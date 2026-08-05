import { sql } from "drizzle-orm";
import {
  boolean,
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
