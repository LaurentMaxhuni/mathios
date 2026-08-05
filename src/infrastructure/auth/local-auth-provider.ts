import { cookies } from "next/headers";
import { AuthenticationError, ApplicationError } from "@/domain/errors/application-error";
import type { IdentityRepository } from "@/domain/ports/identity-repository";
import { getIdentityRepository } from "@/infrastructure/database/repositories/identity-repository";
import { env } from "@/lib/env";
import type {
  AuthCredentials,
  AuthMode,
  AuthProvider,
  AuthSession,
  AuthenticatedPrincipal,
} from "@/infrastructure/auth/auth-provider";
import { verifySecret } from "@/features/auth/secret";
import {
  createSessionToken,
  readSessionToken,
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
} from "@/features/auth/session-token";

function toPrincipal(
  record: Awaited<ReturnType<IdentityRepository["getPrincipalByProfileId"]>>,
): AuthenticatedPrincipal {
  if (!record) throw new AuthenticationError();
  return {
    subjectId: record.userId,
    userId: record.userId,
    profileId: record.profileId,
    roles: record.roles,
    permissions: record.permissions,
    displayName: record.displayName,
    avatar: record.avatar,
    preferredTheme: record.preferredTheme,
  };
}

export class LocalAuthProvider implements AuthProvider {
  readonly mode: AuthMode;

  constructor(
    private readonly repository: IdentityRepository = getIdentityRepository(),
    mode: AuthMode = env.AUTH_MODE === "hosted" ? "local-profile" : env.AUTH_MODE,
  ) {
    this.mode = mode;
  }

  async getSession(): Promise<AuthSession | null> {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (!token) return null;
    const payload = readSessionToken(token, env.SESSION_SECRET);
    if (!payload) return null;
    const principal = await this.repository.getPrincipalByProfileId(payload.profileId);
    if (!principal) return null;
    return {
      principal: toPrincipal(principal),
      expiresAt: new Date(payload.issuedAt + SESSION_MAX_AGE_SECONDS * 1000),
    };
  }

  async signIn(credentials: AuthCredentials): Promise<AuthSession> {
    const profile = await this.repository.getProfile(credentials.identifier);
    if (!profile) throw new AuthenticationError("The profile or PIN is not valid.");
    if (
      profile.secretHash &&
      (!credentials.secret || !verifySecret(credentials.secret, profile.secretHash))
    ) {
      throw new AuthenticationError("The profile or PIN is not valid.");
    }

    const principalRecord = await this.repository.getPrincipalByProfileId(profile.id);
    if (!principalRecord) throw new AuthenticationError("The profile is no longer available.");
    const principal = toPrincipal(principalRecord);
    const issuedAt = Date.now();
    const cookieStore = await cookies();
    cookieStore.set(
      SESSION_COOKIE_NAME,
      createSessionToken(profile.id, env.SESSION_SECRET, issuedAt),
      {
        httpOnly: true,
        sameSite: "lax",
        secure: env.NODE_ENV === "production",
        path: "/",
        maxAge: SESSION_MAX_AGE_SECONDS,
      },
    );
    return {
      principal,
      expiresAt: new Date(issuedAt + SESSION_MAX_AGE_SECONDS * 1000),
    };
  }

  async signOut(): Promise<void> {
    const cookieStore = await cookies();
    cookieStore.delete(SESSION_COOKIE_NAME);
  }
}

class HostedAuthProvider implements AuthProvider {
  readonly mode: AuthMode = "hosted";

  async getSession(): Promise<AuthSession | null> {
    return null;
  }

  async signIn(credentials: AuthCredentials): Promise<AuthSession> {
    void credentials;
    throw new ApplicationError(
      "INTERNAL_ERROR",
      "Hosted authentication is not configured for this installation.",
      501,
    );
  }

  async signOut(): Promise<void> {
    return undefined;
  }
}

export function getAuthProvider(repository?: IdentityRepository): AuthProvider {
  if (env.AUTH_MODE === "hosted") return new HostedAuthProvider();
  return new LocalAuthProvider(repository, env.AUTH_MODE);
}

export async function getCurrentSession(
  repository?: IdentityRepository,
): Promise<AuthSession | null> {
  return getAuthProvider(repository).getSession();
}
