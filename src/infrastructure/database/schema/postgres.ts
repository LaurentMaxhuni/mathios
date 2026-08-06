import { sql } from "drizzle-orm";
import {
  boolean,
  doublePrecision,
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const appMetadata = pgTable("app_metadata", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .default(sql`NOW()`),
});

export type AppMetadata = typeof appMetadata.$inferSelect;
export type NewAppMetadata = typeof appMetadata.$inferInsert;

export const users = pgTable(
  "users",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    authMode: text("auth_mode").notNull().default("local-profile"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`NOW()`),
  },
  (table) => ({
    identifierIdx: uniqueIndex("users_identifier_idx").on(table.identifier),
  }),
);

export const profiles = pgTable(
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
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`NOW()`),
  },
  (table) => ({
    userIdx: uniqueIndex("profiles_user_idx").on(table.userId),
    displayNameIdx: index("profiles_display_name_idx").on(table.displayName),
  }),
);

export const roles = pgTable(
  "roles",
  {
    id: text("id").primaryKey(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    description: text("description").notNull(),
    isSystem: boolean("is_system").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`NOW()`),
  },
  (table) => ({
    slugIdx: uniqueIndex("roles_slug_idx").on(table.slug),
  }),
);

export const userRoles = pgTable(
  "user_roles",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    roleId: text("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    primaryKey: primaryKey({ columns: [table.userId, table.roleId] }),
    roleIdx: index("user_roles_role_idx").on(table.roleId),
  }),
);

export const permissions = pgTable(
  "permissions",
  {
    id: text("id").primaryKey(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    description: text("description").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`NOW()`),
  },
  (table) => ({
    slugIdx: uniqueIndex("permissions_slug_idx").on(table.slug),
  }),
);

export const rolePermissions = pgTable(
  "role_permissions",
  {
    roleId: text("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "cascade" }),
    permissionId: text("permission_id")
      .notNull()
      .references(() => permissions.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    primaryKey: primaryKey({ columns: [table.roleId, table.permissionId] }),
    permissionIdx: index("role_permissions_permission_idx").on(table.permissionId),
  }),
);

export const userSettings = pgTable("user_settings", {
  profileId: text("profile_id")
    .primaryKey()
    .references(() => profiles.id, { onDelete: "cascade" }),
  theme: text("theme").notNull().default("system"),
  reducedMotion: boolean("reduced_motion").notNull().default(false),
  textSize: text("text_size").notNull().default("medium"),
  defaultGrade: text("default_grade"),
  defaultCurriculum: text("default_curriculum"),
  preferredSubjects: text("preferred_subjects").notNull().default("[]"),
  studySessionDuration: integer("study_session_duration").notNull().default(25),
  weekStartDay: integer("week_start_day").notNull().default(1),
  formulaRendering: text("formula_rendering").notNull().default("accessible"),
  accessibilityPreferences: text("accessibility_preferences").notNull().default("{}"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .default(sql`NOW()`),
});

export const onboardingResponses = pgTable("onboarding_responses", {
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
  skipped: boolean("skipped").notNull().default(false),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .default(sql`NOW()`),
});

export const curricula = pgTable(
  "curricula",
  {
    id: text("id").primaryKey(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    kind: text("kind").notNull().default("custom"),
    description: text("description").notNull().default(""),
    authority: text("authority"),
    isSystem: boolean("is_system").notNull().default(false),
    isArchived: boolean("is_archived").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`NOW()`),
  },
  (table) => ({
    slugIdx: uniqueIndex("curricula_slug_idx").on(table.slug),
    archiveIdx: index("curricula_archived_idx").on(table.isArchived),
  }),
);

export const grades = pgTable(
  "grades",
  {
    id: text("id").primaryKey(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    shortName: text("short_name").notNull(),
    description: text("description").notNull().default(""),
    sortOrder: integer("sort_order").notNull().default(0),
    isArchived: boolean("is_archived").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`NOW()`),
  },
  (table) => ({
    slugIdx: uniqueIndex("grades_slug_idx").on(table.slug),
    sortIdx: index("grades_sort_order_idx").on(table.sortOrder),
  }),
);

export const curriculumGrades = pgTable(
  "curriculum_grades",
  {
    curriculumId: text("curriculum_id")
      .notNull()
      .references(() => curricula.id, { onDelete: "cascade" }),
    gradeId: text("grade_id")
      .notNull()
      .references(() => grades.id, { onDelete: "cascade" }),
    sortOrder: integer("sort_order").notNull().default(0),
    isAvailable: boolean("is_available").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`NOW()`),
  },
  (table) => ({
    primaryKey: primaryKey({ columns: [table.curriculumId, table.gradeId] }),
    gradeIdx: index("curriculum_grades_grade_idx").on(table.gradeId),
  }),
);

export const subjects = pgTable(
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
    isArchived: boolean("is_archived").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`NOW()`),
  },
  (table) => ({
    slugIdx: uniqueIndex("subjects_slug_idx").on(table.slug),
    sortIdx: index("subjects_sort_order_idx").on(table.sortOrder),
  }),
);

export const curriculumSubjects = pgTable(
  "curriculum_subjects",
  {
    curriculumId: text("curriculum_id")
      .notNull()
      .references(() => curricula.id, { onDelete: "cascade" }),
    subjectId: text("subject_id")
      .notNull()
      .references(() => subjects.id, { onDelete: "cascade" }),
    isRequired: boolean("is_required").notNull().default(false),
    isAvailable: boolean("is_available").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`NOW()`),
  },
  (table) => ({
    primaryKey: primaryKey({ columns: [table.curriculumId, table.subjectId] }),
    subjectIdx: index("curriculum_subjects_subject_idx").on(table.subjectId),
  }),
);

export const gradeSubjects = pgTable(
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
    isRequired: boolean("is_required").notNull().default(false),
    isAvailable: boolean("is_available").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`NOW()`),
  },
  (table) => ({
    primaryKey: primaryKey({ columns: [table.curriculumId, table.gradeId, table.subjectId] }),
    gradeIdx: index("grade_subjects_grade_idx").on(table.curriculumId, table.gradeId),
    subjectIdx: index("grade_subjects_subject_idx").on(table.subjectId),
  }),
);

export const domains = pgTable(
  "domains",
  {
    id: text("id").primaryKey(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    sortOrder: integer("sort_order").notNull().default(0),
    isArchived: boolean("is_archived").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`NOW()`),
  },
  (table) => ({
    slugIdx: uniqueIndex("domains_slug_idx").on(table.slug),
    sortIdx: index("domains_sort_order_idx").on(table.sortOrder),
  }),
);

export const subjectDomains = pgTable(
  "subject_domains",
  {
    subjectId: text("subject_id")
      .notNull()
      .references(() => subjects.id, { onDelete: "cascade" }),
    domainId: text("domain_id")
      .notNull()
      .references(() => domains.id, { onDelete: "cascade" }),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`NOW()`),
  },
  (table) => ({
    primaryKey: primaryKey({ columns: [table.subjectId, table.domainId] }),
    domainIdx: index("subject_domains_domain_idx").on(table.domainId),
  }),
);

export const gradeSubjectDomains = pgTable(
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
    isRequired: boolean("is_required").notNull().default(false),
    isAvailable: boolean("is_available").notNull().default(true),
    depth: integer("depth").notNull().default(1),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`NOW()`),
  },
  (table) => ({
    primaryKey: primaryKey({
      columns: [table.curriculumId, table.gradeId, table.subjectId, table.domainId],
    }),
    gradeIdx: index("grade_subject_domains_grade_idx").on(table.curriculumId, table.gradeId),
    domainIdx: index("grade_subject_domains_domain_idx").on(table.domainId),
  }),
);

export const learningObjectives = pgTable(
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
    isRequired: boolean("is_required").notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),
    isArchived: boolean("is_archived").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`NOW()`),
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

export const gradeLearningObjectives = pgTable(
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
    isRequired: boolean("is_required").notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`NOW()`),
  },
  (table) => ({
    primaryKey: primaryKey({ columns: [table.curriculumId, table.gradeId, table.objectiveId] }),
    gradeIdx: index("grade_learning_objectives_grade_idx").on(table.curriculumId, table.gradeId),
    objectiveIdx: index("grade_learning_objectives_objective_idx").on(table.objectiveId),
  }),
);

export const courses = pgTable(
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
    isRequired: boolean("is_required").notNull().default(false),
    status: text("status").notNull().default("draft"),
    createdByProfileId: text("created_by_profile_id").references(() => profiles.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`NOW()`),
  },
  (table) => ({
    slugIdx: uniqueIndex("courses_slug_idx").on(table.slug),
    subjectIdx: index("courses_subject_idx").on(table.subjectId),
    statusIdx: index("courses_status_idx").on(table.status),
  }),
);

export const courseCurricula = pgTable(
  "course_curricula",
  {
    courseId: text("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    curriculumId: text("curriculum_id")
      .notNull()
      .references(() => curricula.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    primaryKey: primaryKey({ columns: [table.courseId, table.curriculumId] }),
    curriculumIdx: index("course_curricula_curriculum_idx").on(table.curriculumId),
  }),
);

export const courseGrades = pgTable(
  "course_grades",
  {
    courseId: text("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    gradeId: text("grade_id")
      .notNull()
      .references(() => grades.id, { onDelete: "cascade" }),
    isRequired: boolean("is_required").notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    primaryKey: primaryKey({ columns: [table.courseId, table.gradeId] }),
    gradeIdx: index("course_grades_grade_idx").on(table.gradeId),
  }),
);

export const coursePrerequisites = pgTable(
  "course_prerequisites",
  {
    courseId: text("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    prerequisiteCourseId: text("prerequisite_course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    primaryKey: primaryKey({ columns: [table.courseId, table.prerequisiteCourseId] }),
    prerequisiteIdx: index("course_prerequisites_prerequisite_idx").on(table.prerequisiteCourseId),
  }),
);

export const courseLearningObjectives = pgTable(
  "course_learning_objectives",
  {
    courseId: text("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    objectiveId: text("objective_id")
      .notNull()
      .references(() => learningObjectives.id, { onDelete: "cascade" }),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    primaryKey: primaryKey({ columns: [table.courseId, table.objectiveId] }),
    objectiveIdx: index("course_learning_objectives_objective_idx").on(table.objectiveId),
  }),
);

export const modules = pgTable(
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
    isArchived: boolean("is_archived").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`NOW()`),
  },
  (table) => ({
    courseOrderIdx: index("modules_course_order_idx").on(table.courseId, table.sortOrder),
  }),
);

export const modulePrerequisites = pgTable(
  "module_prerequisites",
  {
    moduleId: text("module_id")
      .notNull()
      .references(() => modules.id, { onDelete: "cascade" }),
    prerequisiteModuleId: text("prerequisite_module_id")
      .notNull()
      .references(() => modules.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    primaryKey: primaryKey({ columns: [table.moduleId, table.prerequisiteModuleId] }),
    prerequisiteIdx: index("module_prerequisites_prerequisite_idx").on(table.prerequisiteModuleId),
  }),
);

export const moduleLearningObjectives = pgTable(
  "module_learning_objectives",
  {
    moduleId: text("module_id")
      .notNull()
      .references(() => modules.id, { onDelete: "cascade" }),
    objectiveId: text("objective_id")
      .notNull()
      .references(() => learningObjectives.id, { onDelete: "cascade" }),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    primaryKey: primaryKey({ columns: [table.moduleId, table.objectiveId] }),
    objectiveIdx: index("module_learning_objectives_objective_idx").on(table.objectiveId),
  }),
);

export const lessons = pgTable(
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
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`NOW()`),
  },
  (table) => ({
    moduleSlugIdx: uniqueIndex("lessons_module_slug_idx").on(table.moduleId, table.slug),
    moduleOrderIdx: index("lessons_module_order_idx").on(table.moduleId, table.sortOrder),
    statusIdx: index("lessons_status_idx").on(table.status),
  }),
);

export const lessonSections = pgTable(
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
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`NOW()`),
  },
  (table) => ({
    lessonOrderIdx: index("lesson_sections_lesson_order_idx").on(table.lessonId, table.sortOrder),
  }),
);

export const lessonBlocks = pgTable(
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
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`NOW()`),
  },
  (table) => ({
    sectionOrderIdx: index("lesson_blocks_section_order_idx").on(table.sectionId, table.sortOrder),
  }),
);

export const lessonAssets = pgTable(
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
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`NOW()`),
  },
  (table) => ({
    lessonIdx: index("lesson_assets_lesson_idx").on(table.lessonId),
  }),
);

export const lessonLearningObjectives = pgTable(
  "lesson_learning_objectives",
  {
    lessonId: text("lesson_id")
      .notNull()
      .references(() => lessons.id, { onDelete: "cascade" }),
    objectiveId: text("objective_id")
      .notNull()
      .references(() => learningObjectives.id, { onDelete: "cascade" }),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    primaryKey: primaryKey({ columns: [table.lessonId, table.objectiveId] }),
    objectiveIdx: index("lesson_learning_objectives_objective_idx").on(table.objectiveId),
  }),
);

export const lessonVersions = pgTable(
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
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    publishedAt: timestamp("published_at", { withTimezone: true }),
  },
  (table) => ({
    lessonVersionIdx: uniqueIndex("lesson_versions_lesson_version_idx").on(
      table.lessonId,
      table.versionNumber,
    ),
    lessonStatusIdx: index("lesson_versions_lesson_status_idx").on(table.lessonId, table.status),
  }),
);

export const userLessonProgress = pgTable(
  "user_lesson_progress",
  {
    profileId: text("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    lessonId: text("lesson_id")
      .notNull()
      .references(() => lessons.id, { onDelete: "cascade" }),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    timeSpentSeconds: integer("time_spent_seconds").notNull().default(0),
    lastViewedBlockId: text("last_viewed_block_id").references(() => lessonBlocks.id, {
      onDelete: "set null",
    }),
    completionPercentage: integer("completion_percentage").notNull().default(0),
    revisitCount: integer("revisit_count").notNull().default(0),
    lastViewedAt: timestamp("last_viewed_at", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`NOW()`),
  },
  (table) => ({
    primaryKey: primaryKey({ columns: [table.profileId, table.lessonId] }),
    lessonIdx: index("user_lesson_progress_lesson_idx").on(table.lessonId),
  }),
);

export const concepts = pgTable(
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
    isArchived: boolean("is_archived").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`NOW()`),
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

export const lessonConcepts = pgTable(
  "lesson_concepts",
  {
    lessonId: text("lesson_id")
      .notNull()
      .references(() => lessons.id, { onDelete: "cascade" }),
    conceptId: text("concept_id")
      .notNull()
      .references(() => concepts.id, { onDelete: "cascade" }),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    primaryKey: primaryKey({ columns: [table.lessonId, table.conceptId] }),
    conceptIdx: index("lesson_concepts_concept_idx").on(table.conceptId, table.sortOrder),
  }),
);

export const conceptRelationships = pgTable(
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
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`NOW()`),
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

export const conceptLearningObjectives = pgTable(
  "concept_learning_objectives",
  {
    conceptId: text("concept_id")
      .notNull()
      .references(() => concepts.id, { onDelete: "cascade" }),
    objectiveId: text("objective_id")
      .notNull()
      .references(() => learningObjectives.id, { onDelete: "cascade" }),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    primaryKey: primaryKey({ columns: [table.conceptId, table.objectiveId] }),
    objectiveIdx: index("concept_learning_objectives_objective_idx").on(table.objectiveId),
  }),
);

export const conceptApplications = pgTable(
  "concept_applications",
  {
    id: text("id").primaryKey(),
    conceptId: text("concept_id")
      .notNull()
      .references(() => concepts.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`NOW()`),
  },
  (table) => ({
    conceptIdx: index("concept_applications_concept_idx").on(table.conceptId, table.sortOrder),
  }),
);

export const conceptMisconceptions = pgTable(
  "concept_misconceptions",
  {
    id: text("id").primaryKey(),
    conceptId: text("concept_id")
      .notNull()
      .references(() => concepts.id, { onDelete: "cascade" }),
    misconception: text("misconception").notNull(),
    correction: text("correction").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`NOW()`),
  },
  (table) => ({
    conceptIdx: index("concept_misconceptions_concept_idx").on(table.conceptId, table.sortOrder),
  }),
);

export const questions = pgTable(
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
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`NOW()`),
  },
  (table) => ({
    slugIdx: uniqueIndex("questions_slug_idx").on(table.slug),
    subjectIdx: index("questions_subject_idx").on(table.subjectId),
    typeIdx: index("questions_type_idx").on(table.questionType),
    statusIdx: index("questions_status_idx").on(table.status),
  }),
);

export const questionVersions = pgTable(
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
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    versionIdx: uniqueIndex("question_versions_question_version_idx").on(
      table.questionId,
      table.versionNumber,
    ),
    questionIdx: index("question_versions_question_idx").on(table.questionId),
  }),
);

export const questionOptions = pgTable(
  "question_options",
  {
    id: text("id").primaryKey(),
    questionVersionId: text("question_version_id")
      .notNull()
      .references(() => questionVersions.id, { onDelete: "cascade" }),
    optionKey: text("option_key").notNull(),
    label: text("label").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    isCorrect: boolean("is_correct").notNull().default(false),
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

export const questionHints = pgTable(
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

export const questionSolutions = pgTable(
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

export const questionConcepts = pgTable(
  "question_concepts",
  {
    questionId: text("question_id")
      .notNull()
      .references(() => questions.id, { onDelete: "cascade" }),
    conceptId: text("concept_id")
      .notNull()
      .references(() => concepts.id, { onDelete: "cascade" }),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    primaryKey: primaryKey({ columns: [table.questionId, table.conceptId] }),
    conceptIdx: index("question_concepts_concept_idx").on(table.conceptId, table.sortOrder),
  }),
);

export const questionLearningObjectives = pgTable(
  "question_learning_objectives",
  {
    questionId: text("question_id")
      .notNull()
      .references(() => questions.id, { onDelete: "cascade" }),
    objectiveId: text("objective_id")
      .notNull()
      .references(() => learningObjectives.id, { onDelete: "cascade" }),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    primaryKey: primaryKey({ columns: [table.questionId, table.objectiveId] }),
    objectiveIdx: index("question_learning_objectives_objective_idx").on(table.objectiveId),
  }),
);

export const questionTemplates = pgTable(
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
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`NOW()`),
  },
  (table) => ({
    slugIdx: uniqueIndex("question_templates_slug_idx").on(table.slug),
    questionIdx: index("question_templates_question_idx").on(table.questionId),
  }),
);

export const exerciseSets = pgTable(
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
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`NOW()`),
  },
  (table) => ({
    slugIdx: uniqueIndex("exercise_sets_slug_idx").on(table.slug),
    statusIdx: index("exercise_sets_status_idx").on(table.status),
  }),
);

export const exerciseSetQuestions = pgTable(
  "exercise_set_questions",
  {
    exerciseSetId: text("exercise_set_id")
      .notNull()
      .references(() => exerciseSets.id, { onDelete: "cascade" }),
    questionId: text("question_id")
      .notNull()
      .references(() => questions.id, { onDelete: "cascade" }),
    sortOrder: integer("sort_order").notNull().default(0),
    points: doublePrecision("points").notNull().default(1),
    isRequired: boolean("is_required").notNull().default(true),
  },
  (table) => ({
    primaryKey: primaryKey({ columns: [table.exerciseSetId, table.questionId] }),
    questionIdx: index("exercise_set_questions_question_idx").on(table.questionId, table.sortOrder),
  }),
);

export const exerciseAttempts = pgTable(
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
    score: doublePrecision("score").notNull().default(0),
    maxScore: doublePrecision("max_score").notNull().default(0),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (table) => ({
    profileIdx: index("exercise_attempts_profile_idx").on(table.profileId, table.startedAt),
    setIdx: index("exercise_attempts_set_idx").on(table.exerciseSetId, table.status),
  }),
);

export const assessments = pgTable(
  "assessments",
  {
    id: text("id").primaryKey(),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    type: text("assessment_type").notNull(),
    subjectId: text("subject_id").references(() => subjects.id, { onDelete: "set null" }),
    gradeId: text("grade_id").references(() => grades.id, { onDelete: "set null" }),
    status: text("status").notNull().default("draft"),
    timeLimitSeconds: integer("time_limit_seconds"),
    attemptLimit: integer("attempt_limit"),
    passingThreshold: doublePrecision("passing_threshold").notNull().default(0.6),
    partialCredit: boolean("partial_credit").notNull().default(true),
    feedbackVisibility: text("feedback_visibility").notNull().default("after-submit"),
    reviewMode: text("review_mode").notNull().default("full"),
    retakeRule: text("retake_rule").notNull().default("after-failure"),
    questionOrdering: text("question_ordering").notNull().default("fixed"),
    autoSubmit: boolean("auto_submit").notNull().default(false),
    configuration: text("configuration").notNull().default("{}"),
    createdByProfileId: text("created_by_profile_id").references(() => profiles.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`NOW()`),
  },
  (table) => ({
    slugIdx: uniqueIndex("assessments_slug_idx").on(table.slug),
    statusIdx: index("assessments_status_idx").on(table.status),
    typeIdx: index("assessments_type_idx").on(table.type),
    subjectGradeIdx: index("assessments_subject_grade_idx").on(table.subjectId, table.gradeId),
  }),
);

export const assessmentSections = pgTable(
  "assessment_sections",
  {
    id: text("id").primaryKey(),
    assessmentId: text("assessment_id")
      .notNull()
      .references(() => assessments.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    sortOrder: integer("sort_order").notNull().default(0),
    points: doublePrecision("points").notNull().default(1),
    timeLimitSeconds: integer("time_limit_seconds"),
    questionOrdering: text("question_ordering").notNull().default("fixed"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`NOW()`),
  },
  (table) => ({
    assessmentIdx: index("assessment_sections_assessment_idx").on(
      table.assessmentId,
      table.sortOrder,
    ),
  }),
);

export const assessmentPools = pgTable(
  "assessment_pools",
  {
    id: text("id").primaryKey(),
    assessmentId: text("assessment_id")
      .notNull()
      .references(() => assessments.id, { onDelete: "cascade" }),
    sectionId: text("section_id")
      .notNull()
      .references(() => assessmentSections.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    selectionCount: integer("selection_count").notNull(),
    difficultyDistribution: text("difficulty_distribution").notNull().default("{}"),
    conceptIds: text("concept_ids").notNull().default("[]"),
    questionOrdering: text("question_ordering").notNull().default("randomized"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`NOW()`),
  },
  (table) => ({
    sectionIdx: index("assessment_pools_section_idx").on(table.sectionId),
  }),
);

export const assessmentQuestions = pgTable(
  "assessment_questions",
  {
    id: text("id").primaryKey(),
    assessmentId: text("assessment_id")
      .notNull()
      .references(() => assessments.id, { onDelete: "cascade" }),
    sectionId: text("section_id")
      .notNull()
      .references(() => assessmentSections.id, { onDelete: "cascade" }),
    poolId: text("pool_id").references(() => assessmentPools.id, { onDelete: "cascade" }),
    questionId: text("question_id")
      .notNull()
      .references(() => questions.id, { onDelete: "restrict" }),
    sortOrder: integer("sort_order").notNull().default(0),
    points: doublePrecision("points").notNull().default(1),
    isRequired: boolean("is_required").notNull().default(true),
  },
  (table) => ({
    sectionIdx: index("assessment_questions_section_idx").on(table.sectionId, table.sortOrder),
    questionIdx: index("assessment_questions_question_idx").on(table.questionId),
  }),
);

export const assessmentAttempts = pgTable(
  "assessment_attempts",
  {
    id: text("id").primaryKey(),
    assessmentId: text("assessment_id")
      .notNull()
      .references(() => assessments.id, { onDelete: "cascade" }),
    profileId: text("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    status: text("status").notNull().default("in-progress"),
    seed: integer("seed").notNull(),
    score: doublePrecision("score").notNull().default(0),
    maxScore: doublePrecision("max_score").notNull().default(0),
    percentage: doublePrecision("percentage").notNull().default(0),
    passed: boolean("passed"),
    questionOrder: text("question_order").notNull().default("[]"),
    questionInstances: text("question_instances").notNull().default("[]"),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
  },
  (table) => ({
    profileIdx: index("assessment_attempts_profile_idx").on(table.profileId, table.startedAt),
    assessmentIdx: index("assessment_attempts_assessment_idx").on(
      table.assessmentId,
      table.profileId,
      table.status,
    ),
  }),
);

export const assessmentSectionResults = pgTable(
  "assessment_section_results",
  {
    id: text("id").primaryKey(),
    assessmentAttemptId: text("assessment_attempt_id")
      .notNull()
      .references(() => assessmentAttempts.id, { onDelete: "cascade" }),
    sectionId: text("section_id")
      .notNull()
      .references(() => assessmentSections.id, { onDelete: "cascade" }),
    score: doublePrecision("score").notNull().default(0),
    maxScore: doublePrecision("max_score").notNull().default(0),
    percentage: doublePrecision("percentage").notNull().default(0),
    correctCount: integer("correct_count").notNull().default(0),
    answeredCount: integer("answered_count").notNull().default(0),
    questionCount: integer("question_count").notNull().default(0),
    conceptScores: text("concept_scores").notNull().default("{}"),
  },
  (table) => ({
    uniqueSection: uniqueIndex("assessment_section_results_attempt_section_idx").on(
      table.assessmentAttemptId,
      table.sectionId,
    ),
  }),
);

export const diagnosticResults = pgTable(
  "diagnostic_results",
  {
    id: text("id").primaryKey(),
    assessmentAttemptId: text("assessment_attempt_id")
      .notNull()
      .references(() => assessmentAttempts.id, { onDelete: "cascade" }),
    readinessGradeId: text("readiness_grade_id").references(() => grades.id, {
      onDelete: "set null",
    }),
    readinessLabel: text("readiness_label").notNull(),
    subjectStrengths: text("subject_strengths").notNull().default("[]"),
    weakConceptIds: text("weak_concept_ids").notNull().default("[]"),
    missingPrerequisiteConceptIds: text("missing_prerequisite_concept_ids").notNull().default("[]"),
    recommendations: text("recommendations").notNull().default("[]"),
    explanation: text("explanation").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    attemptIdx: uniqueIndex("diagnostic_results_attempt_idx").on(table.assessmentAttemptId),
  }),
);

export const placementResults = pgTable(
  "placement_results",
  {
    id: text("id").primaryKey(),
    assessmentAttemptId: text("assessment_attempt_id")
      .notNull()
      .references(() => assessmentAttempts.id, { onDelete: "cascade" }),
    recommendedGradeId: text("recommended_grade_id").references(() => grades.id, {
      onDelete: "set null",
    }),
    startingLevel: text("starting_level").notNull(),
    confidence: doublePrecision("confidence").notNull().default(0),
    reviewQuestionIds: text("review_question_ids").notNull().default("[]"),
    recommendations: text("recommendations").notNull().default("[]"),
    explanation: text("explanation").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    attemptIdx: uniqueIndex("placement_results_attempt_idx").on(table.assessmentAttemptId),
  }),
);

export const questionAttempts = pgTable(
  "question_attempts",
  {
    id: text("id").primaryKey(),
    exerciseAttemptId: text("exercise_attempt_id").references(() => exerciseAttempts.id, {
      onDelete: "cascade",
    }),
    assessmentAttemptId: text("assessment_attempt_id").references(() => assessmentAttempts.id, {
      onDelete: "cascade",
    }),
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
    score: doublePrecision("score").notNull().default(0),
    maxScore: doublePrecision("max_score").notNull().default(0),
    answeredAt: timestamp("answered_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    uniqueQuestionAttempt: uniqueIndex("question_attempts_attempt_question_idx").on(
      table.exerciseAttemptId,
      table.questionId,
    ),
    assessmentQuestionAttempt: uniqueIndex("question_attempts_assessment_question_idx").on(
      table.assessmentAttemptId,
      table.questionId,
    ),
    questionIdx: index("question_attempts_question_idx").on(table.questionId, table.answeredAt),
  }),
);

export const userConceptMastery = pgTable(
  "user_concept_mastery",
  {
    profileId: text("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    conceptId: text("concept_id")
      .notNull()
      .references(() => concepts.id, { onDelete: "cascade" }),
    state: text("state").notNull().default("not-started"),
    score: doublePrecision("score").notNull().default(0),
    confidence: doublePrecision("confidence").notNull().default(0),
    evidenceCount: integer("evidence_count").notNull().default(0),
    evidenceTypeCount: integer("evidence_type_count").notNull().default(0),
    difficultyBandCount: integer("difficulty_band_count").notNull().default(0),
    lastPracticedAt: timestamp("last_practiced_at", { withTimezone: true }),
    nextReviewAt: timestamp("next_review_at", { withTimezone: true }),
    breakdown: text("breakdown").notNull().default("{}"),
    evidenceSummary: text("evidence_summary").notNull().default("[]"),
    currentSnapshotId: text("current_snapshot_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    primaryKey: primaryKey({ columns: [table.profileId, table.conceptId] }),
    profileStateIdx: index("user_concept_mastery_profile_state_idx").on(
      table.profileId,
      table.state,
      table.score,
    ),
    reviewIdx: index("user_concept_mastery_review_idx").on(table.profileId, table.nextReviewAt),
    conceptIdx: index("user_concept_mastery_concept_idx").on(table.conceptId),
  }),
);

export const masteryEvents = pgTable(
  "mastery_events",
  {
    id: text("id").primaryKey(),
    profileId: text("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    conceptId: text("concept_id")
      .notNull()
      .references(() => concepts.id, { onDelete: "cascade" }),
    eventType: text("event_type").notNull(),
    sourceId: text("source_id").notNull(),
    score: doublePrecision("score").notNull().default(0),
    difficulty: text("difficulty").notNull().default("balanced"),
    attempts: integer("attempts").notNull().default(1),
    hintsUsed: integer("hints_used").notNull().default(0),
    partialCredit: boolean("partial_credit").notNull().default(false),
    metadata: text("metadata").notNull().default("{}"),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    sourceIdx: uniqueIndex("mastery_events_profile_concept_source_idx").on(
      table.profileId,
      table.conceptId,
      table.eventType,
      table.sourceId,
    ),
    profileConceptIdx: index("mastery_events_profile_concept_idx").on(
      table.profileId,
      table.conceptId,
      table.occurredAt,
    ),
    eventSourceIdx: index("mastery_events_source_idx").on(table.eventType, table.sourceId),
  }),
);

export const masterySnapshots = pgTable(
  "mastery_snapshots",
  {
    id: text("id").primaryKey(),
    profileId: text("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    conceptId: text("concept_id")
      .notNull()
      .references(() => concepts.id, { onDelete: "cascade" }),
    state: text("state").notNull(),
    score: doublePrecision("score").notNull(),
    confidence: doublePrecision("confidence").notNull(),
    evidenceCount: integer("evidence_count").notNull(),
    evidenceTypeCount: integer("evidence_type_count").notNull(),
    difficultyBandCount: integer("difficulty_band_count").notNull(),
    lastPracticedAt: timestamp("last_practiced_at", { withTimezone: true }),
    nextReviewAt: timestamp("next_review_at", { withTimezone: true }),
    breakdown: text("breakdown").notNull().default("{}"),
    evidenceSummary: text("evidence_summary").notNull().default("[]"),
    reason: text("reason").notNull().default("Evidence updated."),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    profileConceptIdx: index("mastery_snapshots_profile_concept_idx").on(
      table.profileId,
      table.conceptId,
      table.createdAt,
    ),
  }),
);

export const masteryRules = pgTable(
  "mastery_rules",
  {
    id: text("id").primaryKey(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    configuration: text("configuration").notNull().default("{}"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({ slugIdx: uniqueIndex("mastery_rules_slug_idx").on(table.slug) }),
);

export const recommendationRules = pgTable(
  "recommendation_rules",
  {
    id: text("id").primaryKey(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    configuration: text("configuration").notNull().default("{}"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({ slugIdx: uniqueIndex("recommendation_rules_slug_idx").on(table.slug) }),
);

export const recommendations = pgTable(
  "recommendations",
  {
    id: text("id").primaryKey(),
    profileId: text("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    conceptId: text("concept_id").references(() => concepts.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    sourceKey: text("source_key").notNull(),
    title: text("title").notNull(),
    reason: text("reason").notNull(),
    priority: integer("priority").notNull().default(0),
    status: text("status").notNull().default("active"),
    metadata: text("metadata").notNull().default("{}"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
  },
  (table) => ({
    sourceIdx: uniqueIndex("recommendations_profile_kind_source_idx").on(
      table.profileId,
      table.kind,
      table.sourceKey,
    ),
    statusIdx: index("recommendations_profile_status_idx").on(
      table.profileId,
      table.status,
      table.priority,
    ),
    conceptIdx: index("recommendations_concept_idx").on(table.conceptId, table.status),
  }),
);

export const recommendationDismissals = pgTable(
  "recommendation_dismissals",
  {
    id: text("id").primaryKey(),
    recommendationId: text("recommendation_id")
      .notNull()
      .references(() => recommendations.id, { onDelete: "cascade" }),
    profileId: text("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    dismissedAt: timestamp("dismissed_at", { withTimezone: true }).notNull().defaultNow(),
    reason: text("reason"),
  },
  (table) => ({
    uniqueDismissal: uniqueIndex("recommendation_dismissals_profile_recommendation_idx").on(
      table.profileId,
      table.recommendationId,
    ),
    profileIdx: index("recommendation_dismissals_profile_idx").on(
      table.profileId,
      table.dismissedAt,
    ),
  }),
);

export const roadmaps = pgTable(
  "roadmaps",
  {
    id: text("id").primaryKey(),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    goal: text("goal").notNull().default(""),
    targetGradeId: text("target_grade_id").references(() => grades.id, { onDelete: "set null" }),
    targetDifficulty: text("target_difficulty").notNull().default("balanced"),
    estimatedDurationMinutes: integer("estimated_duration_minutes").notNull().default(0),
    coverImage: text("cover_image"),
    status: text("status").notNull().default("draft"),
    createdByProfileId: text("created_by_profile_id").references(() => profiles.id, {
      onDelete: "set null",
    }),
    currentVersionNumber: integer("current_version_number").notNull().default(0),
    publishedVersionId: text("published_version_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    slugIdx: uniqueIndex("roadmaps_slug_idx").on(table.slug),
    statusIdx: index("roadmaps_status_idx").on(table.status, table.updatedAt),
    targetGradeIdx: index("roadmaps_target_grade_idx").on(table.targetGradeId, table.status),
  }),
);

export const roadmapVersions = pgTable(
  "roadmap_versions",
  {
    id: text("id").primaryKey(),
    roadmapId: text("roadmap_id")
      .notNull()
      .references(() => roadmaps.id, { onDelete: "cascade" }),
    versionNumber: integer("version_number").notNull(),
    status: text("status").notNull().default("draft"),
    changeSummary: text("change_summary").notNull().default(""),
    snapshot: text("snapshot").notNull().default("{}"),
    createdByProfileId: text("created_by_profile_id").references(() => profiles.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    publishedAt: timestamp("published_at", { withTimezone: true }),
  },
  (table) => ({
    roadmapVersionIdx: uniqueIndex("roadmap_versions_roadmap_version_idx").on(
      table.roadmapId,
      table.versionNumber,
    ),
    statusIdx: index("roadmap_versions_status_idx").on(
      table.roadmapId,
      table.status,
      table.versionNumber,
    ),
  }),
);

export const roadmapSubjects = pgTable(
  "roadmap_subjects",
  {
    roadmapId: text("roadmap_id")
      .notNull()
      .references(() => roadmaps.id, { onDelete: "cascade" }),
    subjectId: text("subject_id")
      .notNull()
      .references(() => subjects.id, { onDelete: "restrict" }),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    primaryKey: primaryKey({ columns: [table.roadmapId, table.subjectId] }),
    subjectIdx: index("roadmap_subjects_subject_idx").on(table.subjectId, table.roadmapId),
  }),
);

export const roadmapPrerequisites = pgTable(
  "roadmap_prerequisites",
  {
    roadmapId: text("roadmap_id")
      .notNull()
      .references(() => roadmaps.id, { onDelete: "cascade" }),
    prerequisiteRoadmapId: text("prerequisite_roadmap_id")
      .notNull()
      .references(() => roadmaps.id, { onDelete: "restrict" }),
    isRequired: boolean("is_required").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    primaryKey: primaryKey({ columns: [table.roadmapId, table.prerequisiteRoadmapId] }),
    reverseIdx: index("roadmap_prerequisites_reverse_idx").on(
      table.prerequisiteRoadmapId,
      table.roadmapId,
    ),
  }),
);

export const roadmapNodes = pgTable(
  "roadmap_nodes",
  {
    id: text("id").primaryKey(),
    roadmapVersionId: text("roadmap_version_id")
      .notNull()
      .references(() => roadmapVersions.id, { onDelete: "cascade" }),
    nodeKey: text("node_key").notNull(),
    nodeType: text("node_type").notNull(),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    referenceId: text("reference_id"),
    referenceTitle: text("reference_title"),
    subjectId: text("subject_id").references(() => subjects.id, { onDelete: "set null" }),
    isRequired: boolean("is_required").notNull().default(true),
    isCheckpoint: boolean("is_checkpoint").notNull().default(false),
    isOptionalBranch: boolean("is_optional_branch").notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),
    estimatedDurationMinutes: integer("estimated_duration_minutes").notNull().default(0),
    metadata: text("metadata").notNull().default("{}"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    nodeKeyIdx: uniqueIndex("roadmap_nodes_version_key_idx").on(
      table.roadmapVersionId,
      table.nodeKey,
    ),
    orderIdx: index("roadmap_nodes_version_order_idx").on(
      table.roadmapVersionId,
      table.sortOrder,
      table.nodeKey,
    ),
    referenceIdx: index("roadmap_nodes_reference_idx").on(table.referenceId, table.nodeType),
  }),
);

export const roadmapEdges = pgTable(
  "roadmap_edges",
  {
    id: text("id").primaryKey(),
    roadmapVersionId: text("roadmap_version_id")
      .notNull()
      .references(() => roadmapVersions.id, { onDelete: "cascade" }),
    sourceNodeId: text("source_node_id")
      .notNull()
      .references(() => roadmapNodes.id, { onDelete: "cascade" }),
    targetNodeId: text("target_node_id")
      .notNull()
      .references(() => roadmapNodes.id, { onDelete: "cascade" }),
    edgeType: text("edge_type").notNull().default("requires"),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    edgeIdx: uniqueIndex("roadmap_edges_version_nodes_idx").on(
      table.roadmapVersionId,
      table.sourceNodeId,
      table.targetNodeId,
    ),
    orderIdx: index("roadmap_edges_version_order_idx").on(
      table.roadmapVersionId,
      table.sortOrder,
      table.id,
    ),
    targetIdx: index("roadmap_edges_target_idx").on(table.targetNodeId, table.edgeType),
  }),
);

export const userRoadmaps = pgTable(
  "user_roadmaps",
  {
    id: text("id").primaryKey(),
    profileId: text("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    roadmapId: text("roadmap_id")
      .notNull()
      .references(() => roadmaps.id, { onDelete: "cascade" }),
    roadmapVersionId: text("roadmap_version_id")
      .notNull()
      .references(() => roadmapVersions.id, { onDelete: "restrict" }),
    status: text("status").notNull().default("active"),
    selectedGoal: text("selected_goal"),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    profileRoadmapIdx: uniqueIndex("user_roadmaps_profile_roadmap_idx").on(
      table.profileId,
      table.roadmapId,
    ),
    profileStatusIdx: index("user_roadmaps_profile_status_idx").on(
      table.profileId,
      table.status,
      table.updatedAt,
    ),
    roadmapIdx: index("user_roadmaps_roadmap_idx").on(table.roadmapId, table.status),
  }),
);

export const userRoadmapProgress = pgTable(
  "user_roadmap_progress",
  {
    userRoadmapId: text("user_roadmap_id")
      .notNull()
      .references(() => userRoadmaps.id, { onDelete: "cascade" }),
    profileId: text("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    roadmapNodeId: text("roadmap_node_id")
      .notNull()
      .references(() => roadmapNodes.id, { onDelete: "cascade" }),
    status: text("status").notNull().default("locked"),
    completionPercentage: integer("completion_percentage").notNull().default(0),
    unlockedAt: timestamp("unlocked_at", { withTimezone: true }),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    primaryKey: primaryKey({ columns: [table.userRoadmapId, table.roadmapNodeId] }),
    profileStatusIdx: index("user_roadmap_progress_profile_status_idx").on(
      table.profileId,
      table.status,
      table.updatedAt,
    ),
    nodeIdx: index("user_roadmap_progress_node_idx").on(table.roadmapNodeId, table.status),
  }),
);

export const personalizedPaths = pgTable(
  "personalized_paths",
  {
    id: text("id").primaryKey(),
    profileId: text("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    roadmapId: text("roadmap_id")
      .notNull()
      .references(() => roadmaps.id, { onDelete: "cascade" }),
    userRoadmapId: text("user_roadmap_id").references(() => userRoadmaps.id, {
      onDelete: "cascade",
    }),
    currentGradeId: text("current_grade_id").references(() => grades.id, { onDelete: "set null" }),
    targetGradeId: text("target_grade_id").references(() => grades.id, { onDelete: "set null" }),
    selectedGoal: text("selected_goal"),
    weeklyStudyTimeMinutes: integer("weekly_study_time_minutes"),
    estimatedDurationMinutes: integer("estimated_duration_minutes").notNull().default(0),
    estimatedWeeks: integer("estimated_weeks"),
    includedTopics: text("included_topics").notNull().default("[]"),
    skippedMasteredTopics: text("skipped_mastered_topics").notNull().default("[]"),
    missingPrerequisites: text("missing_prerequisites").notNull().default("[]"),
    pathNodes: text("path_nodes").notNull().default("[]"),
    generatedAt: timestamp("generated_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    profileRoadmapIdx: index("personalized_paths_profile_roadmap_idx").on(
      table.profileId,
      table.roadmapId,
      table.generatedAt,
    ),
  }),
);

export const simulations = pgTable(
  "simulations",
  {
    id: text("id").primaryKey(),
    slug: text("slug").notNull().unique(),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    subjectId: text("subject_id")
      .notNull()
      .references(() => subjects.id, { onDelete: "restrict" }),
    status: text("status").notNull().default("draft"),
    estimatedDurationMinutes: integer("estimated_duration_minutes").notNull().default(0),
    currentVersionNumber: integer("current_version_number").notNull().default(0),
    publishedVersionId: text("published_version_id"),
    createdByProfileId: text("created_by_profile_id").references(() => profiles.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    subjectStatusIdx: index("simulations_subject_status_idx").on(
      table.subjectId,
      table.status,
      table.title,
    ),
  }),
);

export const simulationVersions = pgTable(
  "simulation_versions",
  {
    id: text("id").primaryKey(),
    simulationId: text("simulation_id")
      .notNull()
      .references(() => simulations.id, { onDelete: "cascade" }),
    versionNumber: integer("version_number").notNull(),
    status: text("status").notNull().default("draft"),
    definition: text("definition").notNull().default("{}"),
    changeSummary: text("change_summary").notNull().default(""),
    createdByProfileId: text("created_by_profile_id").references(() => profiles.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    publishedAt: timestamp("published_at", { withTimezone: true }),
  },
  (table) => ({
    versionIdx: uniqueIndex("simulation_versions_simulation_version_idx").on(
      table.simulationId,
      table.versionNumber,
    ),
  }),
);

export const simulationInputs = pgTable(
  "simulation_inputs",
  {
    simulationVersionId: text("simulation_version_id")
      .notNull()
      .references(() => simulationVersions.id, { onDelete: "cascade" }),
    inputKey: text("input_key").notNull(),
    label: text("label").notNull(),
    inputType: text("input_type").notNull(),
    configuration: text("configuration").notNull().default("{}"),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (table) => ({ primaryKey: primaryKey({ columns: [table.simulationVersionId, table.inputKey] }) }),
);

export const simulationPresets = pgTable(
  "simulation_presets",
  {
    id: text("id").primaryKey(),
    simulationId: text("simulation_id")
      .notNull()
      .references(() => simulations.id, { onDelete: "cascade" }),
    profileId: text("profile_id").references(() => profiles.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    values: text("values").notNull().default("{}"),
    isDefault: boolean("is_default").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    lookupIdx: index("simulation_presets_lookup_idx").on(
      table.simulationId,
      table.profileId,
      table.isDefault,
    ),
  }),
);

export const lessonSimulations = pgTable(
  "lesson_simulations",
  {
    lessonId: text("lesson_id")
      .notNull()
      .references(() => lessons.id, { onDelete: "cascade" }),
    simulationId: text("simulation_id")
      .notNull()
      .references(() => simulations.id, { onDelete: "cascade" }),
    instructions: text("instructions").notNull().default(""),
    sortOrder: integer("sort_order").notNull().default(0),
    isRequired: boolean("is_required").notNull().default(false),
  },
  (table) => ({ primaryKey: primaryKey({ columns: [table.lessonId, table.simulationId] }) }),
);

export const userSimulationSessions = pgTable(
  "user_simulation_sessions",
  {
    id: text("id").primaryKey(),
    profileId: text("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    simulationId: text("simulation_id")
      .notNull()
      .references(() => simulations.id, { onDelete: "restrict" }),
    simulationVersionId: text("simulation_version_id")
      .notNull()
      .references(() => simulationVersions.id, { onDelete: "restrict" }),
    status: text("status").notNull().default("active"),
    inputs: text("inputs").notNull().default("{}"),
    state: text("state").notNull().default("{}"),
    elapsedSeconds: integer("elapsed_seconds").notNull().default(0),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    pausedAt: timestamp("paused_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    profileIdx: index("user_simulation_sessions_profile_idx").on(
      table.profileId,
      table.simulationId,
      table.updatedAt,
    ),
  }),
);

export const simulationResults = pgTable(
  "simulation_results",
  {
    id: text("id").primaryKey(),
    sessionId: text("session_id")
      .notNull()
      .references(() => userSimulationSessions.id, { onDelete: "cascade" }),
    profileId: text("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    simulationId: text("simulation_id")
      .notNull()
      .references(() => simulations.id, { onDelete: "restrict" }),
    result: text("result").notNull().default("{}"),
    completionPercentage: integer("completion_percentage").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    profileIdx: index("simulation_results_profile_idx").on(
      table.profileId,
      table.simulationId,
      table.createdAt,
    ),
  }),
);

export const laboratoryActivities = pgTable(
  "laboratory_activities",
  {
    id: text("id").primaryKey(),
    slug: text("slug").notNull().unique(),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    subjectId: text("subject_id")
      .notNull()
      .references(() => subjects.id, { onDelete: "restrict" }),
    mode: text("mode").notNull().default("real-world"),
    status: text("status").notNull().default("draft"),
    objective: text("objective").notNull().default(""),
    theory: text("theory").notNull().default(""),
    materials: text("materials").notNull().default("[]"),
    safetyNotes: text("safety_notes").notNull().default("[]"),
    analysisPrompt: text("analysis_prompt").notNull().default(""),
    graphingInstructions: text("graphing_instructions").notNull().default(""),
    questions: text("questions").notNull().default("[]"),
    conclusionPrompt: text("conclusion_prompt").notNull().default(""),
    extensionActivity: text("extension_activity").notNull().default(""),
    simulationId: text("simulation_id").references(() => simulations.id, { onDelete: "set null" }),
    estimatedDurationMinutes: integer("estimated_duration_minutes").notNull().default(0),
    createdByProfileId: text("created_by_profile_id").references(() => profiles.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    publishedAt: timestamp("published_at", { withTimezone: true }),
  },
  (table) => ({
    subjectStatusIdx: index("laboratory_activities_subject_status_idx").on(
      table.subjectId,
      table.status,
      table.title,
    ),
    modeIdx: index("laboratory_activities_mode_idx").on(table.mode, table.status, table.title),
  }),
);

export const laboratorySteps = pgTable(
  "laboratory_steps",
  {
    id: text("id").primaryKey(),
    activityId: text("activity_id")
      .notNull()
      .references(() => laboratoryActivities.id, { onDelete: "cascade" }),
    stepType: text("step_type").notNull().default("procedure"),
    title: text("title").notNull(),
    instructions: text("instructions").notNull().default(""),
    expectedObservation: text("expected_observation").notNull().default(""),
    sortOrder: integer("sort_order").notNull().default(0),
    isRequired: boolean("is_required").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    activityIdx: index("laboratory_steps_activity_idx").on(table.activityId, table.sortOrder),
  }),
);

export const laboratoryVariables = pgTable(
  "laboratory_variables",
  {
    id: text("id").primaryKey(),
    activityId: text("activity_id")
      .notNull()
      .references(() => laboratoryActivities.id, { onDelete: "cascade" }),
    variableKey: text("variable_key").notNull(),
    label: text("label").notNull(),
    symbol: text("symbol").notNull().default(""),
    role: text("role").notNull().default("measured"),
    dataType: text("data_type").notNull().default("number"),
    unit: text("unit"),
    description: text("description").notNull().default(""),
    defaultValue: text("default_value"),
    minValue: doublePrecision("min_value"),
    maxValue: doublePrecision("max_value"),
    uncertainty: doublePrecision("uncertainty"),
    significantFigures: integer("significant_figures"),
    theoreticalValue: doublePrecision("theoretical_value"),
    configuration: text("configuration").notNull().default("{}"),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    activityIdx: index("laboratory_variables_activity_idx").on(
      table.activityId,
      table.role,
      table.sortOrder,
    ),
    keyIdx: uniqueIndex("laboratory_variables_activity_key_idx").on(
      table.activityId,
      table.variableKey,
    ),
  }),
);

export const laboratorySessions = pgTable(
  "laboratory_sessions",
  {
    id: text("id").primaryKey(),
    profileId: text("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    activityId: text("activity_id")
      .notNull()
      .references(() => laboratoryActivities.id, { onDelete: "restrict" }),
    status: text("status").notNull().default("active"),
    mode: text("mode").notNull(),
    simulationSessionId: text("simulation_session_id").references(() => userSimulationSessions.id, {
      onDelete: "set null",
    }),
    inputs: text("inputs").notNull().default("{}"),
    state: text("state").notNull().default("{}"),
    elapsedSeconds: integer("elapsed_seconds").notNull().default(0),
    completionPercentage: integer("completion_percentage").notNull().default(0),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    profileActivityIdx: index("laboratory_sessions_profile_activity_idx").on(
      table.profileId,
      table.activityId,
      table.updatedAt,
    ),
    statusIdx: index("laboratory_sessions_status_idx").on(
      table.profileId,
      table.status,
      table.updatedAt,
    ),
  }),
);

export const laboratoryObservations = pgTable(
  "laboratory_observations",
  {
    id: text("id").primaryKey(),
    sessionId: text("session_id")
      .notNull()
      .references(() => laboratorySessions.id, { onDelete: "cascade" }),
    stepId: text("step_id").references(() => laboratorySteps.id, { onDelete: "set null" }),
    prompt: text("prompt").notNull().default(""),
    notes: text("notes").notNull().default(""),
    recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull().defaultNow(),
    sortOrder: integer("sort_order").notNull().default(0),
    metadata: text("metadata").notNull().default("{}"),
  },
  (table) => ({
    sessionIdx: index("laboratory_observations_session_idx").on(
      table.sessionId,
      table.sortOrder,
      table.recordedAt,
    ),
  }),
);

export const laboratoryMeasurements = pgTable(
  "laboratory_measurements",
  {
    id: text("id").primaryKey(),
    sessionId: text("session_id")
      .notNull()
      .references(() => laboratorySessions.id, { onDelete: "cascade" }),
    variableId: text("variable_id")
      .notNull()
      .references(() => laboratoryVariables.id, { onDelete: "cascade" }),
    observationId: text("observation_id").references(() => laboratoryObservations.id, {
      onDelete: "set null",
    }),
    rowIndex: integer("row_index").notNull(),
    numericValue: doublePrecision("numeric_value"),
    textValue: text("text_value"),
    unit: text("unit"),
    uncertainty: doublePrecision("uncertainty"),
    significantFigures: integer("significant_figures"),
    source: text("source").notNull().default("manual"),
    notes: text("notes").notNull().default(""),
    recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    sessionIdx: index("laboratory_measurements_session_idx").on(
      table.sessionId,
      table.rowIndex,
      table.variableId,
    ),
    rowIdx: uniqueIndex("laboratory_measurements_session_variable_row_idx").on(
      table.sessionId,
      table.variableId,
      table.rowIndex,
    ),
  }),
);

export const laboratoryReports = pgTable(
  "laboratory_reports",
  {
    id: text("id").primaryKey(),
    sessionId: text("session_id")
      .notNull()
      .unique()
      .references(() => laboratorySessions.id, { onDelete: "cascade" }),
    profileId: text("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    status: text("status").notNull().default("draft"),
    title: text("title").notNull().default(""),
    abstract: text("abstract").notNull().default(""),
    sections: text("sections").notNull().default("[]"),
    tables: text("tables").notNull().default("[]"),
    charts: text("charts").notNull().default("[]"),
    formulas: text("formulas").notNull().default("[]"),
    images: text("images").notNull().default("[]"),
    conclusion: text("conclusion").notNull().default(""),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    profileStatusIdx: index("laboratory_reports_profile_status_idx").on(
      table.profileId,
      table.status,
      table.updatedAt,
    ),
  }),
);

export const laboratoryFeedback = pgTable(
  "laboratory_feedback",
  {
    id: text("id").primaryKey(),
    reportId: text("report_id")
      .notNull()
      .references(() => laboratoryReports.id, { onDelete: "cascade" }),
    authorProfileId: text("author_profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    rubric: text("rubric").notNull().default("{}"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    reportIdx: index("laboratory_feedback_report_idx").on(table.reportId, table.createdAt),
  }),
);

export type Roadmap = typeof roadmaps.$inferSelect;
export type NewRoadmap = typeof roadmaps.$inferInsert;
export type RoadmapVersion = typeof roadmapVersions.$inferSelect;
export type NewRoadmapVersion = typeof roadmapVersions.$inferInsert;
export type RoadmapSubject = typeof roadmapSubjects.$inferSelect;
export type NewRoadmapSubject = typeof roadmapSubjects.$inferInsert;
export type RoadmapPrerequisite = typeof roadmapPrerequisites.$inferSelect;
export type NewRoadmapPrerequisite = typeof roadmapPrerequisites.$inferInsert;
export type RoadmapNode = typeof roadmapNodes.$inferSelect;
export type NewRoadmapNode = typeof roadmapNodes.$inferInsert;
export type RoadmapEdge = typeof roadmapEdges.$inferSelect;
export type NewRoadmapEdge = typeof roadmapEdges.$inferInsert;
export type UserRoadmap = typeof userRoadmaps.$inferSelect;
export type NewUserRoadmap = typeof userRoadmaps.$inferInsert;
export type UserRoadmapProgress = typeof userRoadmapProgress.$inferSelect;
export type NewUserRoadmapProgress = typeof userRoadmapProgress.$inferInsert;
export type PersonalizedPath = typeof personalizedPaths.$inferSelect;
export type NewPersonalizedPath = typeof personalizedPaths.$inferInsert;
export type Simulation = typeof simulations.$inferSelect;
export type NewSimulation = typeof simulations.$inferInsert;
export type SimulationVersion = typeof simulationVersions.$inferSelect;
export type NewSimulationVersion = typeof simulationVersions.$inferInsert;
export type SimulationInput = typeof simulationInputs.$inferSelect;
export type NewSimulationInput = typeof simulationInputs.$inferInsert;
export type SimulationPreset = typeof simulationPresets.$inferSelect;
export type NewSimulationPreset = typeof simulationPresets.$inferInsert;
export type LessonSimulation = typeof lessonSimulations.$inferSelect;
export type NewLessonSimulation = typeof lessonSimulations.$inferInsert;
export type UserSimulationSession = typeof userSimulationSessions.$inferSelect;
export type NewUserSimulationSession = typeof userSimulationSessions.$inferInsert;
export type SimulationResult = typeof simulationResults.$inferSelect;
export type NewSimulationResult = typeof simulationResults.$inferInsert;
export const studyGoals = pgTable(
  "study_goals",
  {
    id: text("id").primaryKey(),
    profileId: text("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    goalType: text("goal_type").notNull(),
    targetId: text("target_id"),
    targetTitle: text("target_title").notNull().default(""),
    startDate: text("start_date").notNull(),
    targetDate: text("target_date").notNull(),
    weeklyStudyMinutes: integer("weekly_study_minutes").notNull(),
    availableDays: text("available_days").notNull().default("[1,2,3,4,5]"),
    sessionDurationMinutes: integer("session_duration_minutes").notNull().default(30),
    prioritySubjectIds: text("priority_subject_ids").notNull().default("[]"),
    restDays: text("rest_days").notNull().default("[]"),
    difficultyPreference: text("difficulty_preference").notNull().default("balanced"),
    reviewFrequencyDays: integer("review_frequency_days").notNull().default(7),
    status: text("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    profileStatusIdx: index("study_goals_profile_status_idx").on(
      table.profileId,
      table.status,
      table.updatedAt,
    ),
    targetIdx: index("study_goals_target_idx").on(table.targetId, table.goalType),
  }),
);

export const studyPlans = pgTable(
  "study_plans",
  {
    id: text("id").primaryKey(),
    profileId: text("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    goalId: text("goal_id")
      .notNull()
      .references(() => studyGoals.id, { onDelete: "cascade" }),
    sourceType: text("source_type").notNull().default("goal"),
    sourceId: text("source_id"),
    status: text("status").notNull().default("active"),
    generatedAt: timestamp("generated_at", { withTimezone: true }).notNull().defaultNow(),
    targetDate: text("target_date").notNull(),
    weeklyStudyMinutes: integer("weekly_study_minutes").notNull(),
    totalMinutes: integer("total_minutes").notNull().default(0),
    scheduledMinutes: integer("scheduled_minutes").notNull().default(0),
    unallocatedMinutes: integer("unallocated_minutes").notNull().default(0),
    capacityMinutes: integer("capacity_minutes").notNull().default(0),
    realism: text("realism").notNull().default("realistic"),
    warnings: text("warnings").notNull().default("[]"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    profileStatusIdx: index("study_plans_profile_status_idx").on(
      table.profileId,
      table.status,
      table.updatedAt,
    ),
    goalIdx: index("study_plans_goal_idx").on(table.goalId, table.status, table.updatedAt),
  }),
);

export const studyPlanItems = pgTable(
  "study_plan_items",
  {
    id: text("id").primaryKey(),
    planId: text("plan_id")
      .notNull()
      .references(() => studyPlans.id, { onDelete: "cascade" }),
    itemType: text("item_type").notNull(),
    sourceId: text("source_id"),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    subjectId: text("subject_id").references(() => subjects.id, { onDelete: "set null" }),
    estimatedMinutes: integer("estimated_minutes").notNull(),
    priority: integer("priority").notNull().default(0),
    sortOrder: integer("sort_order").notNull().default(0),
    metadata: text("metadata").notNull().default("{}"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    planOrderIdx: index("study_plan_items_plan_order_idx").on(
      table.planId,
      table.sortOrder,
      table.id,
    ),
    sourceIdx: index("study_plan_items_source_idx").on(table.sourceId, table.itemType),
  }),
);

export const studySessions = pgTable(
  "study_sessions",
  {
    id: text("id").primaryKey(),
    profileId: text("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    planId: text("plan_id")
      .notNull()
      .references(() => studyPlans.id, { onDelete: "cascade" }),
    planItemId: text("plan_item_id")
      .notNull()
      .references(() => studyPlanItems.id, { onDelete: "cascade" }),
    scheduledDate: text("scheduled_date").notNull(),
    startMinute: integer("start_minute").notNull(),
    durationMinutes: integer("duration_minutes").notNull(),
    status: text("status").notNull().default("scheduled"),
    rescheduledFromDate: text("rescheduled_from_date"),
    skipReason: text("skip_reason"),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    profileDateIdx: index("study_sessions_profile_date_idx").on(
      table.profileId,
      table.scheduledDate,
      table.startMinute,
    ),
    planStatusIdx: index("study_sessions_plan_status_idx").on(
      table.planId,
      table.status,
      table.scheduledDate,
    ),
    itemIdx: index("study_sessions_item_idx").on(table.planItemId, table.status),
  }),
);

export const studyAvailability = pgTable(
  "study_availability",
  {
    id: text("id").primaryKey(),
    profileId: text("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    weekday: integer("weekday").notNull(),
    startMinute: integer("start_minute").notNull(),
    endMinute: integer("end_minute").notNull(),
    maxMinutes: integer("max_minutes"),
    label: text("label").notNull().default("Study time"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    profileWeekdayIdx: index("study_availability_profile_weekday_idx").on(
      table.profileId,
      table.weekday,
      table.startMinute,
    ),
    windowIdx: uniqueIndex("study_availability_window_idx").on(
      table.profileId,
      table.weekday,
      table.startMinute,
      table.endMinute,
    ),
  }),
);

export const studyExceptions = pgTable(
  "study_exceptions",
  {
    id: text("id").primaryKey(),
    profileId: text("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    exceptionDate: text("exception_date").notNull(),
    kind: text("kind").notNull(),
    startMinute: integer("start_minute"),
    endMinute: integer("end_minute"),
    reason: text("reason").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    profileDateIdx: index("study_exceptions_profile_date_idx").on(
      table.profileId,
      table.exceptionDate,
      table.startMinute,
    ),
  }),
);

export const studyCompletionEvents = pgTable(
  "study_completion_events",
  {
    id: text("id").primaryKey(),
    profileId: text("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    sessionId: text("session_id")
      .notNull()
      .references(() => studySessions.id, { onDelete: "cascade" }),
    planItemId: text("plan_item_id")
      .notNull()
      .references(() => studyPlanItems.id, { onDelete: "cascade" }),
    eventType: text("event_type").notNull(),
    minutes: integer("minutes").notNull().default(0),
    metadata: text("metadata").notNull().default("{}"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    sessionEventIdx: uniqueIndex("study_completion_events_session_event_idx").on(
      table.sessionId,
      table.eventType,
    ),
    profileIdx: index("study_completion_events_profile_idx").on(table.profileId, table.createdAt),
    itemIdx: index("study_completion_events_item_idx").on(table.planItemId, table.eventType),
  }),
);

export const searchIndexState = pgTable("search_index_state", {
  id: integer("id").primaryKey(),
  sourceRevision: integer("source_revision").notNull().default(0),
  indexedRevision: integer("indexed_revision").notNull().default(-1),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const searchDocuments = pgTable(
  "search_documents",
  {
    id: text("id").primaryKey(),
    resourceType: text("resource_type").notNull(),
    resourceId: text("resource_id").notNull(),
    profileId: text("profile_id").references(() => profiles.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    content: text("content").notNull().default(""),
    href: text("href"),
    metadataJson: text("metadata_json").notNull().default("{}"),
    searchVector: text("search_vector")
      .notNull()
      .default(sql`''::tsvector`),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    resourceIdx: index("search_documents_resource_idx").on(table.resourceType, table.resourceId),
    profileIdx: index("search_documents_profile_idx").on(table.profileId, table.updatedAt),
    resourceProfileIdx: uniqueIndex("search_documents_resource_profile_idx").on(
      table.resourceType,
      table.resourceId,
      table.profileId,
    ),
  }),
);

export const searchRecentQueries = pgTable(
  "search_recent_queries",
  {
    id: text("id").primaryKey(),
    profileId: text("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    query: text("query").notNull(),
    filtersJson: text("filters_json").notNull().default("{}"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    profileQueryIdx: uniqueIndex("search_recent_queries_profile_query_idx").on(
      table.profileId,
      table.query,
    ),
    profileCreatedIdx: index("search_recent_queries_profile_created_idx").on(
      table.profileId,
      table.createdAt,
    ),
  }),
);

export const learningSessions = pgTable(
  "learning_sessions",
  {
    id: text("id").primaryKey(),
    profileId: text("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    sessionType: text("session_type").notNull(),
    sourceType: text("source_type"),
    sourceId: text("source_id"),
    status: text("status").notNull().default("active"),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    durationSeconds: integer("duration_seconds").notNull().default(0),
    metadataJson: text("metadata_json").notNull().default("{}"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    profileStartedIdx: index("learning_sessions_profile_started_idx").on(
      table.profileId,
      table.startedAt,
    ),
    sourceIdx: index("learning_sessions_source_idx").on(
      table.sourceType,
      table.sourceId,
      table.status,
    ),
  }),
);

export const activityEvents = pgTable(
  "activity_events",
  {
    id: text("id").primaryKey(),
    profileId: text("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    eventType: text("event_type").notNull(),
    resourceType: text("resource_type"),
    resourceId: text("resource_id"),
    subjectId: text("subject_id").references(() => subjects.id, { onDelete: "set null" }),
    gradeId: text("grade_id").references(() => grades.id, { onDelete: "set null" }),
    conceptId: text("concept_id").references(() => concepts.id, { onDelete: "set null" }),
    learningSessionId: text("learning_session_id").references(() => learningSessions.id, {
      onDelete: "set null",
    }),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
    durationSeconds: integer("duration_seconds").notNull().default(0),
    score: doublePrecision("score"),
    isCorrect: integer("is_correct"),
    hintsUsed: integer("hints_used").notNull().default(0),
    attemptNumber: integer("attempt_number").notNull().default(1),
    responseTimeMs: integer("response_time_ms"),
    dedupeKey: text("dedupe_key"),
    metadataJson: text("metadata_json").notNull().default("{}"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    profileEventDedupeIdx: uniqueIndex("activity_events_profile_event_dedupe_idx").on(
      table.profileId,
      table.eventType,
      table.dedupeKey,
    ),
    profileOccurredIdx: index("activity_events_profile_occurred_idx").on(
      table.profileId,
      table.occurredAt,
      table.eventType,
    ),
    resourceIdx: index("activity_events_resource_idx").on(
      table.resourceType,
      table.resourceId,
      table.occurredAt,
    ),
    subjectIdx: index("activity_events_subject_idx").on(table.subjectId, table.occurredAt),
    conceptIdx: index("activity_events_concept_idx").on(table.conceptId, table.occurredAt),
  }),
);

export const analyticsSnapshots = pgTable(
  "analytics_snapshots",
  {
    id: text("id").primaryKey(),
    profileId: text("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    snapshotType: text("snapshot_type").notNull(),
    snapshotDate: text("snapshot_date").notNull(),
    metricsJson: text("metrics_json").notNull().default("{}"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    profileTypeDateIdx: uniqueIndex("analytics_snapshots_profile_type_date_idx").on(
      table.profileId,
      table.snapshotType,
      table.snapshotDate,
    ),
    profileDateIdx: index("analytics_snapshots_profile_date_idx").on(
      table.profileId,
      table.snapshotDate,
    ),
  }),
);

export const learnerMetrics = pgTable(
  "learner_metrics",
  {
    id: text("id").primaryKey(),
    profileId: text("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    metricDate: text("metric_date").notNull(),
    timeStudiedSeconds: integer("time_studied_seconds").notNull().default(0),
    lessonsStarted: integer("lessons_started").notNull().default(0),
    lessonsCompleted: integer("lessons_completed").notNull().default(0),
    questionsAttempted: integer("questions_attempted").notNull().default(0),
    correctQuestions: integer("correct_questions").notNull().default(0),
    accuracy: doublePrecision("accuracy").notNull().default(0),
    assessmentCount: integer("assessment_count").notNull().default(0),
    averageAssessmentScore: doublePrecision("average_assessment_score").notNull().default(0),
    hintsUsed: integer("hints_used").notNull().default(0),
    attemptCount: integer("attempt_count").notNull().default(0),
    averageResponseTimeMs: doublePrecision("average_response_time_ms").notNull().default(0),
    studyDays: integer("study_days").notNull().default(0),
    streakDays: integer("streak_days").notNull().default(0),
    consistencyScore: doublePrecision("consistency_score").notNull().default(0),
    masteryScore: doublePrecision("mastery_score").notNull().default(0),
    masteredConcepts: integer("mastered_concepts").notNull().default(0),
    weakConcepts: integer("weak_concepts").notNull().default(0),
    metadataJson: text("metadata_json").notNull().default("{}"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    profileDateIdx: uniqueIndex("learner_metrics_profile_date_idx").on(
      table.profileId,
      table.metricDate,
    ),
  }),
);

export const contentMetrics = pgTable(
  "content_metrics",
  {
    id: text("id").primaryKey(),
    resourceType: text("resource_type").notNull(),
    resourceId: text("resource_id").notNull(),
    metricDate: text("metric_date").notNull(),
    subjectId: text("subject_id").references(() => subjects.id, { onDelete: "set null" }),
    gradeId: text("grade_id").references(() => grades.id, { onDelete: "set null" }),
    conceptId: text("concept_id").references(() => concepts.id, { onDelete: "set null" }),
    attemptCount: integer("attempt_count").notNull().default(0),
    completionCount: integer("completion_count").notNull().default(0),
    correctCount: integer("correct_count").notNull().default(0),
    accuracy: doublePrecision("accuracy").notNull().default(0),
    averageResponseTimeMs: doublePrecision("average_response_time_ms").notNull().default(0),
    averageAttempts: doublePrecision("average_attempts").notNull().default(0),
    hintRate: doublePrecision("hint_rate").notNull().default(0),
    discriminationIndex: doublePrecision("discrimination_index").notNull().default(0),
    supportCount: integer("support_count").notNull().default(0),
    metadataJson: text("metadata_json").notNull().default("{}"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    resourceDateIdx: uniqueIndex("content_metrics_resource_date_idx").on(
      table.resourceType,
      table.resourceId,
      table.metricDate,
    ),
    subjectDateIdx: index("content_metrics_subject_date_idx").on(table.subjectId, table.metricDate),
    supportIdx: index("content_metrics_support_idx").on(table.supportCount, table.accuracy),
  }),
);

export const backupSettings = pgTable("backup_settings", {
  id: integer("id").primaryKey(),
  enabled: boolean("enabled").notNull().default(false),
  schedule: text("schedule").notNull().default("weekly"),
  backupType: text("backup_type").notNull().default("full"),
  retentionCount: integer("retention_count").notNull().default(5),
  location: text("location").notNull().default("backups"),
  encryptionEnabled: boolean("encryption_enabled").notNull().default(false),
  lastRunAt: timestamp("last_run_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const backupArtifacts = pgTable(
  "backup_artifacts",
  {
    id: text("id").primaryKey(),
    kind: text("kind").notNull(),
    format: text("format").notNull(),
    storageKey: text("storage_key").notNull(),
    fileName: text("file_name").notNull(),
    contentType: text("content_type").notNull(),
    byteSize: integer("byte_size").notNull().default(0),
    checksum: text("checksum").notNull(),
    manifestJson: text("manifest_json").notNull().default("{}"),
    encryptionEnabled: boolean("encryption_enabled").notNull().default(false),
    status: text("status").notNull().default("ready"),
    createdByProfileId: text("created_by_profile_id").references(() => profiles.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    errorMessage: text("error_message"),
  },
  (table) => ({
    createdIdx: index("backup_artifacts_created_idx").on(table.createdAt, table.status),
    kindIdx: index("backup_artifacts_kind_idx").on(table.kind, table.createdAt),
    storageKeyIdx: uniqueIndex("backup_artifacts_storage_key_idx").on(table.storageKey),
  }),
);

export const restoreRuns = pgTable(
  "restore_runs",
  {
    id: text("id").primaryKey(),
    backupId: text("backup_id").references(() => backupArtifacts.id, { onDelete: "set null" }),
    profileId: text("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    sourceFileName: text("source_file_name"),
    mode: text("mode").notNull(),
    status: text("status").notNull(),
    packageChecksum: text("package_checksum").notNull(),
    conflictCount: integer("conflict_count").notNull().default(0),
    insertedCount: integer("inserted_count").notNull().default(0),
    updatedCount: integer("updated_count").notNull().default(0),
    previewJson: text("preview_json").notNull().default("{}"),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    errorMessage: text("error_message"),
  },
  (table) => ({
    profileStartedIdx: index("restore_runs_profile_started_idx").on(
      table.profileId,
      table.startedAt,
    ),
  }),
);

export const aiSettings = pgTable("ai_settings", {
  id: integer("id").primaryKey(),
  mode: text("mode").notNull().default("disabled"),
  localBaseUrl: text("local_base_url").notNull().default("http://127.0.0.1:11434"),
  localModel: text("local_model").notNull().default("llama3.2"),
  remoteBaseUrl: text("remote_base_url").notNull().default("https://api.openai.com/v1"),
  remoteModel: text("remote_model").notNull().default("gpt-4o-mini"),
  remoteApiKeyCiphertext: text("remote_api_key_ciphertext"),
  maxTokens: integer("max_tokens").notNull().default(800),
  temperature: doublePrecision("temperature").notNull().default(0.2),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const aiGenerations = pgTable(
  "ai_generations",
  {
    id: text("id").primaryKey(),
    profileId: text("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    task: text("task").notNull(),
    mode: text("mode").notNull(),
    provider: text("provider").notNull(),
    model: text("model").notNull(),
    instruction: text("instruction").notNull(),
    groundingJson: text("grounding_json").notNull().default("[]"),
    outputText: text("output_text").notNull(),
    status: text("status").notNull().default("generated"),
    reviewedByProfileId: text("reviewed_by_profile_id").references(() => profiles.id, {
      onDelete: "set null",
    }),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    profileCreatedIdx: index("ai_generations_profile_created_idx").on(
      table.profileId,
      table.createdAt,
    ),
    statusIdx: index("ai_generations_status_idx").on(table.status, table.createdAt),
  }),
);

export const classes = pgTable(
  "classes",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    joinCode: text("join_code").notNull(),
    subjectIds: text("subject_ids").notNull().default("[]"),
    gradeIds: text("grade_ids").notNull().default("[]"),
    createdByProfileId: text("created_by_profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    joinCodeIdx: uniqueIndex("classes_join_code_idx").on(table.joinCode),
    createdByIdx: index("classes_created_by_idx").on(table.createdByProfileId, table.createdAt),
  }),
);

export const classMembers = pgTable(
  "class_members",
  {
    classId: text("class_id")
      .notNull()
      .references(() => classes.id, { onDelete: "cascade" }),
    profileId: text("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    status: text("status").notNull().default("active"),
    joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    primaryKey: primaryKey({ columns: [table.classId, table.profileId] }),
    profileIdx: index("class_members_profile_idx").on(
      table.profileId,
      table.status,
      table.joinedAt,
    ),
  }),
);

export const classTeachers = pgTable(
  "class_teachers",
  {
    classId: text("class_id")
      .notNull()
      .references(() => classes.id, { onDelete: "cascade" }),
    profileId: text("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    role: text("role").notNull().default("teacher"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    primaryKey: primaryKey({ columns: [table.classId, table.profileId] }),
    profileIdx: index("class_teachers_profile_idx").on(
      table.profileId,
      table.role,
      table.createdAt,
    ),
  }),
);

export const invitations = pgTable(
  "invitations",
  {
    id: text("id").primaryKey(),
    classId: text("class_id")
      .notNull()
      .references(() => classes.id, { onDelete: "cascade" }),
    role: text("role").notNull(),
    code: text("code").notNull(),
    invitedProfileId: text("invited_profile_id").references(() => profiles.id, {
      onDelete: "cascade",
    }),
    invitedByProfileId: text("invited_by_profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "restrict" }),
    status: text("status").notNull().default("pending"),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    acceptedByProfileId: text("accepted_by_profile_id").references(() => profiles.id, {
      onDelete: "set null",
    }),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    codeIdx: uniqueIndex("invitations_code_idx").on(table.code),
    classStatusIdx: index("invitations_class_status_idx").on(
      table.classId,
      table.status,
      table.createdAt,
    ),
    profileStatusIdx: index("invitations_profile_status_idx").on(
      table.invitedProfileId,
      table.status,
      table.createdAt,
    ),
  }),
);

export const assignments = pgTable(
  "assignments",
  {
    id: text("id").primaryKey(),
    classId: text("class_id")
      .notNull()
      .references(() => classes.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    instructions: text("instructions").notNull().default(""),
    resourceType: text("resource_type").notNull(),
    resourceId: text("resource_id").notNull(),
    resourceTitle: text("resource_title").notNull(),
    targetScope: text("target_scope").notNull(),
    startAt: timestamp("start_at", { withTimezone: true }),
    dueAt: timestamp("due_at", { withTimezone: true }),
    attemptLimit: integer("attempt_limit"),
    lateSubmissionRule: text("late_submission_rule").notNull().default("flag"),
    status: text("status").notNull().default("published"),
    createdByProfileId: text("created_by_profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    classStatusIdx: index("assignments_class_status_idx").on(
      table.classId,
      table.status,
      table.dueAt,
    ),
    resourceIdx: index("assignments_resource_idx").on(table.resourceType, table.resourceId),
  }),
);

export const assignmentTargets = pgTable(
  "assignment_targets",
  {
    assignmentId: text("assignment_id")
      .notNull()
      .references(() => assignments.id, { onDelete: "cascade" }),
    profileId: text("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    primaryKey: primaryKey({ columns: [table.assignmentId, table.profileId] }),
    profileIdx: index("assignment_targets_profile_idx").on(table.profileId, table.assignmentId),
  }),
);

export const assignmentSubmissions = pgTable(
  "assignment_submissions",
  {
    id: text("id").primaryKey(),
    assignmentId: text("assignment_id")
      .notNull()
      .references(() => assignments.id, { onDelete: "cascade" }),
    profileId: text("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    attemptNumber: integer("attempt_number").notNull(),
    status: text("status").notNull().default("submitted"),
    responseJson: text("response_json").notNull().default("{}"),
    isLate: boolean("is_late").notNull().default(false),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    returnedAt: timestamp("returned_at", { withTimezone: true }),
    grade: doublePrecision("grade"),
    gradeMax: doublePrecision("grade_max").notNull().default(100),
    reviewedByProfileId: text("reviewed_by_profile_id").references(() => profiles.id, {
      onDelete: "set null",
    }),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    attemptIdx: index("assignment_submissions_assignment_idx").on(
      table.assignmentId,
      table.profileId,
      table.attemptNumber,
    ),
    profileIdx: index("assignment_submissions_profile_idx").on(
      table.profileId,
      table.status,
      table.submittedAt,
    ),
  }),
);

export const gradingRubrics = pgTable(
  "grading_rubrics",
  {
    id: text("id").primaryKey(),
    assignmentId: text("assignment_id")
      .notNull()
      .references(() => assignments.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    criteriaJson: text("criteria_json").notNull().default("[]"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({ assignmentIdx: index("grading_rubrics_assignment_idx").on(table.assignmentId) }),
);

export const teacherFeedback = pgTable(
  "teacher_feedback",
  {
    id: text("id").primaryKey(),
    submissionId: text("submission_id")
      .notNull()
      .references(() => assignmentSubmissions.id, { onDelete: "cascade" }),
    teacherProfileId: text("teacher_profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "restrict" }),
    body: text("body"),
    grade: doublePrecision("grade"),
    gradeMax: doublePrecision("grade_max").notNull().default(100),
    rubricScoresJson: text("rubric_scores_json").notNull().default("{}"),
    returnForResubmission: boolean("return_for_resubmission").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    submissionIdx: index("teacher_feedback_submission_idx").on(table.submissionId, table.createdAt),
  }),
);

export type SearchIndexState = typeof searchIndexState.$inferSelect;
export type SearchDocument = typeof searchDocuments.$inferSelect;
export type SearchRecentQuery = typeof searchRecentQueries.$inferSelect;
export type LearningSession = typeof learningSessions.$inferSelect;
export type NewLearningSession = typeof learningSessions.$inferInsert;
export type ActivityEvent = typeof activityEvents.$inferSelect;
export type NewActivityEvent = typeof activityEvents.$inferInsert;
export type AnalyticsSnapshot = typeof analyticsSnapshots.$inferSelect;
export type NewAnalyticsSnapshot = typeof analyticsSnapshots.$inferInsert;
export type LearnerMetric = typeof learnerMetrics.$inferSelect;
export type NewLearnerMetric = typeof learnerMetrics.$inferInsert;
export type ContentMetric = typeof contentMetrics.$inferSelect;
export type NewContentMetric = typeof contentMetrics.$inferInsert;
export type BackupSettings = typeof backupSettings.$inferSelect;
export type NewBackupSettings = typeof backupSettings.$inferInsert;
export type BackupArtifact = typeof backupArtifacts.$inferSelect;
export type NewBackupArtifact = typeof backupArtifacts.$inferInsert;
export type RestoreRun = typeof restoreRuns.$inferSelect;
export type NewRestoreRun = typeof restoreRuns.$inferInsert;
export type AiSettings = typeof aiSettings.$inferSelect;
export type NewAiSettings = typeof aiSettings.$inferInsert;
export type AiGeneration = typeof aiGenerations.$inferSelect;
export type NewAiGeneration = typeof aiGenerations.$inferInsert;
export type Classroom = typeof classes.$inferSelect;
export type NewClassroom = typeof classes.$inferInsert;
export type ClassMember = typeof classMembers.$inferSelect;
export type NewClassMember = typeof classMembers.$inferInsert;
export type ClassTeacher = typeof classTeachers.$inferSelect;
export type NewClassTeacher = typeof classTeachers.$inferInsert;
export type Invitation = typeof invitations.$inferSelect;
export type NewInvitation = typeof invitations.$inferInsert;
export type Assignment = typeof assignments.$inferSelect;
export type NewAssignment = typeof assignments.$inferInsert;
export type AssignmentTarget = typeof assignmentTargets.$inferSelect;
export type NewAssignmentTarget = typeof assignmentTargets.$inferInsert;
export type AssignmentSubmission = typeof assignmentSubmissions.$inferSelect;
export type NewAssignmentSubmission = typeof assignmentSubmissions.$inferInsert;
export type GradingRubric = typeof gradingRubrics.$inferSelect;
export type NewGradingRubric = typeof gradingRubrics.$inferInsert;
export type TeacherFeedback = typeof teacherFeedback.$inferSelect;
export type NewTeacherFeedback = typeof teacherFeedback.$inferInsert;
export type LaboratoryActivity = typeof laboratoryActivities.$inferSelect;
export type NewLaboratoryActivity = typeof laboratoryActivities.$inferInsert;
export type LaboratoryStep = typeof laboratorySteps.$inferSelect;
export type NewLaboratoryStep = typeof laboratorySteps.$inferInsert;
export type LaboratoryVariable = typeof laboratoryVariables.$inferSelect;
export type NewLaboratoryVariable = typeof laboratoryVariables.$inferInsert;
export type LaboratorySession = typeof laboratorySessions.$inferSelect;
export type NewLaboratorySession = typeof laboratorySessions.$inferInsert;
export type LaboratoryObservation = typeof laboratoryObservations.$inferSelect;
export type NewLaboratoryObservation = typeof laboratoryObservations.$inferInsert;
export type LaboratoryMeasurement = typeof laboratoryMeasurements.$inferSelect;
export type NewLaboratoryMeasurement = typeof laboratoryMeasurements.$inferInsert;
export type LaboratoryReport = typeof laboratoryReports.$inferSelect;
export type NewLaboratoryReport = typeof laboratoryReports.$inferInsert;
export type LaboratoryFeedback = typeof laboratoryFeedback.$inferSelect;
export type StudyGoal = typeof studyGoals.$inferSelect;
export type NewStudyGoal = typeof studyGoals.$inferInsert;
export type StudyPlan = typeof studyPlans.$inferSelect;
export type NewStudyPlan = typeof studyPlans.$inferInsert;
export type StudyPlanItem = typeof studyPlanItems.$inferSelect;
export type NewStudyPlanItem = typeof studyPlanItems.$inferInsert;
export type StudySession = typeof studySessions.$inferSelect;
export type NewStudySession = typeof studySessions.$inferInsert;
export type StudyAvailability = typeof studyAvailability.$inferSelect;
export type NewStudyAvailability = typeof studyAvailability.$inferInsert;
export type StudyException = typeof studyExceptions.$inferSelect;
export type NewStudyException = typeof studyExceptions.$inferInsert;
export type StudyCompletionEvent = typeof studyCompletionEvents.$inferSelect;
export type NewStudyCompletionEvent = typeof studyCompletionEvents.$inferInsert;
export type NewLaboratoryFeedback = typeof laboratoryFeedback.$inferInsert;

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
export type Assessment = typeof assessments.$inferSelect;
export type NewAssessment = typeof assessments.$inferInsert;
export type AssessmentSection = typeof assessmentSections.$inferSelect;
export type NewAssessmentSection = typeof assessmentSections.$inferInsert;
export type AssessmentPool = typeof assessmentPools.$inferSelect;
export type NewAssessmentPool = typeof assessmentPools.$inferInsert;
export type AssessmentQuestion = typeof assessmentQuestions.$inferSelect;
export type NewAssessmentQuestion = typeof assessmentQuestions.$inferInsert;
export type AssessmentAttempt = typeof assessmentAttempts.$inferSelect;
export type NewAssessmentAttempt = typeof assessmentAttempts.$inferInsert;
export type AssessmentSectionResult = typeof assessmentSectionResults.$inferSelect;
export type NewAssessmentSectionResult = typeof assessmentSectionResults.$inferInsert;
export type DiagnosticResult = typeof diagnosticResults.$inferSelect;
export type NewDiagnosticResult = typeof diagnosticResults.$inferInsert;
export type PlacementResult = typeof placementResults.$inferSelect;
export type NewPlacementResult = typeof placementResults.$inferInsert;
export type UserConceptMastery = typeof userConceptMastery.$inferSelect;
export type NewUserConceptMastery = typeof userConceptMastery.$inferInsert;
export type MasteryEvent = typeof masteryEvents.$inferSelect;
export type NewMasteryEvent = typeof masteryEvents.$inferInsert;
export type MasterySnapshot = typeof masterySnapshots.$inferSelect;
export type NewMasterySnapshot = typeof masterySnapshots.$inferInsert;
export type MasteryRule = typeof masteryRules.$inferSelect;
export type NewMasteryRule = typeof masteryRules.$inferInsert;
export type RecommendationRule = typeof recommendationRules.$inferSelect;
export type NewRecommendationRule = typeof recommendationRules.$inferInsert;
export type Recommendation = typeof recommendations.$inferSelect;
export type NewRecommendation = typeof recommendations.$inferInsert;
export type RecommendationDismissal = typeof recommendationDismissals.$inferSelect;
export type NewRecommendationDismissal = typeof recommendationDismissals.$inferInsert;
