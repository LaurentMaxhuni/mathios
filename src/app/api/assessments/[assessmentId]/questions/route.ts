import { NextResponse } from "next/server";
import { asApplicationError } from "@/domain/errors/application-error";
import { getCurrentSession } from "@/infrastructure/auth/local-auth-provider";
import {
  getAssessmentRepository,
  newAssessmentId,
} from "@/infrastructure/database/repositories/assessment-repository";
import { getExerciseRepository } from "@/infrastructure/database/repositories/exercise-repository";
import { assessmentQuestionSchema } from "@/features/assessments/schemas";
import { requireAssessmentEditor, saveAssessmentQuestion } from "@/features/assessments/service";

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
    requireAssessmentEditor(await getCurrentSession());
    const { assessmentId } = await params;
    const parsed = assessmentQuestionSchema.safeParse({ ...(await request.json()), assessmentId });
    if (!parsed.success)
      return NextResponse.json(
        {
          code: "VALIDATION_ERROR",
          message: "Choose valid assessment-question fields.",
          issues: parsed.error.issues,
        },
        { status: 400 },
      );
    await saveAssessmentQuestion(
      { ...parsed.data, id: parsed.data.id ?? newAssessmentId("assessment-question") },
      getAssessmentRepository(),
      getExerciseRepository(),
    );
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
