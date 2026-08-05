import type {
  MasteryConceptRecord,
  MasteryDetail,
  MasteryEventRecord,
  MasteryEvidenceInput,
  MasteryRuleConfig,
  MasterySnapshotRecord,
  MasterySubjectSummary,
  MasteryGradeSummary,
  RecommendationCandidate,
  RecommendationRecord,
  RecommendationRuleConfig,
  UserConceptMasteryRecord,
} from "@/domain/mastery/types";

export interface MasteryContext {
  concepts: readonly MasteryConceptRecord[];
  mastery: readonly UserConceptMasteryRecord[];
  prerequisiteLinks: readonly {
    conceptId: string;
    prerequisiteConceptId: string;
    prerequisiteName: string;
  }[];
  failedAssessmentConceptIds: readonly string[];
  gradeRequiredConceptIds: readonly string[];
  roadmapRequiredConceptIds: readonly string[];
}

export interface ExerciseMasteryEvidence {
  conceptId: string;
  score: number;
  difficulty: "gentle" | "balanced" | "challenging" | "mixed";
  attempts: number;
  hintsUsed: number;
  partialCredit: boolean;
  metadata: Record<string, unknown>;
  occurredAt: string;
}

export interface AssessmentMasteryEvidence extends ExerciseMasteryEvidence {
  passed: boolean;
  assessmentId: string;
}

export interface MasteryRepository {
  getRuleConfiguration(): Promise<{
    mastery: MasteryRuleConfig;
    recommendations: RecommendationRuleConfig;
  }>;
  getMastery(profileId: string, conceptId: string): Promise<UserConceptMasteryRecord | null>;
  listMastery(
    profileId: string,
    options?: { subjectId?: string; gradeId?: string },
  ): Promise<readonly UserConceptMasteryRecord[]>;
  listConcepts(options?: {
    subjectId?: string;
    gradeId?: string;
  }): Promise<readonly MasteryConceptRecord[]>;
  getConcept(conceptId: string): Promise<MasteryConceptRecord | null>;
  getMasteryDetail(profileId: string, conceptId: string): Promise<MasteryDetail | null>;
  listEvents(profileId: string, conceptId: string): Promise<readonly MasteryEventRecord[]>;
  listSnapshots(profileId: string, conceptId: string): Promise<readonly MasterySnapshotRecord[]>;
  getContext(profileId: string): Promise<MasteryContext>;
  listSubjects(profileId: string): Promise<readonly MasterySubjectSummary[]>;
  listGrades(profileId: string): Promise<readonly MasteryGradeSummary[]>;

  getExerciseEvidence(
    profileId: string,
    attemptId: string,
  ): Promise<readonly ExerciseMasteryEvidence[]>;
  getAssessmentEvidence(
    profileId: string,
    attemptId: string,
  ): Promise<readonly AssessmentMasteryEvidence[]>;
  getLessonConceptIds(profileId: string, lessonId: string): Promise<readonly string[]>;
  upsertEvent(input: MasteryEvidenceInput): Promise<MasteryEventRecord>;
  saveMastery(input: UserConceptMasteryRecord, snapshot: MasterySnapshotRecord): Promise<void>;

  listRecommendations(
    profileId: string,
    options?: { includeDismissed?: boolean },
  ): Promise<readonly RecommendationRecord[]>;
  saveRecommendations(
    profileId: string,
    candidates: readonly RecommendationCandidate[],
  ): Promise<void>;
  dismissRecommendation(
    profileId: string,
    recommendationId: string,
    reason?: string,
  ): Promise<void>;
}
