import { NextResponse } from "next/server";
import { asApplicationError } from "@/domain/errors/application-error";
import { getCurrentSession } from "@/infrastructure/auth/local-auth-provider";
import { getSimulationRepository } from "@/infrastructure/database/repositories/simulation-repository";
import { listSimulations } from "@/features/simulations/service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const session = await getCurrentSession();
    const subjectId = new URL(request.url).searchParams.get("subjectId") ?? undefined;
    const includeDraft = Boolean(session?.principal.permissions.includes("edit_content"));
    return NextResponse.json({
      simulations: await listSimulations(getSimulationRepository(), { subjectId, includeDraft }),
    });
  } catch (error) {
    const applicationError = asApplicationError(error);
    return NextResponse.json(applicationError.toJSON(), { status: applicationError.status });
  }
}
