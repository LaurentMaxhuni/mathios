import { randomUUID } from "node:crypto";
import {
  AuthorizationError,
  ConflictError,
  NotFoundError,
  ValidationError,
} from "@/domain/errors/application-error";
import {
  analyzeDiagnostic,
  assertValidAssessmentDefinition,
  assessmentScoreSummary,
  buildSectionResults,
  isAssessmentAttemptExpired,
  reviewQuestionIds,
  selectAssessmentQuestions,
} from "@/domain/assessment/rules";
import type {
  AssessmentAttemptRecord,
  AssessmentDetail,
  AssessmentQuestionInstance,
  AssessmentQuestionRecord,
  AssessmentRecord,
  AssessmentResultDetail,
  AssessmentStatus,
  CreateAssessmentInput,
  CreateAssessmentPoolInput,
  CreateAssessmentSectionInput,
  SaveAssessmentQuestionInput,
  UpdateAssessmentInput,
} from "@/domain/assessment/types";
import type { ExerciseRepository } from "@/domain/ports/exercise-repository";
import type { AssessmentRepository } from "@/domain/ports/assessment-repository";
import type { MasteryRepository } from "@/domain/ports/mastery-repository";
import type { AnalyticsRepository } from "@/domain/ports/analytics-repository";
import type { AuthSession, AuthenticatedPrincipal } from "@/infrastructure/auth/auth-provider";
import { requirePermission, requireSession } from "@/features/auth/authorization";
import { generateQuestionInstance } from "@/domain/exercise/generator";
import { validateAnswer } from "@/domain/exercise/rules";
import type {
  AnswerValidationResult,
  JsonValue,
  QuestionOptionRecord,
} from "@/domain/exercise/types";
import { recordAssessmentCompletion } from "@/features/mastery/service";

const editorRoles = new Set(["administrator", "content-creator", "teacher"]);

export function requireAssessmentEditor(session: AuthSession | null): AuthenticatedPrincipal {
  const principal = requirePermission(session, "edit_content");
  if (!principal.roles.some((role) => editorRoles.has(role))) {
    throw new AuthorizationError(
      "Only teachers, content creators, and administrators can author assessments.",
    );
  }
  return principal;
}

export function canAuthorAssessments(
  principal: AuthenticatedPrincipal | null | undefined,
): boolean {
  return Boolean(
    principal?.permissions.includes("edit_content") &&
    principal.roles.some((role) => editorRoles.has(role)),
  );
}

export function requireAssessmentLearner(session: AuthSession | null): AuthenticatedPrincipal {
  return requireSession(session);
}

function idFor(prefix: string): string {
  return `${prefix}-${randomUUID()}`;
}

function hideValidationFeedback(value: JsonValue): JsonValue {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  return { ...value, feedback: "Feedback is hidden for this assessment." };
}

function ensure<T>(value: T | null, resource: string, id: string): T {
  if (!value) throw new NotFoundError(resource, id);
  return value;
}

function validateSettings(input: {
  title: string;
  passingThreshold: number;
  timeLimitSeconds: number | null;
  attemptLimit: number | null;
}): void {
  assertValidAssessmentDefinition({
    ...input,
    sections: [{ title: "Assessment content", points: 1 }],
  });
}

function assertPublishable(detail: AssessmentDetail): void {
  assertValidAssessmentDefinition({
    title: detail.assessment.title,
    passingThreshold: detail.assessment.passingThreshold,
    timeLimitSeconds: detail.assessment.timeLimitSeconds,
    attemptLimit: detail.assessment.attemptLimit,
    sections: detail.sections.map(({ section }) => section),
  });
  if (!detail.questions.length) {
    throw new ValidationError("Add at least one question before publishing the assessment.");
  }
  for (const section of detail.sections) {
    if (!section.questions.length) {
      throw new ValidationError(`Section '${section.section.title}' needs at least one question.`);
    }
    for (const pool of section.pools) {
      const candidates = section.questions.filter((question) => question.poolId === pool.id);
      if (candidates.length < pool.selectionCount) {
        throw new ValidationError(
          `Pool '${pool.title}' needs at least ${pool.selectionCount} candidate questions.`,
        );
      }
    }
  }
}

export async function createAssessment(
  input: CreateAssessmentInput,
  repository: AssessmentRepository,
): Promise<AssessmentRecord> {
  validateSettings(input);
  if (input.status === "published") {
    throw new ValidationError(
      "Create the assessment as a draft, then add content before publishing it.",
    );
  }
  return repository.createAssessment(input);
}

export async function updateAssessment(
  id: string,
  input: UpdateAssessmentInput,
  repository: AssessmentRepository,
): Promise<AssessmentRecord> {
  validateSettings(input);
  const detail = ensure(
    await repository.getAssessment(id, { includeDraft: true }),
    "Assessment",
    id,
  );
  if (input.status === "published") assertPublishable(detail);
  return repository.updateAssessment(id, input);
}

export async function setAssessmentStatus(
  id: string,
  status: AssessmentStatus,
  repository: AssessmentRepository,
): Promise<AssessmentRecord> {
  const detail = ensure(
    await repository.getAssessment(id, { includeDraft: true }),
    "Assessment",
    id,
  );
  if (status === "published") {
    assertPublishable(detail);
  }
  return repository.setAssessmentStatus(id, status);
}

export async function createAssessmentSection(
  input: CreateAssessmentSectionInput,
  repository: AssessmentRepository,
): Promise<void> {
  const detail = ensure(
    await repository.getAssessment(input.assessmentId, { includeDraft: true }),
    "Assessment",
    input.assessmentId,
  );
  if (input.id && !detail.sections.some((item) => item.section.id === input.id)) {
    throw new ValidationError("The assessment section does not belong to this assessment.");
  }
  if (!input.title.trim() || input.points <= 0) {
    throw new ValidationError("An assessment section needs a title and positive points.");
  }
  await repository.createSection(input);
}

export async function createAssessmentPool(
  input: CreateAssessmentPoolInput,
  repository: AssessmentRepository,
): Promise<void> {
  const detail = ensure(
    await repository.getAssessment(input.assessmentId, { includeDraft: true }),
    "Assessment",
    input.assessmentId,
  );
  const section = detail.sections.find((item) => item.section.id === input.sectionId);
  if (!section) throw new ValidationError("The pool section does not belong to this assessment.");
  if (input.id && !section.pools.some((pool) => pool.id === input.id)) {
    throw new ValidationError("The assessment pool does not belong to this section.");
  }
  if (!input.title.trim() || input.selectionCount <= 0) {
    throw new ValidationError("A question pool needs a title and positive selection count.");
  }
  await repository.createPool(input);
}

export async function saveAssessmentQuestion(
  input: SaveAssessmentQuestionInput,
  repository: AssessmentRepository,
  exerciseRepository: ExerciseRepository,
): Promise<void> {
  const detail = ensure(
    await repository.getAssessment(input.assessmentId, { includeDraft: true }),
    "Assessment",
    input.assessmentId,
  );
  const section = detail.sections.find((item) => item.section.id === input.sectionId);
  if (!section)
    throw new ValidationError("The question section does not belong to this assessment.");
  if (input.poolId && !section.pools.some((pool) => pool.id === input.poolId)) {
    throw new ValidationError("The question pool does not belong to this section.");
  }
  ensure(
    await exerciseRepository.getQuestion(input.questionId, { includeDraft: true }),
    "Question",
    input.questionId,
  );
  if (input.points <= 0) throw new ValidationError("Assessment question points must be positive.");
  await repository.saveQuestion(input);
}

function safeOptions(
  options: readonly QuestionOptionRecord[],
): readonly Omit<QuestionOptionRecord, "isCorrect">[] {
  return options.map(({ isCorrect, ...option }) => {
    void isCorrect;
    return option;
  });
}

async function buildQuestionInstances(
  detail: AssessmentDetail,
  selection: readonly AssessmentQuestionRecord[],
  seed: number,
  exerciseRepository: ExerciseRepository,
): Promise<readonly AssessmentQuestionInstance[]> {
  const instances: AssessmentQuestionInstance[] = [];
  for (const [order, assessmentQuestion] of selection.entries()) {
    const question = ensure(
      await exerciseRepository.getQuestion(assessmentQuestion.questionId),
      "Published question",
      assessmentQuestion.questionId,
    );
    const template = question.template?.isActive ? question.template : null;
    const instanceSeed = template ? seed + order * 104729 : null;
    const generated = template ? generateQuestionInstance(template, instanceSeed ?? seed) : null;
    instances.push({
      assessmentQuestionId: assessmentQuestion.id,
      assessmentId: detail.assessment.id,
      sectionId: assessmentQuestion.sectionId,
      questionId: assessmentQuestion.questionId,
      title: question.question.title,
      type: question.question.type,
      prompt: generated?.prompt ?? question.version.prompt,
      options: safeOptions(question.options),
      points: assessmentQuestion.points,
      isRequired: assessmentQuestion.isRequired,
      order,
      templateId: generated?.templateId ?? null,
      instanceSeed,
      conceptIds: assessmentQuestion.conceptIds,
    });
  }
  return instances;
}

export async function startAssessmentAttempt(
  input: { assessmentId: string; profileId: string; seed?: number },
  repository: AssessmentRepository,
  exerciseRepository: ExerciseRepository,
): Promise<AssessmentAttemptRecord> {
  const detail = ensure(
    await repository.getAssessment(input.assessmentId),
    "Published assessment",
    input.assessmentId,
  );
  const active = await repository.getActiveAttempt(input.assessmentId, input.profileId);
  if (active && !isAssessmentAttemptExpired(active.expiresAt)) return active;
  if (active && isAssessmentAttemptExpired(active.expiresAt)) {
    await completeAssessmentAttempt(
      { attemptId: active.id, profileId: input.profileId },
      repository,
    );
  }
  const latest = await repository.getLatestAttempt(input.assessmentId, input.profileId);
  if (latest?.status === "completed") {
    if (detail.assessment.retakeRule === "never") {
      throw new ConflictError("This assessment does not allow retakes.");
    }
    if (detail.assessment.retakeRule === "after-failure" && latest.passed) {
      throw new ConflictError("This assessment does not allow a retake after a passing result.");
    }
  }
  const count = await repository.countAttempts(input.assessmentId, input.profileId);
  if (detail.assessment.attemptLimit !== null && count >= detail.assessment.attemptLimit) {
    throw new ConflictError("You have reached the attempt limit for this assessment.");
  }
  const seed = input.seed ?? Math.floor(Math.random() * 2_000_000_000);
  const selection = selectAssessmentQuestions(detail, seed);
  if (!selection.questions.length)
    throw new ValidationError("This assessment has no selectable questions.");
  const questionInstances = await buildQuestionInstances(
    detail,
    selection.questions,
    seed,
    exerciseRepository,
  );
  const maxScore = questionInstances.reduce((sum, question) => sum + question.points, 0);
  const expiresAt = detail.assessment.timeLimitSeconds
    ? new Date(Date.now() + detail.assessment.timeLimitSeconds * 1000).toISOString()
    : null;
  return repository.createAttempt({
    id: idFor("assessment-attempt"),
    assessmentId: input.assessmentId,
    profileId: input.profileId,
    seed,
    maxScore,
    questionOrder: selection.questionOrder,
    questionInstances,
    expiresAt,
  });
}

export interface SubmittedAssessmentAnswer {
  attempt: AssessmentAttemptRecord;
  result: AnswerValidationResult;
}

export async function submitAssessmentAnswer(
  input: {
    attemptId: string;
    profileId: string;
    questionId: string;
    response: unknown;
  },
  repository: AssessmentRepository,
  exerciseRepository: ExerciseRepository,
): Promise<SubmittedAssessmentAnswer> {
  const attempt = ensure(
    await repository.getAttempt(input.attemptId, input.profileId),
    "Assessment attempt",
    input.attemptId,
  );
  if (attempt.status !== "in-progress")
    throw new ConflictError("This assessment attempt is already closed.");
  if (isAssessmentAttemptExpired(attempt.expiresAt)) {
    await completeAssessmentAttempt(input, repository);
    throw new ConflictError("The assessment time limit has expired.");
  }
  if (!attempt.questionOrder.includes(input.questionId)) {
    throw new ValidationError("That question does not belong to this assessment attempt.");
  }
  const assessment = ensure(
    await repository.getAssessment(attempt.assessmentId),
    "Published assessment",
    attempt.assessmentId,
  );
  const question = ensure(
    await exerciseRepository.getQuestion(input.questionId),
    "Published question",
    input.questionId,
  );
  const instance = attempt.questionInstances.find((item) => item.questionId === input.questionId);
  let spec = question.version.answerSpec;
  if (instance?.templateId) {
    const template = ensure(
      await exerciseRepository.getQuestionTemplate(instance.templateId),
      "Question template",
      instance.templateId,
    );
    if (!template.isActive)
      throw new ConflictError("The randomized question template is no longer active.");
    spec = generateQuestionInstance(template, instance.instanceSeed ?? attempt.seed).validationSpec;
  }
  let validation = validateAnswer(question.question.type, spec, input.response);
  const weightedQuestion = assessment.questions.find(
    (item) => item.questionId === input.questionId,
  );
  const points = weightedQuestion?.points ?? 1;
  if (!assessment.assessment.partialCredit && validation.status === "partial") {
    validation = {
      ...validation,
      status: "incorrect",
      correct: false,
      score: 0,
      percentage: 0,
      feedback: "Partial credit is disabled for this assessment.",
    };
  }
  const weighted = {
    ...validation,
    score: validation.score * points,
    maxScore: points,
    percentage: validation.percentage,
  };
  await repository.saveQuestionAttempt({
    id: idFor("assessment-question-attempt"),
    assessmentAttemptId: attempt.id,
    questionId: input.questionId,
    questionVersionId: question.version.id,
    templateId: instance?.templateId ?? null,
    instanceSeed: instance?.instanceSeed ?? null,
    response: input.response as never,
    validationResult: weighted,
    score: weighted.score,
    maxScore: weighted.maxScore,
  });
  const visibleResult: AnswerValidationResult =
    assessment.assessment.feedbackVisibility === "immediate"
      ? weighted
      : {
          status: "needs-review",
          correct: false,
          score: 0,
          maxScore: weighted.maxScore,
          percentage: 0,
          feedback: "Answer saved.",
        };
  return { attempt, result: visibleResult };
}

export async function completeAssessmentAttempt(
  input: { attemptId: string; profileId: string },
  repository: AssessmentRepository,
  masteryRepository?: MasteryRepository,
  analyticsRepository?: AnalyticsRepository,
): Promise<AssessmentResultDetail> {
  const attempt = ensure(
    await repository.getAttempt(input.attemptId, input.profileId),
    "Assessment attempt",
    input.attemptId,
  );
  if (attempt.status !== "in-progress") {
    return ensure(
      await repository.getResult(attempt.id, input.profileId),
      "Assessment result",
      attempt.id,
    );
  }
  const detail = ensure(
    await repository.getAssessment(attempt.assessmentId),
    "Published assessment",
    attempt.assessmentId,
  );
  const selectedQuestions = detail.questions.filter((question) =>
    attempt.questionOrder.includes(question.questionId),
  );
  const questionAttempts = await repository.listQuestionAttempts(attempt.id);
  const summary = assessmentScoreSummary(
    questionAttempts.reduce((sum, item) => sum + item.score, 0),
    selectedQuestions.reduce((sum, item) => sum + item.points, 0),
    detail.assessment.passingThreshold,
  );
  const expired = isAssessmentAttemptExpired(attempt.expiresAt);
  const sectionResults = buildSectionResults(detail, selectedQuestions, questionAttempts).map(
    (result) => ({
      ...result,
      id: idFor("assessment-section-result"),
      assessmentAttemptId: attempt.id,
    }),
  );
  await repository.saveSectionResults(attempt.id, sectionResults);
  const analysis =
    detail.assessment.type === "diagnostic-test" || detail.assessment.type === "placement-test"
      ? analyzeDiagnostic({ assessment: detail.assessment, selectedQuestions, questionAttempts })
      : null;
  if (analysis && detail.assessment.type === "diagnostic-test") {
    await repository.saveDiagnosticResult({
      id: idFor("diagnostic-result"),
      assessmentAttemptId: attempt.id,
      createdAt: new Date().toISOString(),
      ...analysis,
    });
  }
  if (analysis && detail.assessment.type === "placement-test") {
    await repository.savePlacementResult({
      id: idFor("placement-result"),
      assessmentAttemptId: attempt.id,
      createdAt: new Date().toISOString(),
      recommendedGradeId: analysis.readinessGradeId,
      startingLevel: analysis.readinessLabel,
      confidence: Math.min(
        1,
        summary.percentage * 0.7 +
          (questionAttempts.length / Math.max(1, selectedQuestions.length)) * 0.3,
      ),
      reviewQuestionIds: reviewQuestionIds(selectedQuestions, questionAttempts),
      recommendations: analysis.recommendations,
      explanation: analysis.explanation,
    });
  }
  await repository.completeAttempt({
    id: attempt.id,
    profileId: input.profileId,
    status: expired ? "expired" : "completed",
    score: summary.score,
    maxScore: summary.maxScore,
    percentage: summary.percentage,
    passed: expired ? false : summary.passed,
    submittedAt: new Date().toISOString(),
  });
  const result = ensure(
    await repository.getResult(attempt.id, input.profileId),
    "Assessment result",
    attempt.id,
  );
  if (masteryRepository) {
    await recordAssessmentCompletion(input, masteryRepository, analyticsRepository);
  }
  return result;
}

export async function getLearnerAssessment(
  id: string,
  repository: AssessmentRepository,
): Promise<AssessmentDetail> {
  return ensure(await repository.getAssessment(id), "Published assessment", id);
}

export async function getLearnerAssessmentResult(
  id: string,
  profileId: string,
  repository: AssessmentRepository,
): Promise<AssessmentResultDetail> {
  const result = ensure(await repository.getResult(id, profileId), "Assessment result", id);
  if (result.assessment.reviewMode === "none") {
    return { ...result, questionAttempts: [] };
  }
  const questionAttempts =
    result.assessment.reviewMode === "incorrect-only"
      ? result.questionAttempts.filter((attempt) => attempt.score < attempt.maxScore)
      : result.questionAttempts;
  return {
    ...result,
    questionAttempts: questionAttempts.map((attempt) => ({
      ...attempt,
      validationResult:
        result.assessment.feedbackVisibility === "hidden"
          ? hideValidationFeedback(attempt.validationResult)
          : attempt.validationResult,
    })),
  };
}

export function publicAssessmentAttempt(attempt: AssessmentAttemptRecord): AssessmentAttemptRecord {
  return attempt;
}
