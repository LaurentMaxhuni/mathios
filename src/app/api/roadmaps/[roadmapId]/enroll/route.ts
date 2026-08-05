import { NextResponse } from "next/server";
import { z } from "zod";
import { asApplicationError } from "@/domain/errors/application-error";
import { getCurrentSession } from "@/infrastructure/auth/local-auth-provider";
import { getRoadmapRepository } from "@/infrastructure/database/repositories/roadmap-repository";
import { enrollRoadmap, requireRoadmapLearner } from "@/features/roadmaps/service";

export const dynamic = "force-dynamic";

const bodySchema = z.object({ selectedGoal: z.string().trim().max(500).nullable().optional() });

export async function POST(
  request: Request,
  { params }: { params: Promise<{ roadmapId: string }> },
): Promise<NextResponse> {
  try {
    const principal = requireRoadmapLearner(await getCurrentSession());
    const { roadmapId } = await params;
    const body = bodySchema.safeParse(await request.json().catch(() => ({})));
    if (!body.success)
      return NextResponse.json({ message: "Invalid enrollment." }, { status: 400 });
    const enrollment = await enrollRoadmap(
      principal.profileId,
      roadmapId,
      getRoadmapRepository(),
      body.data.selectedGoal ?? null,
    );
    return NextResponse.json({ enrollment }, { status: 201 });
  } catch (error) {
    const applicationError = asApplicationError(error);
    return NextResponse.json(applicationError.toJSON(), { status: applicationError.status });
  }
}
