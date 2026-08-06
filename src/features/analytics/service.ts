import { randomUUID } from "node:crypto";
import { NotFoundError } from "@/domain/errors/application-error";
import {
  buildContentMetrics,
  buildLearnerAnalytics,
  buildLearnerDashboard,
  buildLearnerMetricRecords,
  buildTeacherAnalytics,
  normalizeAnalyticsRange,
} from "@/domain/analytics/rules";
import type {
  ActivityEventInput,
  ActivityEventRecord,
  AnalyticsDateRange,
  LearnerAnalyticsData,
  LearnerDashboardData,
  LearnerAnalyticsSource,
  TeacherAnalyticsData,
  LearningSessionInput,
  LearningSessionRecord,
} from "@/domain/analytics/types";
import type { AnalyticsRepository } from "@/domain/ports/analytics-repository";
import { getAnalyticsRepository } from "@/infrastructure/database/repositories/analytics-repository";
import { logger } from "@/lib/logger";

const analyticsLogger = logger.child({ feature: "analytics" });

function snapshotMetrics(data: LearnerAnalyticsData): Record<string, unknown> {
  return {
    summary: data.summary,
    daily: data.daily,
    subjectMastery: data.subjectMastery,
    gradeMastery: data.gradeMastery,
    weakConcepts: data.weakConcepts,
    mostImprovedConcepts: data.mostImprovedConcepts,
    recentlyMasteredConcepts: data.recentlyMasteredConcepts,
    assessmentScores: data.assessmentScores,
    mistakeCategories: data.mistakeCategories,
  };
}

async function persistLearnerAnalytics(
  profileId: string,
  data: LearnerAnalyticsData,
  source: LearnerAnalyticsSource,
  repository: AnalyticsRepository,
): Promise<void> {
  try {
    await repository.upsertLearnerMetrics(buildLearnerMetricRecords(source, data));
    await repository.upsertSnapshot({
      id: `analytics-snapshot-${source.profile.id}-${data.range.to}`,
      profileId: source.profile.id,
      snapshotType: "range",
      snapshotDate: data.range.to,
      metrics: snapshotMetrics(data),
    });
  } catch (error) {
    analyticsLogger.warn("Could not persist derived analytics metrics.", {
      profileId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

export async function getLearnerAnalytics(
  profileId: string,
  inputRange?: Partial<AnalyticsDateRange>,
  repository: AnalyticsRepository = getAnalyticsRepository(),
  now: string | Date = new Date(),
): Promise<LearnerAnalyticsData> {
  const range = normalizeAnalyticsRange(inputRange, now);
  const source = await repository.getLearnerSource(profileId, range);
  if (!source) throw new NotFoundError("Learner profile", profileId);
  const data = buildLearnerAnalytics(source, range, now);
  await persistLearnerAnalytics(profileId, data, source, repository);
  return data;
}

export async function getLearnerDashboard(
  profileId: string,
  repository: AnalyticsRepository = getAnalyticsRepository(),
  now: string | Date = new Date(),
): Promise<LearnerDashboardData> {
  const range = normalizeAnalyticsRange(undefined, now);
  const source = await repository.getLearnerSource(profileId, range);
  if (!source) throw new NotFoundError("Learner profile", profileId);
  const dashboard = buildLearnerDashboard(source, now);
  await persistLearnerAnalytics(profileId, dashboard.analytics, source, repository);
  return dashboard;
}

export async function getTeacherAnalytics(
  inputRange?: Partial<AnalyticsDateRange>,
  repository: AnalyticsRepository = getAnalyticsRepository(),
  now: string | Date = new Date(),
): Promise<TeacherAnalyticsData> {
  const range = normalizeAnalyticsRange(inputRange, now);
  const sources = await repository.getTeacherSources(range);
  const data = buildTeacherAnalytics(sources, range, now);
  try {
    await repository.upsertContentMetrics(buildContentMetrics(sources, range));
    await Promise.all(
      sources.map(async (source) => {
        const learnerAnalytics = buildLearnerAnalytics(source, range, now);
        await repository.upsertLearnerMetrics(buildLearnerMetricRecords(source, learnerAnalytics));
      }),
    );
  } catch (error) {
    analyticsLogger.warn("Could not persist teacher analytics metrics.", {
      error: error instanceof Error ? error.message : String(error),
    });
  }
  return data;
}

export async function recordActivityEvent(
  input: ActivityEventInput,
  repository: AnalyticsRepository = getAnalyticsRepository(),
): Promise<ActivityEventRecord> {
  return repository.recordActivityEvent(input);
}

export async function trackActivityEvent(
  input: ActivityEventInput,
  repository: AnalyticsRepository = getAnalyticsRepository(),
): Promise<ActivityEventRecord | null> {
  try {
    return await recordActivityEvent(input, repository);
  } catch (error) {
    analyticsLogger.warn("Could not record activity event.", {
      profileId: input.profileId,
      eventType: input.eventType,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

export async function startLearningSession(
  input: Omit<LearningSessionInput, "id"> & { id?: string },
  repository: AnalyticsRepository = getAnalyticsRepository(),
): Promise<LearningSessionRecord> {
  return repository.startLearningSession({ ...input, id: input.id ?? randomUUID() });
}

export async function completeLearningSession(
  profileId: string,
  sessionId: string,
  input: { endedAt?: string; durationSeconds?: number; status?: "completed" | "abandoned" },
  repository: AnalyticsRepository = getAnalyticsRepository(),
): Promise<LearningSessionRecord> {
  return repository.completeLearningSession(profileId, sessionId, input);
}
