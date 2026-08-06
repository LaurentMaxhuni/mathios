import { NextResponse } from "next/server";
import { asApplicationError } from "@/domain/errors/application-error";
import { requireSession } from "@/features/auth/authorization";
import { getCurrentSession } from "@/infrastructure/auth/local-auth-provider";
import { getStudyPlannerRepository } from "@/infrastructure/database/repositories/study-planner-repository";
import { generateStudyPlan } from "@/features/planner/service";

export const dynamic = "force-dynamic";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ goalId: string }> },
): Promise<NextResponse> {
  try {
    const principal = requireSession(await getCurrentSession());
    const { goalId } = await params;
    const plan = await generateStudyPlan(principal.profileId, goalId, getStudyPlannerRepository());
    return NextResponse.json({ plan }, { status: 201 });
  } catch (error) {
    const applicationError = asApplicationError(error);
    return NextResponse.json(applicationError.toJSON(), { status: applicationError.status });
  }
}
