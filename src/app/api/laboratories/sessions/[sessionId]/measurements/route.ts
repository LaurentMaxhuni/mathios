import { NextResponse } from "next/server";
import { asApplicationError } from "@/domain/errors/application-error";
import { getCurrentSession } from "@/infrastructure/auth/local-auth-provider";
import { getLaboratoryRepository } from "@/infrastructure/database/repositories/laboratory-repository";
import { requireSession } from "@/features/auth/authorization";
import { laboratoryMeasurementSchema } from "@/features/laboratory/schemas";
import { saveLaboratoryMeasurement } from "@/features/laboratory/service";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> },
): Promise<NextResponse> {
  try {
    const principal = requireSession(await getCurrentSession());
    const parsed = laboratoryMeasurementSchema.safeParse(await request.json());
    if (!parsed.success)
      return NextResponse.json({ message: "Invalid measurement." }, { status: 400 });
    const { sessionId } = await params;
    const measurement = await saveLaboratoryMeasurement(
      principal.profileId,
      sessionId,
      parsed.data,
      getLaboratoryRepository(),
    );
    return NextResponse.json({ measurement });
  } catch (error) {
    const applicationError = asApplicationError(error);
    return NextResponse.json(applicationError.toJSON(), { status: applicationError.status });
  }
}
