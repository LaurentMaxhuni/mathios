import { NextResponse } from "next/server";
import { asApplicationError } from "@/domain/errors/application-error";
import { getCurrentSession } from "@/infrastructure/auth/local-auth-provider";
import { getSimulationRepository } from "@/infrastructure/database/repositories/simulation-repository";
import { requireSimulationLearner, saveSimulationPreset } from "@/features/simulations/service";
import { presetSchema } from "@/features/simulations/schemas";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ simulationId: string }> },
) {
  try {
    const principal = requireSimulationLearner(await getCurrentSession());
    const { simulationId } = await params;
    const body = presetSchema.safeParse({ ...(await request.json()), simulationId });
    if (!body.success) return NextResponse.json({ message: "Invalid preset." }, { status: 400 });
    const preset = await saveSimulationPreset(
      principal.profileId,
      body.data,
      getSimulationRepository(),
    );
    return NextResponse.json({ preset }, { status: 201 });
  } catch (error) {
    const applicationError = asApplicationError(error);
    return NextResponse.json(applicationError.toJSON(), { status: applicationError.status });
  }
}
