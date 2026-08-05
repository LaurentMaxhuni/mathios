import type {
  PersonalizedPathNode,
  PersonalizedPathNodeState,
  PersonalizationMastery,
  RoadmapEdgeRecord,
  RoadmapIntegrityIssue,
  RoadmapIntegrityReport,
  RoadmapNodeRecord,
  RoadmapPersonalizationInput,
  RoadmapProgressSummary,
  PersonalizedPathRecord,
  UserRoadmapProgressRecord,
} from "@/domain/roadmap/types";

function nodeSort(left: RoadmapNodeRecord, right: RoadmapNodeRecord): number {
  return (
    left.sortOrder - right.sortOrder ||
    left.nodeKey.localeCompare(right.nodeKey) ||
    left.id.localeCompare(right.id)
  );
}

function edgeSort(left: RoadmapEdgeRecord, right: RoadmapEdgeRecord): number {
  return left.sortOrder - right.sortOrder || left.id.localeCompare(right.id);
}

function addIssue(issues: RoadmapIntegrityIssue[], issue: RoadmapIntegrityIssue): void {
  issues.push(issue);
}

function requiredAdjacency(
  nodes: readonly RoadmapNodeRecord[],
  edges: readonly RoadmapEdgeRecord[],
): Map<string, string[]> {
  const nodeIds = new Set(nodes.map((node) => node.id));
  const adjacency = new Map<string, string[]>(nodes.map((node) => [node.id, []]));
  for (const edge of edges) {
    if (
      edge.type !== "requires" ||
      !nodeIds.has(edge.sourceNodeId) ||
      !nodeIds.has(edge.targetNodeId)
    ) {
      continue;
    }
    adjacency.get(edge.sourceNodeId)?.push(edge.targetNodeId);
  }
  return adjacency;
}

function findRequiredCycle(
  nodes: readonly RoadmapNodeRecord[],
  edges: readonly RoadmapEdgeRecord[],
): readonly string[] {
  const adjacency = requiredAdjacency(nodes, edges);
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const stack: string[] = [];

  function visit(nodeId: string): readonly string[] {
    if (visiting.has(nodeId)) {
      const index = stack.indexOf(nodeId);
      return stack.slice(index < 0 ? 0 : index).concat(nodeId);
    }
    if (visited.has(nodeId)) return [];
    visiting.add(nodeId);
    stack.push(nodeId);
    for (const next of adjacency.get(nodeId) ?? []) {
      const cycle = visit(next);
      if (cycle.length) return cycle;
    }
    stack.pop();
    visiting.delete(nodeId);
    visited.add(nodeId);
    return [];
  }

  for (const node of [...nodes].sort(nodeSort)) {
    const cycle = visit(node.id);
    if (cycle.length) return cycle;
  }
  return [];
}

export function buildRoadmapIntegrityReport(
  nodes: readonly RoadmapNodeRecord[],
  edges: readonly RoadmapEdgeRecord[],
): RoadmapIntegrityReport {
  const errors: RoadmapIntegrityIssue[] = [];
  const warnings: RoadmapIntegrityIssue[] = [];
  const nodeIds = new Set(nodes.map((node) => node.id));
  const keys = new Map<string, string>();
  const edgeKeys = new Set<string>();
  const connected = new Set<string>();

  for (const node of nodes) {
    const previous = keys.get(node.nodeKey);
    if (previous) {
      addIssue(errors, {
        code: "duplicate-node-key",
        message: `Node key '${node.nodeKey}' is used more than once.`,
        nodeId: node.id,
        relatedNodeIds: [previous],
        severity: "error",
      });
    } else {
      keys.set(node.nodeKey, node.id);
    }
    if (node.type !== "milestone" && !node.referenceId) {
      addIssue(errors, {
        code: "missing-reference",
        message: `${node.title} needs a linked learning resource.`,
        nodeId: node.id,
        severity: "error",
      });
    }
  }

  for (const edge of edges) {
    const key = `${edge.sourceNodeId}:${edge.targetNodeId}`;
    if (edge.sourceNodeId === edge.targetNodeId) {
      addIssue(errors, {
        code: "self-edge",
        message: "A roadmap node cannot depend on itself.",
        edgeId: edge.id,
        nodeId: edge.sourceNodeId,
        severity: "error",
      });
    }
    if (edgeKeys.has(key)) {
      addIssue(errors, {
        code: "duplicate-edge",
        message: "The same roadmap connection is defined more than once.",
        edgeId: edge.id,
        severity: "error",
      });
    }
    edgeKeys.add(key);
    if (!nodeIds.has(edge.sourceNodeId) || !nodeIds.has(edge.targetNodeId)) {
      addIssue(errors, {
        code: "missing-node",
        message: "Every roadmap connection must point to nodes in the same version.",
        edgeId: edge.id,
        severity: "error",
      });
      continue;
    }
    connected.add(edge.sourceNodeId);
    connected.add(edge.targetNodeId);
  }

  const cycle = findRequiredCycle(nodes, edges);
  if (cycle.length) {
    addIssue(errors, {
      code: "required-cycle",
      message: "Required roadmap dependencies must form an acyclic path.",
      relatedNodeIds: cycle,
      severity: "error",
    });
  }

  const orphanNodeIds = nodes
    .filter((node) => nodes.length > 1 && !connected.has(node.id))
    .map((node) => node.id);
  for (const nodeId of orphanNodeIds) {
    addIssue(warnings, {
      code: "orphan-node",
      message: "This node is not connected to another roadmap node.",
      nodeId,
      severity: "warning",
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    requiredCycleNodeIds: cycle,
    orphanNodeIds,
  };
}

export function topologicalRoadmapOrder(
  nodes: readonly RoadmapNodeRecord[],
  edges: readonly RoadmapEdgeRecord[],
): readonly RoadmapNodeRecord[] {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const incoming = new Map<string, number>(nodes.map((node) => [node.id, 0]));
  const outgoing = new Map<string, string[]>(nodes.map((node) => [node.id, []]));
  for (const edge of edges) {
    if (edge.type !== "requires" || !byId.has(edge.sourceNodeId) || !byId.has(edge.targetNodeId))
      continue;
    outgoing.get(edge.sourceNodeId)?.push(edge.targetNodeId);
    incoming.set(edge.targetNodeId, (incoming.get(edge.targetNodeId) ?? 0) + 1);
  }

  const ready = nodes.filter((node) => incoming.get(node.id) === 0).sort(nodeSort);
  const ordered: RoadmapNodeRecord[] = [];
  while (ready.length) {
    const node = ready.shift()!;
    ordered.push(node);
    for (const targetId of outgoing.get(node.id) ?? []) {
      const nextIncoming = (incoming.get(targetId) ?? 0) - 1;
      incoming.set(targetId, nextIncoming);
      if (nextIncoming === 0) {
        const target = byId.get(targetId);
        if (target) {
          ready.push(target);
          ready.sort(nodeSort);
        }
      }
    }
  }

  if (ordered.length !== nodes.length) {
    const included = new Set(ordered.map((node) => node.id));
    ordered.push(...nodes.filter((node) => !included.has(node.id)).sort(nodeSort));
  }
  return ordered;
}

export function computeRoadmapProgress(
  nodes: readonly RoadmapNodeRecord[],
  progress: readonly UserRoadmapProgressRecord[],
  edges: readonly RoadmapEdgeRecord[] = [],
): RoadmapProgressSummary {
  const progressByNode = new Map(progress.map((item) => [item.roadmapNodeId, item]));
  const completed = new Set(
    progress
      .filter((item) => item.status === "completed" || item.status === "skipped")
      .map((item) => item.roadmapNodeId),
  );
  const requiredNodes = nodes.filter((node) => node.isRequired);
  const completedRequiredNodes = requiredNodes.filter((node) => completed.has(node.id));
  const availableNodes = nodes.filter(
    (node) => progressByNode.get(node.id)?.status === "available",
  );
  const lockedNodes = nodes.filter((node) => progressByNode.get(node.id)?.status === "locked");
  const nextNode = topologicalRoadmapOrder(nodes, edges).find(
    (node) => !completed.has(node.id) && progressByNode.get(node.id)?.status !== "locked",
  );
  return {
    totalNodes: nodes.length,
    requiredNodes: requiredNodes.length,
    completedNodes: completed.size,
    completedRequiredNodes: completedRequiredNodes.length,
    availableNodes: availableNodes.length,
    lockedNodes: lockedNodes.length,
    percentage: requiredNodes.length
      ? Math.round((completedRequiredNodes.length / requiredNodes.length) * 100)
      : nodes.length
        ? Math.round((completed.size / nodes.length) * 100)
        : 0,
    nextNodeId: nextNode?.id ?? null,
  };
}

function masteryFor(
  mastery: readonly PersonalizationMastery[],
  conceptId: string | null,
): PersonalizationMastery | null {
  if (!conceptId) return null;
  return mastery.find((item) => item.conceptId === conceptId) ?? null;
}

function isMastered(mastery: PersonalizationMastery | null): boolean {
  if (!mastery) return false;
  return mastery.state === "mastered" || (mastery.score >= 0.9 && mastery.confidence >= 0.45);
}

function pathState(
  node: RoadmapNodeRecord,
  mastery: PersonalizationMastery | null,
  completed: ReadonlySet<string>,
  prerequisites: readonly string[],
  resolved: ReadonlySet<string>,
): PersonalizedPathNodeState {
  if (completed.has(node.id)) return "completed";
  if (node.type === "concept" && isMastered(mastery)) return "skipped-mastered";
  if (prerequisites.some((id) => !resolved.has(id))) return "missing-prerequisite";
  return "included";
}

function reasonFor(
  node: RoadmapNodeRecord,
  state: PersonalizedPathNodeState,
  prerequisiteNames: readonly string[],
  profile: RoadmapPersonalizationInput["profile"],
  mastery: PersonalizationMastery | null,
): string {
  if (state === "completed") return "Already completed in this roadmap.";
  if (state === "skipped-mastered") return "Skipped because this concept is already mastered.";
  const diagnosticFlag =
    node.referenceId && profile.diagnosticWeakConceptIds.includes(node.referenceId);
  const diagnosticPrerequisite =
    node.referenceId && profile.diagnosticMissingPrerequisiteConceptIds.includes(node.referenceId);
  if (state === "missing-prerequisite") {
    return prerequisiteNames.length
      ? `Place after ${prerequisiteNames.join(", ")} because those prerequisites unlock this topic.`
      : "Keep this topic behind its required prerequisites before advancing.";
  }
  if (diagnosticFlag || diagnosticPrerequisite) {
    return "Prioritized because your latest diagnostic identified this topic as a useful starting point.";
  }
  if (mastery && mastery.evidenceCount > 0) {
    return "Included to reinforce existing evidence before the next interdisciplinary connection.";
  }
  if (prerequisiteNames.length) {
    return `Order after ${prerequisiteNames.join(", ")} so the next idea has the needed foundation.`;
  }
  if (node.isOptionalBranch) {
    return profile.preferredSubjects.includes(node.subjectId ?? "")
      ? "Optional enrichment aligned with a preferred subject."
      : "Optional enrichment after the required foundation is secure.";
  }
  return "Start here because it has no required roadmap prerequisites.";
}

export function buildPersonalizedPath(
  input: RoadmapPersonalizationInput,
  id = "personalized-path",
): PersonalizedPathRecord {
  const ordered = topologicalRoadmapOrder(input.nodes, input.edges);
  const edgePrerequisites = new Map<string, string[]>();
  for (const edge of [...input.edges].sort(edgeSort)) {
    if (edge.type !== "requires") continue;
    const list = edgePrerequisites.get(edge.targetNodeId) ?? [];
    list.push(edge.sourceNodeId);
    edgePrerequisites.set(edge.targetNodeId, list);
  }
  const nodeById = new Map(input.nodes.map((node) => [node.id, node]));
  const completed = new Set(input.completedNodeIds ?? []);
  const resolved = new Set<string>();
  const pathNodes: PersonalizedPathNode[] = [];

  for (const node of ordered) {
    const prerequisites = edgePrerequisites.get(node.id) ?? [];
    const mastery = masteryFor(input.mastery, node.type === "concept" ? node.referenceId : null);
    const state = pathState(node, mastery, completed, prerequisites, resolved);
    const prerequisiteNames = prerequisites
      .map((id) => nodeById.get(id)?.title)
      .filter((name): name is string => Boolean(name));
    pathNodes.push({
      nodeId: node.id,
      order: pathNodes.length,
      title: node.title,
      type: node.type,
      referenceId: node.referenceId,
      subjectId: node.subjectId,
      state,
      estimatedDurationMinutes: node.estimatedDurationMinutes,
      prerequisiteNodeIds: prerequisites,
      reason: reasonFor(node, state, prerequisiteNames, input.profile, mastery),
    });
    if (state === "completed" || state === "skipped-mastered") resolved.add(node.id);
  }

  const includedNodes = pathNodes.filter((node) => node.state !== "skipped-mastered");
  const skippedMasteredTopics = pathNodes
    .filter((node) => node.state === "skipped-mastered")
    .map((node) => node.title);
  const missingPrerequisites = pathNodes
    .filter((node) => node.state === "missing-prerequisite")
    .flatMap((node) => node.prerequisiteNodeIds.map((id) => nodeById.get(id)?.title ?? id));
  const estimatedDurationMinutes = includedNodes.reduce(
    (sum, node) => sum + node.estimatedDurationMinutes,
    0,
  );
  const weeklyMinutes = input.profile.weeklyStudyTimeMinutes;
  const estimatedWeeks =
    weeklyMinutes && weeklyMinutes > 0
      ? Math.max(1, Math.ceil(estimatedDurationMinutes / weeklyMinutes))
      : null;

  return {
    id,
    profileId: input.profile.profileId,
    roadmapId: input.roadmapId,
    userRoadmapId: null,
    currentGradeId: input.profile.currentGradeId,
    targetGradeId: input.profile.targetGradeId,
    selectedGoal: input.profile.selectedGoal,
    weeklyStudyTimeMinutes: weeklyMinutes,
    estimatedDurationMinutes,
    estimatedWeeks,
    includedTopics: includedNodes.map((node) => node.title),
    skippedMasteredTopics,
    missingPrerequisites: [...new Set(missingPrerequisites)],
    pathNodes,
    generatedAt: input.now ?? new Date().toISOString(),
  };
}
