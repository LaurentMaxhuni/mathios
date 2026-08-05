import { NextResponse } from "next/server";
import { asApplicationError } from "@/domain/errors/application-error";
import { getCurrentSession } from "@/infrastructure/auth/local-auth-provider";
import { getMasteryRepository } from "@/infrastructure/database/repositories/mastery-repository";
import {
  getMasteryDashboard,
  listRecommendations,
  requireMasteryLearner,
} from "@/features/mastery/service";

export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<NextResponse> {
  try {
    const principal = requireMasteryLearner(await getCurrentSession());
    const query = new URL(request.url).searchParams;
    const dashboard = await getMasteryDashboard(principal.profileId, getMasteryRepository());
    const recommendations = await listRecommendations(principal.profileId, getMasteryRepository());
    const subjectId = query.get("subjectId");
    const gradeId = query.get("gradeId");
    return NextResponse.json({
      dashboard: {
        ...dashboard,
        concepts: dashboard.concepts.filter(
          (concept) =>
            (!subjectId || concept.subjectId === subjectId) &&
            (!gradeId || concept.gradeMinId === gradeId || concept.gradeMaxId === gradeId),
        ),
      },
      recommendations,
    });
  } catch (error) {
    const applicationError = asApplicationError(error);
    return NextResponse.json(applicationError.toJSON(), { status: applicationError.status });
  }
}
