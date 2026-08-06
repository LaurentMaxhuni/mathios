import { NextResponse } from "next/server";
import { hasPermission } from "@/features/auth/authorization";
import { backupSettingsSchema } from "@/features/portability/schemas";
import { errorResponse, requirePortabilitySession } from "@/features/portability/route-utils";
import { getPortabilityRepository } from "@/infrastructure/database/repositories/portability-repository";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  try {
    await requirePortabilitySession();
    return NextResponse.json(await getPortabilityRepository().getBackupSettings());
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request): Promise<NextResponse> {
  try {
    const principal = await requirePortabilitySession();
    if (!hasPermission(principal, "manage_application_settings")) {
      return NextResponse.json(
        { message: "Application settings permission is required." },
        { status: 403 },
      );
    }
    const parsed = backupSettingsSchema.safeParse(await request.json());
    if (!parsed.success)
      return NextResponse.json(
        { message: "Invalid backup settings.", issues: parsed.error.issues },
        { status: 400 },
      );
    return NextResponse.json(await getPortabilityRepository().updateBackupSettings(parsed.data));
  } catch (error) {
    return errorResponse(error);
  }
}
