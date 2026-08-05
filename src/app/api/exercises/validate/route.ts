import { NextResponse } from "next/server";
import { asApplicationError } from "@/domain/errors/application-error";
import { getCurrentSession } from "@/infrastructure/auth/local-auth-provider";
import { previewAnswer, requireExerciseEditor } from "@/features/exercises/service";
import { validationPreviewSchema } from "@/features/exercises/schemas";

export const dynamic = "force-dynamic";

function errorResponse(error: unknown): NextResponse {
  const applicationError = asApplicationError(error);
  return NextResponse.json(applicationError.toJSON(), { status: applicationError.status });
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    requireExerciseEditor(await getCurrentSession());
    const parsed = validationPreviewSchema.safeParse(await request.json());
    if (!parsed.success)
      return NextResponse.json(
        {
          code: "VALIDATION_ERROR",
          message: "Please provide a type, answer specification, and response.",
          issues: parsed.error.issues,
        },
        { status: 400 },
      );
    const result = previewAnswer(parsed.data.type, parsed.data.answerSpec, parsed.data.response);
    return NextResponse.json({ result });
  } catch (error) {
    return errorResponse(error);
  }
}
