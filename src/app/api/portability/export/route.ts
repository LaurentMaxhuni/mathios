import { NextResponse } from "next/server";
import { exportRequestSchema } from "@/features/portability/schemas";
import { exportPortability } from "@/features/portability/service";
import {
  errorResponse,
  requireBackupPermission,
  requirePortabilitySession,
} from "@/features/portability/route-utils";

export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const principal = await requirePortabilitySession();
    const parsed = exportRequestSchema.safeParse(await request.json());
    if (!parsed.success)
      return NextResponse.json(
        { message: "Invalid export request.", issues: parsed.error.issues },
        { status: 400 },
      );
    requireBackupPermission(principal, parsed.data.kind);
    const result = await exportPortability(
      parsed.data.kind,
      parsed.data.format,
      principal.profileId,
    );
    return new NextResponse(result.body as BodyInit, {
      headers: {
        "Content-Type": result.contentType,
        "Content-Disposition": `attachment; filename="${result.fileName}"`,
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
