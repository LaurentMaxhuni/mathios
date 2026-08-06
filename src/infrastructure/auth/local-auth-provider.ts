import { headers } from "next/headers";
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
import { verifyHostedJwt } from "@/infrastructure/auth/hosted-jwt";
import { recordRequestAuditEvent } from "@/server/audit";
import { enforceRateLimit, resetRateLimit } from "@/server/rate-limit";

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
    const cookieStore = await cookiesSafe();
    const token = cookieStore?.get(SESSION_COOKIE_NAME)?.value;
    if (!token) return null;
    const payload = readSessionToken(token, env.SESSION_SECRET);
    if (!payload) return null;
    const principal = await this.repository.getPrincipalByProfileId(payload.profileId);
    if (!principal) return null;

    const expiresAt = new Date(payload.issuedAt + SESSION_MAX_AGE_SECONDS * 1000);
    if (shouldRotateSession(payload.issuedAt)) {
      await tryRotateSession(cookieStore, payload.profileId);
    }
    return { principal: toPrincipal(principal), expiresAt };
  }

  async signIn(credentials: AuthCredentials): Promise<AuthSession> {
    const rateLimitKey = `auth:${credentials.identifier}`;
    enforceRateLimit(rateLimitKey, {
      limit: env.AUTH_RATE_LIMIT_MAX_ATTEMPTS,
      windowSeconds: env.AUTH_RATE_LIMIT_WINDOW_SECONDS,
    });

    try {
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
      setSessionCookie(cookieStore, profile.id, issuedAt);
      resetRateLimit(rateLimitKey);
      await recordRequestAuditEvent({
        actorProfileId: profile.id,
        eventType: "auth.sign_in.succeeded",
        resourceType: "profile",
        resourceId: profile.id,
        metadata: { mode: this.mode },
      });
      return {
        principal,
        expiresAt: new Date(issuedAt + SESSION_MAX_AGE_SECONDS * 1000),
      };
    } catch (error) {
      await recordRequestAuditEvent({
        eventType: "auth.sign_in.failed",
        resourceType: "profile",
        resourceId: credentials.identifier,
        metadata: { mode: this.mode },
      });
      throw error;
    }
  }

  async signOut(): Promise<void> {
    const cookieStore = await cookies();
    const profileId = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    cookieStore.delete(SESSION_COOKIE_NAME);
    await recordRequestAuditEvent({
      eventType: "auth.sign_out",
      resourceType: "profile",
      resourceId: profileId ? "session" : null,
      metadata: { mode: this.mode },
    });
  }
}

export class HostedAuthProvider implements AuthProvider {
  readonly mode: AuthMode = "hosted";

  constructor(private readonly repository: IdentityRepository = getIdentityRepository()) {}

  async getSession(): Promise<AuthSession | null> {
    const requestHeaders = await headers();
    const authorization = requestHeaders.get("authorization");
    const token = authorization?.startsWith("Bearer ")
      ? authorization.slice("Bearer ".length).trim()
      : null;
    if (!token) return null;

    const claims = verifyHostedJwt(token, {
      sharedSecret: env.HOSTED_AUTH_SHARED_SECRET,
      publicKey: env.HOSTED_AUTH_PUBLIC_KEY,
      issuer: env.HOSTED_AUTH_ISSUER,
      audience: env.HOSTED_AUTH_AUDIENCE,
    });
    if (!claims) return null;
    const profile = await this.repository.getProfileByIdentifier(claims.sub);
    if (!profile) return null;
    const principalRecord = await this.repository.getPrincipalByProfileId(profile.id);
    if (!principalRecord) return null;
    return {
      principal: {
        ...toPrincipal(principalRecord),
        subjectId: claims.sub,
      },
      expiresAt: new Date(claims.exp * 1000),
    };
  }

  async signIn(credentials: AuthCredentials): Promise<AuthSession> {
    void credentials;
    throw new ApplicationError(
      "INTERNAL_ERROR",
      "Hosted authentication is managed by the configured identity provider.",
      501,
    );
  }

  async signOut(): Promise<void> {
    return undefined;
  }
}

export function getAuthProvider(repository?: IdentityRepository): AuthProvider {
  if (env.AUTH_MODE === "hosted") return new HostedAuthProvider(repository);
  return new LocalAuthProvider(repository, env.AUTH_MODE);
}

export async function getCurrentSession(
  repository?: IdentityRepository,
): Promise<AuthSession | null> {
  return getAuthProvider(repository).getSession();
}

async function cookiesSafe(): Promise<Awaited<
  ReturnType<typeof import("next/headers").cookies>
> | null> {
  try {
    return await cookies();
  } catch {
    return null;
  }
}

async function cookies(): Promise<Awaited<ReturnType<typeof import("next/headers").cookies>>> {
  const { cookies: getCookies } = await import("next/headers");
  return getCookies();
}

function setSessionCookie(
  cookieStore: Awaited<ReturnType<typeof import("next/headers").cookies>>,
  profileId: string,
  issuedAt: number,
): void {
  cookieStore.set(
    SESSION_COOKIE_NAME,
    createSessionToken(profileId, env.SESSION_SECRET, issuedAt),
    {
      httpOnly: true,
      sameSite: "lax",
      secure: env.NODE_ENV === "production" || env.APP_ENV === "hosted-production",
      path: "/",
      maxAge: SESSION_MAX_AGE_SECONDS,
      priority: "high",
    },
  );
}

async function tryRotateSession(
  cookieStore: Awaited<ReturnType<typeof import("next/headers").cookies>> | null,
  profileId: string,
): Promise<void> {
  if (!cookieStore) return;
  try {
    setSessionCookie(cookieStore, profileId, Date.now());
  } catch {
    // Server Components may only read cookies. The next mutable request/action rotates it.
  }
}

function shouldRotateSession(issuedAt: number, now = Date.now()): boolean {
  return now - issuedAt >= env.SESSION_ROTATION_INTERVAL_SECONDS * 1000;
}
