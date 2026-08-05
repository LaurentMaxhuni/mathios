import { AuthenticationError, AuthorizationError } from "@/domain/errors/application-error";
import type { PermissionSlug } from "@/domain/identity/types";
import type { AuthSession, AuthenticatedPrincipal } from "@/infrastructure/auth/auth-provider";

export function hasPermission(
  principal: AuthenticatedPrincipal | null | undefined,
  permission: PermissionSlug,
): boolean {
  return Boolean(principal?.permissions.includes(permission));
}

export function requirePermission(
  session: AuthSession | null,
  permission: PermissionSlug,
): AuthenticatedPrincipal {
  if (!session) throw new AuthenticationError();
  if (!hasPermission(session.principal, permission)) {
    throw new AuthorizationError("Your profile does not have permission to do that.");
  }
  return session.principal;
}

export function requireSession(session: AuthSession | null): AuthenticatedPrincipal {
  if (!session) throw new AuthenticationError();
  return session.principal;
}

export function canManageProfile(session: AuthSession | null, profileId: string): boolean {
  return Boolean(
    session &&
    (session.principal.profileId === profileId || hasPermission(session.principal, "manage_users")),
  );
}
