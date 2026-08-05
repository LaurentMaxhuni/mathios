import { randomUUID } from "node:crypto";
import {
  AuthorizationError,
  ConflictError,
  NotFoundError,
  ValidationError,
} from "@/domain/errors/application-error";
import {
  assertStatusTransition,
  validateBlockPayload,
  validateLessonForPublishing,
} from "@/domain/course/rules";
import type {
  CreateAssetInput,
  CreateBlockInput,
  CreateCourseInput,
  CreateLessonInput,
  CreateModuleInput,
  CreateSectionInput,
  CourseRecord,
  LessonBlockRecord,
  LessonRecord,
  LessonVersionRecord,
  ModuleRecord,
  SaveProgressInput,
  UpdateBlockInput,
  UpdateCourseInput,
  UpdateLessonInput,
  UpdateModuleInput,
  UpdateSectionInput,
} from "@/domain/course/types";
import type { CourseRepository } from "@/domain/ports/course-repository";
import type { AuthSession, AuthenticatedPrincipal } from "@/infrastructure/auth/auth-provider";
import { requirePermission } from "@/features/auth/authorization";

const editorRoles = new Set(["administrator", "content-creator", "teacher"]);

export function requireCourseEditor(session: AuthSession | null): AuthenticatedPrincipal {
  const principal = requirePermission(session, "edit_content");
  if (!principal.roles.some((role) => editorRoles.has(role))) {
    throw new AuthorizationError(
      "Only teachers, content creators, and administrators can author courses.",
    );
  }
  return principal;
}

export function requireCoursePublisher(session: AuthSession | null): AuthenticatedPrincipal {
  const principal = requirePermission(session, "publish_content");
  if (!principal.roles.some((role) => editorRoles.has(role))) {
    throw new AuthorizationError(
      "Only teachers, content creators, and administrators can publish courses.",
    );
  }
  return principal;
}

export function canAuthorCourses(principal: AuthenticatedPrincipal | null | undefined): boolean {
  return Boolean(
    principal?.permissions.includes("edit_content") &&
    principal.roles.some((role) => editorRoles.has(role)),
  );
}

export function canPublishCourses(principal: AuthenticatedPrincipal | null | undefined): boolean {
  return Boolean(
    principal?.permissions.includes("publish_content") &&
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

function ensureCourseActive(course: CourseRecord | null, id: string): CourseRecord {
  const record = ensure(course, "Course", id);
  if (record.status === "archived")
    throw new ConflictError("Archived courses cannot receive new content.");
  return record;
}

function ensureModuleActive(module: ModuleRecord | null, id: string): ModuleRecord {
  const record = ensure(module, "Module", id);
  if (record.isArchived) throw new ConflictError("Archived modules cannot receive new lessons.");
  return record;
}

export function newCourseId(prefix: string): string {
  return idFor(prefix);
}

export async function createCourse(
  input: Omit<CreateCourseInput, "id" | "createdByProfileId"> & {
    id?: string;
    createdByProfileId?: string | null;
  },
  repository: CourseRepository,
): Promise<CourseRecord> {
  return repository.createCourse({
    ...input,
    id: input.id ?? idFor("course"),
    createdByProfileId: input.createdByProfileId ?? null,
  });
}

export async function updateCourse(
  id: string,
  input: UpdateCourseInput,
  repository: CourseRepository,
): Promise<CourseRecord> {
  ensure(await repository.getCourse(id), "Course", id);
  return repository.updateCourse(id, input);
}

export async function setCourseStatus(
  id: string,
  status: CourseRecord["status"],
  repository: CourseRepository,
): Promise<CourseRecord> {
  const current = ensure(await repository.getCourse(id), "Course", id);
  assertStatusTransition(current.status, status);
  if (status === "published" && current.status !== "published") {
    const detail = ensure(await repository.getCourseDetail(id), "Course", id);
    const hasPublishedLesson = detail.modules.some((courseModule) =>
      courseModule.lessons.some((lesson) => lesson.status === "published"),
    );
    if (!hasPublishedLesson) {
      throw new ValidationError("Publish at least one lesson before publishing the course.");
    }
  }
  return repository.setCourseStatus(id, status);
}

export async function saveCourseCurriculum(
  input: { courseId: string; curriculumId: string },
  repository: CourseRepository,
): Promise<void> {
  ensureCourseActive(await repository.getCourse(input.courseId), input.courseId);
  return repository.saveCourseCurriculum(input);
}

export async function saveCourseGrade(
  input: { courseId: string; gradeId: string; isRequired: boolean; sortOrder: number },
  repository: CourseRepository,
): Promise<void> {
  ensureCourseActive(await repository.getCourse(input.courseId), input.courseId);
  return repository.saveCourseGrade(input);
}

export async function saveCoursePrerequisite(
  input: { courseId: string; prerequisiteCourseId: string },
  repository: CourseRepository,
): Promise<void> {
  if (input.courseId === input.prerequisiteCourseId)
    throw new ValidationError("A course cannot require itself.");
  ensureCourseActive(await repository.getCourse(input.courseId), input.courseId);
  ensureCourseActive(
    await repository.getCourse(input.prerequisiteCourseId),
    input.prerequisiteCourseId,
  );
  return repository.saveCoursePrerequisite(input);
}

export async function saveCourseObjective(
  input: { courseId: string; objectiveId: string; sortOrder: number },
  repository: CourseRepository,
): Promise<void> {
  ensureCourseActive(await repository.getCourse(input.courseId), input.courseId);
  return repository.saveCourseObjective(input);
}

export async function createModule(
  input: Omit<CreateModuleInput, "id"> & { id?: string },
  repository: CourseRepository,
): Promise<ModuleRecord> {
  ensureCourseActive(await repository.getCourse(input.courseId), input.courseId);
  return repository.createModule({ ...input, id: input.id ?? idFor("module") });
}

export async function updateModule(
  id: string,
  input: UpdateModuleInput,
  repository: CourseRepository,
): Promise<ModuleRecord> {
  const courseModule = ensure(await repository.getModule(id), "Module", id);
  ensureCourseActive(await repository.getCourse(courseModule.courseId), courseModule.courseId);
  return repository.updateModule(id, input);
}

export async function setModuleArchived(
  id: string,
  isArchived: boolean,
  repository: CourseRepository,
): Promise<void> {
  ensure(await repository.getModule(id), "Module", id);
  return repository.setModuleArchived(id, isArchived);
}

export async function saveModulePrerequisite(
  input: { moduleId: string; prerequisiteModuleId: string },
  repository: CourseRepository,
): Promise<void> {
  if (input.moduleId === input.prerequisiteModuleId)
    throw new ValidationError("A module cannot require itself.");
  const courseModule = ensureModuleActive(
    await repository.getModule(input.moduleId),
    input.moduleId,
  );
  const prerequisite = ensureModuleActive(
    await repository.getModule(input.prerequisiteModuleId),
    input.prerequisiteModuleId,
  );
  if (courseModule.courseId !== prerequisite.courseId)
    throw new ValidationError("Module prerequisites must stay within the same course.");
  return repository.saveModulePrerequisite(input);
}

export async function saveModuleObjective(
  input: { moduleId: string; objectiveId: string; sortOrder: number },
  repository: CourseRepository,
): Promise<void> {
  ensureModuleActive(await repository.getModule(input.moduleId), input.moduleId);
  return repository.saveModuleObjective(input);
}

export async function createLesson(
  input: Omit<CreateLessonInput, "id" | "createdByProfileId"> & {
    id?: string;
    createdByProfileId?: string | null;
  },
  repository: CourseRepository,
): Promise<LessonRecord> {
  const courseModule = ensureModuleActive(
    await repository.getModule(input.moduleId),
    input.moduleId,
  );
  ensureCourseActive(await repository.getCourse(courseModule.courseId), courseModule.courseId);
  return repository.createLesson({
    ...input,
    id: input.id ?? idFor("lesson"),
    createdByProfileId: input.createdByProfileId ?? null,
  });
}

export async function updateLesson(
  id: string,
  input: UpdateLessonInput,
  repository: CourseRepository,
): Promise<LessonRecord> {
  const lesson = ensure(await repository.getLesson(id), "Lesson", id);
  const courseModule = ensureModuleActive(
    await repository.getModule(lesson.moduleId),
    lesson.moduleId,
  );
  ensureCourseActive(await repository.getCourse(courseModule.courseId), courseModule.courseId);
  return repository.updateLesson(id, input);
}

export async function createSection(
  input: Omit<CreateSectionInput, "id"> & { id?: string },
  repository: CourseRepository,
) {
  ensure(await repository.getLesson(input.lessonId), "Lesson", input.lessonId);
  return repository.createSection({ ...input, id: input.id ?? idFor("section") });
}

export async function updateSection(
  id: string,
  input: UpdateSectionInput,
  repository: CourseRepository,
) {
  ensure(await repository.getSection(id), "Lesson section", id);
  return repository.updateSection(id, input);
}

export async function deleteSection(id: string, repository: CourseRepository): Promise<void> {
  ensure(await repository.getSection(id), "Lesson section", id);
  return repository.deleteSection(id);
}

export async function createBlock(
  input: Omit<CreateBlockInput, "id"> & { id?: string },
  repository: CourseRepository,
): Promise<LessonBlockRecord> {
  ensure(await repository.getSection(input.sectionId), "Lesson section", input.sectionId);
  validateBlockPayload(input.type, input.payload);
  return repository.createBlock({ ...input, id: input.id ?? idFor("block") });
}

export async function updateBlock(
  id: string,
  input: UpdateBlockInput,
  repository: CourseRepository,
): Promise<LessonBlockRecord> {
  ensure(await repository.getBlock(id), "Lesson block", id);
  validateBlockPayload(input.type, input.payload);
  return repository.updateBlock(id, input);
}

export async function duplicateBlock(
  id: string,
  repository: CourseRepository,
): Promise<LessonBlockRecord> {
  const block = ensure(await repository.getBlock(id), "Lesson block", id);
  return createBlock(
    {
      sectionId: block.sectionId,
      type: block.type,
      title: block.title ? `${block.title} (copy)` : null,
      sortOrder: block.sortOrder + 1,
      payload: block.payload,
    },
    repository,
  );
}

export async function deleteBlock(id: string, repository: CourseRepository): Promise<void> {
  ensure(await repository.getBlock(id), "Lesson block", id);
  return repository.deleteBlock(id);
}

export async function saveAsset(
  input: Omit<CreateAssetInput, "id"> & { id?: string },
  repository: CourseRepository,
) {
  ensure(await repository.getLesson(input.lessonId), "Lesson", input.lessonId);
  return repository.saveAsset({ ...input, id: input.id ?? idFor("asset") });
}

export async function deleteAsset(id: string, repository: CourseRepository): Promise<void> {
  return repository.deleteAsset(id);
}

export async function saveLessonObjective(
  input: { lessonId: string; objectiveId: string; sortOrder: number },
  repository: CourseRepository,
): Promise<void> {
  ensure(await repository.getLesson(input.lessonId), "Lesson", input.lessonId);
  return repository.saveLessonObjective(input);
}

export async function autosaveLesson(
  lessonId: string,
  changeSummary: string,
  profileId: string | null,
  repository: CourseRepository,
): Promise<LessonVersionRecord> {
  ensure(await repository.getLesson(lessonId), "Lesson", lessonId);
  return repository.saveDraftVersion(lessonId, changeSummary, profileId);
}

export async function publishLesson(
  lessonId: string,
  changeSummary: string,
  profileId: string | null,
  repository: CourseRepository,
): Promise<LessonVersionRecord> {
  const editor = ensure(await repository.getLessonEditor(lessonId), "Lesson", lessonId);
  validateLessonForPublishing(editor.sections);
  return repository.publishLesson(lessonId, changeSummary, profileId);
}

export async function archiveLesson(
  lessonId: string,
  repository: CourseRepository,
): Promise<LessonRecord> {
  const lesson = ensure(await repository.getLesson(lessonId), "Lesson", lessonId);
  assertStatusTransition(lesson.status, "archived");
  return repository.setLessonStatus(lessonId, "archived");
}

export async function restoreLesson(
  lessonId: string,
  repository: CourseRepository,
): Promise<LessonRecord> {
  const lesson = ensure(await repository.getLesson(lessonId), "Lesson", lessonId);
  assertStatusTransition(lesson.status, "draft");
  return repository.setLessonStatus(lessonId, "draft");
}

export async function restoreLessonVersion(
  lessonId: string,
  versionId: string,
  profileId: string | null,
  repository: CourseRepository,
): Promise<LessonVersionRecord> {
  ensure(await repository.getLesson(lessonId), "Lesson", lessonId);
  return repository.restoreLessonVersion(lessonId, versionId, profileId);
}

export async function saveLessonProgress(
  input: SaveProgressInput,
  repository: CourseRepository,
): Promise<void> {
  const reader = ensure(
    await repository.getLessonReader(input.lessonId),
    "Published lesson",
    input.lessonId,
  );
  if (input.lastViewedBlockId) {
    const block = ensure(
      await repository.getBlock(input.lastViewedBlockId),
      "Lesson block",
      input.lastViewedBlockId,
    );
    const section = ensure(
      await repository.getSection(block.sectionId),
      "Lesson section",
      block.sectionId,
    );
    if (section.lessonId !== reader.lesson.id)
      throw new ValidationError("The viewed block does not belong to this lesson.");
  }
  await repository.saveLessonProgress(input);
}
