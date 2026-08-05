"use server";

import { revalidatePath } from "next/cache";
import { actionStateFromError, actionStateFromZod, type ActionState } from "@/lib/action-state";
import { formBoolean, formNumber, formString } from "@/lib/form-data";
import { getCurrentSession } from "@/infrastructure/auth/local-auth-provider";
import { getCourseRepository } from "@/infrastructure/database/repositories/course-repository";
import { getMasteryRepository } from "@/infrastructure/database/repositories/mastery-repository";
import { recordLessonCompletion } from "@/features/mastery/service";
import {
  archiveLesson,
  autosaveLesson,
  createBlock,
  createCourse,
  createLesson,
  createModule,
  createSection,
  deleteBlock,
  deleteSection,
  duplicateBlock,
  deleteAsset,
  newCourseId,
  publishLesson,
  requireCourseEditor,
  requireCoursePublisher,
  restoreLesson,
  restoreLessonVersion,
  setCourseStatus,
  saveCourseCurriculum,
  saveCourseGrade,
  saveCourseObjective,
  saveCoursePrerequisite,
  saveAsset,
  saveLessonObjective,
  saveLessonProgress,
  saveModuleObjective,
  saveModulePrerequisite,
  updateBlock,
  updateCourse,
  updateLesson,
  updateModule,
  updateSection,
} from "@/features/courses/service";
import {
  assetSchema,
  blockSchema,
  changeSummarySchema,
  courseCurriculumSchema,
  courseGradeSchema,
  courseObjectiveSchema,
  coursePrerequisiteSchema,
  courseSchema,
  lessonObjectiveSchema,
  lessonSchema,
  moduleObjectiveSchema,
  modulePrerequisiteSchema,
  moduleSchema,
  progressSchema,
  sectionSchema,
  statusSchema,
} from "@/features/courses/schemas";

async function editorRepository() {
  const session = await getCurrentSession();
  const principal = requireCourseEditor(session);
  return { repository: getCourseRepository(), principal };
}

async function publisherRepository() {
  const session = await getCurrentSession();
  const principal = requireCoursePublisher(session);
  return { repository: getCourseRepository(), principal };
}

function refreshCoursePaths() {
  revalidatePath("/courses");
  revalidatePath("/courses/manage");
  revalidatePath("/lessons");
}

function parseJson(value: string | undefined): Record<string, unknown> {
  if (!value) return {};
  const parsed: unknown = JSON.parse(value);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
    throw new Error("Payload must be a JSON object.");
  return parsed as Record<string, unknown>;
}

export async function saveCourseAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const id = formString(formData, "id") ?? newCourseId("course");
  const parsed = courseSchema.safeParse({
    id,
    slug: formString(formData, "slug"),
    title: formString(formData, "title"),
    description: formString(formData, "description") ?? "",
    subjectId: formString(formData, "subjectId"),
    difficulty: formString(formData, "difficulty"),
    estimatedDurationMinutes: formNumber(formData, "estimatedDurationMinutes") ?? 0,
    gradeMinId: formString(formData, "gradeMinId") || null,
    gradeMaxId: formString(formData, "gradeMaxId") || null,
    courseImage: formString(formData, "courseImage") || null,
    isRequired: formBoolean(formData, "isRequired"),
  });
  if (!parsed.success) return actionStateFromZod(parsed.error);
  try {
    const { repository, principal } = await editorRepository();
    if (formString(formData, "id")) await updateCourse(id, parsed.data, repository);
    else
      await createCourse(
        { ...parsed.data, status: "draft", createdByProfileId: principal.profileId },
        repository,
      );
    refreshCoursePaths();
    return { ok: true, message: "Course saved." };
  } catch (error) {
    return actionStateFromError(error);
  }
}

export async function setCourseStatusAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const courseId = formString(formData, "courseId");
  const status = statusSchema.safeParse(formString(formData, "status"));
  if (!courseId || !status.success)
    return { ok: false, message: "Choose a course and a valid status." };
  try {
    const { repository } =
      status.data === "published" ? await publisherRepository() : await editorRepository();
    await setCourseStatus(courseId, status.data, repository);
    revalidatePath(`/courses/${courseId}`);
    refreshCoursePaths();
    return { ok: true, message: `Course ${status.data}.` };
  } catch (error) {
    return actionStateFromError(error);
  }
}

export async function saveModuleAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const id = formString(formData, "id");
  const input = {
    id: id ?? newCourseId("module"),
    courseId: formString(formData, "courseId") ?? "",
    title: formString(formData, "title") ?? "",
    description: formString(formData, "description") ?? "",
    sortOrder: formNumber(formData, "sortOrder") ?? 0,
    estimatedStudyTimeMinutes: formNumber(formData, "estimatedStudyTimeMinutes") ?? 0,
    assessmentReference: formString(formData, "assessmentReference") || null,
  };
  const parsed = moduleSchema.safeParse(input);
  if (!parsed.success) return actionStateFromZod(parsed.error);
  try {
    const { repository } = await editorRepository();
    if (id) await updateModule(id, parsed.data, repository);
    else await createModule(parsed.data, repository);
    refreshCoursePaths();
    return { ok: true, message: "Module saved." };
  } catch (error) {
    return actionStateFromError(error);
  }
}

export async function saveLessonAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const id = formString(formData, "id");
  const input = {
    id: id ?? newCourseId("lesson"),
    moduleId: formString(formData, "moduleId") ?? "",
    slug: formString(formData, "slug") ?? "",
    title: formString(formData, "title") ?? "",
    summary: formString(formData, "summary") ?? "",
    sortOrder: formNumber(formData, "sortOrder") ?? 0,
    estimatedDurationMinutes: formNumber(formData, "estimatedDurationMinutes") ?? 0,
  };
  const parsed = lessonSchema.safeParse(input);
  if (!parsed.success) return actionStateFromZod(parsed.error);
  try {
    const { repository, principal } = await editorRepository();
    if (id) await updateLesson(id, parsed.data, repository);
    else
      await createLesson(
        { ...parsed.data, createdByProfileId: principal.profileId, status: "draft" },
        repository,
      );
    refreshCoursePaths();
    return { ok: true, message: "Lesson saved." };
  } catch (error) {
    return actionStateFromError(error);
  }
}

export async function saveSectionAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const id = formString(formData, "id");
  const parsed = sectionSchema.safeParse({
    id: id ?? newCourseId("section"),
    lessonId: formString(formData, "lessonId"),
    kind: formString(formData, "kind"),
    title: formString(formData, "title"),
    description: formString(formData, "description") ?? "",
    sortOrder: formNumber(formData, "sortOrder") ?? 0,
  });
  if (!parsed.success) return actionStateFromZod(parsed.error);
  try {
    const { repository } = await editorRepository();
    if (id) await updateSection(id, parsed.data, repository);
    else await createSection(parsed.data, repository);
    refreshCoursePaths();
    return { ok: true, message: "Section saved." };
  } catch (error) {
    return actionStateFromError(error);
  }
}

export async function saveBlockAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const id = formString(formData, "id");
  let payload: Record<string, unknown>;
  try {
    payload = parseJson(formString(formData, "payload"));
  } catch (error) {
    return actionStateFromError(error);
  }
  const parsed = blockSchema.safeParse({
    id: id ?? newCourseId("block"),
    sectionId: formString(formData, "sectionId"),
    type: formString(formData, "type"),
    title: formString(formData, "title") || null,
    sortOrder: formNumber(formData, "sortOrder") ?? 0,
    payload,
  });
  if (!parsed.success) return actionStateFromZod(parsed.error);
  try {
    const { repository } = await editorRepository();
    if (id) await updateBlock(id, parsed.data, repository);
    else await createBlock(parsed.data, repository);
    refreshCoursePaths();
    return { ok: true, message: "Block saved." };
  } catch (error) {
    return actionStateFromError(error);
  }
}

export async function deleteSectionAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const { repository } = await editorRepository();
    await deleteSection(formString(formData, "id") ?? "", repository);
    refreshCoursePaths();
    return { ok: true, message: "Section deleted." };
  } catch (error) {
    return actionStateFromError(error);
  }
}

export async function deleteBlockAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const { repository } = await editorRepository();
    await deleteBlock(formString(formData, "id") ?? "", repository);
    refreshCoursePaths();
    return { ok: true, message: "Block deleted." };
  } catch (error) {
    return actionStateFromError(error);
  }
}

export async function duplicateBlockAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const { repository } = await editorRepository();
    await duplicateBlock(formString(formData, "id") ?? "", repository);
    refreshCoursePaths();
    return { ok: true, message: "Block duplicated." };
  } catch (error) {
    return actionStateFromError(error);
  }
}

export async function saveAssetAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  let metadata: Record<string, unknown>;
  try {
    metadata = parseJson(formString(formData, "metadata"));
  } catch (error) {
    return actionStateFromError(error);
  }
  const parsed = assetSchema.safeParse({
    id: newCourseId("asset"),
    lessonId: formString(formData, "lessonId"),
    blockId: formString(formData, "blockId") || null,
    kind: formString(formData, "kind"),
    name: formString(formData, "name"),
    sourceUrl: formString(formData, "sourceUrl"),
    mimeType: formString(formData, "mimeType") || null,
    altText: formString(formData, "altText") ?? "",
    metadata,
  });
  if (!parsed.success) return actionStateFromZod(parsed.error);
  try {
    const { repository } = await editorRepository();
    await saveAsset(parsed.data, repository);
    refreshCoursePaths();
    return { ok: true, message: "Asset saved." };
  } catch (error) {
    return actionStateFromError(error);
  }
}

export async function deleteAssetAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const { repository } = await editorRepository();
    await deleteAsset(formString(formData, "id") ?? "", repository);
    refreshCoursePaths();
    return { ok: true, message: "Asset deleted." };
  } catch (error) {
    return actionStateFromError(error);
  }
}

export async function saveCourseCurriculumAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = courseCurriculumSchema.safeParse({
    courseId: formString(formData, "courseId"),
    curriculumId: formString(formData, "curriculumId"),
  });
  if (!parsed.success) return actionStateFromZod(parsed.error);
  try {
    const { repository } = await editorRepository();
    await saveCourseCurriculum(parsed.data, repository);
    refreshCoursePaths();
    return { ok: true, message: "Curriculum compatibility saved." };
  } catch (error) {
    return actionStateFromError(error);
  }
}

export async function saveCourseGradeAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = courseGradeSchema.safeParse({
    courseId: formString(formData, "courseId"),
    gradeId: formString(formData, "gradeId"),
    isRequired: formBoolean(formData, "isRequired"),
    sortOrder: formNumber(formData, "sortOrder") ?? 0,
  });
  if (!parsed.success) return actionStateFromZod(parsed.error);
  try {
    const { repository } = await editorRepository();
    await saveCourseGrade(parsed.data, repository);
    refreshCoursePaths();
    return { ok: true, message: "Course grade saved." };
  } catch (error) {
    return actionStateFromError(error);
  }
}

export async function saveCourseObjectiveAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = courseObjectiveSchema.safeParse({
    courseId: formString(formData, "courseId"),
    objectiveId: formString(formData, "objectiveId"),
    sortOrder: formNumber(formData, "sortOrder") ?? 0,
  });
  if (!parsed.success) return actionStateFromZod(parsed.error);
  try {
    const { repository } = await editorRepository();
    await saveCourseObjective(parsed.data, repository);
    refreshCoursePaths();
    return { ok: true, message: "Course objective saved." };
  } catch (error) {
    return actionStateFromError(error);
  }
}

export async function saveCoursePrerequisiteAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = coursePrerequisiteSchema.safeParse({
    courseId: formString(formData, "courseId"),
    prerequisiteCourseId: formString(formData, "prerequisiteCourseId"),
  });
  if (!parsed.success) return actionStateFromZod(parsed.error);
  try {
    const { repository } = await editorRepository();
    await saveCoursePrerequisite(parsed.data, repository);
    refreshCoursePaths();
    return { ok: true, message: "Course prerequisite saved." };
  } catch (error) {
    return actionStateFromError(error);
  }
}

export async function saveModulePrerequisiteAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = modulePrerequisiteSchema.safeParse({
    moduleId: formString(formData, "moduleId"),
    prerequisiteModuleId: formString(formData, "prerequisiteModuleId"),
  });
  if (!parsed.success) return actionStateFromZod(parsed.error);
  try {
    const { repository } = await editorRepository();
    await saveModulePrerequisite(parsed.data, repository);
    refreshCoursePaths();
    return { ok: true, message: "Module prerequisite saved." };
  } catch (error) {
    return actionStateFromError(error);
  }
}

export async function saveModuleObjectiveAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = moduleObjectiveSchema.safeParse({
    moduleId: formString(formData, "moduleId"),
    objectiveId: formString(formData, "objectiveId"),
    sortOrder: formNumber(formData, "sortOrder") ?? 0,
  });
  if (!parsed.success) return actionStateFromZod(parsed.error);
  try {
    const { repository } = await editorRepository();
    await saveModuleObjective(parsed.data, repository);
    refreshCoursePaths();
    return { ok: true, message: "Module objective saved." };
  } catch (error) {
    return actionStateFromError(error);
  }
}

export async function saveLessonObjectiveAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = lessonObjectiveSchema.safeParse({
    lessonId: formString(formData, "lessonId"),
    objectiveId: formString(formData, "objectiveId"),
    sortOrder: formNumber(formData, "sortOrder") ?? 0,
  });
  if (!parsed.success) return actionStateFromZod(parsed.error);
  try {
    const { repository } = await editorRepository();
    await saveLessonObjective(parsed.data, repository);
    refreshCoursePaths();
    return { ok: true, message: "Lesson objective saved." };
  } catch (error) {
    return actionStateFromError(error);
  }
}

export async function autosaveLessonAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const lessonId = formString(formData, "lessonId");
  const summary = changeSummarySchema.safeParse(formString(formData, "changeSummary") ?? "");
  if (!lessonId || !summary.success)
    return { ok: false, message: "Choose a lesson and a valid change summary." };
  try {
    const { repository, principal } = await editorRepository();
    await autosaveLesson(lessonId, summary.data, principal.profileId, repository);
    refreshCoursePaths();
    return { ok: true, message: "Draft autosaved." };
  } catch (error) {
    return actionStateFromError(error);
  }
}

export async function publishLessonAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const lessonId = formString(formData, "lessonId");
  const summary = changeSummarySchema.safeParse(formString(formData, "changeSummary") ?? "");
  if (!lessonId || !summary.success)
    return { ok: false, message: "Choose a lesson and a valid change summary." };
  try {
    const { repository, principal } = await publisherRepository();
    await publishLesson(lessonId, summary.data, principal.profileId, repository);
    refreshCoursePaths();
    return { ok: true, message: "Lesson published." };
  } catch (error) {
    return actionStateFromError(error);
  }
}

export async function archiveLessonAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const { repository } = await editorRepository();
    await archiveLesson(formString(formData, "lessonId") ?? "", repository);
    refreshCoursePaths();
    return { ok: true, message: "Lesson archived." };
  } catch (error) {
    return actionStateFromError(error);
  }
}

export async function restoreLessonAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const { repository } = await editorRepository();
    await restoreLesson(formString(formData, "lessonId") ?? "", repository);
    refreshCoursePaths();
    return { ok: true, message: "Lesson restored to draft." };
  } catch (error) {
    return actionStateFromError(error);
  }
}

export async function restoreLessonVersionAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const { repository, principal } = await editorRepository();
    await restoreLessonVersion(
      formString(formData, "lessonId") ?? "",
      formString(formData, "versionId") ?? "",
      principal.profileId,
      repository,
    );
    refreshCoursePaths();
    return { ok: true, message: "Version restored as a new draft." };
  } catch (error) {
    return actionStateFromError(error);
  }
}

export async function saveLessonProgressAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = progressSchema.safeParse({
    lessonId: formString(formData, "lessonId"),
    timeSpentSeconds: formNumber(formData, "timeSpentSeconds") ?? 0,
    lastViewedBlockId: formString(formData, "lastViewedBlockId") || null,
    completionPercentage: formNumber(formData, "completionPercentage") ?? 0,
    completed: formBoolean(formData, "completed"),
  });
  if (!parsed.success) return actionStateFromZod(parsed.error);
  try {
    const session = await getCurrentSession();
    if (!session) return { ok: false, message: "Authentication is required." };
    const repository = getCourseRepository();
    await saveLessonProgress(
      { ...parsed.data, profileId: session.principal.profileId },
      repository,
    );
    if (parsed.data.completed) {
      await recordLessonCompletion(
        {
          profileId: session.principal.profileId,
          lessonId: parsed.data.lessonId,
        },
        getMasteryRepository(),
      );
      revalidatePath("/mastery");
      revalidatePath("/recommendations");
      revalidatePath("/review-queue");
    }
    return { ok: true, message: "Progress saved." };
  } catch (error) {
    return actionStateFromError(error);
  }
}
