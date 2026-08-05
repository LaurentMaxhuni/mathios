import { ValidationError } from "@/domain/errors/application-error";
import { createSeededRandom } from "@/domain/exercise/generator";
import type { JsonValue, QuestionDifficulty } from "@/domain/exercise/types";
import type {
  AssessmentDetail,
  AssessmentDifficultyDistribution,
  AssessmentGradeBand,
  AssessmentMistakeCategory,
  AssessmentQuestionRecord,
  AssessmentQuestionAttemptRecord,
  AssessmentQuestionForSelection,
  AssessmentScoreSummary,
  AssessmentSelection,
  AssessmentSectionResultRecord,
  DiagnosticAnalysisInput,
  DiagnosticRecommendation,
} from "@/domain/assessment/types";

const DIFFICULTIES: readonly QuestionDifficulty[] = ["gentle", "balanced", "challenging"];

function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, value));
}

function round(value: number, decimals = 4): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function shuffle<T>(items: readonly T[], random: () => number): T[] {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [copy[index], copy[target]] = [copy[target], copy[index]];
  }
  return copy;
}

function configuredCount(value: unknown): number {
  return typeof value === "number" && Number.isInteger(value) && value > 0 ? value : 0;
}

function selectFromPool(
  poolQuestions: readonly AssessmentQuestionForSelection[],
  selectionCount: number,
  distribution: AssessmentDifficultyDistribution,
  conceptIds: readonly string[],
  random: () => number,
  selectedIds: ReadonlySet<string>,
): AssessmentQuestionForSelection[] {
  const conceptFiltered = conceptIds.length
    ? poolQuestions.filter((question) =>
        conceptIds.some((conceptId) => question.conceptIds.includes(conceptId)),
      )
    : poolQuestions;
  const availableQuestions = conceptFiltered.length ? conceptFiltered : poolQuestions;
  const available = shuffle(
    availableQuestions.filter((question) => !selectedIds.has(question.questionId)),
    random,
  );
  const selected: AssessmentQuestionForSelection[] = [];
  for (const difficulty of DIFFICULTIES) {
    const required = configuredCount(distribution[difficulty]);
    for (const candidate of available) {
      if (selected.length >= selectionCount) break;
      if (selected.some((question) => question.questionId === candidate.questionId)) continue;
      if (
        candidate.question.difficulty === difficulty &&
        selected.filter((question) => question.question.difficulty === difficulty).length < required
      ) {
        selected.push(candidate);
      }
    }
  }
  for (const candidate of available) {
    if (selected.length >= selectionCount) break;
    if (!selected.some((question) => question.questionId === candidate.questionId)) {
      selected.push(candidate);
    }
  }
  return selected;
}

export function assertValidAssessmentDefinition(input: {
  title: string;
  passingThreshold: number;
  timeLimitSeconds: number | null;
  attemptLimit: number | null;
  sections: readonly { title: string; points: number }[];
}): void {
  if (!input.title.trim()) throw new ValidationError("An assessment title cannot be empty.");
  if (
    !Number.isFinite(input.passingThreshold) ||
    input.passingThreshold < 0 ||
    input.passingThreshold > 1
  ) {
    throw new ValidationError("The passing threshold must be between 0 and 1.");
  }
  if (
    input.timeLimitSeconds !== null &&
    (!Number.isInteger(input.timeLimitSeconds) || input.timeLimitSeconds <= 0)
  ) {
    throw new ValidationError("A time limit must be a positive number of seconds.");
  }
  if (
    input.attemptLimit !== null &&
    (!Number.isInteger(input.attemptLimit) || input.attemptLimit <= 0)
  ) {
    throw new ValidationError("An attempt limit must be a positive whole number.");
  }
  if (!input.sections.length) throw new ValidationError("Add at least one assessment section.");
  if (input.sections.some((section) => !section.title.trim() || section.points <= 0)) {
    throw new ValidationError("Every assessment section needs a title and positive points.");
  }
}

export function selectAssessmentQuestions(
  detail: AssessmentDetail,
  seed: number,
): AssessmentSelection {
  const selected: AssessmentQuestionForSelection[] = [];
  const selectedIds = new Set<string>();
  const sectionOrder = [...detail.sections].sort(
    (left, right) => left.section.sortOrder - right.section.sortOrder,
  );
  const configuredConceptIds = detail.assessment.configuration.conceptCoverage ?? [];
  for (const section of sectionOrder) {
    const random = createSeededRandom(seed + section.section.sortOrder * 7919);
    const fixed = section.questions
      .filter((question) => question.poolId === null)
      .sort((left, right) => left.sortOrder - right.sortOrder);
    const sectionSelected = [...fixed];
    for (const pool of section.pools) {
      const candidates = section.questions.filter((question) => question.poolId === pool.id);
      sectionSelected.push(
        ...selectFromPool(
          candidates,
          pool.selectionCount,
          pool.difficultyDistribution,
          pool.conceptIds.length ? pool.conceptIds : configuredConceptIds,
          random,
          selectedIds,
        ),
      );
    }
    const ordered =
      detail.assessment.questionOrdering === "randomized" ||
      section.section.questionOrdering === "randomized" ||
      section.pools.some((pool) => pool.questionOrdering === "randomized")
        ? shuffle(sectionSelected, random)
        : sectionSelected.sort((left, right) => left.sortOrder - right.sortOrder);
    for (const question of ordered) {
      if (selectedIds.has(question.questionId)) continue;
      selectedIds.add(question.questionId);
      selected.push(question);
    }
  }
  return { questions: selected, questionOrder: selected.map((question) => question.questionId) };
}

export function isAssessmentAttemptExpired(
  expiresAt: string | null,
  now: Date | number = Date.now(),
): boolean {
  if (!expiresAt) return false;
  const expiry = Date.parse(expiresAt);
  const timestamp = typeof now === "number" ? now : now.getTime();
  return Number.isFinite(expiry) && timestamp >= expiry;
}

export function assessmentScoreSummary(
  score: number,
  maxScore: number,
  passingThreshold: number,
): AssessmentScoreSummary {
  const percentage = maxScore > 0 ? clamp(score / maxScore) : 0;
  return {
    score: round(Math.max(0, score)),
    maxScore: round(Math.max(0, maxScore)),
    percentage: round(percentage),
    passed: percentage >= passingThreshold,
  };
}

function gradeBandForPercentage(
  bands: readonly AssessmentGradeBand[] | undefined,
  percentage: number,
): AssessmentGradeBand | null {
  if (!bands?.length) return null;
  return (
    [...bands]
      .sort((left, right) => left.minPercentage - right.minPercentage)
      .filter((band) => percentage >= band.minPercentage)
      .at(-1) ?? null
  );
}

function conceptPerformance(
  selectedQuestions: readonly AssessmentQuestionRecord[],
  questionAttempts: readonly AssessmentQuestionAttemptRecord[],
): Map<string, { score: number; maxScore: number }> {
  const questionMap = new Map(selectedQuestions.map((question) => [question.questionId, question]));
  const result = new Map<string, { score: number; maxScore: number }>();
  for (const attempt of questionAttempts) {
    const question = questionMap.get(attempt.questionId);
    if (!question) continue;
    for (const conceptId of question.conceptIds) {
      const previous = result.get(conceptId) ?? { score: 0, maxScore: 0 };
      previous.score += attempt.score;
      previous.maxScore += attempt.maxScore;
      result.set(conceptId, previous);
    }
  }
  return result;
}

export function analyzeDiagnostic(input: DiagnosticAnalysisInput): {
  readinessGradeId: string | null;
  readinessLabel: string;
  subjectStrengths: readonly string[];
  weakConceptIds: readonly string[];
  missingPrerequisiteConceptIds: readonly string[];
  recommendations: readonly DiagnosticRecommendation[];
  explanation: string;
} {
  const score = input.questionAttempts.reduce((sum, attempt) => sum + attempt.score, 0);
  const maxScore = input.questionAttempts.reduce((sum, attempt) => sum + attempt.maxScore, 0);
  const percentage = maxScore > 0 ? clamp(score / maxScore) : 0;
  const bands = input.assessment.configuration.gradeBands;
  const band = gradeBandForPercentage(bands, percentage);
  const performance = conceptPerformance(input.selectedQuestions, input.questionAttempts);
  const strengths: string[] = [];
  const weak: string[] = [];
  for (const [conceptId, values] of performance) {
    const conceptPercentage = values.maxScore > 0 ? values.score / values.maxScore : 0;
    if (conceptPercentage >= 0.8) strengths.push(conceptId);
    if (conceptPercentage < 0.6) weak.push(conceptId);
  }
  const recommendations: DiagnosticRecommendation[] = [];
  if (band) {
    recommendations.push({
      kind: "starting-level",
      title: `Start with ${band.label}`,
      detail: `Your observed score was ${Math.round(percentage * 100)}%, which meets this level's configured readiness threshold.`,
      priority: 1,
      gradeId: band.gradeId,
    });
  } else {
    recommendations.push({
      kind: "starting-level",
      title: "Start with foundational review",
      detail:
        "The result did not meet the first configured readiness threshold, so prerequisite review is the safest starting point.",
      priority: 1,
    });
  }
  for (const conceptId of weak.slice(0, 5)) {
    recommendations.push({
      kind: "review-concept",
      title: "Review a weak concept",
      detail: "This concept was attached to questions where the recorded score was below 60%.",
      priority: 2,
      conceptId,
    });
  }
  for (const conceptId of strengths.slice(0, 3)) {
    recommendations.push({
      kind: "strength",
      title: "Build on a demonstrated strength",
      detail: "This concept reached at least 80% on the answered diagnostic questions.",
      priority: 3,
      conceptId,
    });
  }
  return {
    readinessGradeId: band?.gradeId ?? null,
    readinessLabel: band?.label ?? "Foundational review",
    subjectStrengths: strengths,
    weakConceptIds: weak,
    missingPrerequisiteConceptIds: weak,
    recommendations,
    explanation: `The recommendation uses the assessment score (${Math.round(percentage * 100)}%) and concept-level results from ${input.questionAttempts.length} answered question${input.questionAttempts.length === 1 ? "" : "s"}.`,
  };
}

export function reviewQuestionIds(
  selectedQuestions: readonly AssessmentQuestionRecord[],
  questionAttempts: readonly AssessmentQuestionAttemptRecord[],
): readonly string[] {
  const byQuestion = new Map(questionAttempts.map((attempt) => [attempt.questionId, attempt]));
  return selectedQuestions
    .filter((question) => {
      const attempt = byQuestion.get(question.questionId);
      return !attempt || attempt.score < attempt.maxScore;
    })
    .map((question) => question.questionId);
}

export function buildMistakeCategories(
  questionAttempts: readonly AssessmentQuestionAttemptRecord[],
): readonly AssessmentMistakeCategory[] {
  const categories = new Map<string, { count: number; questionIds: string[] }>();
  for (const attempt of questionAttempts) {
    if (attempt.score >= attempt.maxScore && attempt.maxScore > 0) continue;
    const validation = jsonObject(attempt.validationResult);
    const configuredCategory = validation.errorKey;
    const category =
      typeof configuredCategory === "string" && configuredCategory
        ? configuredCategory
        : typeof validation.status === "string" && validation.status
          ? validation.status
          : "incorrect-answer";
    const entry = categories.get(category) ?? { count: 0, questionIds: [] };
    entry.count += 1;
    entry.questionIds.push(attempt.questionId);
    categories.set(category, entry);
  }
  return [...categories.entries()]
    .sort((left, right) => right[1].count - left[1].count || left[0].localeCompare(right[0]))
    .map(([category, value]) => ({ category, ...value }));
}

export function buildSectionResults(
  detail: AssessmentDetail,
  selectedQuestions: readonly AssessmentQuestionRecord[],
  questionAttempts: readonly AssessmentQuestionAttemptRecord[],
): Omit<AssessmentSectionResultRecord, "id">[] {
  const attempts = new Map(questionAttempts.map((attempt) => [attempt.questionId, attempt]));
  return detail.sections.map(({ section }) => {
    const questions = selectedQuestions.filter((question) => question.sectionId === section.id);
    let score = 0;
    let maxScore = 0;
    let correctCount = 0;
    let answeredCount = 0;
    const conceptTotals = new Map<string, { score: number; maxScore: number }>();
    for (const question of questions) {
      const attempt = attempts.get(question.questionId);
      maxScore += question.points;
      if (!attempt) continue;
      score += attempt.score;
      answeredCount += 1;
      if (attempt.score >= attempt.maxScore && attempt.maxScore > 0) correctCount += 1;
      for (const conceptId of question.conceptIds) {
        const total = conceptTotals.get(conceptId) ?? { score: 0, maxScore: 0 };
        total.score += attempt.score;
        total.maxScore += attempt.maxScore;
        conceptTotals.set(conceptId, total);
      }
    }
    const conceptScores: Record<string, number> = {};
    for (const [conceptId, total] of conceptTotals) {
      conceptScores[conceptId] = total.maxScore > 0 ? round(total.score / total.maxScore) : 0;
    }
    return {
      assessmentAttemptId: "",
      sectionId: section.id,
      score: round(score),
      maxScore: round(maxScore),
      percentage: maxScore > 0 ? round(score / maxScore) : 0,
      correctCount,
      answeredCount,
      questionCount: questions.length,
      conceptScores,
    };
  });
}

export function jsonObject(value: JsonValue): Record<string, JsonValue> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, JsonValue>)
    : {};
}
