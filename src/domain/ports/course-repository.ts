import type {
  CourseCatalogEntry,
  CourseCurriculumPlacement,
  CourseDetail,
  CourseGradePlacement,
  CourseObjectivePlacement,
  CoursePrerequisite,
  CourseRecord,
  CreateAssetInput,
  CreateBlockInput,
  CreateCourseInput,
  CreateLessonInput,
  CreateModuleInput,
  CreateSectionInput,
  LessonAssetRecord,
  LessonBlockRecord,
  LessonEditorData,
  LessonObjectivePlacement,
  LessonProgressRecord,
  LessonReaderData,
  LessonRecord,
  LessonSectionRecord,
  LessonVersionRecord,
  ModuleObjectivePlacement,
  ModulePrerequisite,
  ModuleRecord,
  ModuleWithLessons,
  CourseStatus,
  UpdateBlockInput,
  UpdateCourseInput,
  UpdateLessonInput,
  UpdateModuleInput,
  UpdateSectionInput,
  SaveProgressInput,
} from "@/domain/course/types";

export interface CourseRepository {
  listCourses(options?: {
    status?: CourseStatus;
    curriculumId?: string;
    gradeId?: string;
    subjectId?: string;
    includeArchived?: boolean;
  }): Promise<readonly CourseCatalogEntry[]>;
  getCourse(id: string): Promise<CourseRecord | null>;
  getCourseDetail(id: string): Promise<CourseDetail | null>;
  createCourse(input: CreateCourseInput): Promise<CourseRecord>;
  updateCourse(id: string, input: UpdateCourseInput): Promise<CourseRecord>;
  setCourseStatus(id: string, status: CourseStatus): Promise<CourseRecord>;
  saveCourseCurriculum(input: Omit<CourseCurriculumPlacement, "createdAt">): Promise<void>;
  listCourseCurricula(courseId: string): Promise<readonly CourseCurriculumPlacement[]>;
  saveCourseGrade(input: Omit<CourseGradePlacement, "createdAt">): Promise<void>;
  listCourseGrades(courseId: string): Promise<readonly CourseGradePlacement[]>;
  saveCoursePrerequisite(input: Omit<CoursePrerequisite, "createdAt">): Promise<void>;
  listCoursePrerequisites(courseId: string): Promise<readonly CoursePrerequisite[]>;
  saveCourseObjective(input: Omit<CourseObjectivePlacement, "createdAt">): Promise<void>;
  listCourseObjectives(courseId: string): Promise<readonly CourseObjectivePlacement[]>;

  listModules(courseId: string): Promise<readonly ModuleWithLessons[]>;
  getModule(id: string): Promise<ModuleRecord | null>;
  createModule(input: CreateModuleInput): Promise<ModuleRecord>;
  updateModule(id: string, input: UpdateModuleInput): Promise<ModuleRecord>;
  setModuleArchived(id: string, isArchived: boolean): Promise<void>;
  saveModulePrerequisite(input: Omit<ModulePrerequisite, "createdAt">): Promise<void>;
  listModulePrerequisites(moduleId: string): Promise<readonly ModulePrerequisite[]>;
  saveModuleObjective(input: Omit<ModuleObjectivePlacement, "createdAt">): Promise<void>;
  listModuleObjectives(moduleId: string): Promise<readonly ModuleObjectivePlacement[]>;

  listLessons(moduleId: string): Promise<readonly LessonRecord[]>;
  getLesson(id: string): Promise<LessonRecord | null>;
  createLesson(input: CreateLessonInput): Promise<LessonRecord>;
  updateLesson(id: string, input: UpdateLessonInput): Promise<LessonRecord>;
  setLessonStatus(id: string, status: LessonRecord["status"]): Promise<LessonRecord>;
  listSections(lessonId: string): Promise<readonly LessonSectionRecord[]>;
  getSection(id: string): Promise<LessonSectionRecord | null>;
  createSection(input: CreateSectionInput): Promise<LessonSectionRecord>;
  updateSection(id: string, input: UpdateSectionInput): Promise<LessonSectionRecord>;
  deleteSection(id: string): Promise<void>;
  listBlocks(sectionId: string): Promise<readonly LessonBlockRecord[]>;
  getBlock(id: string): Promise<LessonBlockRecord | null>;
  createBlock(input: CreateBlockInput): Promise<LessonBlockRecord>;
  updateBlock(id: string, input: UpdateBlockInput): Promise<LessonBlockRecord>;
  deleteBlock(id: string): Promise<void>;
  listAssets(lessonId: string): Promise<readonly LessonAssetRecord[]>;
  saveAsset(input: CreateAssetInput): Promise<LessonAssetRecord>;
  deleteAsset(id: string): Promise<void>;
  saveLessonObjective(input: Omit<LessonObjectivePlacement, "createdAt">): Promise<void>;
  listLessonObjectives(lessonId: string): Promise<readonly LessonObjectivePlacement[]>;
  getLessonEditor(id: string): Promise<LessonEditorData | null>;
  getLessonReader(id: string, profileId?: string): Promise<LessonReaderData | null>;
  listLessonVersions(lessonId: string): Promise<readonly LessonVersionRecord[]>;
  getLessonVersion(id: string): Promise<LessonVersionRecord | null>;
  saveDraftVersion(
    lessonId: string,
    changeSummary: string,
    createdByProfileId: string | null,
  ): Promise<LessonVersionRecord>;
  publishLesson(
    lessonId: string,
    changeSummary: string,
    createdByProfileId: string | null,
  ): Promise<LessonVersionRecord>;
  restoreLessonVersion(
    lessonId: string,
    versionId: string,
    createdByProfileId: string | null,
  ): Promise<LessonVersionRecord>;
  getLessonProgress(profileId: string, lessonId: string): Promise<LessonProgressRecord | null>;
  saveLessonProgress(input: SaveProgressInput): Promise<LessonProgressRecord>;
}
