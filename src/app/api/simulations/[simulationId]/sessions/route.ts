import { NextResponse } from "next/server";
import { z } from "zod";
import { asApplicationError } from "@/domain/errors/application-error";
import { getCurrentSession } from "@/infrastructure/auth/local-auth-provider";
import { getSimulationRepository } from "@/infrastructure/database/repositories/simulation-repository";
import { requireSimulationLearner, startSimulation } from "@/features/simulations/service";

export const dynamic = "force-dynamic";
const bodySchema = z.object({
  presetValues: z.record(z.union([z.string(), z.number(), z.boolean()])).optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ simulationId: string }> },
) {
  try {
    const principal = requireSimulationLearner(await getCurrentSession());
    const body = bodySchema.safeParse(await request.json().catch(() => ({})));
    if (!body.success)
      return NextResponse.json({ message: "Invalid simulation inputs." }, { status: 400 });
    const { simulationId } = await params;
    const session = await startSimulation(
      principal.profileId,
      simulationId,
      getSimulationRepository(),
      body.data.presetValues,
    );
    return NextResponse.json({ session }, { status: 201 });
  } catch (error) {
    const applicationError = asApplicationError(error);
    return NextResponse.json(applicationError.toJSON(), { status: applicationError.status });
  }
}
