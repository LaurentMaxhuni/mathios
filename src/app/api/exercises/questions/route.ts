import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { asApplicationError } from "@/domain/errors/application-error";
import { getCurrentSession } from "@/infrastructure/auth/local-auth-provider";
import { getExerciseRepository } from "@/infrastructure/database/repositories/exercise-repository";
import {
  canAuthorExercises,
  createQuestion,
  requireExerciseEditor,
} from "@/features/exercises/service";
import { questionSchema } from "@/features/exercises/schemas";

export const dynamic = "force-dynamic";

function errorResponse(error: unknown): NextResponse {
  const applicationError = asApplicationError(error);
  return NextResponse.json(applicationError.toJSON(), { status: applicationError.status });
}

export async function GET(request: Request): Promise<NextResponse> {
  try {
    const session = await getCurrentSession();
    if (!session)
      return NextResponse.json(
        { code: "UNAUTHORIZED", message: "Authentication is required." },
        { status: 401 },
      );
    const author = canAuthorExercises(session.principal);
    const params = new URL(request.url).searchParams;
    const questions = await getExerciseRepository().listQuestions({
      includeArchived: author && params.get("includeArchived") === "true",
      subjectId: params.get("subjectId") ?? undefined,
      type: params.get("type") ?? undefined,
      difficulty: params.get("difficulty") ?? undefined,
      search: params.get("search") ?? undefined,
    });
    return NextResponse.json({ questions }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const session = await getCurrentSession();
    const principal = requireExerciseEditor(session);
    const parsed = questionSchema.safeParse(await request.json());
    if (!parsed.success)
      return NextResponse.json(
        {
          code: "VALIDATION_ERROR",
          message: "Please review the question fields.",
          issues: parsed.error.issues,
        },
        { status: 400 },
      );
    if (parsed.data.id)
      return NextResponse.json(
        { code: "VALIDATION_ERROR", message: "Use PATCH to update an existing question." },
        { status: 400 },
      );
    const data = {
      ...parsed.data,
      id: "question-" + randomUUID(),
      authorProfileId: principal.profileId,
      options: parsed.data.options.map((option) => ({
        ...option,
        id: option.id ?? "option-" + randomUUID(),
      })),
      hints: parsed.data.hints.map((hint) => ({ ...hint, id: hint.id ?? "hint-" + randomUUID() })),
      solutions: parsed.data.solutions.map((solution) => ({
        ...solution,
        id: solution.id ?? "solution-" + randomUUID(),
      })),
      template: parsed.data.template
        ? {
            ...parsed.data.template,
            id: parsed.data.template.id ?? "template-" + randomUUID(),
          }
        : null,
    };
    const question = await createQuestion(data, getExerciseRepository());
    return NextResponse.json({ question }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
