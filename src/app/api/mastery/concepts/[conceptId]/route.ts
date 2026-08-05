import { NextResponse } from "next/server";
import { asApplicationError } from "@/domain/errors/application-error";
import { getCurrentSession } from "@/infrastructure/auth/local-auth-provider";
import { getMasteryRepository } from "@/infrastructure/database/repositories/mastery-repository";
import { getMasteryDetail, requireMasteryLearner } from "@/features/mastery/service";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ conceptId: string }> },
): Promise<NextResponse> {
  try {
    const principal = requireMasteryLearner(await getCurrentSession());
    const { conceptId } = await params;
    const detail = await getMasteryDetail(principal.profileId, conceptId, getMasteryRepository());
    return NextResponse.json({ detail });
  } catch (error) {
    const applicationError = asApplicationError(error);
    return NextResponse.json(applicationError.toJSON(), { status: applicationError.status });
  }
}
