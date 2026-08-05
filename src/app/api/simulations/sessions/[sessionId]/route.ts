import { NextResponse } from "next/server";
import { asApplicationError } from "@/domain/errors/application-error";
import { getCurrentSession } from "@/infrastructure/auth/local-auth-provider";
import { getSimulationRepository } from "@/infrastructure/database/repositories/simulation-repository";
import { requireSimulationLearner, updateSimulationSession } from "@/features/simulations/service";
import { sessionUpdateSchema } from "@/features/simulations/schemas";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  try {
    const principal = requireSimulationLearner(await getCurrentSession());
    const { sessionId } = await params;
    const body = sessionUpdateSchema.safeParse({ ...(await request.json()), sessionId });
    if (!body.success)
      return NextResponse.json({ message: "Invalid simulation session." }, { status: 400 });
    const session = await updateSimulationSession(
      principal.profileId,
      body.data,
      getSimulationRepository(),
    );
    return NextResponse.json({ session });
  } catch (error) {
    const applicationError = asApplicationError(error);
    return NextResponse.json(applicationError.toJSON(), { status: applicationError.status });
  }
}
