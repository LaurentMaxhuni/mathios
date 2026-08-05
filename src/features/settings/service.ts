import { NotFoundError } from "@/domain/errors/application-error";
import {
  DEFAULT_ACCESSIBILITY_PREFERENCES,
  DEFAULT_USER_SETTINGS,
  type AccessibilityPreferences,
  type UpsertUserSettingsInput,
  type UserSettingsRecord,
} from "@/domain/identity/types";
import type { IdentityRepository } from "@/domain/ports/identity-repository";
import type { AuthSession } from "@/infrastructure/auth/auth-provider";
import { requireSession } from "@/features/auth/authorization";
import type { AccessibilitySettingsInput, SettingsInput } from "@/features/settings/schemas";

export function defaultSettings(profileId: string): UserSettingsRecord {
  return {
    profileId,
    ...DEFAULT_USER_SETTINGS,
    accessibilityPreferences: { ...DEFAULT_ACCESSIBILITY_PREFERENCES },
    createdAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString(),
  };
}

export async function getSettings(
  profileId: string,
  repository: IdentityRepository,
): Promise<UserSettingsRecord> {
  return (await repository.getSettings(profileId)) ?? defaultSettings(profileId);
}

export function settingsInputToRecord(
  profileId: string,
  input: SettingsInput,
): UpsertUserSettingsInput {
  return { profileId, ...input };
}

export async function saveSettings(
  input: SettingsInput,
  session: AuthSession | null,
  repository: IdentityRepository,
): Promise<UserSettingsRecord> {
  const principal = requireSession(session);
  const profileId = principal.profileId;
  return repository.saveSettings(settingsInputToRecord(profileId, input));
}

export async function saveAccessibilitySettings(
  input: AccessibilitySettingsInput,
  session: AuthSession | null,
  repository: IdentityRepository,
): Promise<UserSettingsRecord> {
  const principal = requireSession(session);
  const current = await getSettings(principal.profileId, repository);
  const accessibilityPreferences: AccessibilityPreferences = {
    highContrast: input.highContrast,
    underlineLinks: input.underlineLinks,
    focusIndicators: input.focusIndicators,
    screenReaderOptimizations: input.screenReaderOptimizations,
  };
  return repository.saveSettings({
    profileId: principal.profileId,
    theme: current.theme,
    reducedMotion: input.reducedMotion,
    textSize: input.textSize,
    defaultGrade: current.defaultGrade,
    defaultCurriculum: current.defaultCurriculum,
    preferredSubjects: current.preferredSubjects,
    studySessionDuration: current.studySessionDuration,
    weekStartDay: current.weekStartDay,
    formulaRendering: input.formulaRendering,
    accessibilityPreferences,
  });
}

export function onboardingDefaults(settings: UserSettingsRecord): {
  curriculum: string;
  currentGrade: string;
  targetGrade: string;
  subjects: string[];
} {
  return {
    curriculum: settings.defaultCurriculum ?? "",
    currentGrade: settings.defaultGrade ?? "",
    targetGrade: "",
    subjects: [...settings.preferredSubjects],
  };
}

export function ensureSettings(
  settings: UserSettingsRecord | null,
  profileId: string,
): UserSettingsRecord {
  if (settings) return settings;
  if (!profileId) throw new NotFoundError("Profile");
  return defaultSettings(profileId);
}
