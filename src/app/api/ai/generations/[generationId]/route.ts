import { NextResponse } from "next/server";
import { aiReviewSchema } from "@/features/ai/schemas";
import {
  aiErrorResponse,
  requireAiReviewPermission,
  requireAiSession,
} from "@/features/ai/route-utils";
import { reviewAiGeneration } from "@/features/ai/service";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ generationId: string }> },
): Promise<NextResponse> {
  try {
    const principal = await requireAiSession();
    requireAiReviewPermission(principal);
    const parsed = aiReviewSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { message: "Invalid AI review status.", issues: parsed.error.issues },
        { status: 400 },
      );
    }
    const { generationId } = await params;
    return NextResponse.json(
      await reviewAiGeneration(generationId, parsed.data.status, principal.profileId),
    );
  } catch (error) {
    return aiErrorResponse(error);
  }
}
