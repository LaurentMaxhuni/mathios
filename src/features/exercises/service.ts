import { randomUUID } from "node:crypto";
import {
  AuthorizationError,
  ConflictError,
  NotFoundError,
  ValidationError,
} from "@/domain/errors/application-error";
import { createSeededRandom, generateQuestionInstance } from "@/domain/exercise/generator";
import { assertValidQuestionDefinition, validateAnswer } from "@/domain/exercise/rules";
import type {
  AnswerValidationResult,
  CreateExerciseSetInput,
  CreateQuestionInput,
  ExerciseAttemptRecord,
  ExerciseSetDetail,
  ExerciseSetRecord,
  GeneratedQuestionInstance,
  QuestionDetail,
  QuestionRecord,
  QuestionStatus,
  QuestionTemplateRecord,
  QuestionType,
  QuestionValidationSpec,
  UpdateQuestionInput,
} from "@/domain/exercise/types";
import type { ExerciseRepository } from "@/domain/ports/exercise-repository";
import type { AuthSession, AuthenticatedPrincipal } from "@/infrastructure/auth/auth-provider";
import { requirePermission, requireSession } from "@/features/auth/authorization";

const editorRoles = new Set(["administrator", "content-creator", "teacher"]);

export function requireExerciseEditor(session: AuthSession | null): AuthenticatedPrincipal {
  const principal = requirePermission(session, "edit_content");
  if (!principal.roles.some((role) => editorRoles.has(role))) {
    throw new AuthorizationError(
      "Only teachers, content creators, and administrators can author exercises.",
    );
  }
  return principal;
}

export function canAuthorExercises(principal: AuthenticatedPrincipal | null | undefined): boolean {
  return Boolean(
    principal?.permissions.includes("edit_content") &&
    principal.roles.some((role) => editorRoles.has(role)),
  );
}

export function requireExerciseLearner(session: AuthSession | null): AuthenticatedPrincipal {
  return requireSession(session);
}

function idFor(prefix: string): string {
  return prefix + "-" + randomUUID();
}

function ensure<T>(value: T | null, resource: string, id: string): T {
  if (!value) throw new NotFoundError(resource, id);
  return value;
}

function ensureQuestionType(
  type: QuestionType,
  spec: QuestionValidationSpec,
  prompt: string,
): void {
  assertValidQuestionDefinition({ type, answerSpec: spec, prompt });
}

function ensureChoiceConfiguration(
  type: QuestionType,
  spec: QuestionValidationSpec,
  options: readonly { isCorrect?: boolean }[],
): void {
  if (!["multiple-choice", "multiple-selection"].includes(type)) return;
  if (!options.length) throw new ValidationError("Choice questions need at least one option.");
  if (!options.some((option) => option.isCorrect) && !spec.correctOptionKeys?.length) {
    throw new ValidationError("Choice questions need at least one correct option.");
  }
}

function publicQuestion(detail: QuestionDetail): QuestionDetail {
  return {
    ...detail,
    version: {
      ...detail.version,
      answerSpec: {},
      fullSolution: "",
      commonWrongAnswers: [],
      errorFeedback: {},
      partialCreditRules: null,
    },
    options: detail.options.map(({ isCorrect, ...option }) => {
      void isCorrect;
      return option;
    }),
    solutions: [],
    template: detail.template
      ? {
          ...detail.template,
          answerExpression: "",
          validationSpec: {},
        }
      : null,
  };
}

export function newExerciseId(prefix: string): string {
  return idFor(prefix);
}

export async function createQuestion(
  input: CreateQuestionInput,
  repository: ExerciseRepository,
): Promise<QuestionDetail> {
  ensureQuestionType(input.type, input.answerSpec, input.prompt);
  ensureChoiceConfiguration(input.type, input.answerSpec, input.options);
  return repository.createQuestion(input);
}

export async function importQuestions(
  inputs: readonly CreateQuestionInput[],
  repository: ExerciseRepository,
): Promise<readonly QuestionDetail[]> {
  if (!inputs.length) throw new ValidationError("Import at least one question.");
  for (const input of inputs) {
    ensureQuestionType(input.type, input.answerSpec, input.prompt);
    try {
      ensureChoiceConfiguration(input.type, input.answerSpec, input.options);
    } catch (error) {
      if (error instanceof ValidationError) {
        throw new ValidationError(`Question '${input.slug}': ${error.message}`);
      }
      throw error;
    }
  }
  const created: QuestionDetail[] = [];
  for (const input of inputs) created.push(await repository.createQuestion(input));
  return created;
}

export async function updateQuestion(
  id: string,
  input: UpdateQuestionInput,
  repository: ExerciseRepository,
): Promise<QuestionDetail> {
  ensureQuestionType(input.type, input.answerSpec, input.prompt);
  ensureChoiceConfiguration(input.type, input.answerSpec, input.options);
  ensure(await repository.getQuestion(id, { includeDraft: true }), "Question", id);
  return repository.updateQuestion(id, input);
}

export async function setQuestionStatus(
  id: string,
  status: QuestionStatus,
  repository: ExerciseRepository,
): Promise<QuestionRecord> {
  const question = ensure(await repository.getQuestion(id, { includeDraft: true }), "Question", id);
  if (status === "published") {
    ensureQuestionType(
      question.question.type,
      question.version.answerSpec,
      question.version.prompt,
    );
    ensureChoiceConfiguration(
      question.question.type,
      question.version.answerSpec,
      question.options,
    );
  }
  return repository.setQuestionStatus(id, status);
}

export async function createExerciseSet(
  input: CreateExerciseSetInput,
  repository: ExerciseRepository,
): Promise<ExerciseSetRecord> {
  if (!input.title.trim()) throw new ValidationError("An exercise-set title cannot be empty.");
  return repository.createExerciseSet(input);
}

export async function setExerciseSetStatus(
  id: string,
  status: ExerciseSetRecord["status"],
  repository: ExerciseRepository,
): Promise<ExerciseSetRecord> {
  const detail = ensure(
    await repository.getExerciseSet(id, { includeDraft: true }),
    "Exercise set",
    id,
  );
  if (status === "published" && !detail.questions.length) {
    throw new ValidationError("Add at least one question before publishing the exercise set.");
  }
  return repository.setExerciseSetStatus(id, status);
}

export async function saveExerciseSetQuestion(
  input: {
    exerciseSetId: string;
    questionId: string;
    sortOrder: number;
    points: number;
    isRequired: boolean;
  },
  repository: ExerciseRepository,
): Promise<void> {
  const set = ensure(
    await repository.getExerciseSet(input.exerciseSetId, { includeDraft: true }),
    "Exercise set",
    input.exerciseSetId,
  );
  if (set.exerciseSet.status === "archived") {
    throw new ConflictError("Archived exercise sets cannot receive questions.");
  }
  ensure(
    await repository.getQuestion(input.questionId, { includeDraft: true }),
    "Question",
    input.questionId,
  );
  if (input.points <= 0) throw new ValidationError("Question points must be greater than zero.");
  return repository.saveExerciseSetQuestion(input);
}

export async function startExerciseAttempt(
  input: { exerciseSetId: string; profileId: string; seed?: number },
  repository: ExerciseRepository,
): Promise<ExerciseAttemptRecord> {
  const detail = ensure(
    await repository.getExerciseSet(input.exerciseSetId),
    "Published exercise set",
    input.exerciseSetId,
  );
  if (!detail.questions.length)
    throw new ValidationError("This exercise set has no published questions.");
  const maxScore = detail.questions.reduce((total, item) => total + item.points, 0);
  const seed = input.seed ?? Math.floor(Math.random() * 2_000_000_000);
  return repository.createExerciseAttempt({
    id: idFor("exercise-attempt"),
    exerciseSetId: input.exerciseSetId,
    profileId: input.profileId,
    seed,
    maxScore,
  });
}

const difficultyRank: Record<ExerciseSetRecord["difficulty"], number> = {
  gentle: 0,
  balanced: 1,
  challenging: 2,
};

export function practiceQuestionOrder(detail: ExerciseSetDetail, seed: number): readonly string[] {
  const questions = [...detail.questions];
  if (
    detail.exerciseSet.kind === "lesson" ||
    detail.exerciseSet.kind === "module" ||
    detail.exerciseSet.kind === "concept" ||
    detail.exerciseSet.kind === "grade" ||
    detail.exerciseSet.kind === "custom"
  ) {
    return questions.map((item) => item.questionId);
  }
  const random = createSeededRandom(seed);
  const priority = new Map(questions.map((item) => [item.questionId, random()]));
  questions.sort((left, right) => {
    if (detail.exerciseSet.kind === "adaptive") {
      const target = difficultyRank[detail.exerciseSet.difficulty];
      const distance =
        Math.abs(difficultyRank[left.question.difficulty] - target) -
        Math.abs(difficultyRank[right.question.difficulty] - target);
      if (distance !== 0) return distance;
    }
    return (priority.get(left.questionId) ?? 0) - (priority.get(right.questionId) ?? 0);
  });
  return questions.map((item) => item.questionId);
}

export interface SubmittedAnswer {
  attempt: ExerciseAttemptRecord;
  result: AnswerValidationResult;
}

export async function submitQuestionAnswer(
  input: {
    attemptId: string;
    profileId: string;
    questionId: string;
    response: unknown;
    templateId?: string | null;
    instanceSeed?: number | null;
  },
  repository: ExerciseRepository,
): Promise<SubmittedAnswer> {
  const attempt = ensure(
    await repository.getExerciseAttempt(input.attemptId, input.profileId),
    "Exercise attempt",
    input.attemptId,
  );
  if (attempt.status !== "in-progress") {
    throw new ConflictError("This exercise attempt is already closed.");
  }
  const set = ensure(
    await repository.getExerciseSet(attempt.exerciseSetId),
    "Published exercise set",
    attempt.exerciseSetId,
  );
  const setQuestion = set.questions.find((item) => item.questionId === input.questionId);
  if (!setQuestion)
    throw new ValidationError("That question does not belong to this exercise set.");
  const detail = ensure(
    await repository.getQuestion(input.questionId),
    "Published question",
    input.questionId,
  );
  let spec = {
    ...detail.version.answerSpec,
    ...(detail.version.partialCreditRules
      ? { partialCredit: detail.version.partialCreditRules }
      : {}),
  };
  if (input.templateId) {
    const template = ensure(
      await repository.getQuestionTemplate(input.templateId),
      "Question template",
      input.templateId,
    );
    if (template.questionId !== input.questionId) {
      throw new ValidationError("The selected template does not belong to this question.");
    }
    if (!template.isActive) throw new ConflictError("This question template is not active.");
    spec = {
      ...generateQuestionInstance(template, input.instanceSeed ?? attempt.seed).validationSpec,
      ...(detail.version.partialCreditRules
        ? { partialCredit: detail.version.partialCreditRules }
        : {}),
    };
  }
  const validation = validateAnswer(detail.question.type, spec, input.response);
  const feedback = validation.errorKey
    ? detail.version.errorFeedback[validation.errorKey]
    : undefined;
  const result = feedback ? { ...validation, feedback } : validation;
  const weighted = {
    ...result,
    score: result.score * setQuestion.points,
    maxScore: result.maxScore * setQuestion.points,
    percentage: result.percentage,
  };
  await repository.saveQuestionAttempt({
    id: idFor("question-attempt"),
    exerciseAttemptId: input.attemptId,
    questionId: input.questionId,
    questionVersionId: detail.version.id,
    templateId: input.templateId ?? null,
    instanceSeed: input.instanceSeed ?? null,
    response: input.response as never,
    validationResult: weighted,
    score: weighted.score,
    maxScore: weighted.maxScore,
  });
  return { attempt, result: weighted };
}

export async function completeExerciseAttempt(
  input: { attemptId: string; profileId: string },
  repository: ExerciseRepository,
): Promise<ExerciseAttemptRecord> {
  const attempt = ensure(
    await repository.getExerciseAttempt(input.attemptId, input.profileId),
    "Exercise attempt",
    input.attemptId,
  );
  if (attempt.status !== "in-progress") return attempt;
  const questionAttempts = await repository.listQuestionAttempts(attempt.id);
  const score = questionAttempts.reduce((total, item) => total + item.score, 0);
  return repository.completeExerciseAttempt({
    id: attempt.id,
    profileId: input.profileId,
    score,
    maxScore: attempt.maxScore,
    status: "completed",
  });
}

export async function getLearnerExerciseSet(
  id: string,
  repository: ExerciseRepository,
): Promise<ExerciseSetDetail> {
  return ensure(await repository.getExerciseSet(id), "Published exercise set", id);
}

export async function getLearnerQuestion(
  id: string,
  repository: ExerciseRepository,
): Promise<QuestionDetail> {
  return publicQuestion(ensure(await repository.getQuestion(id), "Published question", id));
}

export function previewAnswer(
  type: QuestionType,
  spec: QuestionValidationSpec,
  response: unknown,
): AnswerValidationResult {
  return validateAnswer(type, spec, response);
}

export function previewTemplate(
  template: QuestionTemplateRecord,
  seeds?: readonly number[],
): readonly GeneratedQuestionInstance[] {
  return (
    seeds?.map((seed) => generateQuestionInstance(template, seed)) ?? [
      generateQuestionInstance(template, template.seed ?? 1),
    ]
  );
}
