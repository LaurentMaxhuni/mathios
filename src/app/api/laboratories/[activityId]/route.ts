import { NextResponse } from "next/server";
import { asApplicationError } from "@/domain/errors/application-error";
import { getCurrentSession } from "@/infrastructure/auth/local-auth-provider";
import { getLaboratoryRepository } from "@/infrastructure/database/repositories/laboratory-repository";
import { requirePermission } from "@/features/auth/authorization";
import {
  canAuthorLaboratories,
  getLaboratoryActivity,
  updateLaboratoryActivity,
} from "@/features/laboratory/service";
import { laboratoryActivitySchema } from "@/features/laboratory/schemas";
import { toLaboratoryActivityInput } from "@/features/laboratory/transport";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ activityId: string }> },
): Promise<NextResponse> {
  try {
    const session = await getCurrentSession();
    const { activityId } = await params;
    const detail = await getLaboratoryActivity(activityId, getLaboratoryRepository(), {
      includeDraft: canAuthorLaboratories(session?.principal),
    });
    if (!detail)
      return NextResponse.json({ message: "Laboratory activity not found." }, { status: 404 });
    return NextResponse.json({ detail });
  } catch (error) {
    const applicationError = asApplicationError(error);
    return NextResponse.json(applicationError.toJSON(), { status: applicationError.status });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ activityId: string }> },
): Promise<NextResponse> {
  try {
    const session = await getCurrentSession();
    requirePermission(session, "edit_content");
    const parsed = laboratoryActivitySchema.safeParse(await request.json());
    if (!parsed.success)
      return NextResponse.json({ message: "Invalid laboratory activity." }, { status: 400 });
    if (parsed.data.status === "published") requirePermission(session, "publish_content");
    const { activityId } = await params;
    const detail = await updateLaboratoryActivity(
      activityId,
      toLaboratoryActivityInput(parsed.data, activityId),
      getLaboratoryRepository(),
    );
    return NextResponse.json({ detail });
  } catch (error) {
    const applicationError = asApplicationError(error);
    return NextResponse.json(applicationError.toJSON(), { status: applicationError.status });
  }
}
