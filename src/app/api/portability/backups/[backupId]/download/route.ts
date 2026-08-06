import { NextResponse } from "next/server";
import { hasPermission } from "@/features/auth/authorization";
import { downloadBackup } from "@/features/portability/service";
import { errorResponse, requirePortabilitySession } from "@/features/portability/route-utils";
import { getPortabilityRepository } from "@/infrastructure/database/repositories/portability-repository";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ backupId: string }> },
): Promise<NextResponse> {
  try {
    const principal = await requirePortabilitySession();
    const { backupId } = await params;
    const artifact = await getPortabilityRepository().getBackupArtifact(backupId);
    if (!artifact) return NextResponse.json({ message: "Backup not found." }, { status: 404 });
    if (
      artifact.createdByProfileId !== principal.profileId &&
      !hasPermission(principal, "run_backups")
    ) {
      return NextResponse.json({ message: "You cannot download this backup." }, { status: 403 });
    }
    const result = await downloadBackup(backupId);
    return new NextResponse(result.body as BodyInit, {
      headers: {
        "Content-Type": result.contentType,
        "Content-Disposition": `attachment; filename="${result.fileName.replace(/[^a-z0-9._-]/gi, "-")}"`,
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
