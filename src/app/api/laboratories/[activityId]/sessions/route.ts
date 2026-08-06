import { NextResponse } from "next/server";
import { asApplicationError } from "@/domain/errors/application-error";
import { getCurrentSession } from "@/infrastructure/auth/local-auth-provider";
import { getLaboratoryRepository } from "@/infrastructure/database/repositories/laboratory-repository";
import { requireSession } from "@/features/auth/authorization";
import { laboratorySessionStartSchema } from "@/features/laboratory/schemas";
import { startLaboratorySession } from "@/features/laboratory/service";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ activityId: string }> },
): Promise<NextResponse> {
  try {
    const principal = requireSession(await getCurrentSession());
    const { activityId } = await params;
    const sessions = await getLaboratoryRepository().listSessions(principal.profileId, activityId);
    return NextResponse.json({ sessions });
  } catch (error) {
    const applicationError = asApplicationError(error);
    return NextResponse.json(applicationError.toJSON(), { status: applicationError.status });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ activityId: string }> },
): Promise<NextResponse> {
  try {
    const principal = requireSession(await getCurrentSession());
    const parsed = laboratorySessionStartSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success)
      return NextResponse.json({ message: "Invalid laboratory session." }, { status: 400 });
    const { activityId } = await params;
    const session = await startLaboratorySession(
      principal.profileId,
      activityId,
      parsed.data,
      getLaboratoryRepository(),
    );
    return NextResponse.json({ session }, { status: 201 });
  } catch (error) {
    const applicationError = asApplicationError(error);
    return NextResponse.json(applicationError.toJSON(), { status: applicationError.status });
  }
}
