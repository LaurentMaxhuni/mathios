import { NextResponse } from "next/server";
import { asApplicationError } from "@/domain/errors/application-error";
import { getCurrentSession } from "@/infrastructure/auth/local-auth-provider";
import { getRoadmapRepository } from "@/infrastructure/database/repositories/roadmap-repository";
import { canAuthorRoadmaps, getRoadmap, requireRoadmapLearner } from "@/features/roadmaps/service";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ roadmapId: string }> },
): Promise<NextResponse> {
  try {
    const session = await getCurrentSession();
    const principal = requireRoadmapLearner(session);
    const { roadmapId } = await params;
    const detail = await getRoadmap(roadmapId, getRoadmapRepository(), {
      includeDraft: canAuthorRoadmaps(principal),
    });
    return NextResponse.json({ detail });
  } catch (error) {
    const applicationError = asApplicationError(error);
    return NextResponse.json(applicationError.toJSON(), { status: applicationError.status });
  }
}
