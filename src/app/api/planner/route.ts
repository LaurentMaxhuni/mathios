import { NextResponse } from "next/server";
import { asApplicationError } from "@/domain/errors/application-error";
import { getCurrentSession } from "@/infrastructure/auth/local-auth-provider";
import { requireSession } from "@/features/auth/authorization";
import { getStudyPlannerRepository } from "@/infrastructure/database/repositories/study-planner-repository";
import {
  createGoalAndGeneratePlan,
  createStudyGoal,
  getPlannerDashboard,
  getPlannerOptions,
  plannerWindowAround,
} from "@/features/planner/service";
import { studyGoalSchema } from "@/features/planner/schemas";
import type { Weekday } from "@/domain/planner/types";

export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<NextResponse> {
  try {
    const principal = requireSession(await getCurrentSession());
    const query = new URL(request.url).searchParams;
    const today = new Date().toISOString().slice(0, 10);
    const fallback = plannerWindowAround(today);
    const repository = getStudyPlannerRepository();
    const [dashboard, options] = await Promise.all([
      getPlannerDashboard(principal.profileId, repository, {
        from: query.get("from") ?? fallback.from,
        to: query.get("to") ?? fallback.to,
      }),
      getPlannerOptions(repository),
    ]);
    return NextResponse.json({ dashboard, options });
  } catch (error) {
    const applicationError = asApplicationError(error);
    return NextResponse.json(applicationError.toJSON(), { status: applicationError.status });
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const principal = requireSession(await getCurrentSession());
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const parsed = studyGoalSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: "Invalid study goal.", issues: parsed.error.issues },
        { status: 400 },
      );
    }
    const repository = getStudyPlannerRepository();
    const input = {
      ...parsed.data,
      availableDays: parsed.data.availableDays as Weekday[],
      restDays: parsed.data.restDays as Weekday[],
    };
    const result = body.generatePlan
      ? await createGoalAndGeneratePlan(principal.profileId, input, repository)
      : { goal: await createStudyGoal(principal.profileId, input, repository), plan: null };
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    const applicationError = asApplicationError(error);
    return NextResponse.json(applicationError.toJSON(), { status: applicationError.status });
  }
}
