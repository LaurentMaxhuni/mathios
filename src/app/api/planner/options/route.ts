import { NextResponse } from "next/server";
import { asApplicationError } from "@/domain/errors/application-error";
import { requireSession } from "@/features/auth/authorization";
import { getCurrentSession } from "@/infrastructure/auth/local-auth-provider";
import { getStudyPlannerRepository } from "@/infrastructure/database/repositories/study-planner-repository";
import { getPlannerOptions } from "@/features/planner/service";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  try {
    requireSession(await getCurrentSession());
    return NextResponse.json({ options: await getPlannerOptions(getStudyPlannerRepository()) });
  } catch (error) {
    const applicationError = asApplicationError(error);
    return NextResponse.json(applicationError.toJSON(), { status: applicationError.status });
  }
}
