import { NextResponse } from "next/server";
import { asApplicationError } from "@/domain/errors/application-error";
import { getCurrentSession } from "@/infrastructure/auth/local-auth-provider";
import { getRoadmapRepository } from "@/infrastructure/database/repositories/roadmap-repository";
import { requireRoadmapLearner } from "@/features/roadmaps/service";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  try {
    const principal = requireRoadmapLearner(await getCurrentSession());
    const repository = getRoadmapRepository();
    const enrollments = await repository.listUserRoadmaps(principal.profileId);
    const paths = await Promise.all(
      enrollments.map((enrollment) =>
        repository.getLatestPersonalizedPath(principal.profileId, enrollment.roadmapId),
      ),
    );
    return NextResponse.json({ paths: paths.filter((path) => path !== null) });
  } catch (error) {
    const applicationError = asApplicationError(error);
    return NextResponse.json(applicationError.toJSON(), { status: applicationError.status });
  }
}
