import { NextResponse } from "next/server";
import { asApplicationError } from "@/domain/errors/application-error";
import { getCurrentSession } from "@/infrastructure/auth/local-auth-provider";
import { getRoadmapRepository } from "@/infrastructure/database/repositories/roadmap-repository";
import {
  generatePersonalizedPath,
  getLatestPersonalizedPath,
  requireRoadmapLearner,
} from "@/features/roadmaps/service";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ roadmapId: string }> },
): Promise<NextResponse> {
  try {
    const principal = requireRoadmapLearner(await getCurrentSession());
    const { roadmapId } = await params;
    const path = await getLatestPersonalizedPath(
      principal.profileId,
      roadmapId,
      getRoadmapRepository(),
    );
    return NextResponse.json({ path });
  } catch (error) {
    const applicationError = asApplicationError(error);
    return NextResponse.json(applicationError.toJSON(), { status: applicationError.status });
  }
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ roadmapId: string }> },
): Promise<NextResponse> {
  try {
    const principal = requireRoadmapLearner(await getCurrentSession());
    const { roadmapId } = await params;
    const path = await generatePersonalizedPath(
      principal.profileId,
      roadmapId,
      getRoadmapRepository(),
    );
    return NextResponse.json({ path }, { status: 201 });
  } catch (error) {
    const applicationError = asApplicationError(error);
    return NextResponse.json(applicationError.toJSON(), { status: applicationError.status });
  }
}
