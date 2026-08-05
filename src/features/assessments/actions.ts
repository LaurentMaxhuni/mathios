"use server";

import { revalidatePath } from "next/cache";
import { ValidationError } from "@/domain/errors/application-error";
import { actionStateFromError, actionStateFromZod, type ActionState } from "@/lib/action-state";
import { formBoolean, formNumber, formString } from "@/lib/form-data";
import { getCurrentSession } from "@/infrastructure/auth/local-auth-provider";
import {
  getAssessmentRepository,
  newAssessmentId,
} from "@/infrastructure/database/repositories/assessment-repository";
import { getExerciseRepository } from "@/infrastructure/database/repositories/exercise-repository";
import { getMasteryRepository } from "@/infrastructure/database/repositories/mastery-repository";
import {
  completeAssessmentAttempt,
  createAssessment,
  createAssessmentPool,
  createAssessmentSection,
  requireAssessmentEditor,
  requireAssessmentLearner,
  saveAssessmentQuestion,
  setAssessmentStatus,
  startAssessmentAttempt,
  submitAssessmentAnswer,
  updateAssessment,
} from "@/features/assessments/service";
import {
  assessmentAnswerSchema,
  assessmentPoolSchema,
  assessmentQuestionSchema,
  assessmentSchema,
  assessmentSectionSchema,
  assessmentStatusSchema,
  completeAssessmentSchema,
  startAssessmentSchema,
} from "@/features/assessments/schemas";

function parseJsonField<T>(formData: FormData, key: string, fallback: T): T {
  const value = formString(formData, key);
  if (!value?.trim()) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    throw new ValidationError("Invalid JSON in " + key + ".");
  }
}

function assessmentPaths(id?: string) {
  revalidatePath("/assessments");
  revalidatePath("/assessments/manage");
  if (id) revalidatePath("/assessments/" + id);
}

function assessmentFromForm(formData: FormData) {
  return assessmentSchema.safeParse({
    id: formString(formData, "id"),
    slug: formString(formData, "slug"),
    title: formString(formData, "title"),
    description: formString(formData, "description") ?? "",
    type: formString(formData, "type"),
    subjectId: formString(formData, "subjectId") ?? null,
    gradeId: formString(formData, "gradeId") ?? null,
    status: formString(formData, "status"),
    timeLimitSeconds: formNumber(formData, "timeLimitSeconds"),
    attemptLimit: formNumber(formData, "attemptLimit"),
    passingThreshold: formNumber(formData, "passingThreshold") ?? 0.6,
    partialCredit: formBoolean(formData, "partialCredit"),
    feedbackVisibility: formString(formData, "feedbackVisibility"),
    reviewMode: formString(formData, "reviewMode"),
    retakeRule: formString(formData, "retakeRule"),
    questionOrdering: formString(formData, "questionOrdering"),
    autoSubmit: formBoolean(formData, "autoSubmit"),
    configuration: parseJsonField(formData, "configuration", {}),
  });
}

export async function saveAssessmentAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const parsed = assessmentFromForm(formData);
    if (!parsed.success) return actionStateFromZod(parsed.error);
    const principal = requireAssessmentEditor(await getCurrentSession());
    const repository = getAssessmentRepository();
    const input = {
      ...parsed.data,
      id: parsed.data.id ?? newAssessmentId("assessment"),
      createdByProfileId: principal.profileId,
    };
    if (parsed.data.id) {
      await updateAssessment(parsed.data.id, input, repository);
      assessmentPaths(parsed.data.id);
      return { ok: true, message: "Assessment saved." };
    }
    await createAssessment(input, repository);
    assessmentPaths(input.id);
    return { ok: true, message: "Assessment created." };
  } catch (error) {
    return actionStateFromError(error);
  }
}

export async function setAssessmentStatusAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const parsed = assessmentStatusSchema.safeParse({
      id: formString(formData, "id"),
      status: formString(formData, "status"),
    });
    if (!parsed.success) return actionStateFromZod(parsed.error);
    requireAssessmentEditor(await getCurrentSession());
    await setAssessmentStatus(parsed.data.id, parsed.data.status, getAssessmentRepository());
    assessmentPaths(parsed.data.id);
    return { ok: true, message: "Assessment status updated." };
  } catch (error) {
    return actionStateFromError(error);
  }
}

export async function saveAssessmentSectionAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const parsed = assessmentSectionSchema.safeParse({
      id: formString(formData, "id"),
      assessmentId: formString(formData, "assessmentId"),
      title: formString(formData, "title"),
      description: formString(formData, "description") ?? "",
      sortOrder: formNumber(formData, "sortOrder") ?? 0,
      points: formNumber(formData, "points") ?? 1,
      timeLimitSeconds: formNumber(formData, "timeLimitSeconds"),
      questionOrdering: formString(formData, "questionOrdering"),
    });
    if (!parsed.success) return actionStateFromZod(parsed.error);
    requireAssessmentEditor(await getCurrentSession());
    await createAssessmentSection(
      { ...parsed.data, id: parsed.data.id ?? newAssessmentId("assessment-section") },
      getAssessmentRepository(),
    );
    assessmentPaths(parsed.data.assessmentId);
    return { ok: true, message: "Assessment section saved." };
  } catch (error) {
    return actionStateFromError(error);
  }
}

export async function saveAssessmentPoolAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const parsed = assessmentPoolSchema.safeParse({
      id: formString(formData, "id"),
      assessmentId: formString(formData, "assessmentId"),
      sectionId: formString(formData, "sectionId"),
      title: formString(formData, "title"),
      selectionCount: formNumber(formData, "selectionCount") ?? 1,
      difficultyDistribution: parseJsonField(formData, "difficultyDistribution", {}),
      conceptIds: parseJsonField(formData, "conceptIds", []),
      questionOrdering: formString(formData, "questionOrdering"),
    });
    if (!parsed.success) return actionStateFromZod(parsed.error);
    requireAssessmentEditor(await getCurrentSession());
    await createAssessmentPool(
      { ...parsed.data, id: parsed.data.id ?? newAssessmentId("assessment-pool") },
      getAssessmentRepository(),
    );
    assessmentPaths(parsed.data.assessmentId);
    return { ok: true, message: "Question pool saved." };
  } catch (error) {
    return actionStateFromError(error);
  }
}

export async function saveAssessmentQuestionAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const parsed = assessmentQuestionSchema.safeParse({
      id: formString(formData, "id"),
      assessmentId: formString(formData, "assessmentId"),
      sectionId: formString(formData, "sectionId"),
      poolId: formString(formData, "poolId") ?? null,
      questionId: formString(formData, "questionId"),
      sortOrder: formNumber(formData, "sortOrder") ?? 0,
      points: formNumber(formData, "points") ?? 1,
      isRequired: formBoolean(formData, "isRequired"),
    });
    if (!parsed.success) return actionStateFromZod(parsed.error);
    requireAssessmentEditor(await getCurrentSession());
    await saveAssessmentQuestion(
      { ...parsed.data, id: parsed.data.id ?? newAssessmentId("assessment-question") },
      getAssessmentRepository(),
      getExerciseRepository(),
    );
    assessmentPaths(parsed.data.assessmentId);
    return { ok: true, message: "Question added to assessment." };
  } catch (error) {
    return actionStateFromError(error);
  }
}

export async function startAssessmentAttemptAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const parsed = startAssessmentSchema.safeParse({
      assessmentId: formString(formData, "assessmentId"),
      seed: formNumber(formData, "seed"),
    });
    if (!parsed.success) return actionStateFromZod(parsed.error);
    const principal = requireAssessmentLearner(await getCurrentSession());
    const attempt = await startAssessmentAttempt(
      {
        assessmentId: parsed.data.assessmentId,
        profileId: principal.profileId,
        seed: parsed.data.seed,
      },
      getAssessmentRepository(),
      getExerciseRepository(),
    );
    return { ok: true, message: "Assessment attempt started: " + attempt.id };
  } catch (error) {
    return actionStateFromError(error);
  }
}

export async function submitAssessmentAnswerAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const raw = formString(formData, "response");
    let response: unknown = raw ?? "";
    if (raw?.trim().startsWith("{") || raw?.trim().startsWith("[")) {
      try {
        response = JSON.parse(raw);
      } catch {
        return { ok: false, message: "Response JSON is invalid." };
      }
    }
    const parsed = assessmentAnswerSchema.safeParse({
      attemptId: formString(formData, "attemptId"),
      questionId: formString(formData, "questionId"),
      response,
    });
    if (!parsed.success) return actionStateFromZod(parsed.error);
    const principal = requireAssessmentLearner(await getCurrentSession());
    const submitted = await submitAssessmentAnswer(
      { ...parsed.data, response: parsed.data.response ?? "", profileId: principal.profileId },
      getAssessmentRepository(),
      getExerciseRepository(),
    );
    return { ok: submitted.result.status !== "incorrect", message: submitted.result.feedback };
  } catch (error) {
    return actionStateFromError(error);
  }
}

export async function completeAssessmentAttemptAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const parsed = completeAssessmentSchema.safeParse({
      attemptId: formString(formData, "attemptId"),
    });
    if (!parsed.success) return actionStateFromZod(parsed.error);
    const principal = requireAssessmentLearner(await getCurrentSession());
    const result = await completeAssessmentAttempt(
      { attemptId: parsed.data.attemptId, profileId: principal.profileId },
      getAssessmentRepository(),
      getMasteryRepository(),
    );
    return {
      ok: true,
      message: `Assessment submitted: ${Math.round(result.attempt.percentage * 100)}%.`,
    };
  } catch (error) {
    return actionStateFromError(error);
  }
}
