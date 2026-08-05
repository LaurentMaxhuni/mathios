import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { asApplicationError } from "@/domain/errors/application-error";
import { getCurrentSession } from "@/infrastructure/auth/local-auth-provider";
import { getExerciseRepository } from "@/infrastructure/database/repositories/exercise-repository";
import {
  canAuthorExercises,
  createExerciseSet,
  requireExerciseEditor,
} from "@/features/exercises/service";
import { exerciseSetSchema } from "@/features/exercises/schemas";

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
    const sets = await getExerciseRepository().listExerciseSets({
      includeArchived: author && params.get("includeArchived") === "true",
      status: params.get("status") ?? undefined,
      kind: params.get("kind") ?? undefined,
      subjectId: params.get("subjectId") ?? undefined,
    });
    return NextResponse.json({ sets }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const principal = requireExerciseEditor(await getCurrentSession());
    const parsed = exerciseSetSchema.safeParse(await request.json());
    if (!parsed.success)
      return NextResponse.json(
        {
          code: "VALIDATION_ERROR",
          message: "Please review the exercise-set fields.",
          issues: parsed.error.issues,
        },
        { status: 400 },
      );
    if (parsed.data.id)
      return NextResponse.json(
        {
          code: "VALIDATION_ERROR",
          message: "Use the set question/status endpoints to update an existing set.",
        },
        { status: 400 },
      );
    const set = await createExerciseSet(
      {
        ...parsed.data,
        id: "exercise-set-" + randomUUID(),
        createdByProfileId: principal.profileId,
      },
      getExerciseRepository(),
    );
    return NextResponse.json({ set }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
