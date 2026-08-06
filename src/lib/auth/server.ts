import { createNeonAuth, type NeonAuth } from "@neondatabase/auth/next/server";
import { env } from "@/lib/env";

let neonAuth: NeonAuth | undefined;

export function isNeonAuthConfigured(): boolean {
  return Boolean(env.NEON_AUTH_BASE_URL && env.NEON_AUTH_COOKIE_SECRET);
}

export function getNeonAuth(): NeonAuth {
  if (!env.NEON_AUTH_BASE_URL || !env.NEON_AUTH_COOKIE_SECRET) {
    throw new Error(
      "Neon Auth is not configured. Set NEON_AUTH_BASE_URL and NEON_AUTH_COOKIE_SECRET before starting the app.",
    );
  }

  neonAuth ??= createNeonAuth({
    baseUrl: env.NEON_AUTH_BASE_URL,
    cookies: {
      secret: env.NEON_AUTH_COOKIE_SECRET,
      sessionDataTtl: 300,
      // OAuth returns to the app from another site. Lax keeps the session
      // challenge available on that top-level callback navigation.
      sameSite: "lax",
    },
    logLevel: env.LOG_LEVEL === "debug" ? "debug" : "warn",
  });
  return neonAuth;
}

/**
 * Lazy proxy kept as the standard import surface for route handlers and server
 * actions. It avoids constructing the SDK during local/offline test builds
 * where Neon Auth is intentionally not configured.
 */
export const auth = new Proxy({} as NeonAuth, {
  get(_target, property: string | symbol) {
    const instance = getNeonAuth();
    const value = instance[property as keyof NeonAuth];
    return typeof value === "function" ? value.bind(instance) : value;
  },
});
