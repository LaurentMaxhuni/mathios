import { NextResponse } from "next/server";
import { asApplicationError } from "@/domain/errors/application-error";
import { getCurrentSession } from "@/infrastructure/auth/local-auth-provider";
import { getExerciseRepository } from "@/infrastructure/database/repositories/exercise-repository";
import { getMasteryRepository } from "@/infrastructure/database/repositories/mastery-repository";
import { getAnalyticsRepository } from "@/infrastructure/database/repositories/analytics-repository";
import { trackActivityEvent } from "@/features/analytics/service";
import { completeExerciseAttempt, requireExerciseLearner } from "@/features/exercises/service";
import { completeAttemptSchema } from "@/features/exercises/schemas";

export const dynamic = "force-dynamic";

function errorResponse(error: unknown): NextResponse {
  const applicationError = asApplicationError(error);
  return NextResponse.json(applicationError.toJSON(), { status: applicationError.status });
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ attemptId: string }> },
): Promise<NextResponse> {
  try {
    const principal = requireExerciseLearner(await getCurrentSession());
    const { attemptId } = await params;
    const parsed = completeAttemptSchema.safeParse({ attemptId });
    if (!parsed.success)
      return NextResponse.json(
        {
          code: "VALIDATION_ERROR",
          message: "Choose a valid attempt.",
          issues: parsed.error.issues,
        },
        { status: 400 },
      );
    const analyticsRepository = getAnalyticsRepository();
    const attempt = await completeExerciseAttempt(
      { attemptId, profileId: principal.profileId },
      getExerciseRepository(),
      getMasteryRepository(),
      analyticsRepository,
    );
    await trackActivityEvent(
      {
        id: `activity-exercise-completion-${attempt.id}`,
        profileId: principal.profileId,
        eventType: "study-session-completion",
        resourceType: "exercise-attempt",
        resourceId: attempt.id,
        score: attempt.maxScore > 0 ? attempt.score / attempt.maxScore : null,
        dedupeKey: `exercise-completion:${attempt.id}`,
      },
      analyticsRepository,
    );
    return NextResponse.json({ attempt });
  } catch (error) {
    return errorResponse(error);
  }
}
