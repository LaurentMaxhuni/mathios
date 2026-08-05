"use server";

import { revalidatePath } from "next/cache";
import { ValidationError } from "@/domain/errors/application-error";
import { actionStateFromError, actionStateFromZod, type ActionState } from "@/lib/action-state";
import { formBoolean, formNumber, formString } from "@/lib/form-data";
import { getCurrentSession } from "@/infrastructure/auth/local-auth-provider";
import { getExerciseRepository } from "@/infrastructure/database/repositories/exercise-repository";
import { getMasteryRepository } from "@/infrastructure/database/repositories/mastery-repository";
import {
  completeExerciseAttempt,
  createExerciseSet,
  createQuestion,
  importQuestions,
  newExerciseId,
  previewAnswer,
  requireExerciseEditor,
  requireExerciseLearner,
  saveExerciseSetQuestion,
  setExerciseSetStatus,
  setQuestionStatus,
  startExerciseAttempt,
  submitQuestionAnswer,
  updateQuestion,
} from "@/features/exercises/service";
import {
  answerSubmissionSchema,
  bulkQuestionImportSchema,
  completeAttemptSchema,
  exerciseSetQuestionSchema,
  exerciseSetSchema,
  exerciseSetStatusSchema,
  questionSchema,
  questionStatusSchema,
  startAttemptSchema,
  validationPreviewSchema,
} from "@/features/exercises/schemas";

function parseJsonField<T>(formData: FormData, key: string, fallback: T): T {
  const value = formString(formData, key);
  if (!value?.trim()) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    throw new ValidationError("Invalid JSON in " + key + ".");
  }
}

function questionFromForm(formData: FormData) {
  return questionSchema.safeParse({
    id: formString(formData, "id"),
    slug: formString(formData, "slug"),
    title: formString(formData, "title"),
    type: formString(formData, "type"),
    subjectId: formString(formData, "subjectId"),
    gradeMinId: formString(formData, "gradeMinId") ?? null,
    gradeMaxId: formString(formData, "gradeMaxId") ?? null,
    difficulty: formString(formData, "difficulty"),
    estimatedTimeSeconds: formNumber(formData, "estimatedTimeSeconds") ?? 120,
    source: formString(formData, "source") ?? "",
    tags: parseJsonField(formData, "tags", []),
    status: formString(formData, "status"),
    prompt: formString(formData, "prompt"),
    answerSpec: parseJsonField(formData, "answerSpec", {}),
    explanation: formString(formData, "explanation") ?? "",
    fullSolution: formString(formData, "fullSolution") ?? "",
    commonWrongAnswers: parseJsonField(formData, "commonWrongAnswers", []),
    errorFeedback: parseJsonField(formData, "errorFeedback", {}),
    partialCreditRules: parseJsonField(formData, "partialCreditRules", null),
    changeSummary: formString(formData, "changeSummary") ?? "",
    options: parseJsonField(formData, "options", []),
    hints: parseJsonField(formData, "hints", []),
    solutions: parseJsonField(formData, "solutions", []),
    conceptIds: parseJsonField(formData, "conceptIds", []),
    learningObjectiveIds: parseJsonField(formData, "learningObjectiveIds", []),
    template: parseJsonField(formData, "template", null),
  });
}

function questionPaths(id?: string) {
  revalidatePath("/exercises");
  revalidatePath("/exercises/questions");
  revalidatePath("/exercises/manage");
  revalidatePath("/exercise-sets");
  if (id) revalidatePath("/exercises/questions/" + id);
}

export async function saveQuestionAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const parsed = questionFromForm(formData);
    if (!parsed.success) return actionStateFromZod(parsed.error);
    const principal = requireExerciseEditor(await getCurrentSession());
    const repository = getExerciseRepository();
    const data = {
      ...parsed.data,
      id: parsed.data.id ?? newExerciseId("question"),
      authorProfileId: principal.profileId,
      options: parsed.data.options.map((option) => ({
        ...option,
        id: option.id ?? newExerciseId("option"),
      })),
      hints: parsed.data.hints.map((hint) => ({
        ...hint,
        id: hint.id ?? newExerciseId("hint"),
      })),
      solutions: parsed.data.solutions.map((solution) => ({
        ...solution,
        id: solution.id ?? newExerciseId("solution"),
      })),
      template: parsed.data.template
        ? {
            ...parsed.data.template,
            id: parsed.data.template.id ?? newExerciseId("template"),
          }
        : null,
    };
    if (parsed.data.id) {
      await updateQuestion(parsed.data.id, data, repository);
      questionPaths(parsed.data.id);
      return { ok: true, message: "Question saved." };
    }
    await createQuestion(data, repository);
    questionPaths(data.id);
    return { ok: true, message: "Question created." };
  } catch (error) {
    return actionStateFromError(error);
  }
}

export async function setQuestionStatusAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const parsed = questionStatusSchema.safeParse({
      id: formString(formData, "id"),
      status: formString(formData, "status"),
    });
    if (!parsed.success) return actionStateFromZod(parsed.error);
    requireExerciseEditor(await getCurrentSession());
    await setQuestionStatus(parsed.data.id, parsed.data.status, getExerciseRepository());
    questionPaths(parsed.data.id);
    return { ok: true, message: "Question status updated." };
  } catch (error) {
    return actionStateFromError(error);
  }
}

export async function saveExerciseSetAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const parsed = exerciseSetSchema.safeParse({
      id: formString(formData, "id"),
      slug: formString(formData, "slug"),
      title: formString(formData, "title"),
      description: formString(formData, "description") ?? "",
      kind: formString(formData, "kind"),
      subjectId: formString(formData, "subjectId") ?? null,
      gradeId: formString(formData, "gradeId") ?? null,
      difficulty: formString(formData, "difficulty"),
      status: formString(formData, "status"),
      estimatedTimeSeconds: formNumber(formData, "estimatedTimeSeconds") ?? 0,
    });
    if (!parsed.success) return actionStateFromZod(parsed.error);
    const principal = requireExerciseEditor(await getCurrentSession());
    const input = {
      ...parsed.data,
      id: parsed.data.id ?? newExerciseId("exercise-set"),
      createdByProfileId: principal.profileId,
    };
    await createExerciseSet(input, getExerciseRepository());
    questionPaths();
    return { ok: true, message: "Exercise set created." };
  } catch (error) {
    return actionStateFromError(error);
  }
}

export async function setExerciseSetStatusAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const parsed = exerciseSetStatusSchema.safeParse({
      id: formString(formData, "id"),
      status: formString(formData, "status"),
    });
    if (!parsed.success) return actionStateFromZod(parsed.error);
    requireExerciseEditor(await getCurrentSession());
    await setExerciseSetStatus(parsed.data.id, parsed.data.status, getExerciseRepository());
    questionPaths();
    return { ok: true, message: "Exercise set status updated." };
  } catch (error) {
    return actionStateFromError(error);
  }
}

export async function saveExerciseSetQuestionAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const parsed = exerciseSetQuestionSchema.safeParse({
      exerciseSetId: formString(formData, "exerciseSetId"),
      questionId: formString(formData, "questionId"),
      sortOrder: formNumber(formData, "sortOrder") ?? 0,
      points: formNumber(formData, "points") ?? 1,
      isRequired: formBoolean(formData, "isRequired"),
    });
    if (!parsed.success) return actionStateFromZod(parsed.error);
    requireExerciseEditor(await getCurrentSession());
    await saveExerciseSetQuestion(parsed.data, getExerciseRepository());
    questionPaths();
    return { ok: true, message: "Question added to the exercise set." };
  } catch (error) {
    return actionStateFromError(error);
  }
}

export async function startExerciseAttemptAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const parsed = zStart(formData);
    if (!parsed.success) return actionStateFromZod(parsed.error);
    const principal = requireExerciseLearner(await getCurrentSession());
    const attempt = await startExerciseAttempt(
      {
        exerciseSetId: parsed.data.exerciseSetId,
        profileId: principal.profileId,
        seed: parsed.data.seed,
      },
      getExerciseRepository(),
    );
    return { ok: true, message: "Exercise attempt started: " + attempt.id };
  } catch (error) {
    return actionStateFromError(error);
  }
}

function zStart(formData: FormData) {
  return startAttemptSchema.safeParse({
    exerciseSetId: formString(formData, "exerciseSetId"),
    seed: formNumber(formData, "seed"),
  });
}

export async function submitQuestionAnswerAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const rawResponse = formString(formData, "response");
    let response: unknown = rawResponse ?? "";
    if (rawResponse?.trim().startsWith("{") || rawResponse?.trim().startsWith("[")) {
      try {
        response = JSON.parse(rawResponse);
      } catch {
        return { ok: false, message: "Response JSON is invalid." };
      }
    }
    const parsed = answerSubmissionSchema.safeParse({
      attemptId: formString(formData, "attemptId"),
      questionId: formString(formData, "questionId"),
      response,
      templateId: formString(formData, "templateId") ?? null,
      instanceSeed: formNumber(formData, "instanceSeed") ?? null,
    });
    if (!parsed.success) return actionStateFromZod(parsed.error);
    const principal = requireExerciseLearner(await getCurrentSession());
    const submitted = await submitQuestionAnswer(
      {
        attemptId: parsed.data.attemptId,
        questionId: parsed.data.questionId,
        response: parsed.data.response ?? "",
        templateId: parsed.data.templateId,
        instanceSeed: parsed.data.instanceSeed,
        profileId: principal.profileId,
      },
      getExerciseRepository(),
    );
    return {
      ok: submitted.result.status === "correct",
      message: submitted.result.feedback,
    };
  } catch (error) {
    return actionStateFromError(error);
  }
}

export async function completeExerciseAttemptAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const parsed = completeAttemptSchema.safeParse({
      attemptId: formString(formData, "attemptId"),
    });
    if (!parsed.success) return actionStateFromZod(parsed.error);
    const principal = requireExerciseLearner(await getCurrentSession());
    const attempt = await completeExerciseAttempt(
      { attemptId: parsed.data.attemptId, profileId: principal.profileId },
      getExerciseRepository(),
      getMasteryRepository(),
    );
    return {
      ok: true,
      message: "Exercise complete: " + attempt.score + " / " + attempt.maxScore + ".",
    };
  } catch (error) {
    return actionStateFromError(error);
  }
}

export async function validationPreviewAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    requireExerciseEditor(await getCurrentSession());
    const rawResponse = formString(formData, "response");
    const parsed = validationPreviewSchema.safeParse({
      type: formString(formData, "type"),
      answerSpec: parseJsonField(formData, "answerSpec", {}),
      response: rawResponse,
    });
    if (!parsed.success) return actionStateFromZod(parsed.error);
    const validation = previewAnswer(
      parsed.data.type,
      parsed.data.answerSpec,
      parsed.data.response,
    );
    return { ok: validation.status === "correct", message: validation.feedback };
  } catch (error) {
    return actionStateFromError(error);
  }
}

export async function bulkImportQuestionsAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const parsed = bulkQuestionImportSchema.safeParse({
      questions: parseJsonField(formData, "questions", []),
    });
    if (!parsed.success) return actionStateFromZod(parsed.error);
    const principal = requireExerciseEditor(await getCurrentSession());
    const repository = getExerciseRepository();
    const inputs = parsed.data.questions.map((question) => ({
      ...question,
      id: newExerciseId("question"),
      authorProfileId: principal.profileId,
      options: question.options.map((option) => ({
        ...option,
        id: option.id ?? newExerciseId("option"),
      })),
      hints: question.hints.map((hint) => ({
        ...hint,
        id: hint.id ?? newExerciseId("hint"),
      })),
      solutions: question.solutions.map((solution) => ({
        ...solution,
        id: solution.id ?? newExerciseId("solution"),
      })),
      template: question.template
        ? {
            ...question.template,
            id: question.template.id ?? newExerciseId("template"),
          }
        : null,
    }));
    await importQuestions(inputs, repository);
    questionPaths();
    return { ok: true, message: `${parsed.data.questions.length} questions imported.` };
  } catch (error) {
    return actionStateFromError(error);
  }
}
