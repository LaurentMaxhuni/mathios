import { NextResponse } from "next/server";
import { z } from "zod";
import { asApplicationError } from "@/domain/errors/application-error";
import { getCurrentSession } from "@/infrastructure/auth/local-auth-provider";
import { getRoadmapRepository } from "@/infrastructure/database/repositories/roadmap-repository";
import { requireRoadmapLearner, saveRoadmapProgress } from "@/features/roadmaps/service";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  roadmapNodeId: z.string().trim().min(1),
  status: z.enum(["locked", "available", "in-progress", "completed", "skipped"]),
  completionPercentage: z.number().int().min(0).max(100),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ roadmapId: string }> },
): Promise<NextResponse> {
  try {
    const principal = requireRoadmapLearner(await getCurrentSession());
    const { roadmapId } = await params;
    const body = bodySchema.safeParse(await request.json());
    if (!body.success)
      return NextResponse.json({ message: "Invalid roadmap progress." }, { status: 400 });
    const progress = await saveRoadmapProgress(
      principal.profileId,
      { roadmapId, ...body.data },
      getRoadmapRepository(),
    );
    return NextResponse.json({ progress });
  } catch (error) {
    const applicationError = asApplicationError(error);
    return NextResponse.json(applicationError.toJSON(), { status: applicationError.status });
  }
}
