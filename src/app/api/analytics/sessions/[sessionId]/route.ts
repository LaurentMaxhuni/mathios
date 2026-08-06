import { NextResponse } from "next/server";
import { asApplicationError } from "@/domain/errors/application-error";
import { requireSession } from "@/features/auth/authorization";
import { learningSessionCompleteSchema } from "@/features/analytics/schemas";
import { completeLearningSession } from "@/features/analytics/service";
import { getCurrentSession } from "@/infrastructure/auth/local-auth-provider";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> },
): Promise<NextResponse> {
  try {
    const principal = requireSession(await getCurrentSession());
    const { sessionId } = await params;
    const parsed = learningSessionCompleteSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { message: "Invalid learning session completion.", issues: parsed.error.issues },
        { status: 400 },
      );
    }
    const session = await completeLearningSession(principal.profileId, sessionId, parsed.data);
    return NextResponse.json(session);
  } catch (error) {
    const applicationError = asApplicationError(error);
    return NextResponse.json(applicationError.toJSON(), { status: applicationError.status });
  }
}
