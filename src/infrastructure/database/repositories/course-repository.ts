import { randomUUID } from "node:crypto";
import { ConflictError, NotFoundError } from "@/domain/errors/application-error";
import type {
  CourseCatalogEntry,
  CourseCurriculumPlacement,
  CourseDetail,
  CourseDifficulty,
  CourseGradePlacement,
  CourseObjectivePlacement,
  CoursePrerequisite,
  CourseRecord,
  CourseStatus,
  CreateAssetInput,
  CreateBlockInput,
  CreateCourseInput,
  CreateLessonInput,
  CreateModuleInput,
  CreateSectionInput,
  LessonAssetRecord,
  LessonBlockRecord,
  LessonBlockPayload,
  LessonEditorData,
  LessonObjectivePlacement,
  LessonProgressRecord,
  LessonReaderData,
  LessonRecord,
  LessonSectionKind,
  LessonSectionRecord,
  LessonVersionRecord,
  ModuleObjectivePlacement,
  ModulePrerequisite,
  ModuleRecord,
  ModuleWithLessons,
  SaveProgressInput,
  UpdateBlockInput,
  UpdateCourseInput,
  UpdateLessonInput,
  UpdateModuleInput,
  UpdateSectionInput,
} from "@/domain/course/types";
import { getDatabase, type DatabaseHandle } from "@/infrastructure/database/client";
import type { CourseRepository } from "@/domain/ports/course-repository";

type DbDate = Date | string | null;
type DbBoolean = boolean | number | string;

interface CourseDbRow {
  id: string;
  slug: string;
  title: string;
  description: string;
  subject_id: string;
  difficulty: string;
  estimated_duration_minutes: number;
  grade_min_id: string | null;
  grade_max_id: string | null;
  course_image: string | null;
  is_required: DbBoolean;
  status: string;
  created_by_profile_id: string | null;
  created_at: DbDate;
  updated_at: DbDate;
  subject_name?: string;
  subject_slug?: string;
  module_count?: number | string;
  lesson_count?: number | string;
}

interface PlacementDbRow {
  course_id: string;
  curriculum_id?: string;
  grade_id?: string;
  objective_id?: string;
  prerequisite_course_id?: string;
  is_required?: DbBoolean;
  sort_order?: number;
  created_at: DbDate;
}

interface ModuleDbRow {
  id: string;
  course_id: string;
  title: string;
  description: string;
  sort_order: number;
  estimated_study_time_minutes: number;
  assessment_reference: string | null;
  is_archived: DbBoolean;
  created_at: DbDate;
  updated_at: DbDate;
}

interface LessonDbRow {
  id: string;
  module_id: string;
  slug: string;
  title: string;
  summary: string;
  sort_order: number;
  estimated_duration_minutes: number;
  status: string;
  current_version_number: number;
  published_version_id: string | null;
  created_by_profile_id: string | null;
  created_at: DbDate;
  updated_at: DbDate;
}

interface SectionDbRow {
  id: string;
  lesson_id: string;
  kind: string;
  title: string;
  description: string;
  sort_order: number;
  created_at: DbDate;
  updated_at: DbDate;
}

interface BlockDbRow {
  id: string;
  section_id: string;
  type: string;
  title: string | null;
  sort_order: number;
  payload: string;
  created_at: DbDate;
  updated_at: DbDate;
}

interface AssetDbRow {
  id: string;
  lesson_id: string;
  block_id: string | null;
  kind: string;
  name: string;
  source_url: string;
  mime_type: string | null;
  alt_text: string;
  metadata: string;
  created_at: DbDate;
  updated_at: DbDate;
}

interface VersionDbRow {
  id: string;
  lesson_id: string;
  version_number: number;
  status: string;
  change_summary: string;
  snapshot: string;
  created_by_profile_id: string | null;
  created_at: DbDate;
  published_at: DbDate;
}

interface ProgressDbRow {
  profile_id: string;
  lesson_id: string;
  started_at: DbDate;
  completed_at: DbDate;
  time_spent_seconds: number;
  last_viewed_block_id: string | null;
  completion_percentage: number;
  revisit_count: number;
  last_viewed_at: DbDate;
  updated_at: DbDate;
}

const courseSelect = `
  SELECT c.id, c.slug, c.title, c.description, c.subject_id, c.difficulty,
         c.estimated_duration_minutes, c.grade_min_id, c.grade_max_id, c.course_image,
         c.is_required, c.status, c.created_by_profile_id, c.created_at, c.updated_at,
         s.name AS subject_name, s.slug AS subject_slug,
         (SELECT COUNT(*) FROM modules m WHERE m.course_id = c.id AND m.is_archived = FALSE) AS module_count,
         (SELECT COUNT(*) FROM lessons l JOIN modules lm ON lm.id = l.module_id
          WHERE lm.course_id = c.id AND lm.is_archived = FALSE AND l.status <> 'archived') AS lesson_count
  FROM courses c
  JOIN subjects s ON s.id = c.subject_id
`;

const courseBaseSelect = `
  SELECT id, slug, title, description, subject_id, difficulty, estimated_duration_minutes,
         grade_min_id, grade_max_id, course_image, is_required, status, created_by_profile_id,
         created_at, updated_at
  FROM courses
`;

const moduleSelect = `
  SELECT id, course_id, title, description, sort_order, estimated_study_time_minutes,
         assessment_reference, is_archived, created_at, updated_at
  FROM modules
`;

const lessonSelect = `
  SELECT id, module_id, slug, title, summary, sort_order, estimated_duration_minutes, status,
         current_version_number, published_version_id, created_by_profile_id, created_at, updated_at
  FROM lessons
`;

const sectionSelect = `
  SELECT id, lesson_id, kind, title, description, sort_order, created_at, updated_at
  FROM lesson_sections
`;

const blockSelect = `
  SELECT id, section_id, type, title, sort_order, payload, created_at, updated_at
  FROM lesson_blocks
`;

const assetSelect = `
  SELECT id, lesson_id, block_id, kind, name, source_url, mime_type, alt_text, metadata,
         created_at, updated_at
  FROM lesson_assets
`;

const versionSelect = `
  SELECT id, lesson_id, version_number, status, change_summary, snapshot,
         created_by_profile_id, created_at, published_at
  FROM lesson_versions
`;

const progressSelect = `
  SELECT profile_id, lesson_id, started_at, completed_at, time_spent_seconds,
         last_viewed_block_id, completion_percentage, revisit_count, last_viewed_at, updated_at
  FROM user_lesson_progress
`;

function asIso(value: DbDate): string {
  if (value instanceof Date) return value.toISOString();
  return value ?? new Date(0).toISOString();
}

function asNullableIso(value: DbDate): string | null {
  return value ? asIso(value) : null;
}

function asBoolean(value: DbBoolean | null | undefined): boolean {
  return value === true || value === 1 || value === "1" || value === "true";
}

function asNumber(value: number | string | null | undefined): number {
  return typeof value === "number" ? value : Number(value ?? 0);
}

function asJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function asDifficulty(value: string): CourseDifficulty {
  return value === "gentle" || value === "challenging" ? value : "balanced";
}

function asCourseStatus(value: string): CourseStatus {
  return value === "published" || value === "archived" ? value : "draft";
}

function asSectionKind(value: string): LessonSectionKind {
  return value as LessonSectionKind;
}

function asContentStatus(value: string): "draft" | "published" | "archived" {
  return value === "published" || value === "archived" ? value : "draft";
}

function mapCourse(row: CourseDbRow): CourseRecord {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    subjectId: row.subject_id,
    difficulty: asDifficulty(row.difficulty),
    estimatedDurationMinutes: row.estimated_duration_minutes,
    gradeMinId: row.grade_min_id,
    gradeMaxId: row.grade_max_id,
    courseImage: row.course_image,
    isRequired: asBoolean(row.is_required),
    status: asCourseStatus(row.status),
    createdByProfileId: row.created_by_profile_id,
    createdAt: asIso(row.created_at),
    updatedAt: asIso(row.updated_at),
  };
}

function mapModule(row: ModuleDbRow): ModuleRecord {
  return {
    id: row.id,
    courseId: row.course_id,
    title: row.title,
    description: row.description,
    sortOrder: row.sort_order,
    estimatedStudyTimeMinutes: row.estimated_study_time_minutes,
    assessmentReference: row.assessment_reference,
    isArchived: asBoolean(row.is_archived),
    createdAt: asIso(row.created_at),
    updatedAt: asIso(row.updated_at),
  };
}

function mapLesson(row: LessonDbRow): LessonRecord {
  return {
    id: row.id,
    moduleId: row.module_id,
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    sortOrder: row.sort_order,
    estimatedDurationMinutes: row.estimated_duration_minutes,
    status: asContentStatus(row.status),
    currentVersionNumber: row.current_version_number,
    publishedVersionId: row.published_version_id,
    createdByProfileId: row.created_by_profile_id,
    createdAt: asIso(row.created_at),
    updatedAt: asIso(row.updated_at),
  };
}

function mapSection(row: SectionDbRow): LessonSectionRecord {
  return {
    id: row.id,
    lessonId: row.lesson_id,
    kind: asSectionKind(row.kind),
    title: row.title,
    description: row.description,
    sortOrder: row.sort_order,
    createdAt: asIso(row.created_at),
    updatedAt: asIso(row.updated_at),
  };
}

function mapBlock(row: BlockDbRow): LessonBlockRecord {
  return {
    id: row.id,
    sectionId: row.section_id,
    type: row.type as LessonBlockRecord["type"],
    title: row.title,
    sortOrder: row.sort_order,
    payload: asJson<LessonBlockPayload>(row.payload, {}),
    createdAt: asIso(row.created_at),
    updatedAt: asIso(row.updated_at),
  };
}

function mapAsset(row: AssetDbRow): LessonAssetRecord {
  return {
    id: row.id,
    lessonId: row.lesson_id,
    blockId: row.block_id,
    kind: row.kind,
    name: row.name,
    sourceUrl: row.source_url,
    mimeType: row.mime_type,
    altText: row.alt_text,
    metadata: asJson<Record<string, unknown>>(row.metadata, {}),
    createdAt: asIso(row.created_at),
    updatedAt: asIso(row.updated_at),
  };
}

function mapVersion(row: VersionDbRow): LessonVersionRecord {
  return {
    id: row.id,
    lessonId: row.lesson_id,
    versionNumber: row.version_number,
    status: asContentStatus(row.status),
    changeSummary: row.change_summary,
    snapshot: asJson(row.snapshot, {
      lesson: {
        id: row.lesson_id,
        slug: "",
        title: "",
        summary: "",
        estimatedDurationMinutes: 0,
      },
      sections: [],
      assets: [],
      objectiveIds: [],
    }),
    createdByProfileId: row.created_by_profile_id,
    createdAt: asIso(row.created_at),
    publishedAt: asNullableIso(row.published_at),
  };
}

function mapProgress(row: ProgressDbRow): LessonProgressRecord {
  return {
    profileId: row.profile_id,
    lessonId: row.lesson_id,
    startedAt: asNullableIso(row.started_at),
    completedAt: asNullableIso(row.completed_at),
    timeSpentSeconds: row.time_spent_seconds,
    lastViewedBlockId: row.last_viewed_block_id,
    completionPercentage: row.completion_percentage,
    revisitCount: row.revisit_count,
    lastViewedAt: asNullableIso(row.last_viewed_at),
    updatedAt: asIso(row.updated_at),
  };
}

function json(value: unknown): string {
  return JSON.stringify(value ?? {});
}

function sqliteBoolean(value: boolean): number {
  return value ? 1 : 0;
}

function asConflict(error: unknown): never {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes("UNIQUE constraint failed") || message.includes("duplicate key")) {
    throw new ConflictError("That course or content record already exists. Use a unique slug.");
  }
  throw error;
}

export class SqlCourseRepository implements CourseRepository {
  constructor(private readonly database: DatabaseHandle = getDatabase()) {}

  private async postgresRows<T>(query: string, values: readonly unknown[] = []): Promise<T[]> {
    if (this.database.provider !== "postgres") return [];
    return (await this.database.raw.unsafe(query, values as never[])) as T[];
  }

  private sqliteRows<T>(query: string, values: readonly unknown[] = []): T[] {
    if (this.database.provider !== "sqlite") return [];
    return this.database.raw.prepare(query).all(...values) as T[];
  }

  private async one<T>(query: string, values: readonly unknown[] = []): Promise<T | undefined> {
    if (this.database.provider === "sqlite") {
      return this.database.raw.prepare(query).get(...values) as T | undefined;
    }
    const rows = await this.postgresRows<T>(query, values);
    return rows[0];
  }

  async listCourses(
    options: {
      status?: CourseStatus;
      curriculumId?: string;
      gradeId?: string;
      subjectId?: string;
      includeArchived?: boolean;
    } = {},
  ): Promise<readonly CourseCatalogEntry[]> {
    const where = options.includeArchived ? "" : "WHERE c.status <> 'archived'";
    const rows =
      this.database.provider === "sqlite"
        ? this.sqliteRows<CourseDbRow>(`${courseSelect} ${where} ORDER BY c.title COLLATE NOCASE`)
        : await this.postgresRows<CourseDbRow>(`${courseSelect} ${where} ORDER BY c.title`);
    const entries = await Promise.all(
      rows.map(async (row) => {
        const course = mapCourse(row);
        const [curricula, grades] = await Promise.all([
          this.listCourseCurricula(course.id),
          this.listCourseGrades(course.id),
        ]);
        return {
          ...course,
          subjectName: row.subject_name ?? "",
          subjectSlug: row.subject_slug ?? "",
          moduleCount: asNumber(row.module_count),
          lessonCount: asNumber(row.lesson_count),
          curriculumIds: curricula.map((item) => item.curriculumId),
          gradeIds: grades.map((item) => item.gradeId),
        } satisfies CourseCatalogEntry;
      }),
    );
    return entries.filter((entry) => {
      if (options.status && entry.status !== options.status) return false;
      if (options.subjectId && entry.subjectId !== options.subjectId) return false;
      if (options.curriculumId && !entry.curriculumIds.includes(options.curriculumId)) return false;
      if (options.gradeId && !entry.gradeIds.includes(options.gradeId)) return false;
      return true;
    });
  }

  async getCourse(id: string): Promise<CourseRecord | null> {
    const row = await this.one<CourseDbRow>(
      this.database.provider === "sqlite"
        ? `${courseBaseSelect} WHERE id = ?`
        : `${courseBaseSelect} WHERE id = $1`,
      [id],
    );
    return row ? mapCourse(row) : null;
  }

  async getCourseDetail(id: string): Promise<CourseDetail | null> {
    const course = await this.getCourse(id);
    if (!course || course.status !== "published") return null;
    const subject = await this.one<{ name: string; slug: string }>(
      this.database.provider === "sqlite"
        ? "SELECT name, slug FROM subjects WHERE id = ?"
        : "SELECT name, slug FROM subjects WHERE id = $1",
      [course.subjectId],
    );
    const [curricula, grades, prerequisites, objectives, modules] = await Promise.all([
      this.listCourseCurricula(id),
      this.listCourseGrades(id),
      this.listCoursePrerequisites(id),
      this.listCourseObjectives(id),
      this.listModules(id),
    ]);
    return {
      course,
      subjectName: subject?.name ?? "",
      subjectSlug: subject?.slug ?? "",
      curricula,
      grades,
      prerequisites,
      objectiveIds: objectives.map((item) => item.objectiveId),
      modules,
    };
  }

  async createCourse(input: CreateCourseInput): Promise<CourseRecord> {
    try {
      if (this.database.provider === "sqlite") {
        this.database.raw
          .prepare(
            `INSERT INTO courses (id, slug, title, description, subject_id, difficulty, estimated_duration_minutes, grade_min_id, grade_max_id, course_image, is_required, status, created_by_profile_id)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          )
          .run(
            input.id,
            input.slug,
            input.title,
            input.description,
            input.subjectId,
            input.difficulty,
            input.estimatedDurationMinutes,
            input.gradeMinId,
            input.gradeMaxId,
            input.courseImage,
            sqliteBoolean(input.isRequired),
            input.status,
            input.createdByProfileId,
          );
      } else {
        await this.database.raw`
          INSERT INTO courses (id, slug, title, description, subject_id, difficulty, estimated_duration_minutes, grade_min_id, grade_max_id, course_image, is_required, status, created_by_profile_id)
          VALUES (${input.id}, ${input.slug}, ${input.title}, ${input.description}, ${input.subjectId}, ${input.difficulty}, ${input.estimatedDurationMinutes}, ${input.gradeMinId}, ${input.gradeMaxId}, ${input.courseImage}, ${input.isRequired}, ${input.status}, ${input.createdByProfileId})
        `;
      }
    } catch (error) {
      asConflict(error);
    }
    const course = await this.getCourse(input.id);
    if (!course) throw new NotFoundError("Course", input.id);
    return course;
  }

  async updateCourse(id: string, input: UpdateCourseInput): Promise<CourseRecord> {
    try {
      if (this.database.provider === "sqlite") {
        const result = this.database.raw
          .prepare(
            `UPDATE courses SET slug = ?, title = ?, description = ?, subject_id = ?, difficulty = ?, estimated_duration_minutes = ?, grade_min_id = ?, grade_max_id = ?, course_image = ?, is_required = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
          )
          .run(
            input.slug,
            input.title,
            input.description,
            input.subjectId,
            input.difficulty,
            input.estimatedDurationMinutes,
            input.gradeMinId,
            input.gradeMaxId,
            input.courseImage,
            sqliteBoolean(input.isRequired),
            id,
          );
        if (result.changes === 0) throw new NotFoundError("Course", id);
      } else {
        const rows = await this.postgresRows<{ id: string }>(
          `UPDATE courses SET slug = $1, title = $2, description = $3, subject_id = $4, difficulty = $5, estimated_duration_minutes = $6, grade_min_id = $7, grade_max_id = $8, course_image = $9, is_required = $10, updated_at = NOW() WHERE id = $11 RETURNING id`,
          [
            input.slug,
            input.title,
            input.description,
            input.subjectId,
            input.difficulty,
            input.estimatedDurationMinutes,
            input.gradeMinId,
            input.gradeMaxId,
            input.courseImage,
            input.isRequired,
            id,
          ],
        );
        if (!rows[0]) throw new NotFoundError("Course", id);
      }
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      asConflict(error);
    }
    return (
      (await this.getCourse(id)) ??
      ((): never => {
        throw new NotFoundError("Course", id);
      })()
    );
  }

  async setCourseStatus(id: string, status: CourseStatus): Promise<CourseRecord> {
    if (this.database.provider === "sqlite") {
      const result = this.database.raw
        .prepare("UPDATE courses SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
        .run(status, id);
      if (result.changes === 0) throw new NotFoundError("Course", id);
    } else {
      const rows = await this.postgresRows<{ id: string }>(
        "UPDATE courses SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING id",
        [status, id],
      );
      if (!rows[0]) throw new NotFoundError("Course", id);
    }
    return (
      (await this.getCourse(id)) ??
      ((): never => {
        throw new NotFoundError("Course", id);
      })()
    );
  }

  async saveCourseCurriculum(input: Omit<CourseCurriculumPlacement, "createdAt">): Promise<void> {
    if (this.database.provider === "sqlite") {
      this.database.raw
        .prepare("INSERT OR IGNORE INTO course_curricula (course_id, curriculum_id) VALUES (?, ?)")
        .run(input.courseId, input.curriculumId);
    } else {
      await this.database.raw`
        INSERT INTO course_curricula (course_id, curriculum_id)
        VALUES (${input.courseId}, ${input.curriculumId}) ON CONFLICT DO NOTHING
      `;
    }
  }

  async listCourseCurricula(courseId: string): Promise<readonly CourseCurriculumPlacement[]> {
    const query =
      this.database.provider === "sqlite"
        ? "SELECT course_id, curriculum_id, created_at FROM course_curricula WHERE course_id = ? ORDER BY curriculum_id"
        : "SELECT course_id, curriculum_id, created_at FROM course_curricula WHERE course_id = $1 ORDER BY curriculum_id";
    const rows =
      this.database.provider === "sqlite"
        ? this.sqliteRows<PlacementDbRow>(query, [courseId])
        : await this.postgresRows<PlacementDbRow>(query, [courseId]);
    return rows.map((row) => ({
      courseId: row.course_id,
      curriculumId: row.curriculum_id!,
      createdAt: asIso(row.created_at),
    }));
  }

  async saveCourseGrade(input: Omit<CourseGradePlacement, "createdAt">): Promise<void> {
    if (this.database.provider === "sqlite") {
      this.database.raw
        .prepare(
          `INSERT INTO course_grades (course_id, grade_id, is_required, sort_order) VALUES (?, ?, ?, ?)
           ON CONFLICT(course_id, grade_id) DO UPDATE SET is_required = excluded.is_required, sort_order = excluded.sort_order`,
        )
        .run(input.courseId, input.gradeId, sqliteBoolean(input.isRequired), input.sortOrder);
    } else {
      await this.database.raw`
        INSERT INTO course_grades (course_id, grade_id, is_required, sort_order)
        VALUES (${input.courseId}, ${input.gradeId}, ${input.isRequired}, ${input.sortOrder})
        ON CONFLICT (course_id, grade_id) DO UPDATE SET is_required = EXCLUDED.is_required, sort_order = EXCLUDED.sort_order
      `;
    }
  }

  async listCourseGrades(courseId: string): Promise<readonly CourseGradePlacement[]> {
    const query =
      this.database.provider === "sqlite"
        ? "SELECT course_id, grade_id, is_required, sort_order, created_at FROM course_grades WHERE course_id = ? ORDER BY sort_order, grade_id"
        : "SELECT course_id, grade_id, is_required, sort_order, created_at FROM course_grades WHERE course_id = $1 ORDER BY sort_order, grade_id";
    const rows =
      this.database.provider === "sqlite"
        ? this.sqliteRows<PlacementDbRow>(query, [courseId])
        : await this.postgresRows<PlacementDbRow>(query, [courseId]);
    return rows.map((row) => ({
      courseId: row.course_id,
      gradeId: row.grade_id!,
      isRequired: asBoolean(row.is_required),
      sortOrder: row.sort_order ?? 0,
      createdAt: asIso(row.created_at),
    }));
  }

  async saveCoursePrerequisite(input: Omit<CoursePrerequisite, "createdAt">): Promise<void> {
    if (input.courseId === input.prerequisiteCourseId)
      throw new ConflictError("A course cannot require itself.");
    if (this.database.provider === "sqlite") {
      this.database.raw
        .prepare(
          "INSERT OR IGNORE INTO course_prerequisites (course_id, prerequisite_course_id) VALUES (?, ?)",
        )
        .run(input.courseId, input.prerequisiteCourseId);
    } else {
      await this.database
        .raw`INSERT INTO course_prerequisites (course_id, prerequisite_course_id) VALUES (${input.courseId}, ${input.prerequisiteCourseId}) ON CONFLICT DO NOTHING`;
    }
  }

  async listCoursePrerequisites(courseId: string): Promise<readonly CoursePrerequisite[]> {
    const query =
      this.database.provider === "sqlite"
        ? "SELECT course_id, prerequisite_course_id, created_at FROM course_prerequisites WHERE course_id = ? ORDER BY prerequisite_course_id"
        : "SELECT course_id, prerequisite_course_id, created_at FROM course_prerequisites WHERE course_id = $1 ORDER BY prerequisite_course_id";
    const rows =
      this.database.provider === "sqlite"
        ? this.sqliteRows<PlacementDbRow>(query, [courseId])
        : await this.postgresRows<PlacementDbRow>(query, [courseId]);
    return rows.map((row) => ({
      courseId: row.course_id,
      prerequisiteCourseId: row.prerequisite_course_id!,
      createdAt: asIso(row.created_at),
    }));
  }

  async saveCourseObjective(input: Omit<CourseObjectivePlacement, "createdAt">): Promise<void> {
    if (this.database.provider === "sqlite") {
      this.database.raw
        .prepare(
          `INSERT INTO course_learning_objectives (course_id, objective_id, sort_order) VALUES (?, ?, ?) ON CONFLICT(course_id, objective_id) DO UPDATE SET sort_order = excluded.sort_order`,
        )
        .run(input.courseId, input.objectiveId, input.sortOrder);
    } else {
      await this.database
        .raw`INSERT INTO course_learning_objectives (course_id, objective_id, sort_order) VALUES (${input.courseId}, ${input.objectiveId}, ${input.sortOrder}) ON CONFLICT (course_id, objective_id) DO UPDATE SET sort_order = EXCLUDED.sort_order`;
    }
  }

  async listCourseObjectives(courseId: string): Promise<readonly CourseObjectivePlacement[]> {
    const query =
      this.database.provider === "sqlite"
        ? "SELECT course_id, objective_id, sort_order, created_at FROM course_learning_objectives WHERE course_id = ? ORDER BY sort_order, objective_id"
        : "SELECT course_id, objective_id, sort_order, created_at FROM course_learning_objectives WHERE course_id = $1 ORDER BY sort_order, objective_id";
    const rows =
      this.database.provider === "sqlite"
        ? this.sqliteRows<PlacementDbRow>(query, [courseId])
        : await this.postgresRows<PlacementDbRow>(query, [courseId]);
    return rows.map((row) => ({
      courseId: row.course_id,
      objectiveId: row.objective_id!,
      sortOrder: row.sort_order ?? 0,
      createdAt: asIso(row.created_at),
    }));
  }

  async listModules(courseId: string): Promise<readonly ModuleWithLessons[]> {
    const query =
      this.database.provider === "sqlite"
        ? `${moduleSelect} WHERE course_id = ? AND is_archived = 0 ORDER BY sort_order, title COLLATE NOCASE`
        : `${moduleSelect} WHERE course_id = $1 AND is_archived = FALSE ORDER BY sort_order, title`;
    const rows =
      this.database.provider === "sqlite"
        ? this.sqliteRows<ModuleDbRow>(query, [courseId])
        : await this.postgresRows<ModuleDbRow>(query, [courseId]);
    return Promise.all(
      rows.map(async (row) => {
        const courseModule = mapModule(row);
        const [lessons, prerequisites, objectives] = await Promise.all([
          this.listLessons(courseModule.id),
          this.listModulePrerequisites(courseModule.id),
          this.listModuleObjectives(courseModule.id),
        ]);
        return {
          ...courseModule,
          lessons,
          prerequisiteModuleIds: prerequisites.map((item) => item.prerequisiteModuleId),
          objectiveIds: objectives.map((item) => item.objectiveId),
        };
      }),
    );
  }

  async getModule(id: string): Promise<ModuleRecord | null> {
    const row = await this.one<ModuleDbRow>(
      this.database.provider === "sqlite"
        ? `${moduleSelect} WHERE id = ?`
        : `${moduleSelect} WHERE id = $1`,
      [id],
    );
    return row ? mapModule(row) : null;
  }

  async createModule(input: CreateModuleInput): Promise<ModuleRecord> {
    try {
      if (this.database.provider === "sqlite") {
        this.database.raw
          .prepare(
            `INSERT INTO modules (id, course_id, title, description, sort_order, estimated_study_time_minutes, assessment_reference) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          )
          .run(
            input.id,
            input.courseId,
            input.title,
            input.description,
            input.sortOrder,
            input.estimatedStudyTimeMinutes,
            input.assessmentReference,
          );
      } else {
        await this.database
          .raw`INSERT INTO modules (id, course_id, title, description, sort_order, estimated_study_time_minutes, assessment_reference) VALUES (${input.id}, ${input.courseId}, ${input.title}, ${input.description}, ${input.sortOrder}, ${input.estimatedStudyTimeMinutes}, ${input.assessmentReference})`;
      }
    } catch (error) {
      asConflict(error);
    }
    return (
      (await this.getModule(input.id)) ??
      ((): never => {
        throw new NotFoundError("Module", input.id);
      })()
    );
  }

  async updateModule(id: string, input: UpdateModuleInput): Promise<ModuleRecord> {
    if (this.database.provider === "sqlite") {
      const result = this.database.raw
        .prepare(
          `UPDATE modules SET title = ?, description = ?, sort_order = ?, estimated_study_time_minutes = ?, assessment_reference = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        )
        .run(
          input.title,
          input.description,
          input.sortOrder,
          input.estimatedStudyTimeMinutes,
          input.assessmentReference,
          id,
        );
      if (result.changes === 0) throw new NotFoundError("Module", id);
    } else {
      const rows = await this.postgresRows<{ id: string }>(
        `UPDATE modules SET title = $1, description = $2, sort_order = $3, estimated_study_time_minutes = $4, assessment_reference = $5, updated_at = NOW() WHERE id = $6 RETURNING id`,
        [
          input.title,
          input.description,
          input.sortOrder,
          input.estimatedStudyTimeMinutes,
          input.assessmentReference,
          id,
        ],
      );
      if (!rows[0]) throw new NotFoundError("Module", id);
    }
    return (
      (await this.getModule(id)) ??
      ((): never => {
        throw new NotFoundError("Module", id);
      })()
    );
  }

  async setModuleArchived(id: string, isArchived: boolean): Promise<void> {
    if (this.database.provider === "sqlite") {
      const result = this.database.raw
        .prepare("UPDATE modules SET is_archived = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
        .run(sqliteBoolean(isArchived), id);
      if (result.changes === 0) throw new NotFoundError("Module", id);
    } else {
      const rows = await this.postgresRows<{ id: string }>(
        "UPDATE modules SET is_archived = $1, updated_at = NOW() WHERE id = $2 RETURNING id",
        [isArchived, id],
      );
      if (!rows[0]) throw new NotFoundError("Module", id);
    }
  }

  async saveModulePrerequisite(input: Omit<ModulePrerequisite, "createdAt">): Promise<void> {
    if (input.moduleId === input.prerequisiteModuleId)
      throw new ConflictError("A module cannot require itself.");
    if (this.database.provider === "sqlite")
      this.database.raw
        .prepare(
          "INSERT OR IGNORE INTO module_prerequisites (module_id, prerequisite_module_id) VALUES (?, ?)",
        )
        .run(input.moduleId, input.prerequisiteModuleId);
    else
      await this.database
        .raw`INSERT INTO module_prerequisites (module_id, prerequisite_module_id) VALUES (${input.moduleId}, ${input.prerequisiteModuleId}) ON CONFLICT DO NOTHING`;
  }

  async listModulePrerequisites(moduleId: string): Promise<readonly ModulePrerequisite[]> {
    const query =
      this.database.provider === "sqlite"
        ? "SELECT module_id, prerequisite_module_id, created_at FROM module_prerequisites WHERE module_id = ? ORDER BY prerequisite_module_id"
        : "SELECT module_id, prerequisite_module_id, created_at FROM module_prerequisites WHERE module_id = $1 ORDER BY prerequisite_module_id";
    const rows =
      this.database.provider === "sqlite"
        ? this.sqliteRows<{
            module_id: string;
            prerequisite_module_id: string;
            created_at: DbDate;
          }>(query, [moduleId])
        : await this.postgresRows<{
            module_id: string;
            prerequisite_module_id: string;
            created_at: DbDate;
          }>(query, [moduleId]);
    return rows.map((row) => ({
      moduleId: row.module_id,
      prerequisiteModuleId: row.prerequisite_module_id,
      createdAt: asIso(row.created_at),
    }));
  }

  async saveModuleObjective(input: Omit<ModuleObjectivePlacement, "createdAt">): Promise<void> {
    if (this.database.provider === "sqlite")
      this.database.raw
        .prepare(
          "INSERT INTO module_learning_objectives (module_id, objective_id, sort_order) VALUES (?, ?, ?) ON CONFLICT(module_id, objective_id) DO UPDATE SET sort_order = excluded.sort_order",
        )
        .run(input.moduleId, input.objectiveId, input.sortOrder);
    else
      await this.database
        .raw`INSERT INTO module_learning_objectives (module_id, objective_id, sort_order) VALUES (${input.moduleId}, ${input.objectiveId}, ${input.sortOrder}) ON CONFLICT (module_id, objective_id) DO UPDATE SET sort_order = EXCLUDED.sort_order`;
  }

  async listModuleObjectives(moduleId: string): Promise<readonly ModuleObjectivePlacement[]> {
    const query =
      this.database.provider === "sqlite"
        ? "SELECT module_id, objective_id, sort_order, created_at FROM module_learning_objectives WHERE module_id = ? ORDER BY sort_order, objective_id"
        : "SELECT module_id, objective_id, sort_order, created_at FROM module_learning_objectives WHERE module_id = $1 ORDER BY sort_order, objective_id";
    const rows =
      this.database.provider === "sqlite"
        ? this.sqliteRows<{
            module_id: string;
            objective_id: string;
            sort_order: number;
            created_at: DbDate;
          }>(query, [moduleId])
        : await this.postgresRows<{
            module_id: string;
            objective_id: string;
            sort_order: number;
            created_at: DbDate;
          }>(query, [moduleId]);
    return rows.map((row) => ({
      moduleId: row.module_id,
      objectiveId: row.objective_id,
      sortOrder: row.sort_order,
      createdAt: asIso(row.created_at),
    }));
  }

  async listLessons(moduleId: string): Promise<readonly LessonRecord[]> {
    const query =
      this.database.provider === "sqlite"
        ? `${lessonSelect} WHERE module_id = ? AND status <> 'archived' ORDER BY sort_order, title COLLATE NOCASE`
        : `${lessonSelect} WHERE module_id = $1 AND status <> 'archived' ORDER BY sort_order, title`;
    const rows =
      this.database.provider === "sqlite"
        ? this.sqliteRows<LessonDbRow>(query, [moduleId])
        : await this.postgresRows<LessonDbRow>(query, [moduleId]);
    return rows.map(mapLesson);
  }

  async getLesson(id: string): Promise<LessonRecord | null> {
    const row = await this.one<LessonDbRow>(
      this.database.provider === "sqlite"
        ? `${lessonSelect} WHERE id = ?`
        : `${lessonSelect} WHERE id = $1`,
      [id],
    );
    return row ? mapLesson(row) : null;
  }

  async createLesson(input: CreateLessonInput): Promise<LessonRecord> {
    try {
      if (this.database.provider === "sqlite")
        this.database.raw
          .prepare(
            `INSERT INTO lessons (id, module_id, slug, title, summary, sort_order, estimated_duration_minutes, status, current_version_number, created_by_profile_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
          )
          .run(
            input.id,
            input.moduleId,
            input.slug,
            input.title,
            input.summary,
            input.sortOrder,
            input.estimatedDurationMinutes,
            input.status,
            input.createdByProfileId,
          );
      else
        await this.database
          .raw`INSERT INTO lessons (id, module_id, slug, title, summary, sort_order, estimated_duration_minutes, status, current_version_number, created_by_profile_id) VALUES (${input.id}, ${input.moduleId}, ${input.slug}, ${input.title}, ${input.summary}, ${input.sortOrder}, ${input.estimatedDurationMinutes}, ${input.status}, 1, ${input.createdByProfileId})`;
    } catch (error) {
      asConflict(error);
    }
    const lesson = await this.getLesson(input.id);
    if (!lesson) throw new NotFoundError("Lesson", input.id);
    await this.saveDraftVersion(input.id, "Initial draft", input.createdByProfileId);
    return lesson;
  }

  async updateLesson(id: string, input: UpdateLessonInput): Promise<LessonRecord> {
    try {
      if (this.database.provider === "sqlite") {
        const result = this.database.raw
          .prepare(
            `UPDATE lessons SET slug = ?, title = ?, summary = ?, sort_order = ?, estimated_duration_minutes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
          )
          .run(
            input.slug,
            input.title,
            input.summary,
            input.sortOrder,
            input.estimatedDurationMinutes,
            id,
          );
        if (result.changes === 0) throw new NotFoundError("Lesson", id);
      } else {
        const rows = await this.postgresRows<{ id: string }>(
          `UPDATE lessons SET slug = $1, title = $2, summary = $3, sort_order = $4, estimated_duration_minutes = $5, updated_at = NOW() WHERE id = $6 RETURNING id`,
          [
            input.slug,
            input.title,
            input.summary,
            input.sortOrder,
            input.estimatedDurationMinutes,
            id,
          ],
        );
        if (!rows[0]) throw new NotFoundError("Lesson", id);
      }
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      asConflict(error);
    }
    return (
      (await this.getLesson(id)) ??
      ((): never => {
        throw new NotFoundError("Lesson", id);
      })()
    );
  }

  async setLessonStatus(id: string, status: LessonRecord["status"]): Promise<LessonRecord> {
    if (this.database.provider === "sqlite") {
      const result = this.database.raw
        .prepare("UPDATE lessons SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
        .run(status, id);
      if (result.changes === 0) throw new NotFoundError("Lesson", id);
    } else {
      const rows = await this.postgresRows<{ id: string }>(
        "UPDATE lessons SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING id",
        [status, id],
      );
      if (!rows[0]) throw new NotFoundError("Lesson", id);
    }
    return (
      (await this.getLesson(id)) ??
      ((): never => {
        throw new NotFoundError("Lesson", id);
      })()
    );
  }

  async listSections(lessonId: string): Promise<readonly LessonSectionRecord[]> {
    const query =
      this.database.provider === "sqlite"
        ? `${sectionSelect} WHERE lesson_id = ? ORDER BY sort_order, title COLLATE NOCASE`
        : `${sectionSelect} WHERE lesson_id = $1 ORDER BY sort_order, title`;
    const rows =
      this.database.provider === "sqlite"
        ? this.sqliteRows<SectionDbRow>(query, [lessonId])
        : await this.postgresRows<SectionDbRow>(query, [lessonId]);
    return rows.map(mapSection);
  }

  async getSection(id: string): Promise<LessonSectionRecord | null> {
    const row = await this.one<SectionDbRow>(
      this.database.provider === "sqlite"
        ? `${sectionSelect} WHERE id = ?`
        : `${sectionSelect} WHERE id = $1`,
      [id],
    );
    return row ? mapSection(row) : null;
  }

  async createSection(input: CreateSectionInput): Promise<LessonSectionRecord> {
    if (this.database.provider === "sqlite")
      this.database.raw
        .prepare(
          `INSERT INTO lesson_sections (id, lesson_id, kind, title, description, sort_order) VALUES (?, ?, ?, ?, ?, ?)`,
        )
        .run(input.id, input.lessonId, input.kind, input.title, input.description, input.sortOrder);
    else
      await this.database
        .raw`INSERT INTO lesson_sections (id, lesson_id, kind, title, description, sort_order) VALUES (${input.id}, ${input.lessonId}, ${input.kind}, ${input.title}, ${input.description}, ${input.sortOrder})`;
    return (
      (await this.getSection(input.id)) ??
      ((): never => {
        throw new NotFoundError("Lesson section", input.id);
      })()
    );
  }

  async updateSection(id: string, input: UpdateSectionInput): Promise<LessonSectionRecord> {
    if (this.database.provider === "sqlite") {
      const result = this.database.raw
        .prepare(
          `UPDATE lesson_sections SET kind = ?, title = ?, description = ?, sort_order = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        )
        .run(input.kind, input.title, input.description, input.sortOrder, id);
      if (result.changes === 0) throw new NotFoundError("Lesson section", id);
    } else {
      const rows = await this.postgresRows<{ id: string }>(
        `UPDATE lesson_sections SET kind = $1, title = $2, description = $3, sort_order = $4, updated_at = NOW() WHERE id = $5 RETURNING id`,
        [input.kind, input.title, input.description, input.sortOrder, id],
      );
      if (!rows[0]) throw new NotFoundError("Lesson section", id);
    }
    return (
      (await this.getSection(id)) ??
      ((): never => {
        throw new NotFoundError("Lesson section", id);
      })()
    );
  }

  async deleteSection(id: string): Promise<void> {
    if (this.database.provider === "sqlite") {
      const result = this.database.raw.prepare("DELETE FROM lesson_sections WHERE id = ?").run(id);
      if (result.changes === 0) throw new NotFoundError("Lesson section", id);
    } else {
      const rows = await this.postgresRows<{ id: string }>(
        "DELETE FROM lesson_sections WHERE id = $1 RETURNING id",
        [id],
      );
      if (!rows[0]) throw new NotFoundError("Lesson section", id);
    }
  }

  async listBlocks(sectionId: string): Promise<readonly LessonBlockRecord[]> {
    const query =
      this.database.provider === "sqlite"
        ? `${blockSelect} WHERE section_id = ? ORDER BY sort_order, id`
        : `${blockSelect} WHERE section_id = $1 ORDER BY sort_order, id`;
    const rows =
      this.database.provider === "sqlite"
        ? this.sqliteRows<BlockDbRow>(query, [sectionId])
        : await this.postgresRows<BlockDbRow>(query, [sectionId]);
    return rows.map(mapBlock);
  }

  async getBlock(id: string): Promise<LessonBlockRecord | null> {
    const row = await this.one<BlockDbRow>(
      this.database.provider === "sqlite"
        ? `${blockSelect} WHERE id = ?`
        : `${blockSelect} WHERE id = $1`,
      [id],
    );
    return row ? mapBlock(row) : null;
  }

  async createBlock(input: CreateBlockInput): Promise<LessonBlockRecord> {
    if (this.database.provider === "sqlite")
      this.database.raw
        .prepare(
          `INSERT INTO lesson_blocks (id, section_id, type, title, sort_order, payload) VALUES (?, ?, ?, ?, ?, ?)`,
        )
        .run(
          input.id,
          input.sectionId,
          input.type,
          input.title,
          input.sortOrder,
          json(input.payload),
        );
    else
      await this.database
        .raw`INSERT INTO lesson_blocks (id, section_id, type, title, sort_order, payload) VALUES (${input.id}, ${input.sectionId}, ${input.type}, ${input.title}, ${input.sortOrder}, ${json(input.payload)})`;
    return (
      (await this.getBlock(input.id)) ??
      ((): never => {
        throw new NotFoundError("Lesson block", input.id);
      })()
    );
  }

  async updateBlock(id: string, input: UpdateBlockInput): Promise<LessonBlockRecord> {
    if (this.database.provider === "sqlite") {
      const result = this.database.raw
        .prepare(
          `UPDATE lesson_blocks SET type = ?, title = ?, sort_order = ?, payload = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        )
        .run(input.type, input.title, input.sortOrder, json(input.payload), id);
      if (result.changes === 0) throw new NotFoundError("Lesson block", id);
    } else {
      const rows = await this.postgresRows<{ id: string }>(
        `UPDATE lesson_blocks SET type = $1, title = $2, sort_order = $3, payload = $4, updated_at = NOW() WHERE id = $5 RETURNING id`,
        [input.type, input.title, input.sortOrder, json(input.payload), id],
      );
      if (!rows[0]) throw new NotFoundError("Lesson block", id);
    }
    return (
      (await this.getBlock(id)) ??
      ((): never => {
        throw new NotFoundError("Lesson block", id);
      })()
    );
  }

  async deleteBlock(id: string): Promise<void> {
    if (this.database.provider === "sqlite") {
      const result = this.database.raw.prepare("DELETE FROM lesson_blocks WHERE id = ?").run(id);
      if (result.changes === 0) throw new NotFoundError("Lesson block", id);
    } else {
      const rows = await this.postgresRows<{ id: string }>(
        "DELETE FROM lesson_blocks WHERE id = $1 RETURNING id",
        [id],
      );
      if (!rows[0]) throw new NotFoundError("Lesson block", id);
    }
  }

  async listAssets(lessonId: string): Promise<readonly LessonAssetRecord[]> {
    const query =
      this.database.provider === "sqlite"
        ? `${assetSelect} WHERE lesson_id = ? ORDER BY name`
        : `${assetSelect} WHERE lesson_id = $1 ORDER BY name`;
    const rows =
      this.database.provider === "sqlite"
        ? this.sqliteRows<AssetDbRow>(query, [lessonId])
        : await this.postgresRows<AssetDbRow>(query, [lessonId]);
    return rows.map(mapAsset);
  }

  async saveAsset(input: CreateAssetInput): Promise<LessonAssetRecord> {
    if (this.database.provider === "sqlite")
      this.database.raw
        .prepare(
          `INSERT INTO lesson_assets (id, lesson_id, block_id, kind, name, source_url, mime_type, alt_text, metadata) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET block_id = excluded.block_id, kind = excluded.kind, name = excluded.name, source_url = excluded.source_url, mime_type = excluded.mime_type, alt_text = excluded.alt_text, metadata = excluded.metadata, updated_at = CURRENT_TIMESTAMP`,
        )
        .run(
          input.id,
          input.lessonId,
          input.blockId,
          input.kind,
          input.name,
          input.sourceUrl,
          input.mimeType,
          input.altText,
          json(input.metadata),
        );
    else
      await this.database
        .raw`INSERT INTO lesson_assets (id, lesson_id, block_id, kind, name, source_url, mime_type, alt_text, metadata) VALUES (${input.id}, ${input.lessonId}, ${input.blockId}, ${input.kind}, ${input.name}, ${input.sourceUrl}, ${input.mimeType}, ${input.altText}, ${json(input.metadata)}) ON CONFLICT (id) DO UPDATE SET block_id = EXCLUDED.block_id, kind = EXCLUDED.kind, name = EXCLUDED.name, source_url = EXCLUDED.source_url, mime_type = EXCLUDED.mime_type, alt_text = EXCLUDED.alt_text, metadata = EXCLUDED.metadata, updated_at = NOW()`;
    const row = await this.one<AssetDbRow>(
      this.database.provider === "sqlite"
        ? `${assetSelect} WHERE id = ?`
        : `${assetSelect} WHERE id = $1`,
      [input.id],
    );
    return row
      ? mapAsset(row)
      : ((): never => {
          throw new NotFoundError("Lesson asset", input.id);
        })();
  }

  async deleteAsset(id: string): Promise<void> {
    if (this.database.provider === "sqlite") {
      const result = this.database.raw.prepare("DELETE FROM lesson_assets WHERE id = ?").run(id);
      if (result.changes === 0) throw new NotFoundError("Lesson asset", id);
    } else {
      const rows = await this.postgresRows<{ id: string }>(
        "DELETE FROM lesson_assets WHERE id = $1 RETURNING id",
        [id],
      );
      if (!rows[0]) throw new NotFoundError("Lesson asset", id);
    }
  }

  async saveLessonObjective(input: Omit<LessonObjectivePlacement, "createdAt">): Promise<void> {
    if (this.database.provider === "sqlite")
      this.database.raw
        .prepare(
          "INSERT INTO lesson_learning_objectives (lesson_id, objective_id, sort_order) VALUES (?, ?, ?) ON CONFLICT(lesson_id, objective_id) DO UPDATE SET sort_order = excluded.sort_order",
        )
        .run(input.lessonId, input.objectiveId, input.sortOrder);
    else
      await this.database
        .raw`INSERT INTO lesson_learning_objectives (lesson_id, objective_id, sort_order) VALUES (${input.lessonId}, ${input.objectiveId}, ${input.sortOrder}) ON CONFLICT (lesson_id, objective_id) DO UPDATE SET sort_order = EXCLUDED.sort_order`;
  }

  async listLessonObjectives(lessonId: string): Promise<readonly LessonObjectivePlacement[]> {
    const query =
      this.database.provider === "sqlite"
        ? "SELECT lesson_id, objective_id, sort_order, created_at FROM lesson_learning_objectives WHERE lesson_id = ? ORDER BY sort_order, objective_id"
        : "SELECT lesson_id, objective_id, sort_order, created_at FROM lesson_learning_objectives WHERE lesson_id = $1 ORDER BY sort_order, objective_id";
    const rows =
      this.database.provider === "sqlite"
        ? this.sqliteRows<{
            lesson_id: string;
            objective_id: string;
            sort_order: number;
            created_at: DbDate;
          }>(query, [lessonId])
        : await this.postgresRows<{
            lesson_id: string;
            objective_id: string;
            sort_order: number;
            created_at: DbDate;
          }>(query, [lessonId]);
    return rows.map((row) => ({
      lessonId: row.lesson_id,
      objectiveId: row.objective_id,
      sortOrder: row.sort_order,
      createdAt: asIso(row.created_at),
    }));
  }

  async getLessonEditor(id: string): Promise<LessonEditorData | null> {
    const lesson = await this.getLesson(id);
    if (!lesson) return null;
    const courseModule = await this.getModule(lesson.moduleId);
    if (!courseModule) return null;
    const course = await this.getCourse(courseModule.courseId);
    if (!course) return null;
    const sections = await this.listSections(id);
    const [assets, objectives, versions] = await Promise.all([
      this.listAssets(id),
      this.listLessonObjectives(id),
      this.listLessonVersions(id),
    ]);
    const sectionBlocks = await Promise.all(
      sections.map(async (section) => ({ section, blocks: await this.listBlocks(section.id) })),
    );
    return {
      lesson,
      module: courseModule,
      course,
      sections: sectionBlocks,
      assets,
      objectiveIds: objectives.map((item) => item.objectiveId),
      versions,
    };
  }

  async getLessonReader(id: string, profileId?: string): Promise<LessonReaderData | null> {
    const lesson = await this.getLesson(id);
    if (!lesson || lesson.status !== "published" || !lesson.publishedVersionId) return null;
    const version = await this.getLessonVersion(lesson.publishedVersionId);
    if (!version || version.status !== "published") return null;
    const courseModule = await this.getModule(lesson.moduleId);
    if (!courseModule) return null;
    const course = await this.getCourse(courseModule.courseId);
    if (!course) return null;
    const subject = await this.one<{ name: string }>(
      this.database.provider === "sqlite"
        ? "SELECT name FROM subjects WHERE id = ?"
        : "SELECT name FROM subjects WHERE id = $1",
      [course.subjectId],
    );
    return {
      lesson,
      module: courseModule,
      course,
      subjectName: subject?.name ?? "",
      version,
      progress: profileId ? await this.getLessonProgress(profileId, id) : null,
    };
  }

  async listLessonVersions(lessonId: string): Promise<readonly LessonVersionRecord[]> {
    const query =
      this.database.provider === "sqlite"
        ? `${versionSelect} WHERE lesson_id = ? ORDER BY version_number DESC`
        : `${versionSelect} WHERE lesson_id = $1 ORDER BY version_number DESC`;
    const rows =
      this.database.provider === "sqlite"
        ? this.sqliteRows<VersionDbRow>(query, [lessonId])
        : await this.postgresRows<VersionDbRow>(query, [lessonId]);
    return rows.map(mapVersion);
  }

  async getLessonVersion(id: string): Promise<LessonVersionRecord | null> {
    const row = await this.one<VersionDbRow>(
      this.database.provider === "sqlite"
        ? `${versionSelect} WHERE id = ?`
        : `${versionSelect} WHERE id = $1`,
      [id],
    );
    return row ? mapVersion(row) : null;
  }

  private async captureSnapshot(lessonId: string): Promise<LessonVersionRecord["snapshot"]> {
    const editor = await this.getLessonEditor(lessonId);
    if (!editor) throw new NotFoundError("Lesson", lessonId);
    return {
      lesson: {
        id: editor.lesson.id,
        slug: editor.lesson.slug,
        title: editor.lesson.title,
        summary: editor.lesson.summary,
        estimatedDurationMinutes: editor.lesson.estimatedDurationMinutes,
      },
      sections: editor.sections,
      assets: editor.assets,
      objectiveIds: editor.objectiveIds,
    };
  }

  async saveDraftVersion(
    lessonId: string,
    changeSummary: string,
    createdByProfileId: string | null,
  ): Promise<LessonVersionRecord> {
    const lesson = await this.getLesson(lessonId);
    if (!lesson) throw new NotFoundError("Lesson", lessonId);
    const snapshot = await this.captureSnapshot(lessonId);
    const existing = (await this.listLessonVersions(lessonId)).find(
      (version) =>
        version.versionNumber === lesson.currentVersionNumber && version.status === "draft",
    );
    if (existing) {
      if (this.database.provider === "sqlite")
        this.database.raw
          .prepare(
            "UPDATE lesson_versions SET change_summary = ?, snapshot = ?, created_by_profile_id = ?, created_at = CURRENT_TIMESTAMP WHERE id = ?",
          )
          .run(changeSummary, json(snapshot), createdByProfileId, existing.id);
      else
        await this.database
          .raw`UPDATE lesson_versions SET change_summary = ${changeSummary}, snapshot = ${json(snapshot)}, created_by_profile_id = ${createdByProfileId}, created_at = NOW() WHERE id = ${existing.id}`;
      return (await this.getLessonVersion(existing.id))!;
    }
    const id = `lesson-version-${randomUUID()}`;
    if (this.database.provider === "sqlite")
      this.database.raw
        .prepare(
          "INSERT INTO lesson_versions (id, lesson_id, version_number, status, change_summary, snapshot, created_by_profile_id) VALUES (?, ?, ?, 'draft', ?, ?, ?)",
        )
        .run(
          id,
          lessonId,
          lesson.currentVersionNumber,
          changeSummary,
          json(snapshot),
          createdByProfileId,
        );
    else
      await this.database
        .raw`INSERT INTO lesson_versions (id, lesson_id, version_number, status, change_summary, snapshot, created_by_profile_id) VALUES (${id}, ${lessonId}, ${lesson.currentVersionNumber}, 'draft', ${changeSummary}, ${json(snapshot)}, ${createdByProfileId})`;
    return (await this.getLessonVersion(id))!;
  }

  async publishLesson(
    lessonId: string,
    changeSummary: string,
    createdByProfileId: string | null,
  ): Promise<LessonVersionRecord> {
    const lesson = await this.getLesson(lessonId);
    if (!lesson) throw new NotFoundError("Lesson", lessonId);
    const snapshot = await this.captureSnapshot(lessonId);
    const draft = await this.saveDraftVersion(lessonId, changeSummary, createdByProfileId);
    const versionId = draft.id;
    if (this.database.provider === "sqlite") {
      const raw = this.database.raw;
      const transaction = raw.transaction(() => {
        raw
          .prepare(
            "UPDATE lesson_versions SET status = 'archived' WHERE lesson_id = ? AND status = 'published'",
          )
          .run(lessonId);
        raw
          .prepare(
            "UPDATE lesson_versions SET status = 'published', snapshot = ?, published_at = CURRENT_TIMESTAMP WHERE id = ?",
          )
          .run(json(snapshot), versionId);
        raw
          .prepare(
            "UPDATE lessons SET status = 'published', published_version_id = ?, current_version_number = current_version_number + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
          )
          .run(versionId, lessonId);
        const nextId = `lesson-version-${randomUUID()}`;
        raw
          .prepare(
            "INSERT INTO lesson_versions (id, lesson_id, version_number, status, change_summary, snapshot, created_by_profile_id) VALUES (?, ?, ?, 'draft', ?, ?, ?)",
          )
          .run(
            nextId,
            lessonId,
            lesson.currentVersionNumber + 1,
            changeSummary,
            json(snapshot),
            createdByProfileId,
          );
      });
      transaction();
    } else {
      await this.database.raw.begin(async (transaction) => {
        await transaction`UPDATE lesson_versions SET status = 'archived' WHERE lesson_id = ${lessonId} AND status = 'published'`;
        await transaction`UPDATE lesson_versions SET status = 'published', snapshot = ${json(snapshot)}, published_at = NOW() WHERE id = ${versionId}`;
        await transaction`UPDATE lessons SET status = 'published', published_version_id = ${versionId}, current_version_number = current_version_number + 1, updated_at = NOW() WHERE id = ${lessonId}`;
        const nextId = `lesson-version-${randomUUID()}`;
        await transaction`INSERT INTO lesson_versions (id, lesson_id, version_number, status, change_summary, snapshot, created_by_profile_id) VALUES (${nextId}, ${lessonId}, ${lesson.currentVersionNumber + 1}, 'draft', ${changeSummary}, ${json(snapshot)}, ${createdByProfileId})`;
      });
    }
    return (await this.getLessonVersion(versionId))!;
  }

  async restoreLessonVersion(
    lessonId: string,
    versionId: string,
    createdByProfileId: string | null,
  ): Promise<LessonVersionRecord> {
    const version = await this.getLessonVersion(versionId);
    if (!version || version.lessonId !== lessonId)
      throw new NotFoundError("Lesson version", versionId);
    const lesson = await this.getLesson(lessonId);
    if (!lesson) throw new NotFoundError("Lesson", lessonId);
    const snapshot = version.snapshot;
    if (this.database.provider === "sqlite") {
      const raw = this.database.raw;
      const transaction = raw.transaction(() => {
        raw.prepare("DELETE FROM lesson_learning_objectives WHERE lesson_id = ?").run(lessonId);
        raw.prepare("DELETE FROM lesson_assets WHERE lesson_id = ?").run(lessonId);
        raw.prepare("DELETE FROM lesson_sections WHERE lesson_id = ?").run(lessonId);
        raw
          .prepare(
            "UPDATE lessons SET slug = ?, title = ?, summary = ?, estimated_duration_minutes = ?, status = 'draft', current_version_number = current_version_number + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
          )
          .run(
            snapshot.lesson.slug,
            snapshot.lesson.title,
            snapshot.lesson.summary,
            snapshot.lesson.estimatedDurationMinutes,
            lessonId,
          );
        for (const entry of snapshot.sections) {
          raw
            .prepare(
              "INSERT INTO lesson_sections (id, lesson_id, kind, title, description, sort_order) VALUES (?, ?, ?, ?, ?, ?)",
            )
            .run(
              entry.section.id,
              lessonId,
              entry.section.kind,
              entry.section.title,
              entry.section.description,
              entry.section.sortOrder,
            );
          for (const block of entry.blocks)
            raw
              .prepare(
                "INSERT INTO lesson_blocks (id, section_id, type, title, sort_order, payload) VALUES (?, ?, ?, ?, ?, ?)",
              )
              .run(
                block.id,
                entry.section.id,
                block.type,
                block.title,
                block.sortOrder,
                json(block.payload),
              );
        }
        for (const asset of snapshot.assets)
          raw
            .prepare(
              "INSERT INTO lesson_assets (id, lesson_id, block_id, kind, name, source_url, mime_type, alt_text, metadata) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
            )
            .run(
              asset.id,
              lessonId,
              asset.blockId,
              asset.kind,
              asset.name,
              asset.sourceUrl,
              asset.mimeType,
              asset.altText,
              json(asset.metadata),
            );
        for (const objectiveId of snapshot.objectiveIds)
          raw
            .prepare(
              "INSERT INTO lesson_learning_objectives (lesson_id, objective_id, sort_order) VALUES (?, ?, ?)",
            )
            .run(lessonId, objectiveId, 0);
      });
      transaction();
    } else {
      await this.database.raw.begin(async (transaction) => {
        await transaction`DELETE FROM lesson_learning_objectives WHERE lesson_id = ${lessonId}`;
        await transaction`DELETE FROM lesson_assets WHERE lesson_id = ${lessonId}`;
        await transaction`DELETE FROM lesson_sections WHERE lesson_id = ${lessonId}`;
        await transaction`UPDATE lessons SET slug = ${snapshot.lesson.slug}, title = ${snapshot.lesson.title}, summary = ${snapshot.lesson.summary}, estimated_duration_minutes = ${snapshot.lesson.estimatedDurationMinutes}, status = 'draft', current_version_number = current_version_number + 1, updated_at = NOW() WHERE id = ${lessonId}`;
        for (const entry of snapshot.sections) {
          await transaction`INSERT INTO lesson_sections (id, lesson_id, kind, title, description, sort_order) VALUES (${entry.section.id}, ${lessonId}, ${entry.section.kind}, ${entry.section.title}, ${entry.section.description}, ${entry.section.sortOrder})`;
          for (const block of entry.blocks)
            await transaction`INSERT INTO lesson_blocks (id, section_id, type, title, sort_order, payload) VALUES (${block.id}, ${entry.section.id}, ${block.type}, ${block.title}, ${block.sortOrder}, ${json(block.payload)})`;
        }
        for (const asset of snapshot.assets)
          await transaction`INSERT INTO lesson_assets (id, lesson_id, block_id, kind, name, source_url, mime_type, alt_text, metadata) VALUES (${asset.id}, ${lessonId}, ${asset.blockId}, ${asset.kind}, ${asset.name}, ${asset.sourceUrl}, ${asset.mimeType}, ${asset.altText}, ${json(asset.metadata)})`;
        for (const objectiveId of snapshot.objectiveIds)
          await transaction`INSERT INTO lesson_learning_objectives (lesson_id, objective_id, sort_order) VALUES (${lessonId}, ${objectiveId}, 0)`;
      });
    }
    return this.saveDraftVersion(
      lessonId,
      `Restored version ${version.versionNumber}`,
      createdByProfileId,
    );
  }

  async getLessonProgress(
    profileId: string,
    lessonId: string,
  ): Promise<LessonProgressRecord | null> {
    const row = await this.one<ProgressDbRow>(
      this.database.provider === "sqlite"
        ? `${progressSelect} WHERE profile_id = ? AND lesson_id = ?`
        : `${progressSelect} WHERE profile_id = $1 AND lesson_id = $2`,
      [profileId, lessonId],
    );
    return row ? mapProgress(row) : null;
  }

  async saveLessonProgress(input: SaveProgressInput): Promise<LessonProgressRecord> {
    const existing = await this.getLessonProgress(input.profileId, input.lessonId);
    const now = new Date().toISOString();
    const revisitCount =
      (existing?.revisitCount ?? 0) +
      (existing?.lastViewedBlockId && existing.lastViewedBlockId !== input.lastViewedBlockId
        ? 1
        : 0);
    const startedAt = existing?.startedAt ?? now;
    const completedAt = input.completed
      ? (existing?.completedAt ?? now)
      : (existing?.completedAt ?? null);
    if (this.database.provider === "sqlite") {
      this.database.raw
        .prepare(
          `INSERT INTO user_lesson_progress (profile_id, lesson_id, started_at, completed_at, time_spent_seconds, last_viewed_block_id, completion_percentage, revisit_count, last_viewed_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP) ON CONFLICT(profile_id, lesson_id) DO UPDATE SET completed_at = excluded.completed_at, time_spent_seconds = excluded.time_spent_seconds, last_viewed_block_id = excluded.last_viewed_block_id, completion_percentage = excluded.completion_percentage, revisit_count = excluded.revisit_count, last_viewed_at = excluded.last_viewed_at, updated_at = CURRENT_TIMESTAMP`,
        )
        .run(
          input.profileId,
          input.lessonId,
          startedAt,
          completedAt,
          input.timeSpentSeconds,
          input.lastViewedBlockId,
          input.completionPercentage,
          revisitCount,
          now,
        );
    } else {
      await this.database
        .raw`INSERT INTO user_lesson_progress (profile_id, lesson_id, started_at, completed_at, time_spent_seconds, last_viewed_block_id, completion_percentage, revisit_count, last_viewed_at, updated_at) VALUES (${input.profileId}, ${input.lessonId}, ${startedAt}, ${completedAt}, ${input.timeSpentSeconds}, ${input.lastViewedBlockId}, ${input.completionPercentage}, ${revisitCount}, ${now}, NOW()) ON CONFLICT (profile_id, lesson_id) DO UPDATE SET completed_at = EXCLUDED.completed_at, time_spent_seconds = EXCLUDED.time_spent_seconds, last_viewed_block_id = EXCLUDED.last_viewed_block_id, completion_percentage = EXCLUDED.completion_percentage, revisit_count = EXCLUDED.revisit_count, last_viewed_at = EXCLUDED.last_viewed_at, updated_at = NOW()`;
    }
    return (await this.getLessonProgress(input.profileId, input.lessonId))!;
  }
}

export function getCourseRepository(database?: DatabaseHandle): CourseRepository {
  return new SqlCourseRepository(database);
}
