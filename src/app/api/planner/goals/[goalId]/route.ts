import { NextResponse } from "next/server";
import { asApplicationError } from "@/domain/errors/application-error";
import { requireSession } from "@/features/auth/authorization";
import { getCurrentSession } from "@/infrastructure/auth/local-auth-provider";
import { getStudyPlannerRepository } from "@/infrastructure/database/repositories/study-planner-repository";
import { updateStudyGoal } from "@/features/planner/service";
import { studyGoalSchema } from "@/features/planner/schemas";
import type { Weekday } from "@/domain/planner/types";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ goalId: string }> },
): Promise<NextResponse> {
  try {
    const principal = requireSession(await getCurrentSession());
    const { goalId } = await params;
    const repository = getStudyPlannerRepository();
    const goal = await repository.getGoal(principal.profileId, goalId);
    if (!goal) return NextResponse.json({ message: "Study goal not found." }, { status: 404 });
    return NextResponse.json({
      goal,
      plan: await repository.getActivePlan(principal.profileId, goalId),
    });
  } catch (error) {
    const applicationError = asApplicationError(error);
    return NextResponse.json(applicationError.toJSON(), { status: applicationError.status });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ goalId: string }> },
): Promise<NextResponse> {
  try {
    const principal = requireSession(await getCurrentSession());
    const { goalId } = await params;
    const parsed = studyGoalSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success)
      return NextResponse.json(
        { message: "Invalid study goal.", issues: parsed.error.issues },
        { status: 400 },
      );
    const parsedInput = { ...parsed.data };
    delete parsedInput.id;
    const input = {
      ...parsedInput,
      availableDays: parsedInput.availableDays as Weekday[],
      restDays: parsedInput.restDays as Weekday[],
    };
    const goal = await updateStudyGoal(
      principal.profileId,
      goalId,
      input,
      getStudyPlannerRepository(),
    );
    return NextResponse.json({ goal });
  } catch (error) {
    const applicationError = asApplicationError(error);
    return NextResponse.json(applicationError.toJSON(), { status: applicationError.status });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ goalId: string }> },
): Promise<NextResponse> {
  try {
    const principal = requireSession(await getCurrentSession());
    const { goalId } = await params;
    const goal = await getStudyPlannerRepository().setGoalStatus(
      principal.profileId,
      goalId,
      "archived",
    );
    return NextResponse.json({ goal });
  } catch (error) {
    const applicationError = asApplicationError(error);
    return NextResponse.json(applicationError.toJSON(), { status: applicationError.status });
  }
}
