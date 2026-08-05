import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { asApplicationError } from "@/domain/errors/application-error";
import { getCurrentSession } from "@/infrastructure/auth/local-auth-provider";
import { getExerciseRepository } from "@/infrastructure/database/repositories/exercise-repository";
import {
  canAuthorExercises,
  getLearnerQuestion,
  requireExerciseEditor,
  setQuestionStatus,
  updateQuestion,
} from "@/features/exercises/service";
import { questionSchema, questionStatusSchema } from "@/features/exercises/schemas";

export const dynamic = "force-dynamic";

function errorResponse(error: unknown): NextResponse {
  const applicationError = asApplicationError(error);
  return NextResponse.json(applicationError.toJSON(), { status: applicationError.status });
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ questionId: string }> },
): Promise<NextResponse> {
  try {
    const session = await getCurrentSession();
    if (!session)
      return NextResponse.json(
        { code: "UNAUTHORIZED", message: "Authentication is required." },
        { status: 401 },
      );
    const { questionId } = await params;
    const detail = canAuthorExercises(session.principal)
      ? await getExerciseRepository().getQuestion(questionId, { includeDraft: true })
      : await getLearnerQuestion(questionId, getExerciseRepository());
    if (!detail)
      return NextResponse.json(
        { code: "NOT_FOUND", message: "Question not found." },
        { status: 404 },
      );
    return NextResponse.json({ detail }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ questionId: string }> },
): Promise<NextResponse> {
  try {
    const session = await getCurrentSession();
    const principal = requireExerciseEditor(session);
    const { questionId } = await params;
    const body = await request.json();
    const status = questionStatusSchema.safeParse({ id: questionId, status: body?.status });
    if (status.success && body && Object.keys(body).length === 1) {
      const question = await setQuestionStatus(
        questionId,
        status.data.status,
        getExerciseRepository(),
      );
      return NextResponse.json({ question });
    }
    const parsed = questionSchema.safeParse({ ...(body as object), id: questionId });
    if (!parsed.success)
      return NextResponse.json(
        {
          code: "VALIDATION_ERROR",
          message: "Please review the question fields.",
          issues: parsed.error.issues,
        },
        { status: 400 },
      );
    const data = {
      ...parsed.data,
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
    const question = await updateQuestion(questionId, data, getExerciseRepository());
    return NextResponse.json({ question });
  } catch (error) {
    return errorResponse(error);
  }
}
