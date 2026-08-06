import { NextResponse } from "next/server";
import { asApplicationError } from "@/domain/errors/application-error";
import { getCurrentSession } from "@/infrastructure/auth/local-auth-provider";
import { getAssessmentRepository } from "@/infrastructure/database/repositories/assessment-repository";
import { getExerciseRepository } from "@/infrastructure/database/repositories/exercise-repository";
import { getAnalyticsRepository } from "@/infrastructure/database/repositories/analytics-repository";
import { trackActivityEvent } from "@/features/analytics/service";
import { assessmentAnswerSchema } from "@/features/assessments/schemas";
import { requireAssessmentLearner, submitAssessmentAnswer } from "@/features/assessments/service";

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
    const parsed = assessmentAnswerSchema.safeParse({ ...(await request.json()), attemptId });
    if (!parsed.success)
      return NextResponse.json(
        {
          code: "VALIDATION_ERROR",
          message: "Choose a valid answer.",
          issues: parsed.error.issues,
        },
        { status: 400 },
      );
    const submitted = await submitAssessmentAnswer(
      { ...parsed.data, response: parsed.data.response ?? "", profileId: principal.profileId },
      getAssessmentRepository(),
      getExerciseRepository(),
    );
    await trackActivityEvent(
      {
        id: `activity-assessment-question-${submitted.attempt.id}-${parsed.data.questionId}`,
        profileId: principal.profileId,
        eventType: "question-attempt",
        resourceType: "question",
        resourceId: parsed.data.questionId,
        score:
          submitted.result.status === "needs-review"
            ? null
            : submitted.result.maxScore > 0
              ? submitted.result.score / submitted.result.maxScore
              : null,
        isCorrect:
          submitted.result.status === "needs-review" ? null : submitted.result.status === "correct",
        dedupeKey: `assessment-question-attempt:${submitted.attempt.id}:${parsed.data.questionId}`,
        metadata: { assessmentAttemptId: submitted.attempt.id },
      },
      getAnalyticsRepository(),
    );
    return NextResponse.json({ attempt: submitted.attempt, result: submitted.result });
  } catch (error) {
    return errorResponse(error);
  }
}
