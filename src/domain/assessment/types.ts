import type {
  AnswerValidationResult,
  JsonValue,
  QuestionListEntry,
  QuestionOptionRecord,
  QuestionType,
  QuestionAttemptRecord,
} from "@/domain/exercise/types";

export const ASSESSMENT_TYPES = [
  "lesson-knowledge-check",
  "module-quiz",
  "unit-test",
  "grade-exam",
  "subject-exam",
  "diagnostic-test",
  "placement-test",
  "roadmap-checkpoint",
  "cumulative-review",
  "timed-exam",
  "untimed-practice",
  "olympiad-problem-set",
] as const;
export type AssessmentType = (typeof ASSESSMENT_TYPES)[number];

export const ASSESSMENT_STATUSES = ["draft", "published", "archived"] as const;
export type AssessmentStatus = (typeof ASSESSMENT_STATUSES)[number];

export const ASSESSMENT_FEEDBACK_VISIBILITIES = ["immediate", "after-submit", "hidden"] as const;
export type AssessmentFeedbackVisibility = (typeof ASSESSMENT_FEEDBACK_VISIBILITIES)[number];

export const ASSESSMENT_REVIEW_MODES = ["none", "incorrect-only", "full"] as const;
export type AssessmentReviewMode = (typeof ASSESSMENT_REVIEW_MODES)[number];

export const ASSESSMENT_RETAKE_RULES = [
  "always",
  "after-completion",
  "after-failure",
  "never",
] as const;
export type AssessmentRetakeRule = (typeof ASSESSMENT_RETAKE_RULES)[number];

export const ASSESSMENT_QUESTION_ORDERINGS = ["fixed", "randomized"] as const;
export type AssessmentQuestionOrdering = (typeof ASSESSMENT_QUESTION_ORDERINGS)[number];

export const ASSESSMENT_ATTEMPT_STATUSES = [
  "in-progress",
  "completed",
  "expired",
  "abandoned",
] as const;
export type AssessmentAttemptStatus = (typeof ASSESSMENT_ATTEMPT_STATUSES)[number];

export interface AssessmentDifficultyDistribution {
  gentle?: number;
  balanced?: number;
  challenging?: number;
  [key: string]: unknown;
}

export interface AssessmentGradeBand {
  gradeId: string;
  label: string;
  minPercentage: number;
}

export interface AssessmentConfiguration {
  difficultyDistribution?: AssessmentDifficultyDistribution;
  conceptCoverage?: readonly string[];
  gradeBands?: readonly AssessmentGradeBand[];
  [key: string]: unknown;
}

export interface AssessmentRecord {
  id: string;
  slug: string;
  title: string;
  description: string;
  type: AssessmentType;
  subjectId: string | null;
  gradeId: string | null;
  status: AssessmentStatus;
  timeLimitSeconds: number | null;
  attemptLimit: number | null;
  passingThreshold: number;
  partialCredit: boolean;
  feedbackVisibility: AssessmentFeedbackVisibility;
  reviewMode: AssessmentReviewMode;
  retakeRule: AssessmentRetakeRule;
  questionOrdering: AssessmentQuestionOrdering;
  autoSubmit: boolean;
  configuration: AssessmentConfiguration;
  createdByProfileId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AssessmentSectionRecord {
  id: string;
  assessmentId: string;
  title: string;
  description: string;
  sortOrder: number;
  points: number;
  timeLimitSeconds: number | null;
  questionOrdering: AssessmentQuestionOrdering;
  createdAt: string;
  updatedAt: string;
}

export interface AssessmentPoolRecord {
  id: string;
  assessmentId: string;
  sectionId: string;
  title: string;
  selectionCount: number;
  difficultyDistribution: AssessmentDifficultyDistribution;
  conceptIds: readonly string[];
  questionOrdering: AssessmentQuestionOrdering;
  createdAt: string;
  updatedAt: string;
}

export interface AssessmentQuestionRecord {
  id: string;
  assessmentId: string;
  sectionId: string;
  poolId: string | null;
  questionId: string;
  sortOrder: number;
  points: number;
  isRequired: boolean;
  question: QuestionListEntry;
  conceptIds: readonly string[];
}

export interface AssessmentSectionDetail {
  section: AssessmentSectionRecord;
  pools: readonly AssessmentPoolRecord[];
  questions: readonly AssessmentQuestionRecord[];
}

export interface AssessmentDetail {
  assessment: AssessmentRecord;
  sections: readonly AssessmentSectionDetail[];
  questions: readonly AssessmentQuestionRecord[];
}

export interface AssessmentQuestionInstance {
  assessmentQuestionId: string;
  assessmentId: string;
  sectionId: string;
  questionId: string;
  title: string;
  type: QuestionType;
  prompt: string;
  options: readonly Omit<QuestionOptionRecord, "isCorrect">[];
  points: number;
  isRequired: boolean;
  order: number;
  templateId: string | null;
  instanceSeed: number | null;
  conceptIds: readonly string[];
}

export interface AssessmentAttemptRecord {
  id: string;
  assessmentId: string;
  profileId: string;
  status: AssessmentAttemptStatus;
  seed: number;
  score: number;
  maxScore: number;
  percentage: number;
  passed: boolean | null;
  questionOrder: readonly string[];
  questionInstances: readonly AssessmentQuestionInstance[];
  startedAt: string;
  expiresAt: string | null;
  submittedAt: string | null;
}

export interface AssessmentQuestionAttemptRecord extends QuestionAttemptRecord {
  assessmentAttemptId: string;
}

export interface AssessmentSectionResultRecord {
  id: string;
  assessmentAttemptId: string;
  sectionId: string;
  score: number;
  maxScore: number;
  percentage: number;
  correctCount: number;
  answeredCount: number;
  questionCount: number;
  conceptScores: JsonValue;
}

export interface DiagnosticRecommendation {
  kind: "review-concept" | "starting-level" | "strength";
  title: string;
  detail: string;
  priority: number;
  conceptId?: string;
  gradeId?: string;
}

export interface DiagnosticResultRecord {
  id: string;
  assessmentAttemptId: string;
  readinessGradeId: string | null;
  readinessLabel: string;
  subjectStrengths: readonly string[];
  weakConceptIds: readonly string[];
  missingPrerequisiteConceptIds: readonly string[];
  recommendations: readonly DiagnosticRecommendation[];
  explanation: string;
  createdAt: string;
}

export interface PlacementResultRecord {
  id: string;
  assessmentAttemptId: string;
  recommendedGradeId: string | null;
  startingLevel: string;
  confidence: number;
  reviewQuestionIds: readonly string[];
  recommendations: readonly DiagnosticRecommendation[];
  explanation: string;
  createdAt: string;
}

export interface AssessmentMistakeCategory {
  category: string;
  count: number;
  questionIds: readonly string[];
}

export interface AssessmentResultDetail {
  assessment: AssessmentRecord;
  attempt: AssessmentAttemptRecord;
  sections: readonly AssessmentSectionResultRecord[];
  questionAttempts: readonly AssessmentQuestionAttemptRecord[];
  timeSpentSeconds: number;
  averageResponseTimeSeconds: number | null;
  mistakeCategories: readonly AssessmentMistakeCategory[];
  previousAttempt: AssessmentAttemptRecord | null;
  diagnostic: DiagnosticResultRecord | null;
  placement: PlacementResultRecord | null;
}

export interface CreateAssessmentInput {
  id: string;
  slug: string;
  title: string;
  description: string;
  type: AssessmentType;
  subjectId: string | null;
  gradeId: string | null;
  status: AssessmentStatus;
  timeLimitSeconds: number | null;
  attemptLimit: number | null;
  passingThreshold: number;
  partialCredit: boolean;
  feedbackVisibility: AssessmentFeedbackVisibility;
  reviewMode: AssessmentReviewMode;
  retakeRule: AssessmentRetakeRule;
  questionOrdering: AssessmentQuestionOrdering;
  autoSubmit: boolean;
  configuration: AssessmentConfiguration;
  createdByProfileId: string | null;
}

export type UpdateAssessmentInput = Omit<
  CreateAssessmentInput,
  "id" | "createdByProfileId" | "status"
> & {
  status: AssessmentStatus;
};

export interface CreateAssessmentSectionInput {
  id: string;
  assessmentId: string;
  title: string;
  description: string;
  sortOrder: number;
  points: number;
  timeLimitSeconds: number | null;
  questionOrdering: AssessmentQuestionOrdering;
}

export interface CreateAssessmentPoolInput {
  id: string;
  assessmentId: string;
  sectionId: string;
  title: string;
  selectionCount: number;
  difficultyDistribution: AssessmentDifficultyDistribution;
  conceptIds: readonly string[];
  questionOrdering: AssessmentQuestionOrdering;
}

export interface SaveAssessmentQuestionInput {
  id: string;
  assessmentId: string;
  sectionId: string;
  poolId: string | null;
  questionId: string;
  sortOrder: number;
  points: number;
  isRequired: boolean;
}

export interface SaveAssessmentQuestionAttemptInput {
  id: string;
  assessmentAttemptId: string;
  questionId: string;
  questionVersionId: string;
  templateId: string | null;
  instanceSeed: number | null;
  response: JsonValue;
  validationResult: AnswerValidationResult;
  score: number;
  maxScore: number;
}

export interface AssessmentQuestionForSelection extends AssessmentQuestionRecord {
  question: QuestionListEntry;
}

export interface AssessmentSelection {
  questions: readonly AssessmentQuestionForSelection[];
  questionOrder: readonly string[];
}

export interface AssessmentScoreSummary {
  score: number;
  maxScore: number;
  percentage: number;
  passed: boolean;
}

export interface DiagnosticAnalysisInput {
  assessment: AssessmentRecord;
  selectedQuestions: readonly AssessmentQuestionRecord[];
  questionAttempts: readonly AssessmentQuestionAttemptRecord[];
}
