import { NextResponse } from "next/server";
import { asApplicationError } from "@/domain/errors/application-error";
import { getCurrentSession } from "@/infrastructure/auth/local-auth-provider";
import { getSimulationRepository } from "@/infrastructure/database/repositories/simulation-repository";
import { canAuthorSimulations, getSimulation } from "@/features/simulations/service";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ simulationId: string }> },
) {
  try {
    const session = await getCurrentSession();
    const { simulationId } = await params;
    const detail = await getSimulation(simulationId, getSimulationRepository(), {
      includeDraft: canAuthorSimulations(session?.principal),
      profileId: session?.principal.profileId,
    });
    if (!detail) return NextResponse.json({ message: "Simulation not found." }, { status: 404 });
    return NextResponse.json({ detail });
  } catch (error) {
    const applicationError = asApplicationError(error);
    return NextResponse.json(applicationError.toJSON(), { status: applicationError.status });
  }
}
