import { NextResponse } from "next/server";
import { asApplicationError } from "@/domain/errors/application-error";
import { getCurrentSession } from "@/infrastructure/auth/local-auth-provider";
import { getAssessmentRepository } from "@/infrastructure/database/repositories/assessment-repository";
import { assessmentSchema, assessmentStatusSchema } from "@/features/assessments/schemas";
import {
  canAuthorAssessments,
  requireAssessmentEditor,
  requireAssessmentLearner,
  setAssessmentStatus,
  updateAssessment,
} from "@/features/assessments/service";

export const dynamic = "force-dynamic";

function errorResponse(error: unknown): NextResponse {
  const applicationError = asApplicationError(error);
  return NextResponse.json(applicationError.toJSON(), { status: applicationError.status });
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ assessmentId: string }> },
): Promise<NextResponse> {
  try {
    const session = await getCurrentSession();
    const principal = requireAssessmentLearner(session);
    const { assessmentId } = await params;
    const detail = await getAssessmentRepository().getAssessment(assessmentId, {
      includeDraft: canAuthorAssessments(principal),
    });
    if (!detail)
      return NextResponse.json(
        { code: "NOT_FOUND", message: "Assessment not found.", status: 404 },
        { status: 404 },
      );
    return NextResponse.json({ detail });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ assessmentId: string }> },
): Promise<NextResponse> {
  try {
    requireAssessmentEditor(await getCurrentSession());
    const { assessmentId } = await params;
    const payload = await request.json();
    if (payload?.status && Object.keys(payload).length === 1) {
      const status = assessmentStatusSchema.safeParse({ id: assessmentId, status: payload.status });
      if (!status.success)
        return NextResponse.json(
          {
            code: "VALIDATION_ERROR",
            message: "Choose a valid assessment status.",
            issues: status.error.issues,
          },
          { status: 400 },
        );
      return NextResponse.json({
        assessment: await setAssessmentStatus(
          assessmentId,
          status.data.status,
          getAssessmentRepository(),
        ),
      });
    }
    const parsed = assessmentSchema.safeParse({ ...payload, id: assessmentId });
    if (!parsed.success)
      return NextResponse.json(
        {
          code: "VALIDATION_ERROR",
          message: "Choose valid assessment fields.",
          issues: parsed.error.issues,
        },
        { status: 400 },
      );
    const assessment = await updateAssessment(assessmentId, parsed.data, getAssessmentRepository());
    return NextResponse.json({ assessment });
  } catch (error) {
    return errorResponse(error);
  }
}
