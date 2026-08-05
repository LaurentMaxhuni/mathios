import { NextResponse } from "next/server";
import { asApplicationError } from "@/domain/errors/application-error";
import { getCurrentSession } from "@/infrastructure/auth/local-auth-provider";
import { getAssessmentRepository } from "@/infrastructure/database/repositories/assessment-repository";
import { completeAssessmentSchema } from "@/features/assessments/schemas";
import {
  completeAssessmentAttempt,
  requireAssessmentLearner,
} from "@/features/assessments/service";

export const dynamic = "force-dynamic";

function errorResponse(error: unknown): NextResponse {
  const applicationError = asApplicationError(error);
  return NextResponse.json(applicationError.toJSON(), { status: applicationError.status });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ attemptId: string }> },
): Promise<NextResponse> {
  try {
    const principal = requireAssessmentLearner(await getCurrentSession());
    const { attemptId } = await params;
    const parsed = completeAssessmentSchema.safeParse({ ...(await request.json()), attemptId });
    if (!parsed.success)
      return NextResponse.json(
        {
          code: "VALIDATION_ERROR",
          message: "Choose a valid attempt.",
          issues: parsed.error.issues,
        },
        { status: 400 },
      );
    const result = await completeAssessmentAttempt(
      { attemptId, profileId: principal.profileId },
      getAssessmentRepository(),
    );
    return NextResponse.json({ result });
  } catch (error) {
    return errorResponse(error);
  }
}
