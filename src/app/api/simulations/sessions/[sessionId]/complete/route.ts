import { NextResponse } from "next/server";
import { z } from "zod";
import { asApplicationError } from "@/domain/errors/application-error";
import { getCurrentSession } from "@/infrastructure/auth/local-auth-provider";
import { getSimulationRepository } from "@/infrastructure/database/repositories/simulation-repository";
import { getAnalyticsRepository } from "@/infrastructure/database/repositories/analytics-repository";
import { trackActivityEvent } from "@/features/analytics/service";
import { completeSimulation, requireSimulationLearner } from "@/features/simulations/service";

export const dynamic = "force-dynamic";
const bodySchema = z.object({
  inputs: z.record(z.union([z.string(), z.number(), z.boolean()])),
  state: z.record(z.number()),
  elapsedSeconds: z.number().int().min(0).max(86400),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  try {
    const principal = requireSimulationLearner(await getCurrentSession());
    const body = bodySchema.safeParse(await request.json());
    if (!body.success)
      return NextResponse.json({ message: "Invalid simulation result." }, { status: 400 });
    const { sessionId } = await params;
    const result = await completeSimulation(
      principal.profileId,
      { sessionId, ...body.data },
      getSimulationRepository(),
    );
    await trackActivityEvent(
      {
        id: `activity-simulation-session-${result.sessionId}`,
        profileId: principal.profileId,
        eventType: "simulation-session",
        resourceType: "simulation",
        resourceId: result.simulationId,
        durationSeconds: body.data.elapsedSeconds,
        score: result.completionPercentage / 100,
        dedupeKey: `simulation-session:${result.sessionId}`,
        metadata: { sessionId: result.sessionId },
      },
      getAnalyticsRepository(),
    );
    return NextResponse.json({ result }, { status: 201 });
  } catch (error) {
    const applicationError = asApplicationError(error);
    return NextResponse.json(applicationError.toJSON(), { status: applicationError.status });
  }
}
