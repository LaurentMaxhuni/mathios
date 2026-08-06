import { NextResponse } from "next/server";
import { asApplicationError } from "@/domain/errors/application-error";
import { requireSession } from "@/features/auth/authorization";
import { parseAnalyticsRange } from "@/features/analytics/schemas";
import { getLearnerAnalytics } from "@/features/analytics/service";
import { getCurrentSession } from "@/infrastructure/auth/local-auth-provider";

export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<NextResponse> {
  try {
    const principal = requireSession(await getCurrentSession());
    const range = parseAnalyticsRange(new URL(request.url).searchParams);
    const data = await getLearnerAnalytics(principal.profileId, range);
    return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const applicationError = asApplicationError(error);
    return NextResponse.json(applicationError.toJSON(), { status: applicationError.status });
  }
}
