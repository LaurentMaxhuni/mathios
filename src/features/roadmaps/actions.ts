"use server";

import { revalidatePath } from "next/cache";
import { actionStateFromError, actionStateFromZod, type ActionState } from "@/lib/action-state";
import { formBoolean, formNumber, formString, formStrings } from "@/lib/form-data";
import { getCurrentSession } from "@/infrastructure/auth/local-auth-provider";
import {
  getRoadmapRepository,
  newRoadmapEdgeId,
  newRoadmapNodeId,
} from "@/infrastructure/database/repositories/roadmap-repository";
import {
  createRoadmap,
  deleteRoadmapEdge,
  deleteRoadmapNode,
  deleteRoadmapPrerequisite,
  deleteRoadmapSubject,
  enrollRoadmap,
  generatePersonalizedPath,
  requireRoadmapEditor,
  requireRoadmapLearner,
  requireRoadmapPublisher,
  reorderRoadmapNodes,
  saveRoadmapEdge,
  saveRoadmapNode,
  saveRoadmapPrerequisite,
  saveRoadmapProgress,
  saveRoadmapSubject,
  setRoadmapStatus,
  updateRoadmap,
} from "@/features/roadmaps/service";
import {
  personalizedPathSchema,
  roadmapEdgeSchema,
  roadmapEnrollmentSchema,
  roadmapNodeSchema,
  roadmapPrerequisiteSchema,
  roadmapProgressSchema,
  roadmapReorderSchema,
  roadmapSchema,
  roadmapStatusSchema,
  roadmapSubjectSchema,
} from "@/features/roadmaps/schemas";

function parseJsonField(value: string | undefined): Record<string, unknown> {
  if (!value?.trim()) return {};
  const parsed: unknown = JSON.parse(value);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
    throw new Error("Metadata must be a JSON object.");
  return parsed as Record<string, unknown>;
}

function refreshRoadmapPaths(id?: string) {
  revalidatePath("/roadmaps");
  revalidatePath("/roadmaps/manage");
  revalidatePath("/personalized-paths");
  if (id) {
    revalidatePath(`/roadmaps/${id}`);
    revalidatePath(`/roadmaps/${id}/edit`);
  }
}

export async function saveRoadmapAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const id = formString(formData, "id");
    const parsed = roadmapSchema.safeParse({
      id,
      slug: formString(formData, "slug"),
      title: formString(formData, "title"),
      description: formString(formData, "description") ?? "",
      goal: formString(formData, "goal") ?? "",
      targetGradeId: formString(formData, "targetGradeId") || null,
      targetDifficulty: formString(formData, "targetDifficulty") ?? "balanced",
      estimatedDurationMinutes: formNumber(formData, "estimatedDurationMinutes") ?? 0,
      coverImage: formString(formData, "coverImage") || null,
      status: formString(formData, "status") ?? "draft",
    });
    if (!parsed.success) return actionStateFromZod(parsed.error);
    const principal = requireRoadmapEditor(await getCurrentSession());
    const input = {
      ...parsed.data,
      id: id ?? `${parsed.data.slug}-${Date.now()}`,
      createdByProfileId: principal.profileId,
    };
    if (id) await updateRoadmap(id, input, getRoadmapRepository());
    else await createRoadmap(input, getRoadmapRepository());
    refreshRoadmapPaths(input.id);
    return { ok: true, message: id ? "Roadmap saved." : "Roadmap created." };
  } catch (error) {
    return actionStateFromError(error);
  }
}

export async function setRoadmapStatusAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const parsed = roadmapStatusSchema.safeParse({
      id: formString(formData, "id"),
      status: formString(formData, "status"),
    });
    if (!parsed.success) return actionStateFromZod(parsed.error);
    const session = await getCurrentSession();
    if (parsed.data.status === "published") requireRoadmapPublisher(session);
    else requireRoadmapEditor(session);
    await setRoadmapStatus(parsed.data.id, parsed.data.status, getRoadmapRepository());
    refreshRoadmapPaths(parsed.data.id);
    return { ok: true, message: `Roadmap ${parsed.data.status}.` };
  } catch (error) {
    return actionStateFromError(error);
  }
}

export async function saveRoadmapNodeAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const parsed = roadmapNodeSchema.safeParse({
      id: formString(formData, "id") || newRoadmapNodeId(),
      roadmapVersionId: formString(formData, "roadmapVersionId"),
      nodeKey: formString(formData, "nodeKey"),
      type: formString(formData, "type"),
      title: formString(formData, "title"),
      description: formString(formData, "description") ?? "",
      referenceId: formString(formData, "referenceId") ?? null,
      referenceTitle: formString(formData, "referenceTitle") ?? null,
      subjectId: formString(formData, "subjectId") ?? null,
      isRequired: formBoolean(formData, "isRequired"),
      isCheckpoint: formBoolean(formData, "isCheckpoint"),
      isOptionalBranch: formBoolean(formData, "isOptionalBranch"),
      sortOrder: formNumber(formData, "sortOrder") ?? 0,
      estimatedDurationMinutes: formNumber(formData, "estimatedDurationMinutes") ?? 0,
      metadata: parseJsonField(formString(formData, "metadata")),
    });
    if (!parsed.success) return actionStateFromZod(parsed.error);
    requireRoadmapEditor(await getCurrentSession());
    await saveRoadmapNode(parsed.data, getRoadmapRepository());
    refreshRoadmapPaths(formString(formData, "roadmapId") ?? undefined);
    return { ok: true, message: "Roadmap node saved." };
  } catch (error) {
    return actionStateFromError(error);
  }
}

export async function deleteRoadmapNodeAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    requireRoadmapEditor(await getCurrentSession());
    await deleteRoadmapNode(
      formString(formData, "roadmapId") ?? "",
      formString(formData, "id") ?? "",
      getRoadmapRepository(),
    );
    refreshRoadmapPaths(formString(formData, "roadmapId") ?? undefined);
    return { ok: true, message: "Roadmap node removed." };
  } catch (error) {
    return actionStateFromError(error);
  }
}

export async function saveRoadmapEdgeAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const parsed = roadmapEdgeSchema.safeParse({
      id: formString(formData, "id") || newRoadmapEdgeId(),
      roadmapVersionId: formString(formData, "roadmapVersionId"),
      sourceNodeId: formString(formData, "sourceNodeId"),
      targetNodeId: formString(formData, "targetNodeId"),
      type: formString(formData, "type") ?? "requires",
      sortOrder: formNumber(formData, "sortOrder") ?? 0,
    });
    if (!parsed.success) return actionStateFromZod(parsed.error);
    requireRoadmapEditor(await getCurrentSession());
    await saveRoadmapEdge(parsed.data, getRoadmapRepository());
    refreshRoadmapPaths(formString(formData, "roadmapId") ?? undefined);
    return { ok: true, message: "Roadmap connection saved." };
  } catch (error) {
    return actionStateFromError(error);
  }
}

export async function reorderRoadmapNodesAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const parsed = roadmapReorderSchema.safeParse({
      roadmapId: formString(formData, "roadmapId"),
      roadmapVersionId: formString(formData, "roadmapVersionId"),
      nodeIds: formStrings(formData, "nodeIds"),
    });
    if (!parsed.success) return actionStateFromZod(parsed.error);
    requireRoadmapEditor(await getCurrentSession());
    await reorderRoadmapNodes(
      {
        roadmapId: parsed.data.roadmapId,
        roadmapVersionId: parsed.data.roadmapVersionId,
        orderedNodeIds: parsed.data.nodeIds,
      },
      getRoadmapRepository(),
    );
    refreshRoadmapPaths(parsed.data.roadmapId);
    return { ok: true, message: "Roadmap order saved." };
  } catch (error) {
    return actionStateFromError(error);
  }
}

export async function deleteRoadmapEdgeAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    requireRoadmapEditor(await getCurrentSession());
    await deleteRoadmapEdge(
      formString(formData, "roadmapId") ?? "",
      formString(formData, "id") ?? "",
      getRoadmapRepository(),
    );
    refreshRoadmapPaths(formString(formData, "roadmapId") ?? undefined);
    return { ok: true, message: "Roadmap connection removed." };
  } catch (error) {
    return actionStateFromError(error);
  }
}

export async function saveRoadmapSubjectAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const parsed = roadmapSubjectSchema.safeParse({
      roadmapId: formString(formData, "roadmapId"),
      subjectId: formString(formData, "subjectId"),
      sortOrder: formNumber(formData, "sortOrder") ?? 0,
    });
    if (!parsed.success) return actionStateFromZod(parsed.error);
    requireRoadmapEditor(await getCurrentSession());
    await saveRoadmapSubject(parsed.data, getRoadmapRepository());
    refreshRoadmapPaths(parsed.data.roadmapId);
    return { ok: true, message: "Roadmap subject saved." };
  } catch (error) {
    return actionStateFromError(error);
  }
}

export async function deleteRoadmapSubjectAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    requireRoadmapEditor(await getCurrentSession());
    const roadmapId = formString(formData, "roadmapId") ?? "";
    await deleteRoadmapSubject(
      { roadmapId, subjectId: formString(formData, "subjectId") ?? "" },
      getRoadmapRepository(),
    );
    refreshRoadmapPaths(roadmapId);
    return { ok: true, message: "Roadmap subject removed." };
  } catch (error) {
    return actionStateFromError(error);
  }
}

export async function saveRoadmapPrerequisiteAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const parsed = roadmapPrerequisiteSchema.safeParse({
      roadmapId: formString(formData, "roadmapId"),
      prerequisiteRoadmapId: formString(formData, "prerequisiteRoadmapId"),
      isRequired: formBoolean(formData, "isRequired"),
    });
    if (!parsed.success) return actionStateFromZod(parsed.error);
    requireRoadmapEditor(await getCurrentSession());
    await saveRoadmapPrerequisite(parsed.data, getRoadmapRepository());
    refreshRoadmapPaths(parsed.data.roadmapId);
    return { ok: true, message: "Roadmap prerequisite saved." };
  } catch (error) {
    return actionStateFromError(error);
  }
}

export async function deleteRoadmapPrerequisiteAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    requireRoadmapEditor(await getCurrentSession());
    const roadmapId = formString(formData, "roadmapId") ?? "";
    await deleteRoadmapPrerequisite(
      { roadmapId, prerequisiteRoadmapId: formString(formData, "prerequisiteRoadmapId") ?? "" },
      getRoadmapRepository(),
    );
    refreshRoadmapPaths(roadmapId);
    return { ok: true, message: "Roadmap prerequisite removed." };
  } catch (error) {
    return actionStateFromError(error);
  }
}

export async function enrollRoadmapAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const parsed = roadmapEnrollmentSchema.safeParse({
      roadmapId: formString(formData, "roadmapId"),
      selectedGoal: formString(formData, "selectedGoal") ?? null,
    });
    if (!parsed.success) return actionStateFromZod(parsed.error);
    const principal = requireRoadmapLearner(await getCurrentSession());
    await enrollRoadmap(
      principal.profileId,
      parsed.data.roadmapId,
      getRoadmapRepository(),
      parsed.data.selectedGoal,
    );
    refreshRoadmapPaths(parsed.data.roadmapId);
    return { ok: true, message: "Roadmap added to your learning paths." };
  } catch (error) {
    return actionStateFromError(error);
  }
}

export async function saveRoadmapProgressAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const parsed = roadmapProgressSchema.safeParse({
      roadmapId: formString(formData, "roadmapId"),
      roadmapNodeId: formString(formData, "roadmapNodeId"),
      status: formString(formData, "status"),
      completionPercentage: formNumber(formData, "completionPercentage") ?? 0,
    });
    if (!parsed.success) return actionStateFromZod(parsed.error);
    const principal = requireRoadmapLearner(await getCurrentSession());
    await saveRoadmapProgress(principal.profileId, parsed.data, getRoadmapRepository());
    refreshRoadmapPaths(parsed.data.roadmapId);
    return { ok: true, message: "Roadmap progress saved." };
  } catch (error) {
    return actionStateFromError(error);
  }
}

export async function generatePersonalizedPathAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const parsed = personalizedPathSchema.safeParse({
      roadmapId: formString(formData, "roadmapId"),
    });
    if (!parsed.success) return actionStateFromZod(parsed.error);
    const principal = requireRoadmapLearner(await getCurrentSession());
    await generatePersonalizedPath(
      principal.profileId,
      parsed.data.roadmapId,
      getRoadmapRepository(),
    );
    refreshRoadmapPaths(parsed.data.roadmapId);
    return { ok: true, message: "Personalized path generated." };
  } catch (error) {
    return actionStateFromError(error);
  }
}
