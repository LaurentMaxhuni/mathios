import type {
  CreateExerciseSetInput,
  CreateQuestionInput,
  ExerciseAttemptRecord,
  ExerciseSetDetail,
  ExerciseSetRecord,
  QuestionAttemptRecord,
  QuestionDetail,
  QuestionListEntry,
  QuestionRecord,
  QuestionTemplateRecord,
  SaveQuestionAttemptInput,
  UpdateQuestionInput,
} from "@/domain/exercise/types";

export interface ExerciseRepository {
  listQuestions(options?: {
    includeArchived?: boolean;
    subjectId?: string;
    gradeId?: string;
    type?: string;
    difficulty?: string;
    search?: string;
  }): Promise<readonly QuestionListEntry[]>;
  getQuestion(id: string, options?: { includeDraft?: boolean }): Promise<QuestionDetail | null>;
  createQuestion(input: CreateQuestionInput): Promise<QuestionDetail>;
  updateQuestion(id: string, input: UpdateQuestionInput): Promise<QuestionDetail>;
  setQuestionStatus(id: string, status: QuestionRecord["status"]): Promise<QuestionRecord>;
  listQuestionTemplates(options?: {
    activeOnly?: boolean;
  }): Promise<readonly QuestionTemplateRecord[]>;
  getQuestionTemplate(id: string): Promise<QuestionTemplateRecord | null>;
  saveQuestionTemplate(template: QuestionTemplateRecord): Promise<QuestionTemplateRecord>;

  listExerciseSets(options?: {
    includeArchived?: boolean;
    status?: string;
    kind?: string;
    subjectId?: string;
  }): Promise<readonly ExerciseSetRecord[]>;
  getExerciseSet(
    id: string,
    options?: { includeDraft?: boolean },
  ): Promise<ExerciseSetDetail | null>;
  createExerciseSet(input: CreateExerciseSetInput): Promise<ExerciseSetRecord>;
  setExerciseSetStatus(id: string, status: ExerciseSetRecord["status"]): Promise<ExerciseSetRecord>;
  saveExerciseSetQuestion(input: {
    exerciseSetId: string;
    questionId: string;
    sortOrder: number;
    points: number;
    isRequired: boolean;
  }): Promise<void>;
  removeExerciseSetQuestion(input: { exerciseSetId: string; questionId: string }): Promise<void>;

  createExerciseAttempt(input: {
    id: string;
    exerciseSetId: string;
    profileId: string;
    seed: number;
    maxScore: number;
  }): Promise<ExerciseAttemptRecord>;
  getExerciseAttempt(id: string, profileId: string): Promise<ExerciseAttemptRecord | null>;
  saveQuestionAttempt(input: SaveQuestionAttemptInput): Promise<QuestionAttemptRecord>;
  listQuestionAttempts(exerciseAttemptId: string): Promise<readonly QuestionAttemptRecord[]>;
  completeExerciseAttempt(input: {
    id: string;
    profileId: string;
    score: number;
    maxScore: number;
    status: ExerciseAttemptRecord["status"];
  }): Promise<ExerciseAttemptRecord>;
}
