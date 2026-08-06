import { NextResponse } from "next/server";
import { aiSettingsSchema } from "@/features/ai/schemas";
import {
  aiErrorResponse,
  requireAiSession,
  requireAiSettingsPermission,
} from "@/features/ai/route-utils";
import { getAiSettingsView, updateAiSettings } from "@/features/ai/service";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  try {
    await requireAiSession();
    return NextResponse.json(await getAiSettingsView());
  } catch (error) {
    return aiErrorResponse(error);
  }
}

export async function PATCH(request: Request): Promise<NextResponse> {
  try {
    const principal = await requireAiSession();
    requireAiSettingsPermission(principal);
    const parsed = aiSettingsSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { message: "Invalid AI settings.", issues: parsed.error.issues },
        { status: 400 },
      );
    }
    return NextResponse.json(await updateAiSettings(parsed.data));
  } catch (error) {
    return aiErrorResponse(error);
  }
}
