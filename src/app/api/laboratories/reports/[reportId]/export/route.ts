import { NextResponse } from "next/server";
import { asApplicationError } from "@/domain/errors/application-error";
import { getCurrentSession } from "@/infrastructure/auth/local-auth-provider";
import { getLaboratoryRepository } from "@/infrastructure/database/repositories/laboratory-repository";
import { requireSession } from "@/features/auth/authorization";
import {
  renderLaboratoryReportHtml,
  renderLaboratoryReportPdf,
} from "@/features/laboratory/export";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ reportId: string }> },
): Promise<NextResponse> {
  try {
    const principal = requireSession(await getCurrentSession());
    const { reportId } = await params;
    const repository = getLaboratoryRepository();
    const report = await repository.getReport(principal.profileId, reportId);
    if (!report)
      return NextResponse.json({ message: "Laboratory report not found." }, { status: 404 });
    const detail = await repository.getSessionDetail(principal.profileId, report.sessionId);
    if (!detail)
      return NextResponse.json({ message: "Laboratory session not found." }, { status: 404 });
    const format = new URL(request.url).searchParams.get("format") ?? "html";
    if (format === "pdf") {
      const pdf = renderLaboratoryReportPdf(detail, report);
      return new NextResponse(pdf as BodyInit, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${report.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "laboratory-report"}.pdf"`,
        },
      });
    }
    if (format !== "html")
      return NextResponse.json({ message: "Choose html or pdf." }, { status: 400 });
    return new NextResponse(renderLaboratoryReportHtml(detail, report), {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  } catch (error) {
    const applicationError = asApplicationError(error);
    return NextResponse.json(applicationError.toJSON(), { status: applicationError.status });
  }
}
