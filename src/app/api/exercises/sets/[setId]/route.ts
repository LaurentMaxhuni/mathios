import { NextResponse } from "next/server";
import { asApplicationError } from "@/domain/errors/application-error";
import { getCurrentSession } from "@/infrastructure/auth/local-auth-provider";
import { getExerciseRepository } from "@/infrastructure/database/repositories/exercise-repository";
import { canAuthorExercises, setExerciseSetStatus } from "@/features/exercises/service";
import { exerciseSetStatusSchema } from "@/features/exercises/schemas";

export const dynamic = "force-dynamic";

function errorResponse(error: unknown): NextResponse {
  const applicationError = asApplicationError(error);
  return NextResponse.json(applicationError.toJSON(), { status: applicationError.status });
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ setId: string }> },
): Promise<NextResponse> {
  try {
    const session = await getCurrentSession();
    if (!session)
      return NextResponse.json(
        { code: "UNAUTHORIZED", message: "Authentication is required." },
        { status: 401 },
      );
    const { setId } = await params;
    const detail = await getExerciseRepository().getExerciseSet(setId, {
      includeDraft: canAuthorExercises(session.principal),
    });
    if (!detail)
      return NextResponse.json(
        { code: "NOT_FOUND", message: "Exercise set not found." },
        { status: 404 },
      );
    return NextResponse.json({ detail }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ setId: string }> },
): Promise<NextResponse> {
  try {
    const session = await getCurrentSession();
    if (!canAuthorExercises(session?.principal))
      return NextResponse.json(
        { code: "FORBIDDEN", message: "Content author permission required." },
        { status: 403 },
      );
    const { setId } = await params;
    const parsed = exerciseSetStatusSchema.safeParse({
      id: setId,
      status: (await request.json())?.status,
    });
    if (!parsed.success)
      return NextResponse.json(
        {
          code: "VALIDATION_ERROR",
          message: "Choose a valid exercise-set status.",
          issues: parsed.error.issues,
        },
        { status: 400 },
      );
    const set = await setExerciseSetStatus(setId, parsed.data.status, getExerciseRepository());
    return NextResponse.json({ set });
  } catch (error) {
    return errorResponse(error);
  }
}
