import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { asApplicationError } from "@/domain/errors/application-error";
import { getCurrentSession } from "@/infrastructure/auth/local-auth-provider";
import { getExerciseRepository } from "@/infrastructure/database/repositories/exercise-repository";
import { bulkQuestionImportSchema } from "@/features/exercises/schemas";
import { importQuestions, requireExerciseEditor } from "@/features/exercises/service";

export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const principal = requireExerciseEditor(await getCurrentSession());
    const parsed = bulkQuestionImportSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        {
          code: "VALIDATION_ERROR",
          message: "Please review the imported question records.",
          issues: parsed.error.issues,
        },
        { status: 400 },
      );
    }
    const questions = await importQuestions(
      parsed.data.questions.map((question) => ({
        ...question,
        id: "question-" + randomUUID(),
        authorProfileId: principal.profileId,
        options: question.options.map((option) => ({
          ...option,
          id: option.id ?? "option-" + randomUUID(),
        })),
        hints: question.hints.map((hint) => ({ ...hint, id: hint.id ?? "hint-" + randomUUID() })),
        solutions: question.solutions.map((solution) => ({
          ...solution,
          id: solution.id ?? "solution-" + randomUUID(),
        })),
        template: question.template
          ? {
              ...question.template,
              id: question.template.id ?? "template-" + randomUUID(),
            }
          : null,
      })),
      getExerciseRepository(),
    );
    return NextResponse.json(
      { questions: questions.map((question) => question.question) },
      { status: 201 },
    );
  } catch (error) {
    const applicationError = asApplicationError(error);
    return NextResponse.json(applicationError.toJSON(), { status: applicationError.status });
  }
}
