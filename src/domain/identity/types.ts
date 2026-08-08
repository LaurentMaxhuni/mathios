export type IdentityAuthMode = "neon-auth" | "local-profile" | "local-credential" | "hosted";

export type ThemePreference = "system" | "light" | "dark";
export type TextSizePreference = "small" | "medium" | "large";
export type FormulaRenderingPreference = "rendered" | "accessible" | "plain";
export type DifficultyPreference = "gentle" | "balanced" | "challenging";

export const ROLE_SLUGS = ["learner", "teacher", "content-creator", "administrator"] as const;
export type RoleSlug = (typeof ROLE_SLUGS)[number];

export const PERMISSION_SLUGS = [
  "view_learning_content",
  "edit_content",
  "publish_content",
  "manage_users",
  "view_analytics",
  "manage_application_settings",
  "run_backups",
  "restore_backups",
] as const;
export type PermissionSlug = (typeof PERMISSION_SLUGS)[number];

export interface ProfileRecord {
  id: string;
  userId: string;
  displayName: string;
  avatar: string;
  preferredTheme: ThemePreference;
  preferredLanguage: string;
  currentCurriculum: string | null;
  currentGrade: string | null;
  targetGrade: string | null;
  secretHash: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProfileRecord {
  id: string;
  userId: string;
  identifier: string;
  authMode: IdentityAuthMode;
  displayName: string;
  avatar: string;
  preferredTheme: ThemePreference;
  preferredLanguage: string;
  currentCurriculum: string | null;
  currentGrade: string | null;
  targetGrade: string | null;
  secretHash: string | null;
  roles: readonly RoleSlug[];
}

export interface UpdateProfileRecord {
  displayName: string;
  avatar: string;
  preferredTheme: ThemePreference;
  preferredLanguage: string;
  currentCurriculum: string | null;
  currentGrade: string | null;
  targetGrade: string | null;
  secretHash: string | null;
}

export interface RoleRecord {
  id: string;
  slug: RoleSlug;
  name: string;
  description: string;
}

export interface ProfileWithRoles extends Omit<ProfileRecord, "secretHash"> {
  hasSecret: boolean;
  roles: readonly RoleSlug[];
}

export interface AuthenticatedPrincipalRecord {
  userId: string;
  profileId: string;
  displayName: string;
  avatar: string;
  preferredTheme: ThemePreference;
  roles: readonly RoleSlug[];
  permissions: readonly PermissionSlug[];
}

export interface UserSettingsRecord {
  profileId: string;
  theme: ThemePreference;
  reducedMotion: boolean;
  textSize: TextSizePreference;
  defaultGrade: string | null;
  defaultCurriculum: string | null;
  preferredSubjects: readonly string[];
  studySessionDuration: number;
  weekStartDay: number;
  formulaRendering: FormulaRenderingPreference;
  accessibilityPreferences: AccessibilityPreferences;
  createdAt: string;
  updatedAt: string;
}

export interface AccessibilityPreferences {
  highContrast: boolean;
  underlineLinks: boolean;
  focusIndicators: boolean;
  screenReaderOptimizations: boolean;
}

export interface UpsertUserSettingsInput {
  profileId: string;
  theme: ThemePreference;
  reducedMotion: boolean;
  textSize: TextSizePreference;
  defaultGrade: string | null;
  defaultCurriculum: string | null;
  preferredSubjects: readonly string[];
  studySessionDuration: number;
  weekStartDay: number;
  formulaRendering: FormulaRenderingPreference;
  accessibilityPreferences: AccessibilityPreferences;
}

export interface OnboardingResponseRecord {
  profileId: string;
  curriculum: string | null;
  currentGrade: string | null;
  targetGrade: string | null;
  subjects: readonly string[];
  learningGoals: readonly string[];
  weeklyStudyTimeMinutes: number | null;
  preferredStudyDays: readonly number[];
  difficultyPreference: DifficultyPreference | null;
  skipped: boolean;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export const DEFAULT_ACCESSIBILITY_PREFERENCES: AccessibilityPreferences = {
  highContrast: false,
  underlineLinks: false,
  focusIndicators: true,
  screenReaderOptimizations: false,
};

export const DEFAULT_USER_SETTINGS: Omit<
  UserSettingsRecord,
  "profileId" | "createdAt" | "updatedAt"
> = {
  theme: "system",
  reducedMotion: false,
  textSize: "medium",
  defaultGrade: null,
  defaultCurriculum: null,
  preferredSubjects: [],
  studySessionDuration: 15,
  weekStartDay: 1,
  formulaRendering: "accessible",
  accessibilityPreferences: DEFAULT_ACCESSIBILITY_PREFERENCES,
};
