import { NextResponse } from "next/server";
import { asApplicationError } from "@/domain/errors/application-error";
import { requireSession } from "@/features/auth/authorization";
import { getCurrentSession } from "@/infrastructure/auth/local-auth-provider";
import { getStudyPlannerRepository } from "@/infrastructure/database/repositories/study-planner-repository";
import { studyAvailabilityListSchema } from "@/features/planner/schemas";
import type { Weekday } from "@/domain/planner/types";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  try {
    const principal = requireSession(await getCurrentSession());
    return NextResponse.json({
      availability: await getStudyPlannerRepository().listAvailability(principal.profileId),
    });
  } catch (error) {
    const applicationError = asApplicationError(error);
    return NextResponse.json(applicationError.toJSON(), { status: applicationError.status });
  }
}

export async function PUT(request: Request): Promise<NextResponse> {
  try {
    const principal = requireSession(await getCurrentSession());
    const parsed = studyAvailabilityListSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success)
      return NextResponse.json(
        { message: "Invalid availability windows.", issues: parsed.error.issues },
        { status: 400 },
      );
    const availability = await getStudyPlannerRepository().replaceAvailability(
      principal.profileId,
      parsed.data.slots.map((slot) => ({ ...slot, weekday: slot.weekday as Weekday })),
    );
    return NextResponse.json({ availability });
  } catch (error) {
    const applicationError = asApplicationError(error);
    return NextResponse.json(applicationError.toJSON(), { status: applicationError.status });
  }
}
