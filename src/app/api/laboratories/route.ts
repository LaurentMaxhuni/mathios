import { NextResponse } from "next/server";
import { asApplicationError } from "@/domain/errors/application-error";
import { getCurrentSession } from "@/infrastructure/auth/local-auth-provider";
import { getLaboratoryRepository } from "@/infrastructure/database/repositories/laboratory-repository";
import { requirePermission } from "@/features/auth/authorization";
import {
  createLaboratoryActivity,
  canAuthorLaboratories,
  listLaboratoryActivities,
} from "@/features/laboratory/service";
import { laboratoryActivitySchema } from "@/features/laboratory/schemas";
import { toLaboratoryActivityInput } from "@/features/laboratory/transport";

export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<NextResponse> {
  try {
    const session = await getCurrentSession();
    const query = new URL(request.url).searchParams;
    const activities = await listLaboratoryActivities(getLaboratoryRepository(), {
      includeDraft: canAuthorLaboratories(session?.principal),
      subjectId: query.get("subjectId") ?? undefined,
      mode: (query.get("mode") as "simulated" | "real-world" | "hybrid" | null) ?? undefined,
    });
    return NextResponse.json({ activities });
  } catch (error) {
    const applicationError = asApplicationError(error);
    return NextResponse.json(applicationError.toJSON(), { status: applicationError.status });
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const principal = requirePermission(await getCurrentSession(), "edit_content");
    const parsed = laboratoryActivitySchema.safeParse(await request.json());
    if (!parsed.success)
      return NextResponse.json({ message: "Invalid laboratory activity." }, { status: 400 });
    const activity = await createLaboratoryActivity(
      principal.profileId,
      toLaboratoryActivityInput(parsed.data),
      getLaboratoryRepository(),
    );
    return NextResponse.json({ detail: activity }, { status: 201 });
  } catch (error) {
    const applicationError = asApplicationError(error);
    return NextResponse.json(applicationError.toJSON(), { status: applicationError.status });
  }
}
