import { sql } from "drizzle-orm";
import {
  index,
  integer,
  primaryKey,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const appMetadata = sqliteTable("app_metadata", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export type AppMetadata = typeof appMetadata.$inferSelect;
export type NewAppMetadata = typeof appMetadata.$inferInsert;

export const users = sqliteTable(
  "users",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    authMode: text("auth_mode").notNull().default("local-profile"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    identifierIdx: uniqueIndex("users_identifier_idx").on(table.identifier),
  }),
);

export const profiles = sqliteTable(
  "profiles",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    displayName: text("display_name").notNull(),
    avatar: text("avatar").notNull().default("orbit"),
    preferredTheme: text("preferred_theme").notNull().default("system"),
    preferredLanguage: text("preferred_language").notNull().default("en"),
    currentCurriculum: text("current_curriculum"),
    currentGrade: text("current_grade"),
    targetGrade: text("target_grade"),
    secretHash: text("secret_hash"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    userIdx: uniqueIndex("profiles_user_idx").on(table.userId),
    displayNameIdx: index("profiles_display_name_idx").on(table.displayName),
  }),
);

export const roles = sqliteTable(
  "roles",
  {
    id: text("id").primaryKey(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    description: text("description").notNull(),
    isSystem: integer("is_system", { mode: "boolean" }).notNull().default(true),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    slugIdx: uniqueIndex("roles_slug_idx").on(table.slug),
  }),
);

export const userRoles = sqliteTable(
  "user_roles",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    roleId: text("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "cascade" }),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    primaryKey: primaryKey({ columns: [table.userId, table.roleId] }),
    roleIdx: index("user_roles_role_idx").on(table.roleId),
  }),
);

export const permissions = sqliteTable(
  "permissions",
  {
    id: text("id").primaryKey(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    description: text("description").notNull(),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    slugIdx: uniqueIndex("permissions_slug_idx").on(table.slug),
  }),
);

export const rolePermissions = sqliteTable(
  "role_permissions",
  {
    roleId: text("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "cascade" }),
    permissionId: text("permission_id")
      .notNull()
      .references(() => permissions.id, { onDelete: "cascade" }),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    primaryKey: primaryKey({ columns: [table.roleId, table.permissionId] }),
    permissionIdx: index("role_permissions_permission_idx").on(table.permissionId),
  }),
);

export const userSettings = sqliteTable("user_settings", {
  profileId: text("profile_id")
    .primaryKey()
    .references(() => profiles.id, { onDelete: "cascade" }),
  theme: text("theme").notNull().default("system"),
  reducedMotion: integer("reduced_motion", { mode: "boolean" }).notNull().default(false),
  textSize: text("text_size").notNull().default("medium"),
  defaultGrade: text("default_grade"),
  defaultCurriculum: text("default_curriculum"),
  preferredSubjects: text("preferred_subjects").notNull().default("[]"),
  studySessionDuration: integer("study_session_duration").notNull().default(25),
  weekStartDay: integer("week_start_day").notNull().default(1),
  formulaRendering: text("formula_rendering").notNull().default("accessible"),
  accessibilityPreferences: text("accessibility_preferences").notNull().default("{}"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export const onboardingResponses = sqliteTable("onboarding_responses", {
  profileId: text("profile_id")
    .primaryKey()
    .references(() => profiles.id, { onDelete: "cascade" }),
  curriculum: text("curriculum"),
  currentGrade: text("current_grade"),
  targetGrade: text("target_grade"),
  subjects: text("subjects").notNull().default("[]"),
  learningGoals: text("learning_goals").notNull().default("[]"),
  weeklyStudyTimeMinutes: integer("weekly_study_time_minutes"),
  preferredStudyDays: text("preferred_study_days").notNull().default("[]"),
  difficultyPreference: text("difficulty_preference"),
  skipped: integer("skipped", { mode: "boolean" }).notNull().default(false),
  completedAt: text("completed_at"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export const curricula = sqliteTable(
  "curricula",
  {
    id: text("id").primaryKey(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    kind: text("kind").notNull().default("custom"),
    description: text("description").notNull().default(""),
    authority: text("authority"),
    isSystem: integer("is_system", { mode: "boolean" }).notNull().default(false),
    isArchived: integer("is_archived", { mode: "boolean" }).notNull().default(false),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    slugIdx: uniqueIndex("curricula_slug_idx").on(table.slug),
    archiveIdx: index("curricula_archived_idx").on(table.isArchived),
  }),
);

export const grades = sqliteTable(
  "grades",
  {
    id: text("id").primaryKey(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    shortName: text("short_name").notNull(),
    description: text("description").notNull().default(""),
    sortOrder: integer("sort_order").notNull().default(0),
    isArchived: integer("is_archived", { mode: "boolean" }).notNull().default(false),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    slugIdx: uniqueIndex("grades_slug_idx").on(table.slug),
    sortIdx: index("grades_sort_order_idx").on(table.sortOrder),
  }),
);

export const curriculumGrades = sqliteTable(
  "curriculum_grades",
  {
    curriculumId: text("curriculum_id")
      .notNull()
      .references(() => curricula.id, { onDelete: "cascade" }),
    gradeId: text("grade_id")
      .notNull()
      .references(() => grades.id, { onDelete: "cascade" }),
    sortOrder: integer("sort_order").notNull().default(0),
    isAvailable: integer("is_available", { mode: "boolean" }).notNull().default(true),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    primaryKey: primaryKey({ columns: [table.curriculumId, table.gradeId] }),
    gradeIdx: index("curriculum_grades_grade_idx").on(table.gradeId),
  }),
);

export const subjects = sqliteTable(
  "subjects",
  {
    id: text("id").primaryKey(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    icon: text("icon").notNull().default("book-open"),
    accent: text("accent").notNull().default("accent"),
    recommendedStudyHours: integer("recommended_study_hours").notNull().default(0),
    sortOrder: integer("sort_order").notNull().default(0),
    isArchived: integer("is_archived", { mode: "boolean" }).notNull().default(false),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    slugIdx: uniqueIndex("subjects_slug_idx").on(table.slug),
    sortIdx: index("subjects_sort_order_idx").on(table.sortOrder),
  }),
);

export const curriculumSubjects = sqliteTable(
  "curriculum_subjects",
  {
    curriculumId: text("curriculum_id")
      .notNull()
      .references(() => curricula.id, { onDelete: "cascade" }),
    subjectId: text("subject_id")
      .notNull()
      .references(() => subjects.id, { onDelete: "cascade" }),
    isRequired: integer("is_required", { mode: "boolean" }).notNull().default(false),
    isAvailable: integer("is_available", { mode: "boolean" }).notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    primaryKey: primaryKey({ columns: [table.curriculumId, table.subjectId] }),
    subjectIdx: index("curriculum_subjects_subject_idx").on(table.subjectId),
  }),
);

export const gradeSubjects = sqliteTable(
  "grade_subjects",
  {
    curriculumId: text("curriculum_id")
      .notNull()
      .references(() => curricula.id, { onDelete: "cascade" }),
    gradeId: text("grade_id")
      .notNull()
      .references(() => grades.id, { onDelete: "cascade" }),
    subjectId: text("subject_id")
      .notNull()
      .references(() => subjects.id, { onDelete: "cascade" }),
    isRequired: integer("is_required", { mode: "boolean" }).notNull().default(false),
    isAvailable: integer("is_available", { mode: "boolean" }).notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    primaryKey: primaryKey({ columns: [table.curriculumId, table.gradeId, table.subjectId] }),
    gradeIdx: index("grade_subjects_grade_idx").on(table.curriculumId, table.gradeId),
    subjectIdx: index("grade_subjects_subject_idx").on(table.subjectId),
  }),
);

export const domains = sqliteTable(
  "domains",
  {
    id: text("id").primaryKey(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    sortOrder: integer("sort_order").notNull().default(0),
    isArchived: integer("is_archived", { mode: "boolean" }).notNull().default(false),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    slugIdx: uniqueIndex("domains_slug_idx").on(table.slug),
    sortIdx: index("domains_sort_order_idx").on(table.sortOrder),
  }),
);

export const subjectDomains = sqliteTable(
  "subject_domains",
  {
    subjectId: text("subject_id")
      .notNull()
      .references(() => subjects.id, { onDelete: "cascade" }),
    domainId: text("domain_id")
      .notNull()
      .references(() => domains.id, { onDelete: "cascade" }),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    primaryKey: primaryKey({ columns: [table.subjectId, table.domainId] }),
    domainIdx: index("subject_domains_domain_idx").on(table.domainId),
  }),
);

export const gradeSubjectDomains = sqliteTable(
  "grade_subject_domains",
  {
    curriculumId: text("curriculum_id")
      .notNull()
      .references(() => curricula.id, { onDelete: "cascade" }),
    gradeId: text("grade_id")
      .notNull()
      .references(() => grades.id, { onDelete: "cascade" }),
    subjectId: text("subject_id")
      .notNull()
      .references(() => subjects.id, { onDelete: "cascade" }),
    domainId: text("domain_id")
      .notNull()
      .references(() => domains.id, { onDelete: "cascade" }),
    isRequired: integer("is_required", { mode: "boolean" }).notNull().default(false),
    isAvailable: integer("is_available", { mode: "boolean" }).notNull().default(true),
    depth: integer("depth").notNull().default(1),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    primaryKey: primaryKey({
      columns: [table.curriculumId, table.gradeId, table.subjectId, table.domainId],
    }),
    gradeIdx: index("grade_subject_domains_grade_idx").on(table.curriculumId, table.gradeId),
    domainIdx: index("grade_subject_domains_domain_idx").on(table.domainId),
  }),
);

export const learningObjectives = sqliteTable(
  "learning_objectives",
  {
    id: text("id").primaryKey(),
    curriculumId: text("curriculum_id")
      .notNull()
      .references(() => curricula.id, { onDelete: "cascade" }),
    subjectId: text("subject_id")
      .notNull()
      .references(() => subjects.id, { onDelete: "cascade" }),
    domainId: text("domain_id").references(() => domains.id, { onDelete: "set null" }),
    code: text("code").notNull(),
    title: text("title").notNull(),
    description: text("description").notNull(),
    difficulty: text("difficulty").notNull().default("balanced"),
    isRequired: integer("is_required", { mode: "boolean" }).notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),
    isArchived: integer("is_archived", { mode: "boolean" }).notNull().default(false),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    codeIdx: uniqueIndex("learning_objectives_curriculum_code_idx").on(
      table.curriculumId,
      table.code,
    ),
    curriculumIdx: index("learning_objectives_curriculum_idx").on(table.curriculumId),
    subjectIdx: index("learning_objectives_subject_idx").on(table.subjectId),
  }),
);

export const gradeLearningObjectives = sqliteTable(
  "grade_learning_objectives",
  {
    curriculumId: text("curriculum_id")
      .notNull()
      .references(() => curricula.id, { onDelete: "cascade" }),
    gradeId: text("grade_id")
      .notNull()
      .references(() => grades.id, { onDelete: "cascade" }),
    objectiveId: text("objective_id")
      .notNull()
      .references(() => learningObjectives.id, { onDelete: "cascade" }),
    isRequired: integer("is_required", { mode: "boolean" }).notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    primaryKey: primaryKey({ columns: [table.curriculumId, table.gradeId, table.objectiveId] }),
    gradeIdx: index("grade_learning_objectives_grade_idx").on(table.curriculumId, table.gradeId),
    objectiveIdx: index("grade_learning_objectives_objective_idx").on(table.objectiveId),
  }),
);

export const courses = sqliteTable(
  "courses",
  {
    id: text("id").primaryKey(),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    subjectId: text("subject_id")
      .notNull()
      .references(() => subjects.id, { onDelete: "restrict" }),
    difficulty: text("difficulty").notNull().default("balanced"),
    estimatedDurationMinutes: integer("estimated_duration_minutes").notNull().default(0),
    gradeMinId: text("grade_min_id").references(() => grades.id, { onDelete: "set null" }),
    gradeMaxId: text("grade_max_id").references(() => grades.id, { onDelete: "set null" }),
    courseImage: text("course_image"),
    isRequired: integer("is_required", { mode: "boolean" }).notNull().default(false),
    status: text("status").notNull().default("draft"),
    createdByProfileId: text("created_by_profile_id").references(() => profiles.id, {
      onDelete: "set null",
    }),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    slugIdx: uniqueIndex("courses_slug_idx").on(table.slug),
    subjectIdx: index("courses_subject_idx").on(table.subjectId),
    statusIdx: index("courses_status_idx").on(table.status),
  }),
);

export const courseCurricula = sqliteTable(
  "course_curricula",
  {
    courseId: text("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    curriculumId: text("curriculum_id")
      .notNull()
      .references(() => curricula.id, { onDelete: "cascade" }),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    primaryKey: primaryKey({ columns: [table.courseId, table.curriculumId] }),
    curriculumIdx: index("course_curricula_curriculum_idx").on(table.curriculumId),
  }),
);

export const courseGrades = sqliteTable(
  "course_grades",
  {
    courseId: text("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    gradeId: text("grade_id")
      .notNull()
      .references(() => grades.id, { onDelete: "cascade" }),
    isRequired: integer("is_required", { mode: "boolean" }).notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    primaryKey: primaryKey({ columns: [table.courseId, table.gradeId] }),
    gradeIdx: index("course_grades_grade_idx").on(table.gradeId),
  }),
);

export const coursePrerequisites = sqliteTable(
  "course_prerequisites",
  {
    courseId: text("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    prerequisiteCourseId: text("prerequisite_course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    primaryKey: primaryKey({ columns: [table.courseId, table.prerequisiteCourseId] }),
    prerequisiteIdx: index("course_prerequisites_prerequisite_idx").on(table.prerequisiteCourseId),
  }),
);

export const courseLearningObjectives = sqliteTable(
  "course_learning_objectives",
  {
    courseId: text("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    objectiveId: text("objective_id")
      .notNull()
      .references(() => learningObjectives.id, { onDelete: "cascade" }),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    primaryKey: primaryKey({ columns: [table.courseId, table.objectiveId] }),
    objectiveIdx: index("course_learning_objectives_objective_idx").on(table.objectiveId),
  }),
);

export const modules = sqliteTable(
  "modules",
  {
    id: text("id").primaryKey(),
    courseId: text("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    sortOrder: integer("sort_order").notNull().default(0),
    estimatedStudyTimeMinutes: integer("estimated_study_time_minutes").notNull().default(0),
    assessmentReference: text("assessment_reference"),
    isArchived: integer("is_archived", { mode: "boolean" }).notNull().default(false),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    courseOrderIdx: index("modules_course_order_idx").on(table.courseId, table.sortOrder),
  }),
);

export const modulePrerequisites = sqliteTable(
  "module_prerequisites",
  {
    moduleId: text("module_id")
      .notNull()
      .references(() => modules.id, { onDelete: "cascade" }),
    prerequisiteModuleId: text("prerequisite_module_id")
      .notNull()
      .references(() => modules.id, { onDelete: "cascade" }),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    primaryKey: primaryKey({ columns: [table.moduleId, table.prerequisiteModuleId] }),
    prerequisiteIdx: index("module_prerequisites_prerequisite_idx").on(table.prerequisiteModuleId),
  }),
);

export const moduleLearningObjectives = sqliteTable(
  "module_learning_objectives",
  {
    moduleId: text("module_id")
      .notNull()
      .references(() => modules.id, { onDelete: "cascade" }),
    objectiveId: text("objective_id")
      .notNull()
      .references(() => learningObjectives.id, { onDelete: "cascade" }),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    primaryKey: primaryKey({ columns: [table.moduleId, table.objectiveId] }),
    objectiveIdx: index("module_learning_objectives_objective_idx").on(table.objectiveId),
  }),
);

export const lessons = sqliteTable(
  "lessons",
  {
    id: text("id").primaryKey(),
    moduleId: text("module_id")
      .notNull()
      .references(() => modules.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    summary: text("summary").notNull().default(""),
    sortOrder: integer("sort_order").notNull().default(0),
    estimatedDurationMinutes: integer("estimated_duration_minutes").notNull().default(0),
    status: text("status").notNull().default("draft"),
    currentVersionNumber: integer("current_version_number").notNull().default(1),
    publishedVersionId: text("published_version_id"),
    createdByProfileId: text("created_by_profile_id").references(() => profiles.id, {
      onDelete: "set null",
    }),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    moduleSlugIdx: uniqueIndex("lessons_module_slug_idx").on(table.moduleId, table.slug),
    moduleOrderIdx: index("lessons_module_order_idx").on(table.moduleId, table.sortOrder),
    statusIdx: index("lessons_status_idx").on(table.status),
  }),
);

export const lessonSections = sqliteTable(
  "lesson_sections",
  {
    id: text("id").primaryKey(),
    lessonId: text("lesson_id")
      .notNull()
      .references(() => lessons.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    lessonOrderIdx: index("lesson_sections_lesson_order_idx").on(table.lessonId, table.sortOrder),
  }),
);

export const lessonBlocks = sqliteTable(
  "lesson_blocks",
  {
    id: text("id").primaryKey(),
    sectionId: text("section_id")
      .notNull()
      .references(() => lessonSections.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    title: text("title"),
    sortOrder: integer("sort_order").notNull().default(0),
    payload: text("payload").notNull().default("{}"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    sectionOrderIdx: index("lesson_blocks_section_order_idx").on(table.sectionId, table.sortOrder),
  }),
);

export const lessonAssets = sqliteTable(
  "lesson_assets",
  {
    id: text("id").primaryKey(),
    lessonId: text("lesson_id")
      .notNull()
      .references(() => lessons.id, { onDelete: "cascade" }),
    blockId: text("block_id").references(() => lessonBlocks.id, { onDelete: "set null" }),
    kind: text("kind").notNull(),
    name: text("name").notNull(),
    sourceUrl: text("source_url").notNull(),
    mimeType: text("mime_type"),
    altText: text("alt_text").notNull().default(""),
    metadata: text("metadata").notNull().default("{}"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    lessonIdx: index("lesson_assets_lesson_idx").on(table.lessonId),
  }),
);

export const lessonLearningObjectives = sqliteTable(
  "lesson_learning_objectives",
  {
    lessonId: text("lesson_id")
      .notNull()
      .references(() => lessons.id, { onDelete: "cascade" }),
    objectiveId: text("objective_id")
      .notNull()
      .references(() => learningObjectives.id, { onDelete: "cascade" }),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    primaryKey: primaryKey({ columns: [table.lessonId, table.objectiveId] }),
    objectiveIdx: index("lesson_learning_objectives_objective_idx").on(table.objectiveId),
  }),
);

export const lessonVersions = sqliteTable(
  "lesson_versions",
  {
    id: text("id").primaryKey(),
    lessonId: text("lesson_id")
      .notNull()
      .references(() => lessons.id, { onDelete: "cascade" }),
    versionNumber: integer("version_number").notNull(),
    status: text("status").notNull().default("draft"),
    changeSummary: text("change_summary").notNull().default(""),
    snapshot: text("snapshot").notNull().default("{}"),
    createdByProfileId: text("created_by_profile_id").references(() => profiles.id, {
      onDelete: "set null",
    }),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    publishedAt: text("published_at"),
  },
  (table) => ({
    lessonVersionIdx: uniqueIndex("lesson_versions_lesson_version_idx").on(
      table.lessonId,
      table.versionNumber,
    ),
    lessonStatusIdx: index("lesson_versions_lesson_status_idx").on(table.lessonId, table.status),
  }),
);

export const userLessonProgress = sqliteTable(
  "user_lesson_progress",
  {
    profileId: text("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    lessonId: text("lesson_id")
      .notNull()
      .references(() => lessons.id, { onDelete: "cascade" }),
    startedAt: text("started_at"),
    completedAt: text("completed_at"),
    timeSpentSeconds: integer("time_spent_seconds").notNull().default(0),
    lastViewedBlockId: text("last_viewed_block_id").references(() => lessonBlocks.id, {
      onDelete: "set null",
    }),
    completionPercentage: integer("completion_percentage").notNull().default(0),
    revisitCount: integer("revisit_count").notNull().default(0),
    lastViewedAt: text("last_viewed_at"),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    primaryKey: primaryKey({ columns: [table.profileId, table.lessonId] }),
    lessonIdx: index("user_lesson_progress_lesson_idx").on(table.lessonId),
  }),
);

export const concepts = sqliteTable(
  "concepts",
  {
    id: text("id").primaryKey(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    subjectId: text("subject_id")
      .notNull()
      .references(() => subjects.id, { onDelete: "restrict" }),
    domainId: text("domain_id").references(() => domains.id, { onDelete: "set null" }),
    gradeMinId: text("grade_min_id").references(() => grades.id, { onDelete: "set null" }),
    gradeMaxId: text("grade_max_id").references(() => grades.id, { onDelete: "set null" }),
    difficulty: text("difficulty").notNull().default("balanced"),
    masteryThreshold: integer("mastery_threshold").notNull().default(70),
    isArchived: integer("is_archived", { mode: "boolean" }).notNull().default(false),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    slugIdx: uniqueIndex("concepts_slug_idx").on(table.slug),
    subjectIdx: index("concepts_subject_idx").on(table.subjectId),
    domainIdx: index("concepts_domain_idx").on(table.domainId),
    gradeRangeIdx: index("concepts_grade_range_idx").on(table.gradeMinId, table.gradeMaxId),
    difficultyIdx: index("concepts_difficulty_idx").on(table.difficulty),
    archivedIdx: index("concepts_archived_idx").on(table.isArchived),
  }),
);

export const lessonConcepts = sqliteTable(
  "lesson_concepts",
  {
    lessonId: text("lesson_id")
      .notNull()
      .references(() => lessons.id, { onDelete: "cascade" }),
    conceptId: text("concept_id")
      .notNull()
      .references(() => concepts.id, { onDelete: "cascade" }),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    primaryKey: primaryKey({ columns: [table.lessonId, table.conceptId] }),
    conceptIdx: index("lesson_concepts_concept_idx").on(table.conceptId, table.sortOrder),
  }),
);

export const conceptRelationships = sqliteTable(
  "concept_relationships",
  {
    id: text("id").primaryKey(),
    sourceConceptId: text("source_concept_id")
      .notNull()
      .references(() => concepts.id, { onDelete: "cascade" }),
    targetConceptId: text("target_concept_id")
      .notNull()
      .references(() => concepts.id, { onDelete: "cascade" }),
    relationshipType: text("relationship_type").notNull(),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    uniqueRelationship: uniqueIndex("concept_relationships_unique_idx").on(
      table.sourceConceptId,
      table.targetConceptId,
      table.relationshipType,
    ),
    sourceIdx: index("concept_relationships_source_idx").on(
      table.sourceConceptId,
      table.relationshipType,
    ),
    targetIdx: index("concept_relationships_target_idx").on(
      table.targetConceptId,
      table.relationshipType,
    ),
  }),
);

export const conceptLearningObjectives = sqliteTable(
  "concept_learning_objectives",
  {
    conceptId: text("concept_id")
      .notNull()
      .references(() => concepts.id, { onDelete: "cascade" }),
    objectiveId: text("objective_id")
      .notNull()
      .references(() => learningObjectives.id, { onDelete: "cascade" }),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    primaryKey: primaryKey({ columns: [table.conceptId, table.objectiveId] }),
    objectiveIdx: index("concept_learning_objectives_objective_idx").on(table.objectiveId),
  }),
);

export const conceptApplications = sqliteTable(
  "concept_applications",
  {
    id: text("id").primaryKey(),
    conceptId: text("concept_id")
      .notNull()
      .references(() => concepts.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    conceptIdx: index("concept_applications_concept_idx").on(table.conceptId, table.sortOrder),
  }),
);

export const conceptMisconceptions = sqliteTable(
  "concept_misconceptions",
  {
    id: text("id").primaryKey(),
    conceptId: text("concept_id")
      .notNull()
      .references(() => concepts.id, { onDelete: "cascade" }),
    misconception: text("misconception").notNull(),
    correction: text("correction").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    conceptIdx: index("concept_misconceptions_concept_idx").on(table.conceptId, table.sortOrder),
  }),
);

export const questions = sqliteTable(
  "questions",
  {
    id: text("id").primaryKey(),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    questionType: text("question_type").notNull(),
    subjectId: text("subject_id")
      .notNull()
      .references(() => subjects.id, { onDelete: "restrict" }),
    gradeMinId: text("grade_min_id").references(() => grades.id, { onDelete: "set null" }),
    gradeMaxId: text("grade_max_id").references(() => grades.id, { onDelete: "set null" }),
    difficulty: text("difficulty").notNull().default("balanced"),
    estimatedTimeSeconds: integer("estimated_time_seconds").notNull().default(120),
    source: text("source").notNull().default(""),
    authorProfileId: text("author_profile_id").references(() => profiles.id, {
      onDelete: "set null",
    }),
    tags: text("tags").notNull().default("[]"),
    status: text("status").notNull().default("draft"),
    currentVersionNumber: integer("current_version_number").notNull().default(1),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    slugIdx: uniqueIndex("questions_slug_idx").on(table.slug),
    subjectIdx: index("questions_subject_idx").on(table.subjectId),
    typeIdx: index("questions_type_idx").on(table.questionType),
    statusIdx: index("questions_status_idx").on(table.status),
  }),
);

export const questionVersions = sqliteTable(
  "question_versions",
  {
    id: text("id").primaryKey(),
    questionId: text("question_id")
      .notNull()
      .references(() => questions.id, { onDelete: "cascade" }),
    versionNumber: integer("version_number").notNull(),
    status: text("status").notNull().default("draft"),
    prompt: text("prompt").notNull(),
    answerSpec: text("answer_spec").notNull().default("{}"),
    explanation: text("explanation").notNull().default(""),
    fullSolution: text("full_solution").notNull().default(""),
    commonWrongAnswers: text("common_wrong_answers").notNull().default("[]"),
    errorFeedback: text("error_feedback").notNull().default("{}"),
    partialCreditRules: text("partial_credit_rules"),
    changeSummary: text("change_summary").notNull().default(""),
    createdByProfileId: text("created_by_profile_id").references(() => profiles.id, {
      onDelete: "set null",
    }),
    publishedAt: text("published_at"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    versionIdx: uniqueIndex("question_versions_question_version_idx").on(
      table.questionId,
      table.versionNumber,
    ),
    questionIdx: index("question_versions_question_idx").on(table.questionId),
  }),
);

export const questionOptions = sqliteTable(
  "question_options",
  {
    id: text("id").primaryKey(),
    questionVersionId: text("question_version_id")
      .notNull()
      .references(() => questionVersions.id, { onDelete: "cascade" }),
    optionKey: text("option_key").notNull(),
    label: text("label").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    isCorrect: integer("is_correct", { mode: "boolean" }).notNull().default(false),
  },
  (table) => ({
    uniqueOption: uniqueIndex("question_options_version_key_idx").on(
      table.questionVersionId,
      table.optionKey,
    ),
    orderIdx: index("question_options_version_order_idx").on(
      table.questionVersionId,
      table.sortOrder,
    ),
  }),
);

export const questionHints = sqliteTable(
  "question_hints",
  {
    id: text("id").primaryKey(),
    questionVersionId: text("question_version_id")
      .notNull()
      .references(() => questionVersions.id, { onDelete: "cascade" }),
    level: integer("level").notNull().default(1),
    content: text("content").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (table) => ({
    uniqueLevel: uniqueIndex("question_hints_version_level_idx").on(
      table.questionVersionId,
      table.level,
    ),
    orderIdx: index("question_hints_version_order_idx").on(
      table.questionVersionId,
      table.sortOrder,
    ),
  }),
);

export const questionSolutions = sqliteTable(
  "question_solutions",
  {
    id: text("id").primaryKey(),
    questionVersionId: text("question_version_id")
      .notNull()
      .references(() => questionVersions.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    content: text("content").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (table) => ({
    orderIdx: index("question_solutions_version_order_idx").on(
      table.questionVersionId,
      table.sortOrder,
    ),
  }),
);

export const questionConcepts = sqliteTable(
  "question_concepts",
  {
    questionId: text("question_id")
      .notNull()
      .references(() => questions.id, { onDelete: "cascade" }),
    conceptId: text("concept_id")
      .notNull()
      .references(() => concepts.id, { onDelete: "cascade" }),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    primaryKey: primaryKey({ columns: [table.questionId, table.conceptId] }),
    conceptIdx: index("question_concepts_concept_idx").on(table.conceptId, table.sortOrder),
  }),
);

export const questionLearningObjectives = sqliteTable(
  "question_learning_objectives",
  {
    questionId: text("question_id")
      .notNull()
      .references(() => questions.id, { onDelete: "cascade" }),
    objectiveId: text("objective_id")
      .notNull()
      .references(() => learningObjectives.id, { onDelete: "cascade" }),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    primaryKey: primaryKey({ columns: [table.questionId, table.objectiveId] }),
    objectiveIdx: index("question_learning_objectives_objective_idx").on(table.objectiveId),
  }),
);

export const questionTemplates = sqliteTable(
  "question_templates",
  {
    id: text("id").primaryKey(),
    questionId: text("question_id").references(() => questions.id, { onDelete: "set null" }),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    questionType: text("question_type").notNull(),
    promptTemplate: text("prompt_template").notNull(),
    variables: text("variables").notNull().default("[]"),
    answerExpression: text("answer_expression").notNull().default(""),
    validationSpec: text("validation_spec").notNull().default("{}"),
    seed: integer("seed"),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    slugIdx: uniqueIndex("question_templates_slug_idx").on(table.slug),
    questionIdx: index("question_templates_question_idx").on(table.questionId),
  }),
);

export const exerciseSets = sqliteTable(
  "exercise_sets",
  {
    id: text("id").primaryKey(),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    kind: text("kind").notNull(),
    subjectId: text("subject_id").references(() => subjects.id, { onDelete: "set null" }),
    gradeId: text("grade_id").references(() => grades.id, { onDelete: "set null" }),
    difficulty: text("difficulty").notNull().default("balanced"),
    status: text("status").notNull().default("draft"),
    estimatedTimeSeconds: integer("estimated_time_seconds").notNull().default(0),
    createdByProfileId: text("created_by_profile_id").references(() => profiles.id, {
      onDelete: "set null",
    }),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    slugIdx: uniqueIndex("exercise_sets_slug_idx").on(table.slug),
    statusIdx: index("exercise_sets_status_idx").on(table.status),
  }),
);

export const exerciseSetQuestions = sqliteTable(
  "exercise_set_questions",
  {
    exerciseSetId: text("exercise_set_id")
      .notNull()
      .references(() => exerciseSets.id, { onDelete: "cascade" }),
    questionId: text("question_id")
      .notNull()
      .references(() => questions.id, { onDelete: "cascade" }),
    sortOrder: integer("sort_order").notNull().default(0),
    points: real("points").notNull().default(1),
    isRequired: integer("is_required", { mode: "boolean" }).notNull().default(true),
  },
  (table) => ({
    primaryKey: primaryKey({ columns: [table.exerciseSetId, table.questionId] }),
    questionIdx: index("exercise_set_questions_question_idx").on(table.questionId, table.sortOrder),
  }),
);

export const exerciseAttempts = sqliteTable(
  "exercise_attempts",
  {
    id: text("id").primaryKey(),
    exerciseSetId: text("exercise_set_id")
      .notNull()
      .references(() => exerciseSets.id, { onDelete: "cascade" }),
    profileId: text("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    status: text("status").notNull().default("in-progress"),
    seed: integer("seed").notNull(),
    score: real("score").notNull().default(0),
    maxScore: real("max_score").notNull().default(0),
    startedAt: text("started_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    completedAt: text("completed_at"),
  },
  (table) => ({
    profileIdx: index("exercise_attempts_profile_idx").on(table.profileId, table.startedAt),
    setIdx: index("exercise_attempts_set_idx").on(table.exerciseSetId, table.status),
  }),
);

export const questionAttempts = sqliteTable(
  "question_attempts",
  {
    id: text("id").primaryKey(),
    exerciseAttemptId: text("exercise_attempt_id")
      .notNull()
      .references(() => exerciseAttempts.id, { onDelete: "cascade" }),
    questionId: text("question_id")
      .notNull()
      .references(() => questions.id, { onDelete: "restrict" }),
    questionVersionId: text("question_version_id")
      .notNull()
      .references(() => questionVersions.id, { onDelete: "restrict" }),
    templateId: text("template_id").references(() => questionTemplates.id, {
      onDelete: "set null",
    }),
    instanceSeed: integer("instance_seed"),
    response: text("response").notNull().default("null"),
    validationResult: text("validation_result").notNull().default("{}"),
    score: real("score").notNull().default(0),
    maxScore: real("max_score").notNull().default(0),
    answeredAt: text("answered_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    uniqueQuestionAttempt: uniqueIndex("question_attempts_attempt_question_idx").on(
      table.exerciseAttemptId,
      table.questionId,
    ),
    questionIdx: index("question_attempts_question_idx").on(table.questionId, table.answeredAt),
  }),
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Profile = typeof profiles.$inferSelect;
export type NewProfile = typeof profiles.$inferInsert;
export type Role = typeof roles.$inferSelect;
export type NewRole = typeof roles.$inferInsert;
export type UserRole = typeof userRoles.$inferSelect;
export type NewUserRole = typeof userRoles.$inferInsert;
export type Permission = typeof permissions.$inferSelect;
export type NewPermission = typeof permissions.$inferInsert;
export type RolePermission = typeof rolePermissions.$inferSelect;
export type NewRolePermission = typeof rolePermissions.$inferInsert;
export type UserSettings = typeof userSettings.$inferSelect;
export type NewUserSettings = typeof userSettings.$inferInsert;
export type OnboardingResponse = typeof onboardingResponses.$inferSelect;
export type NewOnboardingResponse = typeof onboardingResponses.$inferInsert;
export type Curriculum = typeof curricula.$inferSelect;
export type NewCurriculum = typeof curricula.$inferInsert;
export type Grade = typeof grades.$inferSelect;
export type NewGrade = typeof grades.$inferInsert;
export type CurriculumGrade = typeof curriculumGrades.$inferSelect;
export type NewCurriculumGrade = typeof curriculumGrades.$inferInsert;
export type Subject = typeof subjects.$inferSelect;
export type NewSubject = typeof subjects.$inferInsert;
export type CurriculumSubject = typeof curriculumSubjects.$inferSelect;
export type NewCurriculumSubject = typeof curriculumSubjects.$inferInsert;
export type GradeSubject = typeof gradeSubjects.$inferSelect;
export type NewGradeSubject = typeof gradeSubjects.$inferInsert;
export type Domain = typeof domains.$inferSelect;
export type NewDomain = typeof domains.$inferInsert;
export type SubjectDomain = typeof subjectDomains.$inferSelect;
export type NewSubjectDomain = typeof subjectDomains.$inferInsert;
export type GradeSubjectDomain = typeof gradeSubjectDomains.$inferSelect;
export type NewGradeSubjectDomain = typeof gradeSubjectDomains.$inferInsert;
export type LearningObjective = typeof learningObjectives.$inferSelect;
export type NewLearningObjective = typeof learningObjectives.$inferInsert;
export type GradeLearningObjective = typeof gradeLearningObjectives.$inferSelect;
export type NewGradeLearningObjective = typeof gradeLearningObjectives.$inferInsert;
export type Course = typeof courses.$inferSelect;
export type NewCourse = typeof courses.$inferInsert;
export type CourseCurriculum = typeof courseCurricula.$inferSelect;
export type NewCourseCurriculum = typeof courseCurricula.$inferInsert;
export type CourseGrade = typeof courseGrades.$inferSelect;
export type NewCourseGrade = typeof courseGrades.$inferInsert;
export type CoursePrerequisite = typeof coursePrerequisites.$inferSelect;
export type NewCoursePrerequisite = typeof coursePrerequisites.$inferInsert;
export type CourseLearningObjective = typeof courseLearningObjectives.$inferSelect;
export type NewCourseLearningObjective = typeof courseLearningObjectives.$inferInsert;
export type Module = typeof modules.$inferSelect;
export type NewModule = typeof modules.$inferInsert;
export type ModulePrerequisite = typeof modulePrerequisites.$inferSelect;
export type NewModulePrerequisite = typeof modulePrerequisites.$inferInsert;
export type ModuleLearningObjective = typeof moduleLearningObjectives.$inferSelect;
export type NewModuleLearningObjective = typeof moduleLearningObjectives.$inferInsert;
export type Lesson = typeof lessons.$inferSelect;
export type NewLesson = typeof lessons.$inferInsert;
export type LessonSection = typeof lessonSections.$inferSelect;
export type NewLessonSection = typeof lessonSections.$inferInsert;
export type LessonBlock = typeof lessonBlocks.$inferSelect;
export type NewLessonBlock = typeof lessonBlocks.$inferInsert;
export type LessonAsset = typeof lessonAssets.$inferSelect;
export type NewLessonAsset = typeof lessonAssets.$inferInsert;
export type LessonLearningObjective = typeof lessonLearningObjectives.$inferSelect;
export type NewLessonLearningObjective = typeof lessonLearningObjectives.$inferInsert;
export type LessonVersion = typeof lessonVersions.$inferSelect;
export type NewLessonVersion = typeof lessonVersions.$inferInsert;
export type UserLessonProgress = typeof userLessonProgress.$inferSelect;
export type NewUserLessonProgress = typeof userLessonProgress.$inferInsert;
export type Concept = typeof concepts.$inferSelect;
export type NewConcept = typeof concepts.$inferInsert;
export type LessonConcept = typeof lessonConcepts.$inferSelect;
export type NewLessonConcept = typeof lessonConcepts.$inferInsert;
export type ConceptRelationship = typeof conceptRelationships.$inferSelect;
export type NewConceptRelationship = typeof conceptRelationships.$inferInsert;
export type ConceptLearningObjective = typeof conceptLearningObjectives.$inferSelect;
export type NewConceptLearningObjective = typeof conceptLearningObjectives.$inferInsert;
export type ConceptApplication = typeof conceptApplications.$inferSelect;
export type NewConceptApplication = typeof conceptApplications.$inferInsert;
export type ConceptMisconception = typeof conceptMisconceptions.$inferSelect;
export type NewConceptMisconception = typeof conceptMisconceptions.$inferInsert;
