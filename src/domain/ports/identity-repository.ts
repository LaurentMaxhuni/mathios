import type {
  AuthenticatedPrincipalRecord,
  CreateProfileRecord,
  OnboardingResponseRecord,
  ProfileRecord,
  ProfileWithRoles,
  RoleRecord,
  UpdateProfileRecord,
  UpsertUserSettingsInput,
  UserSettingsRecord,
} from "@/domain/identity/types";
import type { RoleSlug } from "@/domain/identity/types";

export interface IdentityRepository {
  listProfiles(): Promise<readonly ProfileRecord[]>;
  listProfilesWithRoles(): Promise<readonly ProfileWithRoles[]>;
  getProfileWithRoles(profileId: string): Promise<ProfileWithRoles | null>;
  getProfile(id: string): Promise<ProfileRecord | null>;
  createProfile(input: CreateProfileRecord): Promise<ProfileRecord>;
  updateProfile(id: string, input: UpdateProfileRecord): Promise<ProfileRecord>;
  deleteProfile(id: string): Promise<void>;
  getPrincipalByProfileId(profileId: string): Promise<AuthenticatedPrincipalRecord | null>;
  listRoles(): Promise<readonly RoleRecord[]>;
  replaceUserRoles(userId: string, roleSlugs: readonly RoleSlug[]): Promise<ProfileWithRoles>;
  getSettings(profileId: string): Promise<UserSettingsRecord | null>;
  saveSettings(input: UpsertUserSettingsInput): Promise<UserSettingsRecord>;
  getOnboarding(profileId: string): Promise<OnboardingResponseRecord | null>;
  saveOnboarding(input: OnboardingResponseRecord): Promise<OnboardingResponseRecord>;
}
