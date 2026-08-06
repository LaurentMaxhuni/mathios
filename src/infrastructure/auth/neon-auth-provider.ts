import { ApplicationError } from "@/domain/errors/application-error";
import type { IdentityRepository } from "@/domain/ports/identity-repository";
import type {
  AuthCredentials,
  AuthMode,
  AuthProvider,
  AuthSession,
  AuthenticatedPrincipal,
} from "@/infrastructure/auth/auth-provider";
import { getNeonAuth } from "@/lib/auth/server";
import { getIdentityRepository } from "@/infrastructure/database/repositories/identity-repository";

interface NeonAuthUser {
  id: string;
  email?: string | null;
  name?: string | null;
}

interface NeonAuthSession {
  user?: NeonAuthUser | null;
  session?: {
    expiresAt?: Date | string | null;
  } | null;
}

function sessionData(value: unknown): NeonAuthSession | null {
  if (!value || typeof value !== "object") return null;
  const response = value as { data?: unknown };
  const data = response.data ?? value;
  if (!data || typeof data !== "object") return null;
  return data as NeonAuthSession;
}

function sessionExpiry(value: Date | string | null | undefined): Date | undefined {
  if (!value) return undefined;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function displayNameFor(user: NeonAuthUser): string {
  const name = user.name?.trim();
  if (name) return name;
  const emailName = user.email?.split("@", 1)[0]?.trim();
  return emailName || "Learner";
}

function toPrincipal(
  profile: Awaited<ReturnType<IdentityRepository["getPrincipalByProfileId"]>>,
  subjectId: string,
): AuthenticatedPrincipal {
  if (!profile) {
    throw new ApplicationError("UNAUTHORIZED", "The application profile is unavailable.", 401);
  }
  return {
    subjectId,
    userId: profile.userId,
    profileId: profile.profileId,
    roles: profile.roles,
    permissions: profile.permissions,
    displayName: profile.displayName,
    avatar: profile.avatar,
    preferredTheme: profile.preferredTheme,
  };
}

export class NeonAuthProvider implements AuthProvider {
  readonly mode: AuthMode = "neon-auth";

  constructor(private readonly repository: IdentityRepository = getIdentityRepository()) {}

  async getSession(): Promise<AuthSession | null> {
    const response = await getNeonAuth().getSession();
    const session = sessionData(response);
    const user = session?.user;
    if (!user?.id) return null;

    const profile = await this.repository.ensureExternalProfile({
      userId: user.id,
      identifier: user.email?.trim() || `neon-auth:${user.id}`,
      authMode: "neon-auth",
      displayName: displayNameFor(user),
    });
    const principal = await this.repository.getPrincipalByProfileId(profile.id);
    return {
      principal: toPrincipal(principal, user.id),
      expiresAt: sessionExpiry(session?.session?.expiresAt),
    };
  }

  async signIn(credentials: AuthCredentials): Promise<AuthSession> {
    void credentials;
    throw new ApplicationError(
      "INTERNAL_ERROR",
      "Use the Neon Auth sign-in page for email or Google authentication.",
      501,
    );
  }

  async signOut(): Promise<void> {
    const response = await getNeonAuth().signOut();
    const error = (response as { error?: { message?: string } | null }).error;
    if (error) {
      throw new ApplicationError(
        "INTERNAL_ERROR",
        error.message ?? "Neon Auth sign-out failed.",
        500,
      );
    }
  }
}
