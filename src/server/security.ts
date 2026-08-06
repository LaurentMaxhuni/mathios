import { env } from "@/lib/env";

const mutationMethods = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export function isMutationMethod(method: string): boolean {
  return mutationMethods.has(method.toUpperCase());
}

export function isAllowedSameOrigin(request: {
  headers: Headers;
  nextUrl: { origin: string };
}): boolean {
  const origin = request.headers.get("origin");
  if (origin) {
    try {
      const originUrl = new URL(origin);
      const requestUrl = new URL(request.nextUrl.origin);
      const configuredUrl = new URL(env.NEXT_PUBLIC_APP_URL);
      const requestHost = request.headers.get("host");
      const forwardedProtocol = request.headers.get("x-forwarded-proto")?.split(",", 1)[0]?.trim();
      const protocol = forwardedProtocol ? `${forwardedProtocol}:` : requestUrl.protocol;
      const sameRequestOrigin =
        originUrl.origin === requestUrl.origin ||
        (originUrl.host === requestHost && originUrl.protocol === protocol);
      const localAlias =
        ["localhost", "127.0.0.1", "::1"].includes(originUrl.hostname) &&
        ["localhost", "127.0.0.1", "::1"].includes(requestUrl.hostname) &&
        originUrl.port === requestUrl.port &&
        originUrl.protocol === requestUrl.protocol;
      return sameRequestOrigin || originUrl.origin === configuredUrl.origin || localAlias;
    } catch {
      return false;
    }
  }
  return request.headers.get("sec-fetch-site") !== "cross-site";
}

export function getRequestClientAddress(request: { headers: Headers }): string {
  if (env.TRUST_PROXY) {
    return (
      request.headers.get("x-forwarded-for")?.split(",", 1)[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown"
    );
  }
  return request.headers.get("x-real-ip") || "unknown";
}

export function applySecurityHeaders(headers: Headers): void {
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Frame-Options", "DENY");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  headers.set("Cross-Origin-Opener-Policy", "same-origin");
  headers.set("Cross-Origin-Resource-Policy", "same-origin");
  headers.set("X-Permitted-Cross-Domain-Policies", "none");
  if (env.NODE_ENV === "production") {
    headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }
}
