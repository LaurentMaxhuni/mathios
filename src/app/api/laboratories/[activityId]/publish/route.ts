import { NextResponse } from "next/server";
import { asApplicationError } from "@/domain/errors/application-error";
import { getCurrentSession } from "@/infrastructure/auth/local-auth-provider";
import { getLaboratoryRepository } from "@/infrastructure/database/repositories/laboratory-repository";
import { requirePermission } from "@/features/auth/authorization";
import { setLaboratoryActivityStatus } from "@/features/laboratory/service";

export const dynamic = "force-dynamic";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ activityId: string }> },
): Promise<NextResponse> {
  try {
    requirePermission(await getCurrentSession(), "publish_content");
    const { activityId } = await params;
    const activity = await setLaboratoryActivityStatus(
      activityId,
      "published",
      getLaboratoryRepository(),
    );
    return NextResponse.json({ activity });
  } catch (error) {
    const applicationError = asApplicationError(error);
    return NextResponse.json(applicationError.toJSON(), { status: applicationError.status });
  }
}
