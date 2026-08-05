import { ConflictError, NotFoundError } from "@/domain/errors/application-error";
import type { RoleSlug } from "@/domain/identity/types";
import type { IdentityRepository } from "@/domain/ports/identity-repository";
import type { AuthSession } from "@/infrastructure/auth/auth-provider";
import { requirePermission } from "@/features/auth/authorization";

export async function replaceProfileRoles(
  profileId: string,
  roleSlugs: readonly RoleSlug[],
  session: AuthSession | null,
  repository: IdentityRepository,
) {
  requirePermission(session, "manage_users");
  const target = await repository.getProfileWithRoles(profileId);
  if (!target) throw new NotFoundError("Profile", profileId);
  const selected = [...new Set(roleSlugs)];
  if (selected.length === 0) throw new ConflictError("A profile must keep at least one role.");

  if (target.roles.includes("administrator") && !selected.includes("administrator")) {
    const profiles = await repository.listProfilesWithRoles();
    const administrators = profiles.filter((profile) => profile.roles.includes("administrator"));
    if (administrators.length <= 1) {
      throw new ConflictError("Keep at least one administrator profile active.");
    }
  }
  return repository.replaceUserRoles(target.userId, selected);
}
