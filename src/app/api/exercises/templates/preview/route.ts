import { NextResponse } from "next/server";
import { asApplicationError } from "@/domain/errors/application-error";
import { getCurrentSession } from "@/infrastructure/auth/local-auth-provider";
import { getExerciseRepository } from "@/infrastructure/database/repositories/exercise-repository";
import { templatePreviewSchema } from "@/features/exercises/schemas";
import { previewTemplate, requireExerciseEditor } from "@/features/exercises/service";

export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<NextResponse> {
  try {
    requireExerciseEditor(await getCurrentSession());
    const parsed = templatePreviewSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        {
          code: "VALIDATION_ERROR",
          message: "Provide a template and up to ten integer seeds.",
          issues: parsed.error.issues,
        },
        { status: 400 },
      );
    }
    const template = await getExerciseRepository().getQuestionTemplate(parsed.data.templateId);
    if (!template)
      return NextResponse.json(
        { code: "NOT_FOUND", message: "Question template was not found." },
        { status: 404 },
      );
    return NextResponse.json({ instances: previewTemplate(template, parsed.data.seeds) });
  } catch (error) {
    const applicationError = asApplicationError(error);
    return NextResponse.json(applicationError.toJSON(), { status: applicationError.status });
  }
}
