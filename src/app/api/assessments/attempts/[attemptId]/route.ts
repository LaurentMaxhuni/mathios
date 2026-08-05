import { NextResponse } from "next/server";
import { asApplicationError } from "@/domain/errors/application-error";
import { getCurrentSession } from "@/infrastructure/auth/local-auth-provider";
import { getAssessmentRepository } from "@/infrastructure/database/repositories/assessment-repository";
import {
  getLearnerAssessmentResult,
  requireAssessmentLearner,
} from "@/features/assessments/service";

export const dynamic = "force-dynamic";

function errorResponse(error: unknown): NextResponse {
  const applicationError = asApplicationError(error);
  return NextResponse.json(applicationError.toJSON(), { status: applicationError.status });
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ attemptId: string }> },
): Promise<NextResponse> {
  try {
    const principal = requireAssessmentLearner(await getCurrentSession());
    const { attemptId } = await params;
    const result = await getLearnerAssessmentResult(
      attemptId,
      principal.profileId,
      getAssessmentRepository(),
    );
    return NextResponse.json({ result });
  } catch (error) {
    return errorResponse(error);
  }
}
