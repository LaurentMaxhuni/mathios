import { NotFoundError } from "@/domain/errors/application-error";
import type {
  OnboardingResponseRecord,
  ProfileRecord,
  UpsertUserSettingsInput,
} from "@/domain/identity/types";
import type { IdentityRepository } from "@/domain/ports/identity-repository";
import type { AuthSession } from "@/infrastructure/auth/auth-provider";
import { requireSession } from "@/features/auth/authorization";
import type { OnboardingInput } from "@/features/onboarding/schemas";
import { defaultSettings } from "@/features/settings/service";

export async function saveOnboarding(
  input: OnboardingInput,
  session: AuthSession | null,
  repository: IdentityRepository,
): Promise<OnboardingResponseRecord> {
  const principal = requireSession(session);
  const profile = await repository.getProfile(principal.profileId);
  if (!profile) throw new NotFoundError("Profile", principal.profileId);
  const currentSettings = (await repository.getSettings(profile.id)) ?? defaultSettings(profile.id);
  const now = new Date().toISOString();
  const updatedProfile: ProfileRecord = {
    ...profile,
    currentCurriculum: input.curriculum || null,
    currentGrade: input.currentGrade || null,
    targetGrade: input.targetGrade || null,
    updatedAt: now,
  };
  await repository.updateProfile(profile.id, {
    displayName: updatedProfile.displayName,
    avatar: updatedProfile.avatar,
    preferredTheme: updatedProfile.preferredTheme,
    preferredLanguage: updatedProfile.preferredLanguage,
    currentCurriculum: updatedProfile.currentCurriculum,
    currentGrade: updatedProfile.currentGrade,
    targetGrade: updatedProfile.targetGrade,
    secretHash: updatedProfile.secretHash,
  });
  const settingsInput: UpsertUserSettingsInput = {
    profileId: profile.id,
    theme: currentSettings.theme,
    reducedMotion: currentSettings.reducedMotion,
    textSize: currentSettings.textSize,
    defaultGrade: input.currentGrade || null,
    defaultCurriculum: input.curriculum || null,
    preferredSubjects: input.subjects,
    studySessionDuration: input.dailyGoalMinutes,
    weekStartDay: currentSettings.weekStartDay,
    formulaRendering: currentSettings.formulaRendering,
    accessibilityPreferences: currentSettings.accessibilityPreferences,
  };
  await repository.saveSettings(settingsInput);
  return repository.saveOnboarding({
    profileId: profile.id,
    curriculum: input.curriculum,
    currentGrade: input.currentGrade,
    targetGrade: input.targetGrade,
    subjects: input.subjects,
    learningGoals: input.learningGoals,
    weeklyStudyTimeMinutes: input.weeklyStudyTimeMinutes,
    preferredStudyDays: input.preferredStudyDays,
    difficultyPreference: input.difficultyPreference,
    skipped: false,
    completedAt: now,
    createdAt: now,
    updatedAt: now,
  });
}

export async function skipOnboarding(
  session: AuthSession | null,
  repository: IdentityRepository,
): Promise<OnboardingResponseRecord> {
  const principal = requireSession(session);
  const now = new Date().toISOString();
  return repository.saveOnboarding({
    profileId: principal.profileId,
    curriculum: null,
    currentGrade: null,
    targetGrade: null,
    subjects: [],
    learningGoals: [],
    weeklyStudyTimeMinutes: null,
    preferredStudyDays: [],
    difficultyPreference: null,
    skipped: true,
    completedAt: null,
    createdAt: now,
    updatedAt: now,
  });
}
