import type { ConceptDifficulty } from "@/domain/concept/types";

export const MASTERY_STATES = [
  "not-started",
  "introduced",
  "developing",
  "practiced",
  "proficient",
  "mastered",
  "needs-review",
] as const;
export type MasteryState = (typeof MASTERY_STATES)[number];

export const MASTERY_EVENT_TYPES = ["lesson-completion", "exercise", "assessment"] as const;
export type MasteryEventType = (typeof MASTERY_EVENT_TYPES)[number];

export const MASTERY_DIFFICULTIES = ["gentle", "balanced", "challenging", "mixed"] as const;
export type MasteryDifficulty = (typeof MASTERY_DIFFICULTIES)[number];

export const RECOMMENDATION_KINDS = [
  "missing-prerequisite",
  "weak-concept",
  "failed-assessment",
  "due-for-review",
  "grade-requirement",
  "nearly-mastered",
  "recently-unlocked",
] as const;
export type RecommendationKind = (typeof RECOMMENDATION_KINDS)[number];

export const RECOMMENDATION_STATUSES = ["active", "dismissed", "completed"] as const;
export type RecommendationStatus = (typeof RECOMMENDATION_STATUSES)[number];

export type ConfidenceLabel = "low" | "medium" | "high";

export interface MasteryRuleConfig {
  lessonWeight: number;
  exerciseWeight: number;
  assessmentWeight: number;
  gentleDifficultyMultiplier: number;
  balancedDifficultyMultiplier: number;
  challengingDifficultyMultiplier: number;
  attemptPenalty: number;
  hintPenalty: number;
  minimumHintMultiplier: number;
  recencyHalfLifeDays: number;
  reviewIntervalDays: number;
  developingReviewIntervalDays: number;
  minimumEvidenceForMastery: number;
  minimumEvidenceTypesForMastery: number;
  minimumDifficultyBandsForMastery: number;
  masteryConfidenceThreshold: number;
  confidenceEvidenceWeight: number;
  confidenceTypeWeight: number;
  confidenceDifficultyWeight: number;
  confidenceConsistencyWeight: number;
}

export const DEFAULT_MASTERY_RULES: MasteryRuleConfig = {
  lessonWeight: 0.18,
  exerciseWeight: 0.52,
  assessmentWeight: 0.3,
  gentleDifficultyMultiplier: 0.85,
  balancedDifficultyMultiplier: 1,
  challengingDifficultyMultiplier: 1.15,
  attemptPenalty: 0.1,
  hintPenalty: 0.05,
  minimumHintMultiplier: 0.7,
  recencyHalfLifeDays: 45,
  reviewIntervalDays: 30,
  developingReviewIntervalDays: 7,
  minimumEvidenceForMastery: 3,
  minimumEvidenceTypesForMastery: 2,
  minimumDifficultyBandsForMastery: 2,
  masteryConfidenceThreshold: 0.65,
  confidenceEvidenceWeight: 0.35,
  confidenceTypeWeight: 0.3,
  confidenceDifficultyWeight: 0.2,
  confidenceConsistencyWeight: 0.15,
};

export interface RecommendationRuleConfig {
  weakScoreThreshold: number;
  nearlyMasteredGap: number;
  recentlyUnlockedDays: number;
  reviewPriority: number;
  prerequisitePriority: number;
  failedAssessmentPriority: number;
  gradeRequirementPriority: number;
  weakConceptPriority: number;
  nearlyMasteredPriority: number;
  recentlyUnlockedPriority: number;
  maximumActiveRecommendations: number;
}

export const DEFAULT_RECOMMENDATION_RULES: RecommendationRuleConfig = {
  weakScoreThreshold: 0.55,
  nearlyMasteredGap: 0.1,
  recentlyUnlockedDays: 14,
  reviewPriority: 100,
  prerequisitePriority: 95,
  failedAssessmentPriority: 90,
  gradeRequirementPriority: 80,
  weakConceptPriority: 70,
  nearlyMasteredPriority: 60,
  recentlyUnlockedPriority: 50,
  maximumActiveRecommendations: 20,
};

export interface MasteryEventRecord {
  id: string;
  profileId: string;
  conceptId: string;
  eventType: MasteryEventType;
  sourceId: string;
  score: number;
  difficulty: MasteryDifficulty;
  attempts: number;
  hintsUsed: number;
  partialCredit: boolean;
  metadata: Record<string, unknown>;
  occurredAt: string;
  createdAt: string;
}

export interface MasteryEvidenceInput {
  id: string;
  profileId: string;
  conceptId: string;
  eventType: MasteryEventType;
  sourceId: string;
  score: number;
  difficulty?: MasteryDifficulty | ConceptDifficulty;
  attempts?: number;
  hintsUsed?: number;
  partialCredit?: boolean;
  metadata?: Record<string, unknown>;
  occurredAt?: string;
}

export interface MasteryScoreBreakdown {
  weightedScore: number;
  totalWeight: number;
  rawScore: number;
  recencyFactor: number;
  consistencyFactor: number;
  prerequisiteFactor: number;
  evidenceCount: number;
  evidenceTypeCount: number;
  difficultyBandCount: number;
  eventWeights: readonly number[];
  weakPrerequisiteIds: readonly string[];
}

export interface MasteryComputation {
  score: number;
  confidence: number;
  confidenceLabel: ConfidenceLabel;
  state: MasteryState;
  evidenceCount: number;
  evidenceTypeCount: number;
  difficultyBandCount: number;
  lastPracticedAt: string | null;
  nextReviewAt: string | null;
  breakdown: MasteryScoreBreakdown;
  evidenceSummary: readonly string[];
}

export interface UserConceptMasteryRecord extends MasteryComputation {
  profileId: string;
  conceptId: string;
  currentSnapshotId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MasterySnapshotRecord extends MasteryComputation {
  id: string;
  profileId: string;
  conceptId: string;
  createdAt: string;
  reason: string;
}

export interface MasteryConceptRecord {
  id: string;
  name: string;
  slug: string;
  subjectId: string;
  subjectName: string;
  subjectSlug: string;
  domainName: string | null;
  gradeMinId: string | null;
  gradeMaxId: string | null;
  difficulty: ConceptDifficulty;
  masteryThreshold: number;
}

export interface MasteryConceptView extends MasteryConceptRecord {
  mastery: UserConceptMasteryRecord;
}

export interface MasteryPrerequisiteLink {
  conceptId: string;
  prerequisiteConceptId: string;
  prerequisiteName: string;
}

export interface MasterySubjectSummary {
  subjectId: string;
  subjectName: string;
  subjectSlug: string;
  conceptCount: number;
  assessedCount: number;
  masteredCount: number;
  averageScore: number;
  averageConfidence: number;
  reviewCount: number;
}

export interface MasteryGradeSummary {
  gradeId: string;
  gradeName: string;
  conceptCount: number;
  assessedCount: number;
  masteredCount: number;
  averageScore: number;
  requirementCount: number;
  requirementMasteredCount: number;
}

export interface MasteryDashboardData {
  concepts: readonly MasteryConceptView[];
  subjects: readonly MasterySubjectSummary[];
  grades: readonly MasteryGradeSummary[];
  totalConcepts: number;
  assessedConcepts: number;
  masteredConcepts: number;
  reviewConcepts: number;
  averageScore: number;
  averageConfidence: number;
}

export interface MasteryDetail {
  concept: MasteryConceptRecord;
  mastery: UserConceptMasteryRecord;
  events: readonly MasteryEventRecord[];
  snapshots: readonly MasterySnapshotRecord[];
  prerequisites: readonly MasteryConceptView[];
  unlocks: readonly MasteryConceptView[];
}

export interface RecommendationRecord {
  id: string;
  profileId: string;
  conceptId: string | null;
  kind: RecommendationKind;
  sourceKey: string;
  title: string;
  reason: string;
  priority: number;
  status: RecommendationStatus;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  expiresAt: string | null;
}

export interface RecommendationCandidate {
  conceptId: string | null;
  kind: RecommendationKind;
  sourceKey: string;
  title: string;
  reason: string;
  priority: number;
  metadata?: Record<string, unknown>;
  expiresAt?: string | null;
}

export type RecommendationConceptContext = MasteryConceptRecord;

export interface RecommendationMasteryContext {
  conceptId: string;
  state: MasteryState;
  score: number;
  confidence: number;
  confidenceLabel: ConfidenceLabel;
  evidenceCount: number;
  lastPracticedAt: string | null;
  nextReviewAt: string | null;
}

export interface RecommendationContext {
  concepts: readonly RecommendationConceptContext[];
  mastery: readonly RecommendationMasteryContext[];
  prerequisiteLinks: readonly MasteryPrerequisiteLink[];
  failedAssessmentConceptIds?: readonly string[];
  gradeRequiredConceptIds?: readonly string[];
  roadmapRequiredConceptIds?: readonly string[];
  now?: string;
}

export interface RecommendationDismissalRecord {
  id: string;
  recommendationId: string;
  profileId: string;
  dismissedAt: string;
  reason: string | null;
}
