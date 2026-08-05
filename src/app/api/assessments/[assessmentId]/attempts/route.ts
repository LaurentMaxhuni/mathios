import { NextResponse } from "next/server";
import { asApplicationError } from "@/domain/errors/application-error";
import { getCurrentSession } from "@/infrastructure/auth/local-auth-provider";
import { getAssessmentRepository } from "@/infrastructure/database/repositories/assessment-repository";
import { getExerciseRepository } from "@/infrastructure/database/repositories/exercise-repository";
import { startAssessmentSchema } from "@/features/assessments/schemas";
import { requireAssessmentLearner, startAssessmentAttempt } from "@/features/assessments/service";

export const dynamic = "force-dynamic";

function errorResponse(error: unknown): NextResponse {
  const applicationError = asApplicationError(error);
  return NextResponse.json(applicationError.toJSON(), { status: applicationError.status });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ assessmentId: string }> },
): Promise<NextResponse> {
  try {
    const principal = requireAssessmentLearner(await getCurrentSession());
    const { assessmentId } = await params;
    const parsed = startAssessmentSchema.safeParse({ ...(await request.json()), assessmentId });
    if (!parsed.success)
      return NextResponse.json(
        {
          code: "VALIDATION_ERROR",
          message: "Choose a valid assessment.",
          issues: parsed.error.issues,
        },
        { status: 400 },
      );
    const attempt = await startAssessmentAttempt(
      { assessmentId, profileId: principal.profileId, seed: parsed.data.seed },
      getAssessmentRepository(),
      getExerciseRepository(),
    );
    return NextResponse.json({ attempt }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
