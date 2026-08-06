import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { hasPermission } from "@/features/auth/authorization";
import { getCurrentSession } from "@/infrastructure/auth/local-auth-provider";
import { env } from "@/lib/env";
import { getMetricsSnapshot, renderPrometheusMetrics } from "@/server/metrics";

export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<NextResponse> {
  if (!(await canReadMetrics(request))) {
    return NextResponse.json(
      { code: "UNAUTHORIZED", message: "Metrics authentication is required." },
      { status: 401 },
    );
  }

  const snapshot = getMetricsSnapshot();
  if (request.headers.get("accept")?.includes("text/plain")) {
    return new NextResponse(renderPrometheusMetrics(snapshot), {
      headers: {
        "Content-Type": "text/plain; version=0.0.4; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  }
  return NextResponse.json(snapshot, { headers: { "Cache-Control": "no-store" } });
}

async function canReadMetrics(request: Request): Promise<boolean> {
  if (env.METRICS_TOKEN) {
    const authorization = request.headers.get("authorization");
    const received = authorization?.startsWith("Bearer ")
      ? Buffer.from(authorization.slice("Bearer ".length))
      : null;
    const expected = Buffer.from(env.METRICS_TOKEN);
    if (!received || received.length !== expected.length) return false;
    return timingSafeEqual(received, expected);
  }

  const session = await getCurrentSession();
  return hasPermission(session?.principal, "manage_application_settings");
}
