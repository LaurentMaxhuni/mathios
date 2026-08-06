import { NextResponse } from "next/server";
import { aiErrorResponse, requireAiSession } from "@/features/ai/route-utils";
import { checkAiHealth } from "@/features/ai/service";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  try {
    await requireAiSession();
    return NextResponse.json(await checkAiHealth());
  } catch (error) {
    return aiErrorResponse(error);
  }
}
