import { NextResponse } from "next/server";
import { aiGenerationSchema } from "@/features/ai/schemas";
import { aiErrorResponse, requireAiSession } from "@/features/ai/route-utils";
import { generateAiContent } from "@/features/ai/service";

export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const principal = await requireAiSession();
    const parsed = aiGenerationSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { message: "Invalid AI request.", issues: parsed.error.issues },
        { status: 400 },
      );
    }
    return NextResponse.json(await generateAiContent(principal.profileId, parsed.data));
  } catch (error) {
    return aiErrorResponse(error);
  }
}
