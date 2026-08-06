import { NextResponse } from "next/server";
import { asApplicationError } from "@/domain/errors/application-error";
import { requireSession } from "@/features/auth/authorization";
import { getCurrentSession } from "@/infrastructure/auth/local-auth-provider";
import { getStudyPlannerRepository } from "@/infrastructure/database/repositories/study-planner-repository";
import { rescheduleMissedSessions } from "@/features/planner/service";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ planId: string }> },
): Promise<NextResponse> {
  try {
    const principal = requireSession(await getCurrentSession());
    const { planId } = await params;
    const body = (await request.json().catch(() => ({}))) as { asOfDate?: string };
    const result = await rescheduleMissedSessions(
      principal.profileId,
      planId,
      body.asOfDate ?? new Date().toISOString().slice(0, 10),
      getStudyPlannerRepository(),
    );
    return NextResponse.json(result);
  } catch (error) {
    const applicationError = asApplicationError(error);
    return NextResponse.json(applicationError.toJSON(), { status: applicationError.status });
  }
}
