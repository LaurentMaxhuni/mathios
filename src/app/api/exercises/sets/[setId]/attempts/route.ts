import { NextResponse } from "next/server";
import { asApplicationError } from "@/domain/errors/application-error";
import { generateQuestionInstance } from "@/domain/exercise/generator";
import { getCurrentSession } from "@/infrastructure/auth/local-auth-provider";
import { getExerciseRepository } from "@/infrastructure/database/repositories/exercise-repository";
import {
  practiceQuestionOrder,
  requireExerciseLearner,
  startExerciseAttempt,
} from "@/features/exercises/service";
import { startAttemptSchema } from "@/features/exercises/schemas";

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
    const principal = requireExerciseLearner(await getCurrentSession());
    const { setId } = await params;
    const parsed = startAttemptSchema.safeParse({
      ...(await request.json()),
      exerciseSetId: setId,
    });
    if (!parsed.success)
      return NextResponse.json(
        {
          code: "VALIDATION_ERROR",
          message: "Choose a valid exercise set.",
          issues: parsed.error.issues,
        },
        { status: 400 },
      );
    const repository = getExerciseRepository();
    const attempt = await startExerciseAttempt(
      { exerciseSetId: setId, profileId: principal.profileId, seed: parsed.data.seed },
      repository,
    );
    const detail = await repository.getExerciseSet(setId);
    const instances = detail
      ? await Promise.all(
          detail.questions.map(async (item) => {
            const question = await repository.getQuestion(item.questionId);
            const template = question?.template;
            if (!template?.isActive) {
              return {
                questionId: item.questionId,
                prompt: question?.version.prompt ?? "",
                templateId: null,
                instanceSeed: null,
              };
            }
            const instance = generateQuestionInstance(template, attempt.seed);
            return {
              questionId: item.questionId,
              prompt: instance.prompt,
              templateId: instance.templateId,
              instanceSeed: instance.seed,
            };
          }),
        )
      : [];
    return NextResponse.json(
      {
        attempt,
        questionIds: detail ? practiceQuestionOrder(detail, attempt.seed) : [],
        instances,
      },
      { status: 201 },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
