import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { asApplicationError } from "@/domain/errors/application-error";
import { requireSession } from "@/features/auth/authorization";
import { getCurrentSession } from "@/infrastructure/auth/local-auth-provider";
import { getStudyPlannerRepository } from "@/infrastructure/database/repositories/study-planner-repository";
import { studyExceptionSchema } from "@/features/planner/schemas";

export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const principal = requireSession(await getCurrentSession());
    const parsed = studyExceptionSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success)
      return NextResponse.json(
        { message: "Invalid calendar exception.", issues: parsed.error.issues },
        { status: 400 },
      );
    const exception = await getStudyPlannerRepository().createException({
      ...parsed.data,
      id: `study-exception-${randomUUID()}`,
      profileId: principal.profileId,
    });
    return NextResponse.json({ exception }, { status: 201 });
  } catch (error) {
    const applicationError = asApplicationError(error);
    return NextResponse.json(applicationError.toJSON(), { status: applicationError.status });
  }
}

export async function DELETE(request: Request): Promise<NextResponse> {
  try {
    const principal = requireSession(await getCurrentSession());
    const exceptionId = new URL(request.url).searchParams.get("id");
    if (!exceptionId)
      return NextResponse.json({ message: "Exception id is required." }, { status: 400 });
    await getStudyPlannerRepository().deleteException(principal.profileId, exceptionId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const applicationError = asApplicationError(error);
    return NextResponse.json(applicationError.toJSON(), { status: applicationError.status });
  }
}
