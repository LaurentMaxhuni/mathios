import type {
  ActivityEventInput,
  ActivityEventRecord,
  AnalyticsDateRange,
  AnalyticsSnapshotRecord,
  ContentMetricRecord,
  LearnerAnalyticsSource,
  LearnerMetricRecord,
  LearningSessionInput,
  LearningSessionRecord,
} from "@/domain/analytics/types";

export interface AnalyticsRepository {
  getLearnerSource(
    profileId: string,
    range: AnalyticsDateRange,
  ): Promise<LearnerAnalyticsSource | null>;
  getTeacherSources(range: AnalyticsDateRange): Promise<readonly LearnerAnalyticsSource[]>;
  recordActivityEvent(input: ActivityEventInput): Promise<ActivityEventRecord>;
  startLearningSession(input: LearningSessionInput): Promise<LearningSessionRecord>;
  getLearningSession(profileId: string, sessionId: string): Promise<LearningSessionRecord | null>;
  completeLearningSession(
    profileId: string,
    sessionId: string,
    input: { endedAt?: string; durationSeconds?: number; status?: "completed" | "abandoned" },
  ): Promise<LearningSessionRecord>;
  upsertLearnerMetrics(metrics: readonly LearnerMetricRecord[]): Promise<void>;
  upsertContentMetrics(metrics: readonly ContentMetricRecord[]): Promise<void>;
  upsertSnapshot(input: {
    id: string;
    profileId: string;
    snapshotType: AnalyticsSnapshotRecord["snapshotType"];
    snapshotDate: string;
    metrics: Record<string, unknown>;
  }): Promise<AnalyticsSnapshotRecord>;
}
