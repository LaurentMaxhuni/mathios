export const COURSE_STATUSES = ["draft", "published", "archived"] as const;
export type CourseStatus = (typeof COURSE_STATUSES)[number];

export const LESSON_SECTION_KINDS = [
  "introduction",
  "why-this-matters",
  "learning-objectives",
  "prerequisite-check",
  "intuitive-explanation",
  "formal-explanation",
  "definition",
  "formula",
  "derivation",
  "diagram",
  "image",
  "table",
  "worked-example",
  "guided-practice",
  "independent-exercise",
  "common-mistake",
  "real-world-application",
  "cross-subject-connection",
  "summary",
  "knowledge-check",
  "further-exploration",
  "advanced-extension",
  "olympiad-extension",
] as const;
export type LessonSectionKind = (typeof LESSON_SECTION_KINDS)[number];

export const LESSON_BLOCK_TYPES = [
  "heading",
  "paragraph",
  "markdown",
  "formula",
  "definition",
  "theorem",
  "example",
  "callout",
  "warning",
  "common-mistake",
  "image",
  "diagram",
  "table",
  "code",
  "file",
  "video",
  "audio",
  "exercise-reference",
  "simulation-reference",
  "tabs",
  "accordion",
  "comparison",
  "timeline",
] as const;
export type LessonBlockType = (typeof LESSON_BLOCK_TYPES)[number];

export const CONTENT_STATUSES = ["draft", "published", "archived"] as const;
export type ContentStatus = (typeof CONTENT_STATUSES)[number];

export type CourseDifficulty = "gentle" | "balanced" | "challenging";

export type LessonBlockPayload = Record<string, unknown>;

export interface CourseRecord {
  id: string;
  slug: string;
  title: string;
  description: string;
  subjectId: string;
  difficulty: CourseDifficulty;
  estimatedDurationMinutes: number;
  gradeMinId: string | null;
  gradeMaxId: string | null;
  courseImage: string | null;
  isRequired: boolean;
  status: CourseStatus;
  createdByProfileId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CourseCurriculumPlacement {
  courseId: string;
  curriculumId: string;
  createdAt: string;
}

export interface CourseGradePlacement {
  courseId: string;
  gradeId: string;
  isRequired: boolean;
  sortOrder: number;
  createdAt: string;
}

export interface CoursePrerequisite {
  courseId: string;
  prerequisiteCourseId: string;
  createdAt: string;
}

export interface CourseObjectivePlacement {
  courseId: string;
  objectiveId: string;
  sortOrder: number;
  createdAt: string;
}

export interface ModuleRecord {
  id: string;
  courseId: string;
  title: string;
  description: string;
  sortOrder: number;
  estimatedStudyTimeMinutes: number;
  assessmentReference: string | null;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ModulePrerequisite {
  moduleId: string;
  prerequisiteModuleId: string;
  createdAt: string;
}

export interface ModuleObjectivePlacement {
  moduleId: string;
  objectiveId: string;
  sortOrder: number;
  createdAt: string;
}

export interface LessonRecord {
  id: string;
  moduleId: string;
  slug: string;
  title: string;
  summary: string;
  sortOrder: number;
  estimatedDurationMinutes: number;
  status: ContentStatus;
  currentVersionNumber: number;
  publishedVersionId: string | null;
  createdByProfileId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LessonSectionRecord {
  id: string;
  lessonId: string;
  kind: LessonSectionKind;
  title: string;
  description: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface LessonBlockRecord {
  id: string;
  sectionId: string;
  type: LessonBlockType;
  title: string | null;
  sortOrder: number;
  payload: LessonBlockPayload;
  createdAt: string;
  updatedAt: string;
}

export interface LessonAssetRecord {
  id: string;
  lessonId: string;
  blockId: string | null;
  kind: string;
  name: string;
  sourceUrl: string;
  mimeType: string | null;
  altText: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface LessonObjectivePlacement {
  lessonId: string;
  objectiveId: string;
  sortOrder: number;
  createdAt: string;
}

export interface LessonVersionSnapshot {
  lesson: Pick<LessonRecord, "id" | "slug" | "title" | "summary" | "estimatedDurationMinutes">;
  sections: readonly {
    section: LessonSectionRecord;
    blocks: readonly LessonBlockRecord[];
  }[];
  assets: readonly LessonAssetRecord[];
  objectiveIds: readonly string[];
}

export interface LessonVersionRecord {
  id: string;
  lessonId: string;
  versionNumber: number;
  status: ContentStatus;
  changeSummary: string;
  snapshot: LessonVersionSnapshot;
  createdByProfileId: string | null;
  createdAt: string;
  publishedAt: string | null;
}

export interface LessonProgressRecord {
  profileId: string;
  lessonId: string;
  startedAt: string | null;
  completedAt: string | null;
  timeSpentSeconds: number;
  lastViewedBlockId: string | null;
  completionPercentage: number;
  revisitCount: number;
  lastViewedAt: string | null;
  updatedAt: string;
}

export interface CourseCatalogEntry extends CourseRecord {
  subjectName: string;
  subjectSlug: string;
  moduleCount: number;
  lessonCount: number;
  curriculumIds: readonly string[];
  gradeIds: readonly string[];
}

export interface ModuleWithLessons extends ModuleRecord {
  lessons: readonly LessonRecord[];
  objectiveIds: readonly string[];
  prerequisiteModuleIds: readonly string[];
}

export interface CourseDetail {
  course: CourseRecord;
  subjectName: string;
  subjectSlug: string;
  curricula: readonly CourseCurriculumPlacement[];
  grades: readonly CourseGradePlacement[];
  prerequisites: readonly CoursePrerequisite[];
  objectiveIds: readonly string[];
  modules: readonly ModuleWithLessons[];
}

export interface LessonEditorData {
  lesson: LessonRecord;
  module: ModuleRecord;
  course: CourseRecord;
  sections: readonly {
    section: LessonSectionRecord;
    blocks: readonly LessonBlockRecord[];
  }[];
  assets: readonly LessonAssetRecord[];
  objectiveIds: readonly string[];
  versions: readonly LessonVersionRecord[];
}

export interface LessonReaderData {
  lesson: LessonRecord;
  module: ModuleRecord;
  course: CourseRecord;
  subjectName: string;
  version: LessonVersionRecord;
  progress: LessonProgressRecord | null;
  simulationLinks?: readonly {
    simulationId: string;
    simulationTitle: string;
    instructions: string;
  }[];
}

export interface CreateCourseInput {
  id: string;
  slug: string;
  title: string;
  description: string;
  subjectId: string;
  difficulty: CourseDifficulty;
  estimatedDurationMinutes: number;
  gradeMinId: string | null;
  gradeMaxId: string | null;
  courseImage: string | null;
  isRequired: boolean;
  status: CourseStatus;
  createdByProfileId: string | null;
}

export type UpdateCourseInput = Omit<CreateCourseInput, "id" | "createdByProfileId" | "status">;

export interface CreateModuleInput {
  id: string;
  courseId: string;
  title: string;
  description: string;
  sortOrder: number;
  estimatedStudyTimeMinutes: number;
  assessmentReference: string | null;
}

export type UpdateModuleInput = Omit<CreateModuleInput, "id" | "courseId">;

export interface CreateLessonInput {
  id: string;
  moduleId: string;
  slug: string;
  title: string;
  summary: string;
  sortOrder: number;
  estimatedDurationMinutes: number;
  status: ContentStatus;
  createdByProfileId: string | null;
}

export type UpdateLessonInput = Omit<
  CreateLessonInput,
  "id" | "moduleId" | "createdByProfileId" | "status"
>;

export interface CreateSectionInput {
  id: string;
  lessonId: string;
  kind: LessonSectionKind;
  title: string;
  description: string;
  sortOrder: number;
}

export type UpdateSectionInput = Omit<CreateSectionInput, "id" | "lessonId">;

export interface CreateBlockInput {
  id: string;
  sectionId: string;
  type: LessonBlockType;
  title: string | null;
  sortOrder: number;
  payload: LessonBlockPayload;
}

export type UpdateBlockInput = Omit<CreateBlockInput, "id" | "sectionId">;

export interface CreateAssetInput {
  id: string;
  lessonId: string;
  blockId: string | null;
  kind: string;
  name: string;
  sourceUrl: string;
  mimeType: string | null;
  altText: string;
  metadata: Record<string, unknown>;
}

export type CourseCurriculumInput = CourseCurriculumPlacement;
export type CourseGradeInput = Omit<CourseGradePlacement, "createdAt">;
export type CoursePrerequisiteInput = Omit<CoursePrerequisite, "createdAt">;
export type CourseObjectiveInput = Omit<CourseObjectivePlacement, "createdAt">;
export type ModulePrerequisiteInput = Omit<ModulePrerequisite, "createdAt">;
export type ModuleObjectiveInput = Omit<ModuleObjectivePlacement, "createdAt">;
export type LessonObjectiveInput = Omit<LessonObjectivePlacement, "createdAt">;

export interface SaveProgressInput {
  profileId: string;
  lessonId: string;
  timeSpentSeconds: number;
  lastViewedBlockId: string | null;
  completionPercentage: number;
  completed: boolean;
}
