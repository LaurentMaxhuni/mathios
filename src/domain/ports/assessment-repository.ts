import type {
  AssessmentAttemptRecord,
  AssessmentDetail,
  AssessmentRecord,
  AssessmentResultDetail,
  AssessmentSectionResultRecord,
  CreateAssessmentInput,
  CreateAssessmentPoolInput,
  CreateAssessmentSectionInput,
  AssessmentQuestionAttemptRecord,
  DiagnosticResultRecord,
  PlacementResultRecord,
  SaveAssessmentQuestionAttemptInput,
  SaveAssessmentQuestionInput,
  UpdateAssessmentInput,
} from "@/domain/assessment/types";

export interface AssessmentRepository {
  listAssessments(options?: {
    includeArchived?: boolean;
    includeDraft?: boolean;
    type?: string;
    subjectId?: string;
    gradeId?: string;
  }): Promise<readonly AssessmentRecord[]>;
  getAssessment(id: string, options?: { includeDraft?: boolean }): Promise<AssessmentDetail | null>;
  createAssessment(input: CreateAssessmentInput): Promise<AssessmentRecord>;
  updateAssessment(id: string, input: UpdateAssessmentInput): Promise<AssessmentRecord>;
  setAssessmentStatus(id: string, status: AssessmentRecord["status"]): Promise<AssessmentRecord>;
  createSection(input: CreateAssessmentSectionInput): Promise<void>;
  createPool(input: CreateAssessmentPoolInput): Promise<void>;
  saveQuestion(input: SaveAssessmentQuestionInput): Promise<void>;
  removeQuestion(input: { id: string }): Promise<void>;

  countAttempts(assessmentId: string, profileId: string): Promise<number>;
  getLatestAttempt(
    assessmentId: string,
    profileId: string,
  ): Promise<AssessmentAttemptRecord | null>;
  getPreviousAttempt(
    assessmentId: string,
    profileId: string,
    beforeAttemptId: string,
  ): Promise<AssessmentAttemptRecord | null>;
  getActiveAttempt(
    assessmentId: string,
    profileId: string,
  ): Promise<AssessmentAttemptRecord | null>;
  createAttempt(input: {
    id: string;
    assessmentId: string;
    profileId: string;
    seed: number;
    maxScore: number;
    questionOrder: readonly string[];
    questionInstances: AssessmentAttemptRecord["questionInstances"];
    expiresAt: string | null;
  }): Promise<AssessmentAttemptRecord>;
  getAttempt(id: string, profileId: string): Promise<AssessmentAttemptRecord | null>;
  saveQuestionAttempt(input: SaveAssessmentQuestionAttemptInput): Promise<void>;
  listQuestionAttempts(attemptId: string): Promise<readonly AssessmentQuestionAttemptRecord[]>;
  saveSectionResults(
    attemptId: string,
    results: readonly AssessmentSectionResultRecord[],
  ): Promise<void>;
  saveDiagnosticResult(result: DiagnosticResultRecord): Promise<void>;
  savePlacementResult(result: PlacementResultRecord): Promise<void>;
  completeAttempt(input: {
    id: string;
    profileId: string;
    status: AssessmentAttemptRecord["status"];
    score: number;
    maxScore: number;
    percentage: number;
    passed: boolean;
    submittedAt: string;
  }): Promise<AssessmentAttemptRecord>;
  getResult(id: string, profileId: string): Promise<AssessmentResultDetail | null>;
}
