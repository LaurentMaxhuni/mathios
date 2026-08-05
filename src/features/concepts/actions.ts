"use server";

import { revalidatePath } from "next/cache";
import { actionStateFromError, actionStateFromZod, type ActionState } from "@/lib/action-state";
import { formBoolean, formNumber, formString } from "@/lib/form-data";
import { getCurrentSession } from "@/infrastructure/auth/local-auth-provider";
import { getConceptRepository } from "@/infrastructure/database/repositories/concept-repository";
import {
  archiveConcept,
  bulkImportRelationships,
  createConcept,
  deleteConceptRelationship,
  deleteLessonConcept,
  newConceptId,
  parseBulkRelationshipRows,
  requireConceptEditor,
  saveConceptApplication,
  saveConceptMisconception,
  saveConceptObjective,
  saveConceptRelationship,
  saveLessonConcept,
  updateConcept,
  validateConceptGraph,
} from "@/features/concepts/service";
import {
  archiveConceptSchema,
  bulkRelationshipSchema,
  conceptApplicationSchema,
  conceptMisconceptionSchema,
  conceptObjectiveSchema,
  conceptRelationshipSchema,
  conceptSchema,
  lessonConceptSchema,
} from "@/features/concepts/schemas";

async function editorRepository() {
  const session = await getCurrentSession();
  requireConceptEditor(session);
  return getConceptRepository();
}

function conceptPaths(id?: string) {
  revalidatePath("/concepts");
  revalidatePath("/concepts/manage");
  revalidatePath("/knowledge-graph");
  if (id) revalidatePath(`/concepts/${id}`);
}

export async function saveConceptAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const id = formString(formData, "id");
    const parsed = conceptSchema.safeParse({
      id,
      slug: formString(formData, "slug"),
      name: formString(formData, "name"),
      description: formString(formData, "description") ?? "",
      subjectId: formString(formData, "subjectId"),
      domainId: formString(formData, "domainId") ?? null,
      gradeMinId: formString(formData, "gradeMinId") ?? null,
      gradeMaxId: formString(formData, "gradeMaxId") ?? null,
      difficulty: formString(formData, "difficulty"),
      masteryThreshold: formNumber(formData, "masteryThreshold"),
    });
    if (!parsed.success) return actionStateFromZod(parsed.error);
    const repository = await editorRepository();
    if (parsed.data.id) {
      await updateConcept(parsed.data.id, parsed.data, repository);
      conceptPaths(parsed.data.id);
      return { ok: true, message: "Concept saved." };
    }
    const concept = await createConcept(parsed.data, repository);
    conceptPaths(concept.id);
    return { ok: true, message: "Concept created." };
  } catch (error) {
    return actionStateFromError(error);
  }
}

export async function archiveConceptAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const parsed = archiveConceptSchema.safeParse({
      id: formString(formData, "id"),
      isArchived: formBoolean(formData, "isArchived"),
    });
    if (!parsed.success) return actionStateFromZod(parsed.error);
    await archiveConcept(parsed.data.id, parsed.data.isArchived, await editorRepository());
    conceptPaths(parsed.data.id);
    return {
      ok: true,
      message: parsed.data.isArchived ? "Concept archived." : "Concept restored.",
    };
  } catch (error) {
    return actionStateFromError(error);
  }
}

export async function saveConceptRelationshipAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const parsed = conceptRelationshipSchema.safeParse({
      id: formString(formData, "id"),
      sourceConceptId: formString(formData, "sourceConceptId"),
      targetConceptId: formString(formData, "targetConceptId"),
      type: formString(formData, "type"),
    });
    if (!parsed.success) return actionStateFromZod(parsed.error);
    const relationship = await saveConceptRelationship(parsed.data, await editorRepository());
    conceptPaths(relationship.sourceConceptId);
    conceptPaths(relationship.targetConceptId);
    return { ok: true, message: "Relationship saved." };
  } catch (error) {
    return actionStateFromError(error);
  }
}

export async function deleteConceptRelationshipAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const id = formString(formData, "id");
    if (!id) return { ok: false, message: "Relationship ID is required." };
    await deleteConceptRelationship(id, await editorRepository());
    conceptPaths();
    return { ok: true, message: "Relationship removed." };
  } catch (error) {
    return actionStateFromError(error);
  }
}

export async function saveLessonConceptAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const parsed = lessonConceptSchema.safeParse({
      conceptId: formString(formData, "conceptId"),
      lessonId: formString(formData, "lessonId"),
      sortOrder: formNumber(formData, "sortOrder") ?? 0,
    });
    if (!parsed.success) return actionStateFromZod(parsed.error);
    await saveLessonConcept(parsed.data, await editorRepository());
    conceptPaths(parsed.data.conceptId);
    return { ok: true, message: "Lesson linked to concept." };
  } catch (error) {
    return actionStateFromError(error);
  }
}

export async function deleteLessonConceptAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const parsed = lessonConceptSchema.pick({ conceptId: true, lessonId: true }).safeParse({
      conceptId: formString(formData, "conceptId"),
      lessonId: formString(formData, "lessonId"),
    });
    if (!parsed.success) return actionStateFromZod(parsed.error);
    await deleteLessonConcept(parsed.data, await editorRepository());
    conceptPaths(parsed.data.conceptId);
    return { ok: true, message: "Lesson link removed." };
  } catch (error) {
    return actionStateFromError(error);
  }
}

export async function saveConceptObjectiveAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const parsed = conceptObjectiveSchema.safeParse({
      conceptId: formString(formData, "conceptId"),
      objectiveId: formString(formData, "objectiveId"),
      sortOrder: formNumber(formData, "sortOrder") ?? 0,
    });
    if (!parsed.success) return actionStateFromZod(parsed.error);
    await saveConceptObjective(parsed.data, await editorRepository());
    conceptPaths(parsed.data.conceptId);
    return { ok: true, message: "Learning objective linked." };
  } catch (error) {
    return actionStateFromError(error);
  }
}

export async function saveConceptApplicationAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const parsed = conceptApplicationSchema.safeParse({
      id: formString(formData, "id"),
      conceptId: formString(formData, "conceptId"),
      title: formString(formData, "title"),
      description: formString(formData, "description"),
      sortOrder: formNumber(formData, "sortOrder") ?? 0,
    });
    if (!parsed.success) return actionStateFromZod(parsed.error);
    await saveConceptApplication(parsed.data, await editorRepository());
    conceptPaths(parsed.data.conceptId);
    return { ok: true, message: "Application saved." };
  } catch (error) {
    return actionStateFromError(error);
  }
}

export async function saveConceptMisconceptionAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const parsed = conceptMisconceptionSchema.safeParse({
      id: formString(formData, "id"),
      conceptId: formString(formData, "conceptId"),
      misconception: formString(formData, "misconception"),
      correction: formString(formData, "correction"),
      sortOrder: formNumber(formData, "sortOrder") ?? 0,
    });
    if (!parsed.success) return actionStateFromZod(parsed.error);
    await saveConceptMisconception(parsed.data, await editorRepository());
    conceptPaths(parsed.data.conceptId);
    return { ok: true, message: "Misconception saved." };
  } catch (error) {
    return actionStateFromError(error);
  }
}

export async function validateConceptGraphAction(
  _previous: ActionState,
  _formData: FormData,
): Promise<ActionState> {
  try {
    void _previous;
    void _formData;
    const report = validateConceptGraph(await (await editorRepository()).getIntegritySnapshot());
    const issueCount =
      report.orphanedConceptIds.length +
      report.missingConceptIds.length +
      report.duplicateRelationshipKeys.length +
      (report.requiredCycle ? 1 : 0);
    return {
      ok: issueCount === 0,
      message:
        issueCount === 0
          ? "Graph validation passed: no orphaned concepts or invalid prerequisite cycles."
          : `Graph validation found ${issueCount} issue${issueCount === 1 ? "" : "s"}. Review the management report.`,
    };
  } catch (error) {
    return actionStateFromError(error);
  }
}

export async function bulkImportRelationshipsAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const parsed = bulkRelationshipSchema.safeParse({ rows: formString(formData, "rows") });
    if (!parsed.success) return actionStateFromZod(parsed.error);
    const repository = await editorRepository();
    const concepts = await repository.listConcepts({ includeArchived: true });
    const rows = parseBulkRelationshipRows(parsed.data.rows, concepts);
    const count = await bulkImportRelationships(rows, repository);
    conceptPaths();
    return { ok: true, message: `${count} relationship${count === 1 ? "" : "s"} imported.` };
  } catch (error) {
    return actionStateFromError(error);
  }
}

export async function newConceptFormIdAction(): Promise<string> {
  requireConceptEditor(await getCurrentSession());
  return newConceptId("concept");
}
