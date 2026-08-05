import { ConflictError, NotFoundError } from "@/domain/errors/application-error";
import {
  DEFAULT_ACCESSIBILITY_PREFERENCES,
  type AccessibilityPreferences,
  type AuthenticatedPrincipalRecord,
  type CreateProfileRecord,
  type DifficultyPreference,
  type FormulaRenderingPreference,
  type OnboardingResponseRecord,
  type PermissionSlug,
  type ProfileRecord,
  type ProfileWithRoles,
  type RoleRecord,
  type RoleSlug,
  type TextSizePreference,
  type ThemePreference,
  type UpdateProfileRecord,
  type UpsertUserSettingsInput,
  type UserSettingsRecord,
} from "@/domain/identity/types";
import type { IdentityRepository } from "@/domain/ports/identity-repository";
import { getDatabase, type DatabaseHandle } from "@/infrastructure/database/client";

interface ProfileDbRow {
  id: string;
  user_id: string;
  display_name: string;
  avatar: string;
  preferred_theme: string;
  preferred_language: string;
  current_curriculum: string | null;
  current_grade: string | null;
  target_grade: string | null;
  secret_hash: string | null;
  created_at: Date | string;
  updated_at: Date | string;
}

interface ProfileWithRoleDbRow extends ProfileDbRow {
  role_slug: string | null;
}

interface PrincipalDbRow extends ProfileDbRow {
  role_slug: string | null;
  permission_slug: string | null;
}

interface RoleDbRow {
  id: string;
  slug: string;
  name: string;
  description: string;
}

interface SettingsDbRow {
  profile_id: string;
  theme: string;
  reduced_motion: boolean | number;
  text_size: string;
  default_grade: string | null;
  default_curriculum: string | null;
  preferred_subjects: string;
  study_session_duration: number;
  week_start_day: number;
  formula_rendering: string;
  accessibility_preferences: string;
  created_at: Date | string;
  updated_at: Date | string;
}

interface OnboardingDbRow {
  profile_id: string;
  curriculum: string | null;
  current_grade: string | null;
  target_grade: string | null;
  subjects: string;
  learning_goals: string;
  weekly_study_time_minutes: number | null;
  preferred_study_days: string;
  difficulty_preference: string | null;
  skipped: boolean | number;
  completed_at: Date | string | null;
  created_at: Date | string;
  updated_at: Date | string;
}

const profileSelect = `
  SELECT
    p.id,
    p.user_id,
    p.display_name,
    p.avatar,
    p.preferred_theme,
    p.preferred_language,
    p.current_curriculum,
    p.current_grade,
    p.target_grade,
    p.secret_hash,
    p.created_at,
    p.updated_at
  FROM profiles p
`;

const profileRoleSelect = `
  SELECT
    p.id,
    p.user_id,
    p.display_name,
    p.avatar,
    p.preferred_theme,
    p.preferred_language,
    p.current_curriculum,
    p.current_grade,
    p.target_grade,
    p.secret_hash,
    p.created_at,
    p.updated_at,
    r.slug AS role_slug
  FROM profiles p
  LEFT JOIN user_roles ur ON ur.user_id = p.user_id
  LEFT JOIN roles r ON r.id = ur.role_id
`;

const principalSelect = `
  SELECT
    p.id,
    p.user_id,
    p.display_name,
    p.avatar,
    p.preferred_theme,
    p.preferred_language,
    p.current_curriculum,
    p.current_grade,
    p.target_grade,
    p.secret_hash,
    p.created_at,
    p.updated_at,
    r.slug AS role_slug,
    permission.slug AS permission_slug
  FROM profiles p
  LEFT JOIN user_roles ur ON ur.user_id = p.user_id
  LEFT JOIN roles r ON r.id = ur.role_id
  LEFT JOIN role_permissions rp ON rp.role_id = r.id
  LEFT JOIN permissions permission ON permission.id = rp.permission_id
`;

function asIso(value: Date | string | null | undefined): string {
  if (value instanceof Date) return value.toISOString();
  return value ?? new Date(0).toISOString();
}

function asBoolean(value: boolean | number | string | null | undefined): boolean {
  return value === true || value === 1 || value === "1";
}

function asJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function asTheme(value: string): ThemePreference {
  return value === "light" || value === "dark" ? value : "system";
}

function asTextSize(value: string): TextSizePreference {
  return value === "small" || value === "large" ? value : "medium";
}

function asFormulaRendering(value: string): FormulaRenderingPreference {
  return value === "rendered" || value === "plain" ? value : "accessible";
}

function asDifficulty(value: string | null): DifficultyPreference | null {
  return value === "gentle" || value === "challenging" || value === "balanced" ? value : null;
}

function asRole(value: string): RoleSlug | null {
  return value === "learner" ||
    value === "teacher" ||
    value === "content-creator" ||
    value === "administrator"
    ? value
    : null;
}

function asPermission(value: string): PermissionSlug | null {
  const permissions: readonly PermissionSlug[] = [
    "view_learning_content",
    "edit_content",
    "publish_content",
    "manage_users",
    "view_analytics",
    "manage_application_settings",
    "run_backups",
    "restore_backups",
  ];
  return permissions.includes(value as PermissionSlug) ? (value as PermissionSlug) : null;
}

function mapProfile(row: ProfileDbRow): ProfileRecord {
  return {
    id: row.id,
    userId: row.user_id,
    displayName: row.display_name,
    avatar: row.avatar,
    preferredTheme: asTheme(row.preferred_theme),
    preferredLanguage: row.preferred_language,
    currentCurriculum: row.current_curriculum,
    currentGrade: row.current_grade,
    targetGrade: row.target_grade,
    secretHash: row.secret_hash,
    createdAt: asIso(row.created_at),
    updatedAt: asIso(row.updated_at),
  };
}

function mapSettings(row: SettingsDbRow): UserSettingsRecord {
  const accessibility = asJson<Partial<AccessibilityPreferences>>(
    row.accessibility_preferences,
    {},
  );
  return {
    profileId: row.profile_id,
    theme: asTheme(row.theme),
    reducedMotion: asBoolean(row.reduced_motion),
    textSize: asTextSize(row.text_size),
    defaultGrade: row.default_grade,
    defaultCurriculum: row.default_curriculum,
    preferredSubjects: asJson<string[]>(row.preferred_subjects, []),
    studySessionDuration: row.study_session_duration,
    weekStartDay: row.week_start_day,
    formulaRendering: asFormulaRendering(row.formula_rendering),
    accessibilityPreferences: {
      ...DEFAULT_ACCESSIBILITY_PREFERENCES,
      ...accessibility,
    },
    createdAt: asIso(row.created_at),
    updatedAt: asIso(row.updated_at),
  };
}

function mapOnboarding(row: OnboardingDbRow): OnboardingResponseRecord {
  return {
    profileId: row.profile_id,
    curriculum: row.curriculum,
    currentGrade: row.current_grade,
    targetGrade: row.target_grade,
    subjects: asJson<string[]>(row.subjects, []),
    learningGoals: asJson<string[]>(row.learning_goals, []),
    weeklyStudyTimeMinutes: row.weekly_study_time_minutes,
    preferredStudyDays: asJson<number[]>(row.preferred_study_days, []),
    difficultyPreference: asDifficulty(row.difficulty_preference),
    skipped: asBoolean(row.skipped),
    completedAt: row.completed_at ? asIso(row.completed_at) : null,
    createdAt: asIso(row.created_at),
    updatedAt: asIso(row.updated_at),
  };
}

function roleValues(rows: readonly { role_slug: string | null }[]): RoleSlug[] {
  return [
    ...new Set(rows.map((row) => (row.role_slug ? asRole(row.role_slug) : null)).filter(Boolean)),
  ] as RoleSlug[];
}

export class SqlIdentityRepository implements IdentityRepository {
  constructor(private readonly database: DatabaseHandle = getDatabase()) {}

  async listProfiles(): Promise<readonly ProfileRecord[]> {
    if (this.database.provider === "sqlite") {
      const rows = this.database.raw
        .prepare(`${profileSelect} ORDER BY p.display_name COLLATE NOCASE`)
        .all() as ProfileDbRow[];
      return rows.map(mapProfile);
    }

    const rows = await this.database.raw<ProfileDbRow[]>`
      ${this.database.raw.unsafe(profileSelect)}
      ORDER BY p.display_name
    `;
    return rows.map(mapProfile);
  }

  async getProfile(id: string): Promise<ProfileRecord | null> {
    if (this.database.provider === "sqlite") {
      const row = this.database.raw.prepare(`${profileSelect} WHERE p.id = ?`).get(id) as
        ProfileDbRow | undefined;
      return row ? mapProfile(row) : null;
    }

    const rows = await this.database.raw<ProfileDbRow[]>`
      ${this.database.raw.unsafe(profileSelect)}
      WHERE p.id = ${id}
    `;
    return rows[0] ? mapProfile(rows[0]) : null;
  }

  async createProfile(input: CreateProfileRecord): Promise<ProfileRecord> {
    if (this.database.provider === "sqlite") {
      const database = this.database.raw;
      const insert = database.transaction(() => {
        database
          .prepare(
            `INSERT INTO users (id, identifier, auth_mode) VALUES (@id, @identifier, @authMode)`,
          )
          .run({ id: input.userId, identifier: input.identifier, authMode: input.authMode });
        database
          .prepare(
            `INSERT INTO profiles (id, user_id, display_name, avatar, preferred_theme, preferred_language, current_curriculum, current_grade, target_grade, secret_hash)
             VALUES (@id, @userId, @displayName, @avatar, @preferredTheme, @preferredLanguage, @currentCurriculum, @currentGrade, @targetGrade, @secretHash)`,
          )
          .run(input);
        database
          .prepare(`INSERT INTO user_settings (profile_id, theme) VALUES (?, ?)`)
          .run(input.id, input.preferredTheme);

        for (const roleSlug of input.roles) {
          const role = database.prepare(`SELECT id FROM roles WHERE slug = ?`).get(roleSlug) as
            { id: string } | undefined;
          if (!role) throw new ConflictError(`The role '${roleSlug}' is not available.`);
          database
            .prepare(`INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)`)
            .run(input.userId, role.id);
        }
      });
      insert();
    } else {
      await this.database.raw.begin(async (transaction) => {
        await transaction`
          INSERT INTO users (id, identifier, auth_mode)
          VALUES (${input.userId}, ${input.identifier}, ${input.authMode})
        `;
        await transaction`
          INSERT INTO profiles (id, user_id, display_name, avatar, preferred_theme, preferred_language, current_curriculum, current_grade, target_grade, secret_hash)
          VALUES (${input.id}, ${input.userId}, ${input.displayName}, ${input.avatar}, ${input.preferredTheme}, ${input.preferredLanguage}, ${input.currentCurriculum}, ${input.currentGrade}, ${input.targetGrade}, ${input.secretHash})
        `;
        await transaction`
          INSERT INTO user_settings (profile_id, theme) VALUES (${input.id}, ${input.preferredTheme})
        `;
        for (const roleSlug of input.roles) {
          const role = await transaction<{ id: string }[]>`
            SELECT id FROM roles WHERE slug = ${roleSlug}
          `;
          if (!role[0]) throw new ConflictError(`The role '${roleSlug}' is not available.`);
          await transaction`
            INSERT INTO user_roles (user_id, role_id) VALUES (${input.userId}, ${role[0].id})
          `;
        }
      });
    }

    const created = await this.getProfile(input.id);
    if (!created) throw new NotFoundError("Profile", input.id);
    return created;
  }

  async updateProfile(id: string, input: UpdateProfileRecord): Promise<ProfileRecord> {
    if (this.database.provider === "sqlite") {
      const database = this.database.raw;
      const update = database.transaction(() => {
        const result = database
          .prepare(
            `UPDATE profiles
             SET display_name = @displayName,
                 avatar = @avatar,
                 preferred_theme = @preferredTheme,
                 preferred_language = @preferredLanguage,
                 current_curriculum = @currentCurriculum,
                 current_grade = @currentGrade,
                 target_grade = @targetGrade,
                 secret_hash = @secretHash,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = @id`,
          )
          .run({ id, ...input });
        if (result.changes === 0) throw new NotFoundError("Profile", id);
        database
          .prepare(
            `UPDATE user_settings SET theme = @preferredTheme, updated_at = CURRENT_TIMESTAMP WHERE profile_id = @id`,
          )
          .run({ id, preferredTheme: input.preferredTheme });
      });
      update();
    } else {
      await this.database.raw.begin(async (transaction) => {
        const rows = await transaction<{ id: string }[]>`
          UPDATE profiles
          SET display_name = ${input.displayName},
              avatar = ${input.avatar},
              preferred_theme = ${input.preferredTheme},
              preferred_language = ${input.preferredLanguage},
              current_curriculum = ${input.currentCurriculum},
              current_grade = ${input.currentGrade},
              target_grade = ${input.targetGrade},
              secret_hash = ${input.secretHash},
              updated_at = NOW()
          WHERE id = ${id}
          RETURNING id
        `;
        if (!rows[0]) throw new NotFoundError("Profile", id);
        await transaction`
          UPDATE user_settings SET theme = ${input.preferredTheme}, updated_at = NOW() WHERE profile_id = ${id}
        `;
      });
    }

    const updated = await this.getProfile(id);
    if (!updated) throw new NotFoundError("Profile", id);
    return updated;
  }

  async deleteProfile(id: string): Promise<void> {
    if (this.database.provider === "sqlite") {
      const result = this.database.raw.prepare(`DELETE FROM profiles WHERE id = ?`).run(id);
      if (result.changes === 0) throw new NotFoundError("Profile", id);
      return;
    }

    const rows = await this.database.raw<{ id: string }[]>`
      DELETE FROM profiles WHERE id = ${id} RETURNING id
    `;
    if (!rows[0]) throw new NotFoundError("Profile", id);
  }

  async listProfilesWithRoles(): Promise<readonly ProfileWithRoles[]> {
    const rows =
      this.database.provider === "sqlite"
        ? (this.database.raw
            .prepare(`${profileRoleSelect} ORDER BY p.display_name COLLATE NOCASE, r.slug`)
            .all() as ProfileWithRoleDbRow[])
        : await this.database.raw<ProfileWithRoleDbRow[]>`
          ${this.database.raw.unsafe(profileRoleSelect)}
          ORDER BY p.display_name, r.slug
        `;
    return this.groupProfilesWithRoles(rows);
  }

  async getProfileWithRoles(profileId: string): Promise<ProfileWithRoles | null> {
    const rows =
      this.database.provider === "sqlite"
        ? (this.database.raw
            .prepare(`${profileRoleSelect} WHERE p.id = ? ORDER BY r.slug`)
            .all(profileId) as ProfileWithRoleDbRow[])
        : await this.database.raw<ProfileWithRoleDbRow[]>`
          ${this.database.raw.unsafe(profileRoleSelect)}
          WHERE p.id = ${profileId}
          ORDER BY r.slug
        `;
    return this.groupProfilesWithRoles(rows)[0] ?? null;
  }

  async getPrincipalByProfileId(profileId: string): Promise<AuthenticatedPrincipalRecord | null> {
    const rows =
      this.database.provider === "sqlite"
        ? (this.database.raw
            .prepare(`${principalSelect} WHERE p.id = ?`)
            .all(profileId) as PrincipalDbRow[])
        : await this.database.raw<PrincipalDbRow[]>`
          ${this.database.raw.unsafe(principalSelect)}
          WHERE p.id = ${profileId}
        `;
    const first = rows[0];
    if (!first) return null;
    const roles = roleValues(rows);
    const permissions = [
      ...new Set(
        rows
          .map((row) => (row.permission_slug ? asPermission(row.permission_slug) : null))
          .filter(Boolean),
      ),
    ] as PermissionSlug[];
    return {
      userId: first.user_id,
      profileId: first.id,
      displayName: first.display_name,
      avatar: first.avatar,
      preferredTheme: asTheme(first.preferred_theme),
      roles,
      permissions,
    };
  }

  async listRoles(): Promise<readonly RoleRecord[]> {
    const rows =
      this.database.provider === "sqlite"
        ? (this.database.raw
            .prepare(`SELECT id, slug, name, description FROM roles ORDER BY name`)
            .all() as RoleDbRow[])
        : await this.database.raw<RoleDbRow[]>`
          SELECT id, slug, name, description FROM roles ORDER BY name
        `;
    return rows.flatMap((row) => {
      const slug = asRole(row.slug);
      return slug ? [{ id: row.id, slug, name: row.name, description: row.description }] : [];
    });
  }

  async replaceUserRoles(
    userId: string,
    roleSlugs: readonly RoleSlug[],
  ): Promise<ProfileWithRoles> {
    const distinctSlugs = [...new Set(roleSlugs)];
    if (distinctSlugs.length === 0)
      throw new ConflictError("A profile must keep at least one role.");

    if (this.database.provider === "sqlite") {
      const database = this.database.raw;
      const update = database.transaction(() => {
        const placeholders = distinctSlugs.map(() => "?").join(", ");
        const roles = database
          .prepare(`SELECT id, slug FROM roles WHERE slug IN (${placeholders})`)
          .all(...distinctSlugs) as Array<{ id: string; slug: string }>;
        if (roles.length !== distinctSlugs.length) {
          throw new ConflictError("One or more selected roles are not available.");
        }
        database.prepare(`DELETE FROM user_roles WHERE user_id = ?`).run(userId);
        for (const role of roles) {
          database
            .prepare(`INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)`)
            .run(userId, role.id);
        }
      });
      update();
    } else {
      await this.database.raw.begin(async (transaction) => {
        const roles = await transaction<{ id: string; slug: string }[]>`
          SELECT id, slug FROM roles WHERE slug = ANY(${distinctSlugs})
        `;
        if (roles.length !== distinctSlugs.length) {
          throw new ConflictError("One or more selected roles are not available.");
        }
        await transaction`DELETE FROM user_roles WHERE user_id = ${userId}`;
        for (const role of roles) {
          await transaction`
            INSERT INTO user_roles (user_id, role_id) VALUES (${userId}, ${role.id})
          `;
        }
      });
    }

    const profile = await this.findProfileWithRolesByUserId(userId);
    if (!profile) throw new NotFoundError("Profile for user", userId);
    return profile;
  }

  async getSettings(profileId: string): Promise<UserSettingsRecord | null> {
    const query = `
      SELECT profile_id, theme, reduced_motion, text_size, default_grade, default_curriculum,
             preferred_subjects, study_session_duration, week_start_day, formula_rendering,
             accessibility_preferences, created_at, updated_at
      FROM user_settings WHERE profile_id = ?
    `;
    if (this.database.provider === "sqlite") {
      const row = this.database.raw.prepare(query).get(profileId) as SettingsDbRow | undefined;
      return row ? mapSettings(row) : null;
    }
    const rows = await this.database.raw<SettingsDbRow[]>`
      SELECT profile_id, theme, reduced_motion, text_size, default_grade, default_curriculum,
             preferred_subjects, study_session_duration, week_start_day, formula_rendering,
             accessibility_preferences, created_at, updated_at
      FROM user_settings WHERE profile_id = ${profileId}
    `;
    return rows[0] ? mapSettings(rows[0]) : null;
  }

  async saveSettings(input: UpsertUserSettingsInput): Promise<UserSettingsRecord> {
    const subjects = JSON.stringify(input.preferredSubjects);
    const accessibility = JSON.stringify(input.accessibilityPreferences);
    if (this.database.provider === "sqlite") {
      const database = this.database.raw;
      const save = database.transaction(() => {
        database
          .prepare(
            `INSERT INTO user_settings (profile_id, theme, reduced_motion, text_size, default_grade, default_curriculum, preferred_subjects, study_session_duration, week_start_day, formula_rendering, accessibility_preferences)
             VALUES (@profileId, @theme, @reducedMotion, @textSize, @defaultGrade, @defaultCurriculum, @preferredSubjects, @studySessionDuration, @weekStartDay, @formulaRendering, @accessibilityPreferences)
             ON CONFLICT(profile_id) DO UPDATE SET
               theme = excluded.theme,
               reduced_motion = excluded.reduced_motion,
               text_size = excluded.text_size,
               default_grade = excluded.default_grade,
               default_curriculum = excluded.default_curriculum,
               preferred_subjects = excluded.preferred_subjects,
               study_session_duration = excluded.study_session_duration,
               week_start_day = excluded.week_start_day,
               formula_rendering = excluded.formula_rendering,
               accessibility_preferences = excluded.accessibility_preferences,
               updated_at = CURRENT_TIMESTAMP`,
          )
          .run({
            profileId: input.profileId,
            theme: input.theme,
            reducedMotion: input.reducedMotion ? 1 : 0,
            textSize: input.textSize,
            defaultGrade: input.defaultGrade,
            defaultCurriculum: input.defaultCurriculum,
            preferredSubjects: subjects,
            studySessionDuration: input.studySessionDuration,
            weekStartDay: input.weekStartDay,
            formulaRendering: input.formulaRendering,
            accessibilityPreferences: accessibility,
          });
        database
          .prepare(
            `UPDATE profiles SET preferred_theme = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
          )
          .run(input.theme, input.profileId);
      });
      save();
    } else {
      await this.database.raw.begin(async (transaction) => {
        await transaction`
          INSERT INTO user_settings (profile_id, theme, reduced_motion, text_size, default_grade, default_curriculum, preferred_subjects, study_session_duration, week_start_day, formula_rendering, accessibility_preferences)
          VALUES (${input.profileId}, ${input.theme}, ${input.reducedMotion}, ${input.textSize}, ${input.defaultGrade}, ${input.defaultCurriculum}, ${subjects}, ${input.studySessionDuration}, ${input.weekStartDay}, ${input.formulaRendering}, ${accessibility})
          ON CONFLICT (profile_id) DO UPDATE SET
            theme = EXCLUDED.theme,
            reduced_motion = EXCLUDED.reduced_motion,
            text_size = EXCLUDED.text_size,
            default_grade = EXCLUDED.default_grade,
            default_curriculum = EXCLUDED.default_curriculum,
            preferred_subjects = EXCLUDED.preferred_subjects,
            study_session_duration = EXCLUDED.study_session_duration,
            week_start_day = EXCLUDED.week_start_day,
            formula_rendering = EXCLUDED.formula_rendering,
            accessibility_preferences = EXCLUDED.accessibility_preferences,
            updated_at = NOW()
        `;
        await transaction`
          UPDATE profiles SET preferred_theme = ${input.theme}, updated_at = NOW() WHERE id = ${input.profileId}
        `;
      });
    }

    const settings = await this.getSettings(input.profileId);
    if (!settings) throw new NotFoundError("Settings for profile", input.profileId);
    return settings;
  }

  async getOnboarding(profileId: string): Promise<OnboardingResponseRecord | null> {
    if (this.database.provider === "sqlite") {
      const row = this.database.raw
        .prepare(
          `SELECT profile_id, curriculum, current_grade, target_grade, subjects, learning_goals,
                  weekly_study_time_minutes, preferred_study_days, difficulty_preference, skipped,
                  completed_at, created_at, updated_at
           FROM onboarding_responses WHERE profile_id = ?`,
        )
        .get(profileId) as OnboardingDbRow | undefined;
      return row ? mapOnboarding(row) : null;
    }
    const rows = await this.database.raw<OnboardingDbRow[]>`
      SELECT profile_id, curriculum, current_grade, target_grade, subjects, learning_goals,
             weekly_study_time_minutes, preferred_study_days, difficulty_preference, skipped,
             completed_at, created_at, updated_at
      FROM onboarding_responses WHERE profile_id = ${profileId}
    `;
    return rows[0] ? mapOnboarding(rows[0]) : null;
  }

  async saveOnboarding(input: OnboardingResponseRecord): Promise<OnboardingResponseRecord> {
    const subjects = JSON.stringify(input.subjects);
    const learningGoals = JSON.stringify(input.learningGoals);
    const preferredStudyDays = JSON.stringify(input.preferredStudyDays);
    if (this.database.provider === "sqlite") {
      this.database.raw
        .prepare(
          `INSERT INTO onboarding_responses (profile_id, curriculum, current_grade, target_grade, subjects, learning_goals, weekly_study_time_minutes, preferred_study_days, difficulty_preference, skipped, completed_at)
           VALUES (@profileId, @curriculum, @currentGrade, @targetGrade, @subjects, @learningGoals, @weeklyStudyTimeMinutes, @preferredStudyDays, @difficultyPreference, @skipped, @completedAt)
           ON CONFLICT(profile_id) DO UPDATE SET
             curriculum = excluded.curriculum,
             current_grade = excluded.current_grade,
             target_grade = excluded.target_grade,
             subjects = excluded.subjects,
             learning_goals = excluded.learning_goals,
             weekly_study_time_minutes = excluded.weekly_study_time_minutes,
             preferred_study_days = excluded.preferred_study_days,
             difficulty_preference = excluded.difficulty_preference,
             skipped = excluded.skipped,
             completed_at = excluded.completed_at,
             updated_at = CURRENT_TIMESTAMP`,
        )
        .run({
          profileId: input.profileId,
          curriculum: input.curriculum,
          currentGrade: input.currentGrade,
          targetGrade: input.targetGrade,
          subjects,
          learningGoals,
          weeklyStudyTimeMinutes: input.weeklyStudyTimeMinutes,
          preferredStudyDays,
          difficultyPreference: input.difficultyPreference,
          skipped: input.skipped ? 1 : 0,
          completedAt: input.completedAt,
        });
    } else {
      await this.database.raw`
        INSERT INTO onboarding_responses (profile_id, curriculum, current_grade, target_grade, subjects, learning_goals, weekly_study_time_minutes, preferred_study_days, difficulty_preference, skipped, completed_at)
        VALUES (${input.profileId}, ${input.curriculum}, ${input.currentGrade}, ${input.targetGrade}, ${subjects}, ${learningGoals}, ${input.weeklyStudyTimeMinutes}, ${preferredStudyDays}, ${input.difficultyPreference}, ${input.skipped}, ${input.completedAt})
        ON CONFLICT (profile_id) DO UPDATE SET
          curriculum = EXCLUDED.curriculum,
          current_grade = EXCLUDED.current_grade,
          target_grade = EXCLUDED.target_grade,
          subjects = EXCLUDED.subjects,
          learning_goals = EXCLUDED.learning_goals,
          weekly_study_time_minutes = EXCLUDED.weekly_study_time_minutes,
          preferred_study_days = EXCLUDED.preferred_study_days,
          difficulty_preference = EXCLUDED.difficulty_preference,
          skipped = EXCLUDED.skipped,
          completed_at = EXCLUDED.completed_at,
          updated_at = NOW()
      `;
    }
    const saved = await this.getOnboarding(input.profileId);
    if (!saved) throw new NotFoundError("Onboarding response", input.profileId);
    return saved;
  }

  private groupProfilesWithRoles(rows: readonly ProfileWithRoleDbRow[]): ProfileWithRoles[] {
    const grouped = new Map<string, ProfileWithRoles>();
    for (const row of rows) {
      const existing = grouped.get(row.id);
      if (existing) {
        grouped.set(row.id, {
          ...existing,
          roles: [
            ...new Set([
              ...existing.roles,
              ...(row.role_slug && asRole(row.role_slug) ? [asRole(row.role_slug)!] : []),
            ]),
          ],
        });
        continue;
      }
      const profile = mapProfile(row);
      grouped.set(row.id, {
        id: profile.id,
        userId: profile.userId,
        displayName: profile.displayName,
        avatar: profile.avatar,
        preferredTheme: profile.preferredTheme,
        preferredLanguage: profile.preferredLanguage,
        currentCurriculum: profile.currentCurriculum,
        currentGrade: profile.currentGrade,
        targetGrade: profile.targetGrade,
        createdAt: profile.createdAt,
        updatedAt: profile.updatedAt,
        hasSecret: Boolean(profile.secretHash),
        roles: row.role_slug && asRole(row.role_slug) ? [asRole(row.role_slug)!] : [],
      });
    }
    return [...grouped.values()];
  }

  private async findProfileWithRolesByUserId(userId: string): Promise<ProfileWithRoles | null> {
    const rows =
      this.database.provider === "sqlite"
        ? (this.database.raw
            .prepare(`${profileRoleSelect} WHERE p.user_id = ? ORDER BY r.slug`)
            .all(userId) as ProfileWithRoleDbRow[])
        : await this.database.raw<ProfileWithRoleDbRow[]>`
          ${this.database.raw.unsafe(profileRoleSelect)}
          WHERE p.user_id = ${userId}
          ORDER BY r.slug
        `;
    return this.groupProfilesWithRoles(rows)[0] ?? null;
  }
}

export function getIdentityRepository(database?: DatabaseHandle): IdentityRepository {
  return new SqlIdentityRepository(database);
}
