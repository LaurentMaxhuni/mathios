export const QUESTION_TYPES = [
  "multiple-choice",
  "multiple-selection",
  "true-false",
  "numeric",
  "numeric-tolerance",
  "numeric-unit",
  "algebraic-expression",
  "formula",
  "short-answer",
  "long-answer",
  "matching",
  "ordering",
  "diagram-labeling",
  "graph-interpretation",
  "table-interpretation",
  "multi-step",
] as const;

export type QuestionType = (typeof QUESTION_TYPES)[number];

export const QUESTION_DIFFICULTIES = ["gentle", "balanced", "challenging"] as const;
export type QuestionDifficulty = (typeof QUESTION_DIFFICULTIES)[number];

export const QUESTION_STATUSES = ["draft", "published", "archived"] as const;
export type QuestionStatus = (typeof QUESTION_STATUSES)[number];

export const EXERCISE_SET_KINDS = [
  "lesson",
  "module",
  "concept",
  "grade",
  "custom",
  "randomized",
  "adaptive",
] as const;
export type ExerciseSetKind = (typeof EXERCISE_SET_KINDS)[number];

export const EXERCISE_SET_STATUSES = ["draft", "published", "archived"] as const;
export type ExerciseSetStatus = (typeof EXERCISE_SET_STATUSES)[number];

export const EXERCISE_ATTEMPT_STATUSES = ["in-progress", "completed", "abandoned"] as const;
export type ExerciseAttemptStatus = (typeof EXERCISE_ATTEMPT_STATUSES)[number];

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

export interface QuestionOptionRecord {
  id: string;
  questionVersionId: string;
  key: string;
  label: string;
  sortOrder: number;
  isCorrect?: boolean;
}

export interface QuestionHintRecord {
  id: string;
  questionVersionId: string;
  level: number;
  content: string;
  sortOrder: number;
}

export interface QuestionSolutionRecord {
  id: string;
  questionVersionId: string;
  title: string;
  content: string;
  sortOrder: number;
}

export interface QuestionValidationSpec {
  expected?: JsonValue;
  acceptedAnswers?: JsonValue[];
  correctOptionKeys?: string[];
  correctPairs?: Record<string, string>;
  correctOrder?: string[];
  tolerance?: number;
  relativeTolerance?: number;
  unit?: string;
  acceptedUnits?: string[];
  significantFigures?: number;
  caseInsensitive?: boolean;
  trimWhitespace?: boolean;
  aliases?: Record<string, string[]>;
  variables?: string[];
  steps?: Array<{
    id: string;
    label?: string;
    type: QuestionType;
    weight?: number;
    spec: QuestionValidationSpec;
  }>;
  partialCredit?: {
    enabled?: boolean;
    penaltyForIncorrect?: boolean;
    minimumScore?: number;
  };
  [key: string]: unknown;
}

export interface QuestionRecord {
  id: string;
  slug: string;
  title: string;
  type: QuestionType;
  subjectId: string;
  subjectName?: string;
  gradeMinId: string | null;
  gradeMaxId: string | null;
  difficulty: QuestionDifficulty;
  estimatedTimeSeconds: number;
  source: string;
  authorProfileId: string | null;
  tags: readonly string[];
  status: QuestionStatus;
  currentVersionNumber: number;
  createdAt: string;
  updatedAt: string;
}

export interface QuestionVersionRecord {
  id: string;
  questionId: string;
  versionNumber: number;
  status: QuestionStatus;
  prompt: string;
  answerSpec: QuestionValidationSpec;
  explanation: string;
  fullSolution: string;
  commonWrongAnswers: readonly string[];
  errorFeedback: Readonly<Record<string, string>>;
  partialCreditRules: QuestionValidationSpec["partialCredit"] | null;
  changeSummary: string;
  createdByProfileId: string | null;
  publishedAt: string | null;
  createdAt: string;
}

export interface QuestionDetail {
  question: QuestionRecord;
  version: QuestionVersionRecord;
  options: readonly QuestionOptionRecord[];
  hints: readonly QuestionHintRecord[];
  solutions: readonly QuestionSolutionRecord[];
  conceptIds: readonly string[];
  learningObjectiveIds: readonly string[];
  template: QuestionTemplateRecord | null;
}

export interface QuestionListEntry extends QuestionRecord {
  conceptCount: number;
  exerciseSetCount: number;
}

export interface QuestionTemplateVariable {
  name: string;
  label: string;
  min: number;
  max: number;
  step?: number;
  decimals?: number;
  values?: readonly (string | number)[];
}

export interface QuestionTemplateRecord {
  id: string;
  questionId: string | null;
  slug: string;
  name: string;
  questionType: QuestionType;
  promptTemplate: string;
  variables: readonly QuestionTemplateVariable[];
  answerExpression: string;
  validationSpec: QuestionValidationSpec;
  seed: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface GeneratedQuestionInstance {
  templateId: string;
  seed: number;
  variables: Readonly<Record<string, string | number>>;
  prompt: string;
  expectedAnswer: JsonValue;
  validationSpec: QuestionValidationSpec;
}

export interface ExerciseSetRecord {
  id: string;
  slug: string;
  title: string;
  description: string;
  kind: ExerciseSetKind;
  subjectId: string | null;
  gradeId: string | null;
  difficulty: QuestionDifficulty;
  status: ExerciseSetStatus;
  estimatedTimeSeconds: number;
  createdByProfileId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ExerciseSetQuestionRecord {
  exerciseSetId: string;
  questionId: string;
  sortOrder: number;
  points: number;
  isRequired: boolean;
  question: QuestionListEntry;
}

export interface ExerciseSetDetail {
  exerciseSet: ExerciseSetRecord;
  questions: readonly ExerciseSetQuestionRecord[];
}

export interface ExerciseAttemptRecord {
  id: string;
  exerciseSetId: string;
  profileId: string;
  status: ExerciseAttemptStatus;
  seed: number;
  score: number;
  maxScore: number;
  startedAt: string;
  completedAt: string | null;
}

export interface QuestionAttemptRecord {
  id: string;
  exerciseAttemptId: string | null;
  assessmentAttemptId?: string | null;
  questionId: string;
  questionVersionId: string;
  templateId: string | null;
  instanceSeed: number | null;
  response: JsonValue;
  validationResult: JsonValue;
  score: number;
  maxScore: number;
  answeredAt: string;
}

export interface AnswerValidationResult {
  status: "correct" | "incorrect" | "partial" | "needs-review";
  correct: boolean;
  score: number;
  maxScore: number;
  percentage: number;
  feedback: string;
  errorKey?: string;
  normalizedAnswer?: JsonValue;
  perPart?: readonly AnswerValidationResult[];
}

export interface CreateQuestionInput {
  id: string;
  slug: string;
  title: string;
  type: QuestionType;
  subjectId: string;
  gradeMinId: string | null;
  gradeMaxId: string | null;
  difficulty: QuestionDifficulty;
  estimatedTimeSeconds: number;
  source: string;
  authorProfileId: string | null;
  tags: readonly string[];
  status: QuestionStatus;
  prompt: string;
  answerSpec: QuestionValidationSpec;
  explanation: string;
  fullSolution: string;
  commonWrongAnswers: readonly string[];
  errorFeedback: Readonly<Record<string, string>>;
  partialCreditRules: QuestionValidationSpec["partialCredit"] | null;
  changeSummary: string;
  options: readonly Omit<QuestionOptionRecord, "questionVersionId">[];
  hints: readonly Omit<QuestionHintRecord, "questionVersionId">[];
  solutions: readonly Omit<QuestionSolutionRecord, "questionVersionId">[];
  conceptIds: readonly string[];
  learningObjectiveIds: readonly string[];
  template?: Omit<QuestionTemplateRecord, "questionId" | "createdAt" | "updatedAt"> | null;
}

export type UpdateQuestionInput = Omit<
  CreateQuestionInput,
  "id" | "slug" | "subjectId" | "authorProfileId" | "status"
> & {
  slug: string;
  subjectId: string;
  authorProfileId: string | null;
  status: QuestionStatus;
};

export interface CreateExerciseSetInput {
  id: string;
  slug: string;
  title: string;
  description: string;
  kind: ExerciseSetKind;
  subjectId: string | null;
  gradeId: string | null;
  difficulty: QuestionDifficulty;
  status: ExerciseSetStatus;
  estimatedTimeSeconds: number;
  createdByProfileId: string | null;
}

export interface SaveQuestionAttemptInput {
  id: string;
  exerciseAttemptId: string;
  questionId: string;
  questionVersionId: string;
  templateId: string | null;
  instanceSeed: number | null;
  response: JsonValue;
  validationResult: AnswerValidationResult;
  score: number;
  maxScore: number;
}
