import { NextResponse } from "next/server";
import { asApplicationError } from "@/domain/errors/application-error";
import { requireSession } from "@/features/auth/authorization";
import { getCurrentSession } from "@/infrastructure/auth/local-auth-provider";
import { getStudyPlannerRepository } from "@/infrastructure/database/repositories/study-planner-repository";
import { getAnalyticsRepository } from "@/infrastructure/database/repositories/analytics-repository";
import { trackActivityEvent } from "@/features/analytics/service";
import { rescheduleStudySession, updateStudySessionStatus } from "@/features/planner/service";
import { studySessionMoveSchema, studySessionStatusSchema } from "@/features/planner/schemas";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> },
): Promise<NextResponse> {
  try {
    const principal = requireSession(await getCurrentSession());
    const { sessionId } = await params;
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const repository = getStudyPlannerRepository();
    let session;
    const move = studySessionMoveSchema.safeParse(body);
    if (move.success) {
      session = await rescheduleStudySession(principal.profileId, sessionId, move.data, repository);
    }
    if (typeof body.status === "string") {
      const parsedStatus = studySessionStatusSchema.safeParse(body);
      if (!parsedStatus.success)
        return NextResponse.json({ message: "Invalid session status." }, { status: 400 });
      session = await updateStudySessionStatus(
        principal.profileId,
        sessionId,
        parsedStatus.data.status,
        parsedStatus.data.reason,
        repository,
      );
      if (session.status === "completed") {
        await trackActivityEvent(
          {
            id: `activity-study-session-completion-${session.id}`,
            profileId: principal.profileId,
            eventType: "study-session-completion",
            resourceType: "study-session",
            resourceId: session.id,
            durationSeconds: session.durationMinutes * 60,
            dedupeKey: `study-session-completion:${session.id}`,
            metadata: { itemType: session.itemType, sourceId: session.sourceId },
          },
          getAnalyticsRepository(),
        );
      }
    }
    if (!session)
      return NextResponse.json({ message: "Provide a move or status update." }, { status: 400 });
    return NextResponse.json({ session });
  } catch (error) {
    const applicationError = asApplicationError(error);
    return NextResponse.json(applicationError.toJSON(), { status: applicationError.status });
  }
}
