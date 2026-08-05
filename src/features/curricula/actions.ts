"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { actionStateFromError, actionStateFromZod, type ActionState } from "@/lib/action-state";
import { formBoolean, formNumber, formString } from "@/lib/form-data";
import { getCurrentSession } from "@/infrastructure/auth/local-auth-provider";
import { getCurriculumRepository } from "@/infrastructure/database/repositories/curriculum-repository";
import {
  archiveCurriculum,
  archiveDomain,
  archiveGrade,
  archiveLearningObjective,
  archiveSubject,
  createCurriculum,
  createDomain,
  createGrade,
  createLearningObjective,
  createSubject,
  newStructureId,
  requireStructureManager,
  saveCurriculumGrade,
  saveCurriculumSubject,
  saveGradeLearningObjective,
  saveGradeSubject,
  saveGradeSubjectDomain,
  saveSubjectDomain,
  updateCurriculum,
  updateDomain,
  updateGrade,
  updateLearningObjective,
  updateSubject,
} from "@/features/curricula/service";
import {
  curriculumGradeMappingSchema,
  curriculumSchema,
  curriculumSubjectMappingSchema,
  domainSchema,
  gradeLearningObjectiveMappingSchema,
  gradeSchema,
  gradeSubjectDomainMappingSchema,
  gradeSubjectMappingSchema,
  learningObjectiveSchema,
  learningObjectiveUpdateSchema,
  subjectDomainMappingSchema,
  subjectSchema,
} from "@/features/curricula/schemas";

const archiveSchema = z.object({
  entity: z.enum(["curriculum", "grade", "subject", "domain", "objective"]),
  id: z.string().trim().min(1),
  isArchived: z.boolean(),
});

function refreshStructurePaths() {
  revalidatePath("/curricula");
  revalidatePath("/grades");
  revalidatePath("/subjects");
  revalidatePath("/domains");
  revalidatePath("/curricula/manage");
  revalidatePath("/grades/manage");
  revalidatePath("/subjects/manage");
  revalidatePath("/domains/manage");
}

async function authorizedRepository() {
  const repository = getCurriculumRepository();
  const session = await getCurrentSession();
  requireStructureManager(session);
  return repository;
}

export async function saveCurriculumAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const id = formString(formData, "id") ?? newStructureId("curriculum");
  const parsed = curriculumSchema.safeParse({
    id,
    slug: formString(formData, "slug"),
    name: formString(formData, "name"),
    kind: formString(formData, "kind"),
    description: formString(formData, "description") ?? "",
    authority: formString(formData, "authority") || null,
  });
  if (!parsed.success) return actionStateFromZod(parsed.error);
  try {
    const repository = await authorizedRepository();
    if (formString(formData, "id")) {
      await updateCurriculum(parsed.data.id, parsed.data, repository);
    } else {
      await createCurriculum(parsed.data, repository);
    }
    refreshStructurePaths();
    return { ok: true, message: "Curriculum saved." };
  } catch (error) {
    return actionStateFromError(error);
  }
}

export async function saveGradeAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const id = formString(formData, "id") ?? newStructureId("grade");
  const parsed = gradeSchema.safeParse({
    id,
    slug: formString(formData, "slug"),
    name: formString(formData, "name"),
    shortName: formString(formData, "shortName"),
    description: formString(formData, "description") ?? "",
    sortOrder: formNumber(formData, "sortOrder") ?? 0,
  });
  if (!parsed.success) return actionStateFromZod(parsed.error);
  try {
    const repository = await authorizedRepository();
    if (formString(formData, "id")) await updateGrade(parsed.data.id, parsed.data, repository);
    else await createGrade(parsed.data, repository);
    refreshStructurePaths();
    return { ok: true, message: "Grade saved." };
  } catch (error) {
    return actionStateFromError(error);
  }
}

export async function saveSubjectAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const id = formString(formData, "id") ?? newStructureId("subject");
  const parsed = subjectSchema.safeParse({
    id,
    slug: formString(formData, "slug"),
    name: formString(formData, "name"),
    description: formString(formData, "description") ?? "",
    icon: formString(formData, "icon") ?? "book-open",
    accent: formString(formData, "accent") ?? "accent",
    recommendedStudyHours: formNumber(formData, "recommendedStudyHours") ?? 0,
    sortOrder: formNumber(formData, "sortOrder") ?? 0,
  });
  if (!parsed.success) return actionStateFromZod(parsed.error);
  try {
    const repository = await authorizedRepository();
    if (formString(formData, "id")) await updateSubject(parsed.data.id, parsed.data, repository);
    else await createSubject(parsed.data, repository);
    refreshStructurePaths();
    return { ok: true, message: "Subject saved." };
  } catch (error) {
    return actionStateFromError(error);
  }
}

export async function saveDomainAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const id = formString(formData, "id") ?? newStructureId("domain");
  const parsed = domainSchema.safeParse({
    id,
    slug: formString(formData, "slug"),
    name: formString(formData, "name"),
    description: formString(formData, "description") ?? "",
    sortOrder: formNumber(formData, "sortOrder") ?? 0,
  });
  if (!parsed.success) return actionStateFromZod(parsed.error);
  try {
    const repository = await authorizedRepository();
    if (formString(formData, "id")) await updateDomain(parsed.data.id, parsed.data, repository);
    else await createDomain(parsed.data, repository);
    refreshStructurePaths();
    return { ok: true, message: "Domain saved." };
  } catch (error) {
    return actionStateFromError(error);
  }
}

export async function saveCurriculumGradeAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = curriculumGradeMappingSchema.safeParse({
    curriculumId: formString(formData, "curriculumId"),
    gradeId: formString(formData, "gradeId"),
    sortOrder: formNumber(formData, "sortOrder") ?? 0,
    isAvailable: formBoolean(formData, "isAvailable"),
  });
  if (!parsed.success) return actionStateFromZod(parsed.error);
  try {
    await saveCurriculumGrade(parsed.data, await authorizedRepository());
    refreshStructurePaths();
    return { ok: true, message: "Curriculum grade mapping saved." };
  } catch (error) {
    return actionStateFromError(error);
  }
}

export async function saveCurriculumSubjectAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = curriculumSubjectMappingSchema.safeParse({
    curriculumId: formString(formData, "curriculumId"),
    subjectId: formString(formData, "subjectId"),
    isRequired: formBoolean(formData, "isRequired"),
    isAvailable: formBoolean(formData, "isAvailable"),
    sortOrder: formNumber(formData, "sortOrder") ?? 0,
  });
  if (!parsed.success) return actionStateFromZod(parsed.error);
  try {
    await saveCurriculumSubject(parsed.data, await authorizedRepository());
    refreshStructurePaths();
    return { ok: true, message: "Curriculum subject mapping saved." };
  } catch (error) {
    return actionStateFromError(error);
  }
}

export async function saveGradeSubjectAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = gradeSubjectMappingSchema.safeParse({
    curriculumId: formString(formData, "curriculumId"),
    gradeId: formString(formData, "gradeId"),
    subjectId: formString(formData, "subjectId"),
    isRequired: formBoolean(formData, "isRequired"),
    isAvailable: formBoolean(formData, "isAvailable"),
    sortOrder: formNumber(formData, "sortOrder") ?? 0,
  });
  if (!parsed.success) return actionStateFromZod(parsed.error);
  try {
    await saveGradeSubject(parsed.data, await authorizedRepository());
    refreshStructurePaths();
    return { ok: true, message: "Grade subject mapping saved." };
  } catch (error) {
    return actionStateFromError(error);
  }
}

export async function saveSubjectDomainAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = subjectDomainMappingSchema.safeParse({
    subjectId: formString(formData, "subjectId"),
    domainId: formString(formData, "domainId"),
    sortOrder: formNumber(formData, "sortOrder") ?? 0,
  });
  if (!parsed.success) return actionStateFromZod(parsed.error);
  try {
    await saveSubjectDomain(parsed.data, await authorizedRepository());
    refreshStructurePaths();
    return { ok: true, message: "Subject domain mapping saved." };
  } catch (error) {
    return actionStateFromError(error);
  }
}

export async function saveGradeSubjectDomainAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = gradeSubjectDomainMappingSchema.safeParse({
    curriculumId: formString(formData, "curriculumId"),
    gradeId: formString(formData, "gradeId"),
    subjectId: formString(formData, "subjectId"),
    domainId: formString(formData, "domainId"),
    isRequired: formBoolean(formData, "isRequired"),
    isAvailable: formBoolean(formData, "isAvailable"),
    depth: formNumber(formData, "depth") ?? 1,
    sortOrder: formNumber(formData, "sortOrder") ?? 0,
  });
  if (!parsed.success) return actionStateFromZod(parsed.error);
  try {
    await saveGradeSubjectDomain(parsed.data, await authorizedRepository());
    refreshStructurePaths();
    return { ok: true, message: "Grade domain depth saved." };
  } catch (error) {
    return actionStateFromError(error);
  }
}

export async function saveLearningObjectiveAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const id = formString(formData, "id");
  const input = {
    id: id ?? newStructureId("objective"),
    curriculumId: formString(formData, "curriculumId") ?? "",
    subjectId: formString(formData, "subjectId") ?? "",
    domainId: formString(formData, "domainId") || null,
    code: formString(formData, "code") ?? "",
    title: formString(formData, "title") ?? "",
    description: formString(formData, "description") ?? "",
    difficulty: formString(formData, "difficulty") ?? "balanced",
    isRequired: formBoolean(formData, "isRequired"),
    sortOrder: formNumber(formData, "sortOrder") ?? 0,
  };
  const parsed = id
    ? learningObjectiveUpdateSchema.safeParse(input)
    : learningObjectiveSchema.safeParse(input);
  if (!parsed.success) return actionStateFromZod(parsed.error);
  try {
    const repository = await authorizedRepository();
    if (id) await updateLearningObjective(id, parsed.data, repository);
    else
      await createLearningObjective(
        { ...parsed.data, curriculumId: input.curriculumId },
        repository,
      );
    refreshStructurePaths();
    return { ok: true, message: "Learning objective saved." };
  } catch (error) {
    return actionStateFromError(error);
  }
}

export async function saveGradeLearningObjectiveAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = gradeLearningObjectiveMappingSchema.safeParse({
    curriculumId: formString(formData, "curriculumId"),
    gradeId: formString(formData, "gradeId"),
    objectiveId: formString(formData, "objectiveId"),
    isRequired: formBoolean(formData, "isRequired"),
    sortOrder: formNumber(formData, "sortOrder") ?? 0,
  });
  if (!parsed.success) return actionStateFromZod(parsed.error);
  try {
    await saveGradeLearningObjective(parsed.data, await authorizedRepository());
    refreshStructurePaths();
    return { ok: true, message: "Grade objective mapping saved." };
  } catch (error) {
    return actionStateFromError(error);
  }
}

export async function archiveStructureAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = archiveSchema.safeParse({
    entity: formString(formData, "entity"),
    id: formString(formData, "id"),
    isArchived: formBoolean(formData, "isArchived"),
  });
  if (!parsed.success) return actionStateFromZod(parsed.error);
  try {
    const repository = await authorizedRepository();
    if (parsed.data.entity === "curriculum")
      await archiveCurriculum(parsed.data.id, parsed.data.isArchived, repository);
    if (parsed.data.entity === "grade")
      await archiveGrade(parsed.data.id, parsed.data.isArchived, repository);
    if (parsed.data.entity === "subject")
      await archiveSubject(parsed.data.id, parsed.data.isArchived, repository);
    if (parsed.data.entity === "domain")
      await archiveDomain(parsed.data.id, parsed.data.isArchived, repository);
    if (parsed.data.entity === "objective")
      await archiveLearningObjective(parsed.data.id, parsed.data.isArchived, repository);
    refreshStructurePaths();
    return {
      ok: true,
      message: parsed.data.isArchived ? "Structure archived." : "Structure restored.",
    };
  } catch (error) {
    return actionStateFromError(error);
  }
}
