import { NextResponse } from "next/server";
import { asApplicationError } from "@/domain/errors/application-error";
import { getCurrentSession } from "@/infrastructure/auth/local-auth-provider";
import { getLaboratoryRepository } from "@/infrastructure/database/repositories/laboratory-repository";
import { requireSession } from "@/features/auth/authorization";
import { laboratoryReportSchema } from "@/features/laboratory/schemas";
import { initialLaboratoryReport, saveLaboratoryReport } from "@/features/laboratory/service";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ sessionId: string }> },
): Promise<NextResponse> {
  try {
    const principal = requireSession(await getCurrentSession());
    const { sessionId } = await params;
    const repository = getLaboratoryRepository();
    const detail = await repository.getSessionDetail(principal.profileId, sessionId);
    if (!detail)
      return NextResponse.json({ message: "Laboratory session not found." }, { status: 404 });
    const report = detail.report ?? initialLaboratoryReport(detail.activity);
    return NextResponse.json({ report: detail.report, template: report });
  } catch (error) {
    const applicationError = asApplicationError(error);
    return NextResponse.json(applicationError.toJSON(), { status: applicationError.status });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> },
): Promise<NextResponse> {
  try {
    const principal = requireSession(await getCurrentSession());
    const parsed = laboratoryReportSchema.safeParse(await request.json());
    if (!parsed.success)
      return NextResponse.json({ message: "Invalid laboratory report." }, { status: 400 });
    const { sessionId } = await params;
    const report = await saveLaboratoryReport(
      principal.profileId,
      sessionId,
      parsed.data,
      getLaboratoryRepository(),
    );
    return NextResponse.json({ report });
  } catch (error) {
    const applicationError = asApplicationError(error);
    return NextResponse.json(applicationError.toJSON(), { status: applicationError.status });
  }
}
