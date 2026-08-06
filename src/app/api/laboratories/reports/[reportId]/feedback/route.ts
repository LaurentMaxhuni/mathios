import { NextResponse } from "next/server";
import { asApplicationError } from "@/domain/errors/application-error";
import { getCurrentSession } from "@/infrastructure/auth/local-auth-provider";
import { getLaboratoryRepository } from "@/infrastructure/database/repositories/laboratory-repository";
import { requirePermission } from "@/features/auth/authorization";
import { laboratoryFeedbackSchema } from "@/features/laboratory/schemas";
import { addLaboratoryFeedback } from "@/features/laboratory/service";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ reportId: string }> },
): Promise<NextResponse> {
  try {
    const principal = requirePermission(await getCurrentSession(), "edit_content");
    const parsed = laboratoryFeedbackSchema.safeParse(await request.json());
    if (!parsed.success)
      return NextResponse.json({ message: "Invalid laboratory feedback." }, { status: 400 });
    const { reportId } = await params;
    const feedback = await addLaboratoryFeedback(
      reportId,
      principal.profileId,
      parsed.data,
      getLaboratoryRepository(),
    );
    return NextResponse.json({ feedback }, { status: 201 });
  } catch (error) {
    const applicationError = asApplicationError(error);
    return NextResponse.json(applicationError.toJSON(), { status: applicationError.status });
  }
}
