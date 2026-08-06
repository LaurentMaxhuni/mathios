import { NextResponse } from "next/server";
import { asApplicationError } from "@/domain/errors/application-error";
import { getCurrentSession } from "@/infrastructure/auth/local-auth-provider";
import { getLaboratoryRepository } from "@/infrastructure/database/repositories/laboratory-repository";
import { requireSession } from "@/features/auth/authorization";
import { laboratorySessionUpdateSchema } from "@/features/laboratory/schemas";
import { getLaboratorySessionDetail, updateLaboratorySession } from "@/features/laboratory/service";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ sessionId: string }> },
): Promise<NextResponse> {
  try {
    const principal = requireSession(await getCurrentSession());
    const { sessionId } = await params;
    const detail = await getLaboratorySessionDetail(
      principal.profileId,
      sessionId,
      getLaboratoryRepository(),
    );
    if (!detail)
      return NextResponse.json({ message: "Laboratory session not found." }, { status: 404 });
    return NextResponse.json({ detail });
  } catch (error) {
    const applicationError = asApplicationError(error);
    return NextResponse.json(applicationError.toJSON(), { status: applicationError.status });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> },
): Promise<NextResponse> {
  try {
    const principal = requireSession(await getCurrentSession());
    const parsed = laboratorySessionUpdateSchema.safeParse(await request.json());
    if (!parsed.success)
      return NextResponse.json({ message: "Invalid laboratory session update." }, { status: 400 });
    const { sessionId } = await params;
    const session = await updateLaboratorySession(
      principal.profileId,
      { sessionId, ...parsed.data },
      getLaboratoryRepository(),
    );
    return NextResponse.json({ session });
  } catch (error) {
    const applicationError = asApplicationError(error);
    return NextResponse.json(applicationError.toJSON(), { status: applicationError.status });
  }
}
