import { NextResponse } from "next/server";
import { asApplicationError } from "@/domain/errors/application-error";
import { getCurrentSession } from "@/infrastructure/auth/local-auth-provider";
import { getExerciseRepository } from "@/infrastructure/database/repositories/exercise-repository";
import { requireExerciseEditor, saveExerciseSetQuestion } from "@/features/exercises/service";
import { exerciseSetQuestionSchema } from "@/features/exercises/schemas";

export const dynamic = "force-dynamic";

function errorResponse(error: unknown): NextResponse {
  const applicationError = asApplicationError(error);
  return NextResponse.json(applicationError.toJSON(), { status: applicationError.status });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ setId: string }> },
): Promise<NextResponse> {
  try {
    requireExerciseEditor(await getCurrentSession());
    const { setId } = await params;
    const parsed = exerciseSetQuestionSchema.safeParse({
      ...(await request.json()),
      exerciseSetId: setId,
    });
    if (!parsed.success)
      return NextResponse.json(
        {
          code: "VALIDATION_ERROR",
          message: "Please review the set question fields.",
          issues: parsed.error.issues,
        },
        { status: 400 },
      );
    await saveExerciseSetQuestion(parsed.data, getExerciseRepository());
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
