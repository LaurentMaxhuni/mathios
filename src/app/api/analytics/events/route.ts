import { NextResponse } from "next/server";
import { asApplicationError } from "@/domain/errors/application-error";
import { requireSession } from "@/features/auth/authorization";
import { activityEventSchema } from "@/features/analytics/schemas";
import { recordActivityEvent } from "@/features/analytics/service";
import { getCurrentSession } from "@/infrastructure/auth/local-auth-provider";

export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const principal = requireSession(await getCurrentSession());
    const parsed = activityEventSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { message: "Invalid analytics event.", issues: parsed.error.issues },
        { status: 400 },
      );
    }
    const event = await recordActivityEvent({ ...parsed.data, profileId: principal.profileId });
    return NextResponse.json(event, { status: 201 });
  } catch (error) {
    const applicationError = asApplicationError(error);
    return NextResponse.json(applicationError.toJSON(), { status: applicationError.status });
  }
}
