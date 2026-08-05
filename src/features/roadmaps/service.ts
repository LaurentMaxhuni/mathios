import { randomUUID } from "node:crypto";
import {
  AuthorizationError,
  NotFoundError,
  ValidationError,
} from "@/domain/errors/application-error";
import {
  buildPersonalizedPath,
  buildRoadmapIntegrityReport,
  computeRoadmapProgress,
} from "@/domain/roadmap/rules";
import type {
  CreateRoadmapInput,
  PersonalizedPathRecord,
  RoadmapCatalogEntry,
  RoadmapDetail,
  RoadmapLearningContext,
  RoadmapRecord,
  RoadmapSnapshot,
  RoadmapStatus,
  SaveRoadmapEdgeInput,
  SaveRoadmapNodeInput,
  UpdateRoadmapInput,
  UserRoadmapDetail,
  UserRoadmapProgressRecord,
  UserRoadmapRecord,
} from "@/domain/roadmap/types";
import type { RoadmapRepository } from "@/domain/ports/roadmap-repository";
import type { AuthSession, AuthenticatedPrincipal } from "@/infrastructure/auth/auth-provider";
import { requirePermission, requireSession } from "@/features/auth/authorization";

const editorRoles = new Set(["administrator", "content-creator", "teacher"]);

export function requireRoadmapEditor(session: AuthSession | null): AuthenticatedPrincipal {
  const principal = requirePermission(session, "edit_content");
  if (!principal.roles.some((role) => editorRoles.has(role))) {
    throw new AuthorizationError(
      "Only teachers, content creators, and administrators can manage roadmaps.",
    );
  }
  return principal;
}

export function requireRoadmapPublisher(session: AuthSession | null): AuthenticatedPrincipal {
  const principal = requirePermission(session, "publish_content");
  if (!principal.roles.some((role) => editorRoles.has(role))) {
    throw new AuthorizationError("Only authorized content editors can publish roadmaps.");
  }
  return principal;
}

export function requireRoadmapLearner(session: AuthSession | null): AuthenticatedPrincipal {
  return requireSession(session);
}

export function canAuthorRoadmaps(principal: AuthenticatedPrincipal | null | undefined): boolean {
  return Boolean(
    principal?.permissions.includes("edit_content") &&
    principal.roles.some((role) => editorRoles.has(role)),
  );
}

function idFor(prefix: string): string {
  return `${prefix}-${randomUUID()}`;
}

function ensure<T>(value: T | null, resource: string, id: string): T {
  if (!value) throw new NotFoundError(resource, id);
  return value;
}

function assertValidDetail(detail: RoadmapDetail): void {
  if (!detail.nodes.length)
    throw new ValidationError("Add at least one node before publishing a roadmap.");
  const report = buildRoadmapIntegrityReport(detail.nodes, detail.edges);
  if (!report.valid) {
    throw new ValidationError(
      report.errors.map((issue) => issue.message).join(" "),
      report.errors.map((issue) => ({
        path: issue.nodeId ?? issue.edgeId ?? "roadmap",
        message: issue.message,
      })),
    );
  }
}

async function forkPublishedVersion(
  detail: RoadmapDetail,
  repository: RoadmapRepository,
): Promise<RoadmapDetail> {
  if (detail.version.status !== "published") return detail;
  const versionNumber = detail.roadmap.currentVersionNumber + 1;
  const versionId = `${detail.roadmap.id}-version-${versionNumber}`;
  const snapshot: RoadmapSnapshot = {
    roadmap: {
      id: detail.roadmap.id,
      slug: detail.roadmap.slug,
      title: detail.roadmap.title,
      description: detail.roadmap.description,
      goal: detail.roadmap.goal,
      targetGradeId: detail.roadmap.targetGradeId,
      targetDifficulty: detail.roadmap.targetDifficulty,
      estimatedDurationMinutes: detail.roadmap.estimatedDurationMinutes,
      coverImage: detail.roadmap.coverImage,
    },
    subjects: detail.subjects,
    prerequisites: detail.prerequisites,
    nodes: detail.nodes,
    edges: detail.edges,
  };
  await repository.createVersion({
    id: versionId,
    roadmapId: detail.roadmap.id,
    versionNumber,
    status: "draft",
    changeSummary: "Draft created from the published roadmap.",
    snapshot,
    createdByProfileId: detail.roadmap.createdByProfileId,
    publishedAt: null,
  });
  for (const node of detail.nodes) {
    await repository.saveNode({
      id: `${node.id}-v${versionNumber}`,
      roadmapVersionId: versionId,
      nodeKey: node.nodeKey,
      type: node.type,
      title: node.title,
      description: node.description,
      referenceId: node.referenceId,
      referenceTitle: node.referenceTitle,
      subjectId: node.subjectId,
      isRequired: node.isRequired,
      isCheckpoint: node.isCheckpoint,
      isOptionalBranch: node.isOptionalBranch,
      sortOrder: node.sortOrder,
      estimatedDurationMinutes: node.estimatedDurationMinutes,
      metadata: node.metadata,
    });
  }
  for (const edge of detail.edges) {
    const source = detail.nodes.find((node) => node.id === edge.sourceNodeId);
    const target = detail.nodes.find((node) => node.id === edge.targetNodeId);
    if (!source || !target) continue;
    await repository.saveEdge({
      id: `${edge.id}-v${versionNumber}`,
      roadmapVersionId: versionId,
      sourceNodeId: `${source.id}-v${versionNumber}`,
      targetNodeId: `${target.id}-v${versionNumber}`,
      type: edge.type,
      sortOrder: edge.sortOrder,
    });
  }
  return ensure(
    await repository.getRoadmap(detail.roadmap.id, { includeDraft: true }),
    "Roadmap",
    detail.roadmap.id,
  );
}

export async function listRoadmaps(
  repository: RoadmapRepository,
  options: Parameters<RoadmapRepository["listRoadmaps"]>[0] = {},
): Promise<readonly RoadmapCatalogEntry[]> {
  return repository.listRoadmaps(options);
}

export async function getRoadmap(
  id: string,
  repository: RoadmapRepository,
  options: { includeDraft?: boolean } = {},
): Promise<RoadmapDetail> {
  return ensure(await repository.getRoadmap(id, options), "Roadmap", id);
}

export async function createRoadmap(
  input: CreateRoadmapInput,
  repository: RoadmapRepository,
): Promise<RoadmapRecord> {
  if (input.status === "published") {
    throw new ValidationError("Create the roadmap as a draft, then validate and publish it.");
  }
  return repository.createRoadmap(input);
}

export async function updateRoadmap(
  id: string,
  input: UpdateRoadmapInput,
  repository: RoadmapRepository,
): Promise<RoadmapRecord> {
  let detail = ensure(await repository.getRoadmap(id, { includeDraft: true }), "Roadmap", id);
  if (detail.version.status === "published") {
    detail = await forkPublishedVersion(detail, repository);
    return repository.updateRoadmap(id, { ...input, status: "draft" });
  }
  if (input.status === "published") assertValidDetail(detail);
  return repository.updateRoadmap(id, input);
}

export async function setRoadmapStatus(
  id: string,
  status: RoadmapStatus,
  repository: RoadmapRepository,
): Promise<RoadmapRecord> {
  const detail = ensure(await repository.getRoadmap(id, { includeDraft: true }), "Roadmap", id);
  if (status === "draft" && detail.version.status === "published") {
    await forkPublishedVersion(detail, repository);
  }
  if (status === "published") assertValidDetail(detail);
  return repository.setRoadmapStatus(id, status);
}

export async function saveRoadmapNode(
  input: SaveRoadmapNodeInput,
  repository: RoadmapRepository,
): Promise<void> {
  if (input.type !== "milestone" && !input.referenceId) {
    throw new ValidationError(
      "Link this node to a reusable concept, lesson, course, module, or assessment.",
    );
  }
  const version = ensure(
    await repository.getVersion(input.roadmapVersionId),
    "Roadmap version",
    input.roadmapVersionId,
  );
  let detail = await getRoadmap(version.roadmapId, repository, { includeDraft: true });
  if (detail.version.id !== input.roadmapVersionId && version.status !== "published") {
    throw new ValidationError("Edit the current roadmap version before saving a node.");
  }
  detail = await forkPublishedVersion(detail, repository);
  await repository.saveNode({ ...input, roadmapVersionId: detail.version.id });
}

export async function deleteRoadmapNode(
  roadmapId: string,
  id: string,
  repository: RoadmapRepository,
): Promise<void> {
  let detail = await getRoadmap(roadmapId, repository, { includeDraft: true });
  const node = ensure(detail.nodes.find((item) => item.id === id) ?? null, "Roadmap node", id);
  detail = await forkPublishedVersion(detail, repository);
  const target = detail.nodes.find((item) => item.nodeKey === node.nodeKey);
  return repository.deleteNode(ensure(target ?? null, "Roadmap node", id).id);
}

export async function reorderRoadmapNodes(
  input: {
    roadmapId: string;
    roadmapVersionId: string;
    orderedNodeIds: readonly string[];
  },
  repository: RoadmapRepository,
): Promise<void> {
  const version = ensure(
    await repository.getVersion(input.roadmapVersionId),
    "Roadmap version",
    input.roadmapVersionId,
  );
  let detail = await getRoadmap(input.roadmapId, repository, { includeDraft: true });
  if (detail.version.id !== input.roadmapVersionId && version.status !== "published") {
    throw new ValidationError("Edit the current roadmap version before reordering nodes.");
  }
  const originalNodes = input.orderedNodeIds.map((id) =>
    ensure(detail.nodes.find((node) => node.id === id) ?? null, "Roadmap node", id),
  );
  if (originalNodes.length !== detail.nodes.length) {
    throw new ValidationError("Reorder every node in the roadmap version exactly once.");
  }
  const uniqueNodeIds = new Set(originalNodes.map((node) => node.id));
  if (uniqueNodeIds.size !== detail.nodes.length) {
    throw new ValidationError("A roadmap node can appear only once in an ordering.");
  }
  detail = await forkPublishedVersion(detail, repository);
  const orderedNodeIds = originalNodes.map(
    (original) =>
      ensure(
        detail.nodes.find((node) => node.nodeKey === original.nodeKey) ?? null,
        "Roadmap node",
        original.id,
      ).id,
  );
  await repository.reorderNodes({ roadmapVersionId: detail.version.id, orderedNodeIds });
}

export async function saveRoadmapEdge(
  input: SaveRoadmapEdgeInput,
  repository: RoadmapRepository,
): Promise<void> {
  const version = ensure(
    await repository.getVersion(input.roadmapVersionId),
    "Roadmap version",
    input.roadmapVersionId,
  );
  let detail = await getRoadmap(version.roadmapId, repository, { includeDraft: true });
  if (detail.version.id !== input.roadmapVersionId && version.status !== "published") {
    throw new ValidationError("Edit the current roadmap version before adding connections.");
  }
  const originalSource = detail.nodes.find((node) => node.id === input.sourceNodeId);
  const originalTarget = detail.nodes.find((node) => node.id === input.targetNodeId);
  if (!originalSource || !originalTarget) {
    throw new ValidationError("Choose nodes from the roadmap version being edited.");
  }
  detail = await forkPublishedVersion(detail, repository);
  const source = ensure(
    detail.nodes.find((node) => node.nodeKey === originalSource.nodeKey) ?? null,
    "Roadmap node",
    input.sourceNodeId,
  );
  const target = ensure(
    detail.nodes.find((node) => node.nodeKey === originalTarget.nodeKey) ?? null,
    "Roadmap node",
    input.targetNodeId,
  );
  if (source.id === target.id)
    throw new ValidationError("A roadmap node cannot connect to itself.");
  const edges = detail.edges.filter(
    (edge) => edge.id !== input.id && edge.id !== `${input.id}-v${detail.version.versionNumber}`,
  );
  const draftInput = {
    ...input,
    roadmapVersionId: detail.version.id,
    sourceNodeId: source.id,
    targetNodeId: target.id,
  };
  const report = buildRoadmapIntegrityReport(detail.nodes, [
    ...edges,
    { ...draftInput, createdAt: "" },
  ]);
  if (!report.valid)
    throw new ValidationError(report.errors.map((issue) => issue.message).join(" "));
  await repository.saveEdge({
    ...draftInput,
    id:
      detail.version.id === version.id ? input.id : `${input.id}-v${detail.version.versionNumber}`,
  });
}

export async function deleteRoadmapEdge(
  roadmapId: string,
  id: string,
  repository: RoadmapRepository,
): Promise<void> {
  let detail = await getRoadmap(roadmapId, repository, { includeDraft: true });
  const edge = ensure(detail.edges.find((item) => item.id === id) ?? null, "Roadmap edge", id);
  const source = ensure(
    detail.nodes.find((item) => item.id === edge.sourceNodeId) ?? null,
    "Roadmap node",
    edge.sourceNodeId,
  );
  const target = ensure(
    detail.nodes.find((item) => item.id === edge.targetNodeId) ?? null,
    "Roadmap node",
    edge.targetNodeId,
  );
  detail = await forkPublishedVersion(detail, repository);
  const forkedEdgeId = detail.edges.find((item) => {
    const forkedSource = detail.nodes.find((node) => node.id === item.sourceNodeId);
    const forkedTarget = detail.nodes.find((node) => node.id === item.targetNodeId);
    return (
      forkedSource?.nodeKey === source.nodeKey &&
      forkedTarget?.nodeKey === target.nodeKey &&
      item.type === edge.type
    );
  })?.id;
  return repository.deleteEdge(ensure(forkedEdgeId ?? null, "Roadmap edge", id));
}

export async function saveRoadmapSubject(
  input: { roadmapId: string; subjectId: string; sortOrder: number },
  repository: RoadmapRepository,
): Promise<void> {
  ensure(
    await repository.getRoadmap(input.roadmapId, { includeDraft: true }),
    "Roadmap",
    input.roadmapId,
  );
  return repository.saveSubject(input);
}

export async function deleteRoadmapSubject(
  input: { roadmapId: string; subjectId: string },
  repository: RoadmapRepository,
): Promise<void> {
  return repository.deleteSubject(input);
}

export async function saveRoadmapPrerequisite(
  input: { roadmapId: string; prerequisiteRoadmapId: string; isRequired: boolean },
  repository: RoadmapRepository,
): Promise<void> {
  if (input.roadmapId === input.prerequisiteRoadmapId) {
    throw new ValidationError("A roadmap cannot require itself.");
  }
  ensure(
    await repository.getRoadmap(input.roadmapId, { includeDraft: true }),
    "Roadmap",
    input.roadmapId,
  );
  ensure(
    await repository.getRoadmap(input.prerequisiteRoadmapId, { includeDraft: true }),
    "Roadmap",
    input.prerequisiteRoadmapId,
  );
  return repository.savePrerequisite(input);
}

export async function deleteRoadmapPrerequisite(
  input: { roadmapId: string; prerequisiteRoadmapId: string },
  repository: RoadmapRepository,
): Promise<void> {
  return repository.deletePrerequisite(input);
}

export async function enrollRoadmap(
  profileId: string,
  roadmapId: string,
  repository: RoadmapRepository,
  selectedGoal: string | null = null,
): Promise<UserRoadmapRecord> {
  const detail = await getRoadmap(roadmapId, repository);
  if (detail.roadmap.status !== "published")
    throw new ValidationError("Only published roadmaps can be started.");
  return repository.enrollUser({
    id: idFor("user-roadmap"),
    profileId,
    roadmapId,
    roadmapVersionId: detail.version.id,
    selectedGoal,
  });
}

export async function getUserRoadmap(
  profileId: string,
  roadmapId: string,
  repository: RoadmapRepository,
): Promise<UserRoadmapDetail> {
  return ensure(
    await repository.getUserRoadmap(profileId, roadmapId),
    "Roadmap enrollment",
    roadmapId,
  );
}

export async function saveRoadmapProgress(
  profileId: string,
  input: {
    roadmapId: string;
    roadmapNodeId: string;
    status: UserRoadmapProgressRecord["status"];
    completionPercentage: number;
  },
  repository: RoadmapRepository,
): Promise<UserRoadmapProgressRecord> {
  const detail = await getUserRoadmap(profileId, input.roadmapId, repository);
  const node = ensure(
    detail.nodes.find((item) => item.id === input.roadmapNodeId) ?? null,
    "Roadmap node",
    input.roadmapNodeId,
  );
  const current = detail.progress.find((item) => item.roadmapNodeId === node.id);
  if (
    current?.status === "locked" &&
    ["in-progress", "completed", "skipped"].includes(input.status)
  ) {
    throw new ValidationError("Complete the required roadmap prerequisites first.");
  }
  return repository.saveProgress({ ...input, userRoadmapId: detail.enrollment.id, profileId });
}

export async function generatePersonalizedPath(
  profileId: string,
  roadmapId: string,
  repository: RoadmapRepository,
): Promise<PersonalizedPathRecord> {
  const detail = await getRoadmap(roadmapId, repository);
  const context: RoadmapLearningContext = await repository.getLearningContext(profileId, roadmapId);
  const enrollment = (await repository.listUserRoadmaps(profileId)).find(
    (item) => item.roadmapId === roadmapId,
  );
  const path = buildPersonalizedPath(
    {
      roadmapId,
      nodes: detail.nodes,
      edges: detail.edges,
      mastery: context.mastery,
      completedNodeIds: context.completedNodeIds,
      profile: context.profile,
    },
    idFor("personalized-path"),
  );
  return repository.savePersonalizedPath({ ...path, userRoadmapId: enrollment?.id ?? null });
}

export async function getLatestPersonalizedPath(
  profileId: string,
  roadmapId: string,
  repository: RoadmapRepository,
): Promise<PersonalizedPathRecord | null> {
  return repository.getLatestPersonalizedPath(profileId, roadmapId);
}

export function validateRoadmapGraph(detail: Pick<RoadmapDetail, "nodes" | "edges">) {
  return buildRoadmapIntegrityReport(detail.nodes, detail.edges);
}

export function roadmapProgress(detail: Pick<UserRoadmapDetail, "nodes" | "progress" | "edges">) {
  return computeRoadmapProgress(detail.nodes, detail.progress, detail.edges);
}

export function newRoadmapNodeId(prefix = "roadmap-node"): string {
  return idFor(prefix);
}

export function newRoadmapEdgeId(prefix = "roadmap-edge"): string {
  return idFor(prefix);
}
