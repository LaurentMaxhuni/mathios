import { NextResponse } from "next/server";
import { aiErrorResponse, requireAiSession } from "@/features/ai/route-utils";
import { getAiRepository } from "@/infrastructure/database/repositories/ai-repository";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  try {
    const principal = await requireAiSession();
    return NextResponse.json(await getAiRepository().listGenerations(principal.profileId));
  } catch (error) {
    return aiErrorResponse(error);
  }
}
