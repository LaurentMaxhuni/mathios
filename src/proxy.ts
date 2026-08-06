import { NextRequest, NextResponse } from "next/server";
import { consumeRateLimit } from "@/server/rate-limit";
import {
  applySecurityHeaders,
  getRequestClientAddress,
  isAllowedSameOrigin,
  isMutationMethod,
} from "@/server/security";
import { env } from "@/lib/env";
import { getNeonAuth, isNeonAuthConfigured } from "@/lib/auth/server";

const NEON_AUTH_SESSION_VERIFIER_PARAM = "neon_auth_session_verifier";
const NEON_AUTH_SESSION_CHALLENGE_COOKIE = "__Secure-neon-auth.session_challange";

export async function proxy(request: NextRequest): Promise<NextResponse> {
  const requestId = normalizeRequestId(request.headers.get("x-request-id")) ?? crypto.randomUUID();
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-request-id", requestId);
  const headers = new Headers({ "x-request-id": requestId });
  const pathname = request.nextUrl.pathname;
  const isApiRequest = pathname.startsWith("/api/");
  const isPublicPage = pathname === "/" || pathname === "/auth" || pathname.startsWith("/auth/");
  const hasNeonAuthSessionVerifier = request.nextUrl.searchParams.has(
    NEON_AUTH_SESSION_VERIFIER_PARAM,
  );
  const hasNeonAuthSessionChallenge = request.cookies.has(NEON_AUTH_SESSION_CHALLENGE_COOKIE);

  let response: NextResponse;
  if (
    env.AUTH_MODE === "neon-auth" &&
    hasNeonAuthSessionVerifier &&
    !isApiRequest &&
    !hasNeonAuthSessionChallenge
  ) {
    const cleanUrl = request.nextUrl.clone();
    cleanUrl.searchParams.delete(NEON_AUTH_SESSION_VERIFIER_PARAM);
    response = NextResponse.redirect(cleanUrl);
  } else if (
    env.AUTH_MODE === "neon-auth" &&
    !isApiRequest &&
    (!isPublicPage || hasNeonAuthSessionVerifier)
  ) {
    response = isNeonAuthConfigured()
      ? await getNeonAuth().middleware({ loginUrl: "/auth/sign-in" })(request)
      : NextResponse.json(
          {
            code: "AUTH_NOT_CONFIGURED",
            message: "Neon Auth is not configured for this deployment.",
          },
          { status: 503, headers },
        );
  } else if (isApiRequest) {
    response = rateLimitedResponse(request, requestHeaders, requestId);
  } else {
    response = NextResponse.next({ request: { headers: requestHeaders } });
  }

  applySecurityHeaders(response.headers);
  response.headers.set("x-request-id", requestId);
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)", "/api/:path*"],
};

function rateLimitedResponse(
  request: NextRequest,
  requestHeaders: Headers,
  requestId: string,
): NextResponse {
  const decision = consumeRateLimit(
    `http:${getRequestClientAddress(request)}:${request.nextUrl.pathname}`,
  );
  const headers = new Headers({
    "x-request-id": requestId,
    "X-RateLimit-Limit": String(decision.limit),
    "X-RateLimit-Remaining": String(decision.remaining),
  });
  if (!decision.allowed) {
    headers.set("Retry-After", String(decision.retryAfterSeconds));
    return NextResponse.json(
      { code: "RATE_LIMITED", message: "Too many requests. Please try again later." },
      { status: 429, headers },
    );
  }

  const hasSessionCookie =
    request.cookies.has("mathios_session") ||
    request.cookies.getAll().some(({ name }) => name.includes("neon-auth"));
  const isNeonAuthApi = request.nextUrl.pathname.startsWith("/api/auth/");
  if (
    isMutationMethod(request.method) &&
    env.CSRF_PROTECTION_ENABLED &&
    hasSessionCookie &&
    !isNeonAuthApi &&
    !isAllowedSameOrigin(request)
  ) {
    return NextResponse.json(
      { code: "FORBIDDEN", message: "Cross-site state-changing requests are not allowed." },
      { status: 403, headers },
    );
  }
  return NextResponse.next({ request: { headers: requestHeaders } });
}

function normalizeRequestId(value: string | null): string | null {
  if (!value || value.length > 128 || !/^[A-Za-z0-9._:-]+$/.test(value)) return null;
  return value;
}
