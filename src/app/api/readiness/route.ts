import { NextResponse } from "next/server";
import { getReadinessReport } from "@/server/health";
import { recordHttpRequest } from "@/server/metrics";

export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<NextResponse> {
  const startedAt = performance.now();
  const report = await getReadinessReport();
  const response = NextResponse.json(report, {
    status: report.status === "ready" ? 200 : 503,
    headers: { "Cache-Control": "no-store" },
  });
  recordHttpRequest({
    method: request.method,
    path: "/api/readiness",
    status: response.status,
    durationMs: Math.round(performance.now() - startedAt),
  });
  return response;
}
