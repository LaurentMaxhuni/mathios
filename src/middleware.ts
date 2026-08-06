import { NextRequest, NextResponse } from "next/server";
import { consumeRateLimit } from "@/server/rate-limit";
import {
  applySecurityHeaders,
  getRequestClientAddress,
  isAllowedSameOrigin,
  isMutationMethod,
} from "@/server/security";
import { env } from "@/lib/env";

export function middleware(request: NextRequest): NextResponse {
  const requestId = normalizeRequestId(request.headers.get("x-request-id")) ?? crypto.randomUUID();
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-request-id", requestId);
  const headers = new Headers({ "x-request-id": requestId });

  const response =
    isMutationMethod(request.method) &&
    env.CSRF_PROTECTION_ENABLED &&
    request.cookies.has("mathios_session") &&
    !isAllowedSameOrigin(request)
      ? NextResponse.json(
          { code: "FORBIDDEN", message: "Cross-site state-changing requests are not allowed." },
          { status: 403, headers },
        )
      : rateLimitedResponse(request, requestHeaders, requestId);

  applySecurityHeaders(response.headers);
  response.headers.set("x-request-id", requestId);
  return response;
}

export const config = {
  matcher: ["/api/:path*"],
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
  return NextResponse.next({ request: { headers: requestHeaders } });
}

function normalizeRequestId(value: string | null): string | null {
  if (!value || value.length > 128 || !/^[A-Za-z0-9._:-]+$/.test(value)) return null;
  return value;
}
