import { NextResponse } from "next/server";
import { backupRequestSchema } from "@/features/portability/schemas";
import { artifactToJson, createBackup } from "@/features/portability/service";
import {
  errorResponse,
  requireBackupPermission,
  requirePortabilitySession,
} from "@/features/portability/route-utils";
import { getPortabilityRepository } from "@/infrastructure/database/repositories/portability-repository";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  try {
    await requirePortabilitySession();
    const repository = getPortabilityRepository();
    return NextResponse.json({
      settings: await repository.getBackupSettings(),
      backups: (await repository.listBackupArtifacts()).map(artifactToJson),
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const principal = await requirePortabilitySession();
    requireBackupPermission(principal);
    const parsed = backupRequestSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success)
      return NextResponse.json(
        { message: "Invalid backup request.", issues: parsed.error.issues },
        { status: 400 },
      );
    const artifact = await createBackup({ kind: parsed.data.kind, profileId: principal.profileId });
    return NextResponse.json(artifactToJson(artifact), { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
