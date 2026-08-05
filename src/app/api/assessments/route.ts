import { NextResponse } from "next/server";
import { asApplicationError } from "@/domain/errors/application-error";
import { getCurrentSession } from "@/infrastructure/auth/local-auth-provider";
import {
  getAssessmentRepository,
  newAssessmentId,
} from "@/infrastructure/database/repositories/assessment-repository";
import { assessmentSchema } from "@/features/assessments/schemas";
import {
  canAuthorAssessments,
  createAssessment,
  requireAssessmentEditor,
  requireAssessmentLearner,
} from "@/features/assessments/service";

export const dynamic = "force-dynamic";

function errorResponse(error: unknown): NextResponse {
  const applicationError = asApplicationError(error);
  return NextResponse.json(applicationError.toJSON(), { status: applicationError.status });
}

export async function GET(): Promise<NextResponse> {
  try {
    const session = await getCurrentSession();
    const principal = requireAssessmentLearner(session);
    const repository = getAssessmentRepository();
    const assessments = await repository.listAssessments({
      includeDraft: canAuthorAssessments(principal),
    });
    return NextResponse.json({ assessments });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const principal = requireAssessmentEditor(await getCurrentSession());
    const parsed = assessmentSchema.safeParse(await request.json());
    if (!parsed.success)
      return NextResponse.json(
        {
          code: "VALIDATION_ERROR",
          message: "Choose valid assessment fields.",
          issues: parsed.error.issues,
        },
        { status: 400 },
      );
    const input = {
      ...parsed.data,
      id: parsed.data.id ?? newAssessmentId("assessment"),
      createdByProfileId: principal.profileId,
    };
    const assessment = await createAssessment(input, getAssessmentRepository());
    return NextResponse.json({ assessment }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
