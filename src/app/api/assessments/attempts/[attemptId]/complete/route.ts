import { NextResponse } from "next/server";
import { asApplicationError } from "@/domain/errors/application-error";
import { getCurrentSession } from "@/infrastructure/auth/local-auth-provider";
import { getAssessmentRepository } from "@/infrastructure/database/repositories/assessment-repository";
import { getMasteryRepository } from "@/infrastructure/database/repositories/mastery-repository";
import { getAnalyticsRepository } from "@/infrastructure/database/repositories/analytics-repository";
import { trackActivityEvent } from "@/features/analytics/service";
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
    const analyticsRepository = getAnalyticsRepository();
    const result = await completeAssessmentAttempt(
      { attemptId, profileId: principal.profileId },
      getAssessmentRepository(),
      getMasteryRepository(),
      analyticsRepository,
    );
    await trackActivityEvent(
      {
        id: `activity-assessment-submission-${result.attempt.id}`,
        profileId: principal.profileId,
        eventType: "assessment-submission",
        resourceType: "assessment",
        resourceId: result.assessment.id,
        score: result.attempt.percentage,
        durationSeconds: result.timeSpentSeconds,
        dedupeKey: `assessment-submission:${result.attempt.id}`,
        metadata: { passed: result.attempt.passed },
      },
      analyticsRepository,
    );
    return NextResponse.json({ result });
  } catch (error) {
    return errorResponse(error);
  }
}
