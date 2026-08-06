import { NextResponse } from "next/server";
import { asApplicationError } from "@/domain/errors/application-error";
import { getCurrentSession } from "@/infrastructure/auth/local-auth-provider";
import { getLaboratoryRepository } from "@/infrastructure/database/repositories/laboratory-repository";
import { requireSession } from "@/features/auth/authorization";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ reportId: string }> },
): Promise<NextResponse> {
  try {
    const principal = requireSession(await getCurrentSession());
    const { reportId } = await params;
    const report = await getLaboratoryRepository().getReport(principal.profileId, reportId);
    if (!report)
      return NextResponse.json({ message: "Laboratory report not found." }, { status: 404 });
    return NextResponse.json({ report });
  } catch (error) {
    const applicationError = asApplicationError(error);
    return NextResponse.json(applicationError.toJSON(), { status: applicationError.status });
  }
}
