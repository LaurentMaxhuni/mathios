import { randomUUID } from "node:crypto";
import { AuthorizationError, NotFoundError } from "@/domain/errors/application-error";
import type { IdentityRepository } from "@/domain/ports/identity-repository";
import type { AuthSession } from "@/infrastructure/auth/auth-provider";
import { hashSecret } from "@/features/auth/secret";
import { canManageProfile, hasPermission } from "@/features/auth/authorization";
import type { ProfileCreateInput, ProfileUpdateInput } from "@/features/profiles/schemas";
import type { ProfileRecord } from "@/domain/identity/types";
import { env } from "@/lib/env";

export type PublicProfile = Omit<ProfileRecord, "secretHash"> & { hasSecret: boolean };

export function toPublicProfile(profile: ProfileRecord): PublicProfile {
  const { secretHash, ...publicProfile } = profile;
  return { ...publicProfile, hasSecret: Boolean(secretHash) };
}

export async function createProfile(
  input: ProfileCreateInput,
  session: AuthSession | null,
  repository: IdentityRepository,
): Promise<PublicProfile> {
  const existingProfiles = await repository.listProfiles();
  if (
    existingProfiles.length > 0 &&
    (!session || !hasPermission(session.principal, "manage_users"))
  ) {
    throw new AuthorizationError(
      "Select an administrator profile before creating another profile.",
    );
  }

  const id = randomUUID();
  const profile = await repository.createProfile({
    id,
    userId: randomUUID(),
    identifier: `local-${id}`,
    authMode: env.AUTH_MODE,
    displayName: input.displayName,
    avatar: input.avatar,
    preferredTheme: input.preferredTheme,
    preferredLanguage: input.preferredLanguage,
    currentCurriculum: null,
    currentGrade: null,
    targetGrade: null,
    secretHash: input.pin ? hashSecret(input.pin) : null,
    roles: existingProfiles.length === 0 ? ["learner", "administrator"] : ["learner"],
  });
  return toPublicProfile(profile);
}

export async function updateProfile(
  input: ProfileUpdateInput,
  session: AuthSession | null,
  repository: IdentityRepository,
): Promise<PublicProfile> {
  if (!canManageProfile(session, input.profileId)) {
    throw new AuthorizationError("You can only edit your own profile.");
  }
  const current = await repository.getProfile(input.profileId);
  if (!current) throw new NotFoundError("Profile", input.profileId);
  const secretHash = input.clearPin ? null : input.pin ? hashSecret(input.pin) : current.secretHash;
  const updated = await repository.updateProfile(input.profileId, {
    displayName: input.displayName,
    avatar: input.avatar,
    preferredTheme: input.preferredTheme,
    preferredLanguage: input.preferredLanguage,
    currentCurriculum: current.currentCurriculum,
    currentGrade: current.currentGrade,
    targetGrade: current.targetGrade,
    secretHash,
  });
  return toPublicProfile(updated);
}

export async function deleteProfile(
  profileId: string,
  session: AuthSession | null,
  repository: IdentityRepository,
): Promise<void> {
  if (!canManageProfile(session, profileId)) {
    throw new AuthorizationError("You can only delete your own profile.");
  }
  await repository.deleteProfile(profileId);
}
