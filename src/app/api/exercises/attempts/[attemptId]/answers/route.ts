import { NextResponse } from "next/server";
import { asApplicationError } from "@/domain/errors/application-error";
import { getCurrentSession } from "@/infrastructure/auth/local-auth-provider";
import { getExerciseRepository } from "@/infrastructure/database/repositories/exercise-repository";
import { getAnalyticsRepository } from "@/infrastructure/database/repositories/analytics-repository";
import { trackActivityEvent } from "@/features/analytics/service";
import { requireExerciseLearner, submitQuestionAnswer } from "@/features/exercises/service";
import { answerSubmissionSchema } from "@/features/exercises/schemas";

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
    const principal = requireExerciseLearner(await getCurrentSession());
    const { attemptId } = await params;
    const parsed = answerSubmissionSchema.safeParse({ ...(await request.json()), attemptId });
    if (!parsed.success)
      return NextResponse.json(
        {
          code: "VALIDATION_ERROR",
          message: "Please provide a response.",
          issues: parsed.error.issues,
        },
        { status: 400 },
      );
    const submitted = await submitQuestionAnswer(
      {
        attemptId: parsed.data.attemptId,
        questionId: parsed.data.questionId,
        response: parsed.data.response ?? "",
        templateId: parsed.data.templateId,
        instanceSeed: parsed.data.instanceSeed,
        profileId: principal.profileId,
      },
      getExerciseRepository(),
    );
    await trackActivityEvent(
      {
        id: `activity-question-attempt-${submitted.attempt.id}-${parsed.data.questionId}`,
        profileId: principal.profileId,
        eventType: "question-attempt",
        resourceType: "question",
        resourceId: parsed.data.questionId,
        score:
          submitted.result.maxScore > 0 ? submitted.result.score / submitted.result.maxScore : null,
        isCorrect: submitted.result.status === "correct",
        dedupeKey: `question-attempt:${submitted.attempt.id}:${parsed.data.questionId}`,
        metadata: { attemptId: submitted.attempt.id },
      },
      getAnalyticsRepository(),
    );
    return NextResponse.json(
      { attempt: submitted.attempt, result: submitted.result },
      { status: 200 },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
