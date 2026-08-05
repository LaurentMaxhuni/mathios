import { NextResponse } from "next/server";
import { asApplicationError } from "@/domain/errors/application-error";
import { getCurrentSession } from "@/infrastructure/auth/local-auth-provider";
import { getMasteryRepository } from "@/infrastructure/database/repositories/mastery-repository";
import { dismissRecommendation, requireMasteryLearner } from "@/features/mastery/service";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ recommendationId: string }> },
): Promise<NextResponse> {
  try {
    const principal = requireMasteryLearner(await getCurrentSession());
    const { recommendationId } = await params;
    const body = (await request.json().catch(() => ({}))) as { reason?: string };
    await dismissRecommendation(
      principal.profileId,
      recommendationId,
      getMasteryRepository(),
      body.reason,
    );
    return NextResponse.json({ ok: true, reason: body.reason ?? null });
  } catch (error) {
    const applicationError = asApplicationError(error);
    return NextResponse.json(applicationError.toJSON(), { status: applicationError.status });
  }
}
