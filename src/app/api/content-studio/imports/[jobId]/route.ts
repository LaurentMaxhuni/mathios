import { NextResponse } from "next/server";
import { NotFoundError } from "@/domain/errors/application-error";
import { aiErrorResponse } from "@/features/ai/route-utils";
import { requireCourseEditor } from "@/features/courses/service";
import { getCurrentSession } from "@/infrastructure/auth/local-auth-provider";
import { getSourceImportRepository } from "@/infrastructure/database/repositories/source-import-repository";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ jobId: string }> },
): Promise<NextResponse> {
  try {
    const principal = requireCourseEditor(await getCurrentSession());
    const { jobId } = await context.params;
    const record = await getSourceImportRepository().getImport(jobId);
    if (!record || record.createdByProfileId !== principal.profileId) {
      throw new NotFoundError("Source import", jobId);
    }
    return NextResponse.json(record, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return aiErrorResponse(error);
  }
}
