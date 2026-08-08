import { randomUUID } from "node:crypto";
import { NotFoundError } from "@/domain/errors/application-error";
import {
  ACTIVITY_EVENT_TYPES,
  type ActivityEventInput,
  type ActivityEventRecord,
  type AnalyticsDateRange,
  type AnalyticsSnapshotRecord,
  type AnalyticsAssessmentAttempt,
  type AnalyticsBookmark,
  type AnalyticsLessonProgress,
  type AnalyticsMastery,
  type AnalyticsMasterySnapshot,
  type AnalyticsNote,
  type AnalyticsPlannerSession,
  type AnalyticsQuestionAttempt,
  type AnalyticsRecommendation,
  type AnalyticsRoadmap,
  type AnalyticsSubject,
  type AnalyticsSubjectLessonTotal,
  type AnalyticsUpcomingAssessment,
  type AnalyticsGrade,
  type LearnerAnalyticsSource,
  type LearnerMetricRecord,
  type LearningSessionInput,
  type LearningSessionRecord,
  type ActivityEventType,
  type LearningSessionStatus,
  type LearningSessionType,
  type ContentMetricRecord,
} from "@/domain/analytics/types";
import type { AnalyticsRepository } from "@/domain/ports/analytics-repository";
import { getDatabase, type DatabaseHandle } from "@/infrastructure/database/client";

type DbDate = Date | string | null | undefined;
type DbBoolean = boolean | number | string | null | undefined;
type DbRow = Record<string, unknown>;

const DAY_MS = 86_400_000;

function asNumber(value: unknown, fallback = 0): number {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function asString(value: unknown, fallback = ""): string {
  return value === null || value === undefined ? fallback : String(value);
}

function asNullableString(value: unknown): string | null {
  return value === null || value === undefined || value === "" ? null : String(value);
}

function asBoolean(value: DbBoolean): boolean {
  return value === true || value === 1 || value === "1" || value === "true";
}

function asNullableBoolean(value: DbBoolean): boolean | null {
  return value === null || value === undefined ? null : asBoolean(value);
}

function asIso(value: DbDate): string {
  if (value instanceof Date) return value.toISOString();
  return value ?? new Date(0).toISOString();
}

function asNullableIso(value: DbDate): string | null {
  if (value === null || value === undefined) return null;
  return asIso(value);
}

function parseJson<T>(value: unknown, fallback: T): T {
  if (typeof value !== "string" || !value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  const parsed = parseJson<unknown>(value, {});
  return parsed && typeof parsed === "object" && !Array.isArray(parsed)
    ? (parsed as Record<string, unknown>)
    : {};
}

function eventType(value: unknown): ActivityEventType {
  return ACTIVITY_EVENT_TYPES.includes(value as ActivityEventType)
    ? (value as ActivityEventType)
    : "lesson-view";
}

function sessionType(value: unknown): LearningSessionType {
  const types: readonly LearningSessionType[] = [
    "study",
    "lesson",
    "exercise",
    "assessment",
    "simulation",
    "laboratory",
    "planner",
  ];
  return types.includes(value as LearningSessionType) ? (value as LearningSessionType) : "study";
}

function sessionStatus(value: unknown): LearningSessionStatus {
  return value === "completed" || value === "abandoned" ? value : "active";
}

function dateAtStart(date: string): number {
  const timestamp = Date.parse(`${date}T00:00:00.000Z`);
  return Number.isFinite(timestamp) ? timestamp : Date.now();
}

function exclusiveDate(date: string): string {
  return new Date(dateAtStart(date) + DAY_MS).toISOString();
}

function historicDate(date: string): string {
  return new Date(dateAtStart(date) - 365 * DAY_MS).toISOString();
}

function placeholders(count: number, offset = 0, token = "?"): string {
  return Array.from({ length: count }, (_, index) =>
    token === "?" ? "?" : `$${index + offset + 1}`,
  ).join(", ");
}

function mapActivityEvent(row: DbRow): ActivityEventRecord {
  return {
    id: asString(row.id),
    profileId: asString(row.profile_id),
    eventType: eventType(row.event_type),
    resourceType: asNullableString(row.resource_type),
    resourceId: asNullableString(row.resource_id),
    subjectId: asNullableString(row.subject_id),
    gradeId: asNullableString(row.grade_id),
    conceptId: asNullableString(row.concept_id),
    learningSessionId: asNullableString(row.learning_session_id),
    occurredAt: asIso(row.occurred_at as DbDate),
    durationSeconds: asNumber(row.duration_seconds),
    score: row.score === null || row.score === undefined ? null : asNumber(row.score),
    isCorrect: asNullableBoolean(row.is_correct as DbBoolean),
    hintsUsed: asNumber(row.hints_used),
    attemptNumber: Math.max(1, asNumber(row.attempt_number, 1)),
    responseTimeMs:
      row.response_time_ms === null || row.response_time_ms === undefined
        ? null
        : asNumber(row.response_time_ms),
    dedupeKey: asNullableString(row.dedupe_key),
    metadata: asRecord(row.metadata_json),
    createdAt: asIso(row.created_at as DbDate),
  };
}

function mapLearningSession(row: DbRow): LearningSessionRecord {
  return {
    id: asString(row.id),
    profileId: asString(row.profile_id),
    sessionType: sessionType(row.session_type),
    sourceType: asNullableString(row.source_type),
    sourceId: asNullableString(row.source_id),
    status: sessionStatus(row.status),
    startedAt: asIso(row.started_at as DbDate),
    endedAt: asNullableIso(row.ended_at as DbDate),
    durationSeconds: asNumber(row.duration_seconds),
    metadata: asRecord(row.metadata_json),
    createdAt: asIso(row.created_at as DbDate),
    updatedAt: asIso(row.updated_at as DbDate),
  };
}

function mapSubject(row: DbRow): AnalyticsSubject {
  return {
    id: asString(row.id),
    name: asString(row.name),
    slug: asString(row.slug),
    accent: asString(row.accent, "accent"),
  };
}

function mapGrade(row: DbRow): AnalyticsGrade {
  return {
    id: asString(row.id),
    name: asString(row.name),
    sortOrder: asNumber(row.sort_order),
  };
}

function mapLessonProgress(row: DbRow): AnalyticsLessonProgress {
  const completionPercentage = Math.max(0, Math.min(100, asNumber(row.completion_percentage)));
  return {
    lessonId: asString(row.lesson_id),
    title: asString(row.lesson_title),
    subjectId: asString(row.subject_id),
    subjectName: asString(row.subject_name),
    courseId: asString(row.course_id),
    courseTitle: asString(row.course_title),
    gradeId: asNullableString(row.grade_id),
    completionPercentage,
    completed: Boolean(row.completed_at) || completionPercentage >= 100,
    timeSpentSeconds: asNumber(row.time_spent_seconds),
    startedAt: asNullableIso(row.started_at as DbDate),
    completedAt: asNullableIso(row.completed_at as DbDate),
    lastViewedAt: asNullableIso(row.last_viewed_at as DbDate),
    updatedAt: asIso(row.updated_at as DbDate),
  };
}

function mapMastery(row: DbRow): AnalyticsMastery {
  return {
    conceptId: asString(row.concept_id),
    conceptName: asString(row.concept_name),
    subjectId: asString(row.subject_id),
    subjectName: asString(row.subject_name),
    gradeMinId: asNullableString(row.grade_min_id),
    gradeMaxId: asNullableString(row.grade_max_id),
    state: asString(row.state, "not-started"),
    score: Math.max(0, Math.min(1, asNumber(row.score))),
    confidence: Math.max(0, Math.min(1, asNumber(row.confidence))),
    evidenceCount: asNumber(row.evidence_count),
    lastPracticedAt: asNullableIso(row.last_practiced_at as DbDate),
    updatedAt: asIso(row.updated_at as DbDate),
  };
}

function mapSnapshot(row: DbRow): AnalyticsMasterySnapshot {
  return {
    conceptId: asString(row.concept_id),
    score: Math.max(0, Math.min(1, asNumber(row.score))),
    state: asString(row.state, "not-started"),
    createdAt: asIso(row.created_at as DbDate),
  };
}

function mapPlannerSession(row: DbRow): AnalyticsPlannerSession {
  return {
    id: asString(row.id),
    scheduledDate: asString(row.scheduled_date),
    status: asString(row.status),
    durationMinutes: asNumber(row.duration_minutes),
    completedAt: asNullableIso(row.completed_at as DbDate),
    itemType: asString(row.item_type),
    sourceId: asNullableString(row.source_id),
    title: asString(row.title),
    subjectId: asNullableString(row.subject_id),
  };
}

function mapRoadmap(row: DbRow): AnalyticsRoadmap {
  return {
    id: asString(row.roadmap_id),
    title: asString(row.title),
    status: asString(row.status),
    completedNodes: asNumber(row.completed_nodes),
    totalNodes: asNumber(row.total_nodes),
    updatedAt: asIso(row.updated_at as DbDate),
  };
}

function mapRecommendation(row: DbRow): AnalyticsRecommendation {
  return {
    id: asString(row.id),
    title: asString(row.title),
    reason: asString(row.reason),
    conceptId: asNullableString(row.concept_id),
  };
}

function mapAssessmentAttempt(row: DbRow): AnalyticsAssessmentAttempt {
  return {
    id: asString(row.id),
    assessmentId: asString(row.assessment_id),
    title: asString(row.title),
    subjectId: asNullableString(row.subject_id),
    subjectName: asNullableString(row.subject_name),
    gradeId: asNullableString(row.grade_id),
    percentage: Math.max(0, Math.min(1, asNumber(row.percentage))),
    passed: asNullableBoolean(row.passed as DbBoolean),
    startedAt: asIso(row.started_at as DbDate),
    submittedAt: asNullableIso(row.submitted_at as DbDate),
  };
}

function mapNote(row: DbRow): AnalyticsNote {
  return {
    id: asString(row.id),
    title: asString(row.title, "Untitled note"),
    createdAt: asIso(row.created_at as DbDate),
    updatedAt: asIso(row.updated_at as DbDate),
  };
}

function mapBookmark(row: DbRow): AnalyticsBookmark {
  return {
    id: asString(row.id),
    resourceType: asString(row.resource_type),
    resourceId: asString(row.resource_id),
    title: asString(row.title),
    createdAt: asIso(row.created_at as DbDate),
  };
}

function mapSnapshotRecord(row: DbRow): AnalyticsSnapshotRecord {
  return {
    id: asString(row.id),
    profileId: asString(row.profile_id),
    snapshotType:
      row.snapshot_type === "weekly" || row.snapshot_type === "range" ? row.snapshot_type : "daily",
    snapshotDate: asString(row.snapshot_date),
    metrics: asRecord(row.metrics_json),
    createdAt: asIso(row.created_at as DbDate),
  };
}

export class SqlAnalyticsRepository implements AnalyticsRepository {
  constructor(private readonly database: DatabaseHandle = getDatabase()) {}

  private async rows<T extends DbRow>(
    sqliteQuery: string,
    postgresQuery: string,
    values: readonly unknown[] = [],
  ): Promise<T[]> {
    if (this.database.provider === "sqlite") {
      return this.database.raw.prepare(sqliteQuery).all(...values) as T[];
    }
    return (await this.database.raw.unsafe(postgresQuery, values as never[])) as T[];
  }

  private async one<T extends DbRow>(
    sqliteQuery: string,
    postgresQuery: string,
    values: readonly unknown[] = [],
  ): Promise<T | undefined> {
    return (await this.rows<T>(sqliteQuery, postgresQuery, values))[0];
  }

  private async execute(
    sqliteQuery: string,
    postgresQuery: string,
    values: readonly unknown[] = [],
  ): Promise<void> {
    if (this.database.provider === "sqlite") this.database.raw.prepare(sqliteQuery).run(...values);
    else await this.database.raw.unsafe(postgresQuery, values as never[]);
  }

  async getLearnerSource(
    profileId: string,
    range: AnalyticsDateRange,
  ): Promise<LearnerAnalyticsSource | null> {
    const profile = await this.one<DbRow>(
      `SELECT p.id, p.display_name, p.current_grade, p.current_curriculum, c.name AS current_curriculum_name, o.weekly_study_time_minutes
       FROM profiles p
       LEFT JOIN curricula c ON c.id = p.current_curriculum
       LEFT JOIN onboarding_responses o ON o.profile_id = p.id
       WHERE p.id = ?`,
      `SELECT p.id, p.display_name, p.current_grade, p.current_curriculum, c.name AS current_curriculum_name, o.weekly_study_time_minutes
       FROM profiles p
       LEFT JOIN curricula c ON c.id = p.current_curriculum
       LEFT JOIN onboarding_responses o ON o.profile_id = p.id
       WHERE p.id = $1`,
      [profileId],
    );
    if (!profile) return null;

    const from = historicDate(range.from);
    const to = exclusiveDate(range.to);
    const activeSqlite = "is_archived = 0";
    const activePostgres = "is_archived = FALSE";

    const [
      subjectRows,
      gradeRows,
      eventRows,
      sessionRows,
      progressRows,
      questionRows,
      assessmentRows,
      masteryRows,
      snapshotRows,
      plannerRows,
      roadmapRows,
      recommendationRows,
      upcomingRows,
      noteRows,
      bookmarkRows,
      totalRows,
    ] = await Promise.all([
      this.rows<DbRow>(
        `SELECT id, name, slug, accent FROM subjects WHERE ${activeSqlite} ORDER BY sort_order, name`,
        `SELECT id, name, slug, accent FROM subjects WHERE ${activePostgres} ORDER BY sort_order, name`,
      ),
      this.rows<DbRow>(
        `SELECT id, name, sort_order FROM grades WHERE ${activeSqlite} ORDER BY sort_order, id`,
        `SELECT id, name, sort_order FROM grades WHERE ${activePostgres} ORDER BY sort_order, id`,
      ),
      this.rows<DbRow>(
        `SELECT id, profile_id, event_type, resource_type, resource_id, subject_id, grade_id, concept_id, learning_session_id, occurred_at, duration_seconds, score, is_correct, hints_used, attempt_number, response_time_ms, dedupe_key, metadata_json, created_at
         FROM activity_events WHERE profile_id = ? AND occurred_at >= ? AND occurred_at < ? ORDER BY occurred_at, id`,
        `SELECT id, profile_id, event_type, resource_type, resource_id, subject_id, grade_id, concept_id, learning_session_id, occurred_at, duration_seconds, score, is_correct, hints_used, attempt_number, response_time_ms, dedupe_key, metadata_json, created_at
         FROM activity_events WHERE profile_id = $1 AND occurred_at >= $2 AND occurred_at < $3 ORDER BY occurred_at, id`,
        [profileId, from, to],
      ),
      this.rows<DbRow>(
        `SELECT id, profile_id, session_type, source_type, source_id, status, started_at, ended_at, duration_seconds, metadata_json, created_at, updated_at
         FROM learning_sessions WHERE profile_id = ? AND started_at >= ? AND started_at < ? ORDER BY started_at, id`,
        `SELECT id, profile_id, session_type, source_type, source_id, status, started_at, ended_at, duration_seconds, metadata_json, created_at, updated_at
         FROM learning_sessions WHERE profile_id = $1 AND started_at >= $2 AND started_at < $3 ORDER BY started_at, id`,
        [profileId, from, to],
      ),
      this.rows<DbRow>(
        `SELECT ulp.lesson_id, l.title AS lesson_title, s.id AS subject_id, s.name AS subject_name, c.id AS course_id, c.title AS course_title,
                COALESCE((SELECT cg.grade_id FROM course_grades cg WHERE cg.course_id = c.id ORDER BY cg.sort_order, cg.grade_id LIMIT 1), c.grade_min_id) AS grade_id,
                ulp.completion_percentage, ulp.completed_at, ulp.started_at, ulp.time_spent_seconds, ulp.last_viewed_at, ulp.updated_at
         FROM user_lesson_progress ulp
         JOIN lessons l ON l.id = ulp.lesson_id
         JOIN modules m ON m.id = l.module_id
         JOIN courses c ON c.id = m.course_id
         JOIN subjects s ON s.id = c.subject_id
         WHERE ulp.profile_id = ? ORDER BY COALESCE(ulp.last_viewed_at, ulp.updated_at) DESC, ulp.lesson_id`,
        `SELECT ulp.lesson_id, l.title AS lesson_title, s.id AS subject_id, s.name AS subject_name, c.id AS course_id, c.title AS course_title,
                COALESCE((SELECT cg.grade_id FROM course_grades cg WHERE cg.course_id = c.id ORDER BY cg.sort_order, cg.grade_id LIMIT 1), c.grade_min_id) AS grade_id,
                ulp.completion_percentage, ulp.completed_at, ulp.started_at, ulp.time_spent_seconds, ulp.last_viewed_at, ulp.updated_at
         FROM user_lesson_progress ulp
         JOIN lessons l ON l.id = ulp.lesson_id
         JOIN modules m ON m.id = l.module_id
         JOIN courses c ON c.id = m.course_id
         JOIN subjects s ON s.id = c.subject_id
         WHERE ulp.profile_id = $1 ORDER BY COALESCE(ulp.last_viewed_at, ulp.updated_at) DESC, ulp.lesson_id`,
        [profileId],
      ),
      this.rows<DbRow>(
        `SELECT qa.id, qa.question_id, q.title AS question_title, q.subject_id, s.name AS subject_name, q.grade_min_id, q.grade_max_id,
                qa.score, qa.max_score, qa.validation_result, qa.answered_at, aa.assessment_id, a.title AS assessment_title
         FROM question_attempts qa
         JOIN questions q ON q.id = qa.question_id
         JOIN subjects s ON s.id = q.subject_id
         LEFT JOIN exercise_attempts ea ON ea.id = qa.exercise_attempt_id
         LEFT JOIN assessment_attempts aa ON aa.id = qa.assessment_attempt_id
         LEFT JOIN assessments a ON a.id = aa.assessment_id
         WHERE COALESCE(ea.profile_id, aa.profile_id) = ? AND qa.answered_at >= ? AND qa.answered_at < ?
         ORDER BY qa.answered_at, qa.id`,
        `SELECT qa.id, qa.question_id, q.title AS question_title, q.subject_id, s.name AS subject_name, q.grade_min_id, q.grade_max_id,
                qa.score, qa.max_score, qa.validation_result, qa.answered_at, aa.assessment_id, a.title AS assessment_title
         FROM question_attempts qa
         JOIN questions q ON q.id = qa.question_id
         JOIN subjects s ON s.id = q.subject_id
         LEFT JOIN exercise_attempts ea ON ea.id = qa.exercise_attempt_id
         LEFT JOIN assessment_attempts aa ON aa.id = qa.assessment_attempt_id
         LEFT JOIN assessments a ON a.id = aa.assessment_id
         WHERE COALESCE(ea.profile_id, aa.profile_id) = $1 AND qa.answered_at >= $2 AND qa.answered_at < $3
         ORDER BY qa.answered_at, qa.id`,
        [profileId, from, to],
      ),
      this.rows<DbRow>(
        `SELECT aa.id, aa.assessment_id, a.title, a.subject_id, s.name AS subject_name, a.grade_id, aa.percentage, aa.passed, aa.started_at, aa.submitted_at
         FROM assessment_attempts aa
         JOIN assessments a ON a.id = aa.assessment_id
         LEFT JOIN subjects s ON s.id = a.subject_id
         WHERE aa.profile_id = ? AND aa.status IN ('completed', 'expired') AND COALESCE(aa.submitted_at, aa.started_at) >= ? AND COALESCE(aa.submitted_at, aa.started_at) < ?
         ORDER BY COALESCE(aa.submitted_at, aa.started_at) DESC, aa.id`,
        `SELECT aa.id, aa.assessment_id, a.title, a.subject_id, s.name AS subject_name, a.grade_id, aa.percentage, aa.passed, aa.started_at, aa.submitted_at
         FROM assessment_attempts aa
         JOIN assessments a ON a.id = aa.assessment_id
         LEFT JOIN subjects s ON s.id = a.subject_id
         WHERE aa.profile_id = $1 AND aa.status IN ('completed', 'expired') AND COALESCE(aa.submitted_at, aa.started_at) >= $2 AND COALESCE(aa.submitted_at, aa.started_at) < $3
         ORDER BY COALESCE(aa.submitted_at, aa.started_at) DESC, aa.id`,
        [profileId, from, to],
      ),
      this.rows<DbRow>(
        `SELECT c.id AS concept_id, c.name AS concept_name, c.subject_id, s.name AS subject_name, c.grade_min_id, c.grade_max_id,
                COALESCE(ucm.state, 'not-started') AS state, COALESCE(ucm.score, 0) AS score, COALESCE(ucm.confidence, 0) AS confidence,
                COALESCE(ucm.evidence_count, 0) AS evidence_count, ucm.last_practiced_at, COALESCE(ucm.updated_at, c.updated_at) AS updated_at
         FROM concepts c
         JOIN subjects s ON s.id = c.subject_id
         LEFT JOIN user_concept_mastery ucm ON ucm.concept_id = c.id AND ucm.profile_id = ?
         WHERE c.${activeSqlite.replace("is_archived", "is_archived")} ORDER BY s.name, c.name`,
        `SELECT c.id AS concept_id, c.name AS concept_name, c.subject_id, s.name AS subject_name, c.grade_min_id, c.grade_max_id,
                COALESCE(ucm.state, 'not-started') AS state, COALESCE(ucm.score, 0) AS score, COALESCE(ucm.confidence, 0) AS confidence,
                COALESCE(ucm.evidence_count, 0) AS evidence_count, ucm.last_practiced_at, COALESCE(ucm.updated_at, c.updated_at) AS updated_at
         FROM concepts c
         JOIN subjects s ON s.id = c.subject_id
         LEFT JOIN user_concept_mastery ucm ON ucm.concept_id = c.id AND ucm.profile_id = $1
         WHERE c.${activePostgres.replace("is_archived", "is_archived")} ORDER BY s.name, c.name`,
        [profileId],
      ),
      this.rows<DbRow>(
        `SELECT ms.concept_id, ms.score, ms.state, ms.created_at FROM mastery_snapshots ms WHERE ms.profile_id = ? AND ms.created_at >= ? AND ms.created_at < ? ORDER BY ms.created_at, ms.id`,
        `SELECT ms.concept_id, ms.score, ms.state, ms.created_at FROM mastery_snapshots ms WHERE ms.profile_id = $1 AND ms.created_at >= $2 AND ms.created_at < $3 ORDER BY ms.created_at, ms.id`,
        [profileId, from, to],
      ),
      this.rows<DbRow>(
        `SELECT ss.id, ss.scheduled_date, ss.status, ss.duration_minutes, ss.completed_at, i.item_type, i.source_id, i.title, i.subject_id
         FROM study_sessions ss JOIN study_plan_items i ON i.id = ss.plan_item_id
         WHERE ss.profile_id = ? AND ((ss.scheduled_date >= ? AND ss.scheduled_date < ?) OR (ss.completed_at >= ? AND ss.completed_at < ?))
         ORDER BY COALESCE(ss.completed_at, ss.scheduled_date) DESC, ss.id`,
        `SELECT ss.id, ss.scheduled_date, ss.status, ss.duration_minutes, ss.completed_at, i.item_type, i.source_id, i.title, i.subject_id
         FROM study_sessions ss JOIN study_plan_items i ON i.id = ss.plan_item_id
         WHERE ss.profile_id = $1 AND ((ss.scheduled_date >= $2 AND ss.scheduled_date < $3) OR (ss.completed_at >= $4 AND ss.completed_at < $5))
         ORDER BY COALESCE(ss.completed_at, ss.scheduled_date::timestamptz) DESC, ss.id`,
        [profileId, range.from, range.to, from, to],
      ),
      this.rows<DbRow>(
        `SELECT ur.roadmap_id, r.title, ur.status, ur.updated_at,
                COALESCE(SUM(CASE WHEN urp.status = 'completed' THEN 1 ELSE 0 END), 0) AS completed_nodes,
                COUNT(urp.roadmap_node_id) AS total_nodes
         FROM user_roadmaps ur JOIN roadmaps r ON r.id = ur.roadmap_id
         LEFT JOIN user_roadmap_progress urp ON urp.user_roadmap_id = ur.id
         WHERE ur.profile_id = ? AND ur.status IN ('active', 'completed')
         GROUP BY ur.id, ur.roadmap_id, r.title, ur.status, ur.updated_at ORDER BY ur.updated_at DESC, ur.id`,
        `SELECT ur.roadmap_id, r.title, ur.status, ur.updated_at,
                COALESCE(SUM(CASE WHEN urp.status = 'completed' THEN 1 ELSE 0 END), 0) AS completed_nodes,
                COUNT(urp.roadmap_node_id) AS total_nodes
         FROM user_roadmaps ur JOIN roadmaps r ON r.id = ur.roadmap_id
         LEFT JOIN user_roadmap_progress urp ON urp.user_roadmap_id = ur.id
         WHERE ur.profile_id = $1 AND ur.status IN ('active', 'completed')
         GROUP BY ur.id, ur.roadmap_id, r.title, ur.status, ur.updated_at ORDER BY ur.updated_at DESC, ur.id`,
        [profileId],
      ),
      this.rows<DbRow>(
        `SELECT id, title, reason, concept_id FROM recommendations WHERE profile_id = ? AND status = 'active' AND (expires_at IS NULL OR expires_at >= CURRENT_TIMESTAMP) ORDER BY priority DESC, updated_at DESC, id`,
        `SELECT id, title, reason, concept_id FROM recommendations WHERE profile_id = $1 AND status = 'active' AND (expires_at IS NULL OR expires_at >= NOW()) ORDER BY priority DESC, updated_at DESC, id`,
        [profileId],
      ),
      this.rows<DbRow>(
        `SELECT a.id, a.title, s.name AS subject_name, g.name AS grade_name, a.passing_threshold FROM assessments a LEFT JOIN subjects s ON s.id = a.subject_id LEFT JOIN grades g ON g.id = a.grade_id WHERE a.status = 'published' ORDER BY a.updated_at DESC, a.id LIMIT 10`,
        `SELECT a.id, a.title, s.name AS subject_name, g.name AS grade_name, a.passing_threshold FROM assessments a LEFT JOIN subjects s ON s.id = a.subject_id LEFT JOIN grades g ON g.id = a.grade_id WHERE a.status = 'published' ORDER BY a.updated_at DESC, a.id LIMIT 10`,
      ),
      this.rows<DbRow>(
        `SELECT id, title, created_at, updated_at FROM notes WHERE profile_id = ? AND is_archived = 0 ORDER BY updated_at DESC, id LIMIT 5`,
        `SELECT id, title, created_at, updated_at FROM notes WHERE profile_id = $1 AND is_archived = FALSE ORDER BY updated_at DESC, id LIMIT 5`,
        [profileId],
      ),
      this.rows<DbRow>(
        `SELECT id, resource_type, resource_id, title, created_at FROM bookmarks WHERE profile_id = ? ORDER BY updated_at DESC, id LIMIT 5`,
        `SELECT id, resource_type, resource_id, title, created_at FROM bookmarks WHERE profile_id = $1 ORDER BY updated_at DESC, id LIMIT 5`,
        [profileId],
      ),
      this.rows<DbRow>(
        `SELECT c.subject_id, s.name AS subject_name, COUNT(l.id) AS total_lessons
         FROM courses c JOIN subjects s ON s.id = c.subject_id JOIN modules m ON m.course_id = c.id JOIN lessons l ON l.module_id = m.id
         WHERE c.status = 'published' AND l.status = 'published' GROUP BY c.subject_id, s.name ORDER BY s.name`,
        `SELECT c.subject_id, s.name AS subject_name, COUNT(l.id) AS total_lessons
         FROM courses c JOIN subjects s ON s.id = c.subject_id JOIN modules m ON m.course_id = c.id JOIN lessons l ON l.module_id = m.id
         WHERE c.status = 'published' AND l.status = 'published' GROUP BY c.subject_id, s.name ORDER BY s.name`,
      ),
    ]);

    const questionIds = [...new Set(questionRows.map((row) => asString(row.question_id)))];
    const conceptRows = questionIds.length
      ? await this.rows<DbRow>(
          `SELECT question_id, concept_id FROM question_concepts WHERE question_id IN (${placeholders(questionIds.length)}) ORDER BY question_id, sort_order, concept_id`,
          `SELECT question_id, concept_id FROM question_concepts WHERE question_id IN (${placeholders(questionIds.length, 0, "$")}) ORDER BY question_id, sort_order, concept_id`,
          questionIds,
        )
      : [];
    const conceptsByQuestion = new Map<string, string[]>();
    for (const row of conceptRows) {
      const id = asString(row.question_id);
      conceptsByQuestion.set(id, [...(conceptsByQuestion.get(id) ?? []), asString(row.concept_id)]);
    }
    const questionAttemptNumbers = new Map<string, number>();
    const questionAttempts: AnalyticsQuestionAttempt[] = questionRows.map((row) => {
      const questionId = asString(row.question_id);
      const currentNumber = (questionAttemptNumbers.get(questionId) ?? 0) + 1;
      questionAttemptNumbers.set(questionId, currentNumber);
      const score = asNumber(row.score);
      const maxScore = asNumber(row.max_score);
      const validation = asRecord(row.validation_result);
      const validationStatus = asString(validation.status);
      const isCorrect =
        validationStatus === "correct" ||
        validation.correct === true ||
        (maxScore > 0 && score >= maxScore);
      return {
        id: asString(row.id),
        profileId,
        questionId,
        questionTitle: asString(row.question_title),
        subjectId: asString(row.subject_id),
        subjectName: asString(row.subject_name),
        gradeMinId: asNullableString(row.grade_min_id),
        gradeMaxId: asNullableString(row.grade_max_id),
        conceptIds: conceptsByQuestion.get(questionId) ?? [],
        score,
        maxScore,
        scorePercentage: maxScore > 0 ? Math.max(0, Math.min(1, score / maxScore)) : 0,
        isCorrect,
        answeredAt: asIso(row.answered_at as DbDate),
        assessmentId: asNullableString(row.assessment_id),
        assessmentTitle: asNullableString(row.assessment_title),
        attemptNumber: currentNumber,
        hintsUsed: 0,
        responseTimeMs: null,
        mistakeCategory: isCorrect
          ? null
          : (asNullableString(validation.errorKey) ?? "Incorrect answer"),
      };
    });

    const progressLesson =
      progressRows
        .map(mapLessonProgress)
        .find((item) => !item.completed && item.completionPercentage < 100) ?? null;
    const currentLesson: AnalyticsLessonProgress | null =
      progressLesson ??
      (await this.one<DbRow>(
        `SELECT l.id AS lesson_id, l.title AS lesson_title, s.id AS subject_id, s.name AS subject_name, c.id AS course_id, c.title AS course_title,
                COALESCE((SELECT cg.grade_id FROM course_grades cg WHERE cg.course_id = c.id ORDER BY cg.sort_order, cg.grade_id LIMIT 1), c.grade_min_id) AS grade_id,
                0 AS completion_percentage, NULL AS completed_at, NULL AS started_at, 0 AS time_spent_seconds, NULL AS last_viewed_at, l.updated_at
         FROM lessons l JOIN modules m ON m.id = l.module_id JOIN courses c ON c.id = m.course_id JOIN subjects s ON s.id = c.subject_id
         WHERE l.status = 'published' AND c.status = 'published' ORDER BY l.updated_at DESC, l.id LIMIT 1`,
        `SELECT l.id AS lesson_id, l.title AS lesson_title, s.id AS subject_id, s.name AS subject_name, c.id AS course_id, c.title AS course_title,
                COALESCE((SELECT cg.grade_id FROM course_grades cg WHERE cg.course_id = c.id ORDER BY cg.sort_order, cg.grade_id LIMIT 1), c.grade_min_id) AS grade_id,
                0 AS completion_percentage, NULL AS completed_at, NULL AS started_at, 0 AS time_spent_seconds, NULL AS last_viewed_at, l.updated_at
         FROM lessons l JOIN modules m ON m.id = l.module_id JOIN courses c ON c.id = m.course_id JOIN subjects s ON s.id = c.subject_id
         WHERE l.status = 'published' AND c.status = 'published' ORDER BY l.updated_at DESC, l.id LIMIT 1`,
      ).then((row) => (row ? mapLessonProgress(row) : null)));

    return {
      profile: {
        id: asString(profile.id),
        displayName: asString(profile.display_name),
        currentGrade: asNullableString(profile.current_grade),
        currentCurriculum: asNullableString(profile.current_curriculum),
        currentCurriculumName: asNullableString(profile.current_curriculum_name),
        weeklyStudyTargetMinutes:
          profile.weekly_study_time_minutes === null ||
          profile.weekly_study_time_minutes === undefined
            ? null
            : asNumber(profile.weekly_study_time_minutes),
      },
      subjects: subjectRows.map(mapSubject),
      grades: gradeRows.map(mapGrade),
      events: eventRows.map(mapActivityEvent),
      learningSessions: sessionRows.map(mapLearningSession),
      lessonProgress: progressRows.map(mapLessonProgress),
      questionAttempts,
      assessmentAttempts: assessmentRows.map(mapAssessmentAttempt),
      mastery: masteryRows.map(mapMastery),
      masterySnapshots: snapshotRows.map(mapSnapshot),
      plannerSessions: plannerRows.map(mapPlannerSession),
      roadmaps: roadmapRows.map(mapRoadmap),
      currentLesson,
      recommendations: recommendationRows.map(mapRecommendation),
      upcomingAssessments: upcomingRows.map(
        (row) =>
          ({
            id: asString(row.id),
            title: asString(row.title),
            subjectName: asNullableString(row.subject_name),
            gradeName: asNullableString(row.grade_name),
            passingThreshold: asNumber(row.passing_threshold),
          }) satisfies AnalyticsUpcomingAssessment,
      ),
      notes: noteRows.map(mapNote),
      bookmarks: bookmarkRows.map(mapBookmark),
      subjectLessonTotals: totalRows.map(
        (row) =>
          ({
            subjectId: asString(row.subject_id),
            subjectName: asString(row.subject_name),
            totalLessons: asNumber(row.total_lessons),
          }) satisfies AnalyticsSubjectLessonTotal,
      ),
    };
  }

  async getTeacherSources(range: AnalyticsDateRange): Promise<readonly LearnerAnalyticsSource[]> {
    const rows = await this.rows<DbRow>(
      "SELECT id FROM profiles ORDER BY display_name, id",
      "SELECT id FROM profiles ORDER BY display_name, id",
    );
    const sources = await Promise.all(
      rows.map((row) => this.getLearnerSource(asString(row.id), range)),
    );
    return sources.filter((source): source is LearnerAnalyticsSource => Boolean(source));
  }

  async recordActivityEvent(input: ActivityEventInput): Promise<ActivityEventRecord> {
    if (input.dedupeKey) {
      const existing = await this.one<DbRow>(
        "SELECT id, profile_id, event_type, resource_type, resource_id, subject_id, grade_id, concept_id, learning_session_id, occurred_at, duration_seconds, score, is_correct, hints_used, attempt_number, response_time_ms, dedupe_key, metadata_json, created_at FROM activity_events WHERE profile_id = ? AND event_type = ? AND dedupe_key = ?",
        "SELECT id, profile_id, event_type, resource_type, resource_id, subject_id, grade_id, concept_id, learning_session_id, occurred_at, duration_seconds, score, is_correct, hints_used, attempt_number, response_time_ms, dedupe_key, metadata_json, created_at FROM activity_events WHERE profile_id = $1 AND event_type = $2 AND dedupe_key = $3",
        [input.profileId, input.eventType, input.dedupeKey],
      );
      if (existing) return mapActivityEvent(existing);
    }

    const occurredAt = input.occurredAt ?? new Date().toISOString();
    const isCorrect =
      input.isCorrect === null || input.isCorrect === undefined ? null : input.isCorrect ? 1 : 0;
    await this.execute(
      `INSERT INTO activity_events (id, profile_id, event_type, resource_type, resource_id, subject_id, grade_id, concept_id, learning_session_id, occurred_at, duration_seconds, score, is_correct, hints_used, attempt_number, response_time_ms, dedupe_key, metadata_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET resource_type = excluded.resource_type, resource_id = excluded.resource_id, subject_id = excluded.subject_id, grade_id = excluded.grade_id, concept_id = excluded.concept_id, learning_session_id = excluded.learning_session_id, occurred_at = excluded.occurred_at, duration_seconds = excluded.duration_seconds, score = excluded.score, is_correct = excluded.is_correct, hints_used = excluded.hints_used, attempt_number = excluded.attempt_number, response_time_ms = excluded.response_time_ms, dedupe_key = excluded.dedupe_key, metadata_json = excluded.metadata_json`,
      `INSERT INTO activity_events (id, profile_id, event_type, resource_type, resource_id, subject_id, grade_id, concept_id, learning_session_id, occurred_at, duration_seconds, score, is_correct, hints_used, attempt_number, response_time_ms, dedupe_key, metadata_json)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
       ON CONFLICT(id) DO UPDATE SET resource_type = EXCLUDED.resource_type, resource_id = EXCLUDED.resource_id, subject_id = EXCLUDED.subject_id, grade_id = EXCLUDED.grade_id, concept_id = EXCLUDED.concept_id, learning_session_id = EXCLUDED.learning_session_id, occurred_at = EXCLUDED.occurred_at, duration_seconds = EXCLUDED.duration_seconds, score = EXCLUDED.score, is_correct = EXCLUDED.is_correct, hints_used = EXCLUDED.hints_used, attempt_number = EXCLUDED.attempt_number, response_time_ms = EXCLUDED.response_time_ms, dedupe_key = EXCLUDED.dedupe_key, metadata_json = EXCLUDED.metadata_json`,
      [
        input.id || randomUUID(),
        input.profileId,
        input.eventType,
        input.resourceType ?? null,
        input.resourceId ?? null,
        input.subjectId ?? null,
        input.gradeId ?? null,
        input.conceptId ?? null,
        input.learningSessionId ?? null,
        occurredAt,
        Math.max(0, input.durationSeconds ?? 0),
        input.score ?? null,
        isCorrect,
        Math.max(0, input.hintsUsed ?? 0),
        Math.max(1, input.attemptNumber ?? 1),
        input.responseTimeMs ?? null,
        input.dedupeKey ?? null,
        JSON.stringify(input.metadata ?? {}),
      ],
    );
    const row = await this.one<DbRow>(
      "SELECT id, profile_id, event_type, resource_type, resource_id, subject_id, grade_id, concept_id, learning_session_id, occurred_at, duration_seconds, score, is_correct, hints_used, attempt_number, response_time_ms, dedupe_key, metadata_json, created_at FROM activity_events WHERE id = ?",
      "SELECT id, profile_id, event_type, resource_type, resource_id, subject_id, grade_id, concept_id, learning_session_id, occurred_at, duration_seconds, score, is_correct, hints_used, attempt_number, response_time_ms, dedupe_key, metadata_json, created_at FROM activity_events WHERE id = $1",
      [input.id],
    );
    if (!row) throw new NotFoundError("Activity event", input.id);
    return mapActivityEvent(row);
  }

  async startLearningSession(input: LearningSessionInput): Promise<LearningSessionRecord> {
    await this.execute(
      `INSERT INTO learning_sessions (id, profile_id, session_type, source_type, source_id, status, started_at, metadata_json) VALUES (?, ?, ?, ?, ?, 'active', ?, ?) ON CONFLICT(id) DO NOTHING`,
      `INSERT INTO learning_sessions (id, profile_id, session_type, source_type, source_id, status, started_at, metadata_json) VALUES ($1, $2, $3, $4, $5, 'active', $6, $7) ON CONFLICT(id) DO NOTHING`,
      [
        input.id || randomUUID(),
        input.profileId,
        input.sessionType,
        input.sourceType ?? null,
        input.sourceId ?? null,
        input.startedAt ?? new Date().toISOString(),
        JSON.stringify(input.metadata ?? {}),
      ],
    );
    const row = await this.one<DbRow>(
      "SELECT id, profile_id, session_type, source_type, source_id, status, started_at, ended_at, duration_seconds, metadata_json, created_at, updated_at FROM learning_sessions WHERE id = ? AND profile_id = ?",
      "SELECT id, profile_id, session_type, source_type, source_id, status, started_at, ended_at, duration_seconds, metadata_json, created_at, updated_at FROM learning_sessions WHERE id = $1 AND profile_id = $2",
      [input.id, input.profileId],
    );
    if (!row) throw new NotFoundError("Learning session", input.id);
    return mapLearningSession(row);
  }

  async getLearningSession(
    profileId: string,
    sessionId: string,
  ): Promise<LearningSessionRecord | null> {
    const row = await this.one<DbRow>(
      "SELECT id, profile_id, session_type, source_type, source_id, status, started_at, ended_at, duration_seconds, metadata_json, created_at, updated_at FROM learning_sessions WHERE id = ? AND profile_id = ?",
      "SELECT id, profile_id, session_type, source_type, source_id, status, started_at, ended_at, duration_seconds, metadata_json, created_at, updated_at FROM learning_sessions WHERE id = $1 AND profile_id = $2",
      [sessionId, profileId],
    );
    return row ? mapLearningSession(row) : null;
  }

  async completeLearningSession(
    profileId: string,
    sessionId: string,
    input: { endedAt?: string; durationSeconds?: number; status?: "completed" | "abandoned" },
  ): Promise<LearningSessionRecord> {
    const current = await this.getLearningSession(profileId, sessionId);
    if (!current) throw new NotFoundError("Learning session", sessionId);
    if (current.status !== "active") return current;
    const endedAt = input.endedAt ?? new Date().toISOString();
    const durationSeconds =
      input.durationSeconds ??
      Math.max(0, Math.floor((Date.parse(endedAt) - Date.parse(current.startedAt)) / 1000));
    await this.execute(
      "UPDATE learning_sessions SET status = ?, ended_at = ?, duration_seconds = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND profile_id = ?",
      "UPDATE learning_sessions SET status = $1, ended_at = $2, duration_seconds = $3, updated_at = NOW() WHERE id = $4 AND profile_id = $5",
      [input.status ?? "completed", endedAt, Math.max(0, durationSeconds), sessionId, profileId],
    );
    const updated = await this.getLearningSession(profileId, sessionId);
    if (!updated) throw new NotFoundError("Learning session", sessionId);
    return updated;
  }

  async upsertLearnerMetrics(metrics: readonly LearnerMetricRecord[]): Promise<void> {
    for (const metric of metrics) {
      await this.execute(
        `INSERT INTO learner_metrics (id, profile_id, metric_date, time_studied_seconds, lessons_started, lessons_completed, questions_attempted, correct_questions, accuracy, assessment_count, average_assessment_score, hints_used, attempt_count, average_response_time_ms, study_days, streak_days, consistency_score, mastery_score, mastered_concepts, weak_concepts, metadata_json)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(profile_id, metric_date) DO UPDATE SET time_studied_seconds = excluded.time_studied_seconds, lessons_started = excluded.lessons_started, lessons_completed = excluded.lessons_completed, questions_attempted = excluded.questions_attempted, correct_questions = excluded.correct_questions, accuracy = excluded.accuracy, assessment_count = excluded.assessment_count, average_assessment_score = excluded.average_assessment_score, hints_used = excluded.hints_used, attempt_count = excluded.attempt_count, average_response_time_ms = excluded.average_response_time_ms, study_days = excluded.study_days, streak_days = excluded.streak_days, consistency_score = excluded.consistency_score, mastery_score = excluded.mastery_score, mastered_concepts = excluded.mastered_concepts, weak_concepts = excluded.weak_concepts, metadata_json = excluded.metadata_json, updated_at = CURRENT_TIMESTAMP`,
        `INSERT INTO learner_metrics (id, profile_id, metric_date, time_studied_seconds, lessons_started, lessons_completed, questions_attempted, correct_questions, accuracy, assessment_count, average_assessment_score, hints_used, attempt_count, average_response_time_ms, study_days, streak_days, consistency_score, mastery_score, mastered_concepts, weak_concepts, metadata_json)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
         ON CONFLICT(profile_id, metric_date) DO UPDATE SET time_studied_seconds = EXCLUDED.time_studied_seconds, lessons_started = EXCLUDED.lessons_started, lessons_completed = EXCLUDED.lessons_completed, questions_attempted = EXCLUDED.questions_attempted, correct_questions = EXCLUDED.correct_questions, accuracy = EXCLUDED.accuracy, assessment_count = EXCLUDED.assessment_count, average_assessment_score = EXCLUDED.average_assessment_score, hints_used = EXCLUDED.hints_used, attempt_count = EXCLUDED.attempt_count, average_response_time_ms = EXCLUDED.average_response_time_ms, study_days = EXCLUDED.study_days, streak_days = EXCLUDED.streak_days, consistency_score = EXCLUDED.consistency_score, mastery_score = EXCLUDED.mastery_score, mastered_concepts = EXCLUDED.mastered_concepts, weak_concepts = EXCLUDED.weak_concepts, metadata_json = EXCLUDED.metadata_json, updated_at = NOW()`,
        [
          metric.id,
          metric.profileId,
          metric.metricDate,
          metric.timeStudiedSeconds,
          metric.lessonsStarted,
          metric.lessonsCompleted,
          metric.questionsAttempted,
          metric.correctQuestions,
          metric.accuracy,
          metric.assessmentCount,
          metric.averageAssessmentScore,
          metric.hintsUsed,
          metric.attemptCount,
          metric.averageResponseTimeMs,
          metric.studyDays,
          metric.streakDays,
          metric.consistencyScore,
          metric.masteryScore,
          metric.masteredConcepts,
          metric.weakConcepts,
          JSON.stringify(metric.metadata),
        ],
      );
    }
  }

  async upsertContentMetrics(metrics: readonly ContentMetricRecord[]): Promise<void> {
    for (const metric of metrics) {
      await this.execute(
        `INSERT INTO content_metrics (id, resource_type, resource_id, metric_date, subject_id, grade_id, concept_id, attempt_count, completion_count, correct_count, accuracy, average_response_time_ms, average_attempts, hint_rate, discrimination_index, support_count, metadata_json)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(resource_type, resource_id, metric_date) DO UPDATE SET subject_id = excluded.subject_id, grade_id = excluded.grade_id, concept_id = excluded.concept_id, attempt_count = excluded.attempt_count, completion_count = excluded.completion_count, correct_count = excluded.correct_count, accuracy = excluded.accuracy, average_response_time_ms = excluded.average_response_time_ms, average_attempts = excluded.average_attempts, hint_rate = excluded.hint_rate, discrimination_index = excluded.discrimination_index, support_count = excluded.support_count, metadata_json = excluded.metadata_json, updated_at = CURRENT_TIMESTAMP`,
        `INSERT INTO content_metrics (id, resource_type, resource_id, metric_date, subject_id, grade_id, concept_id, attempt_count, completion_count, correct_count, accuracy, average_response_time_ms, average_attempts, hint_rate, discrimination_index, support_count, metadata_json)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
         ON CONFLICT(resource_type, resource_id, metric_date) DO UPDATE SET subject_id = EXCLUDED.subject_id, grade_id = EXCLUDED.grade_id, concept_id = EXCLUDED.concept_id, attempt_count = EXCLUDED.attempt_count, completion_count = EXCLUDED.completion_count, correct_count = EXCLUDED.correct_count, accuracy = EXCLUDED.accuracy, average_response_time_ms = EXCLUDED.average_response_time_ms, average_attempts = EXCLUDED.average_attempts, hint_rate = EXCLUDED.hint_rate, discrimination_index = EXCLUDED.discrimination_index, support_count = EXCLUDED.support_count, metadata_json = EXCLUDED.metadata_json, updated_at = NOW()`,
        [
          metric.id,
          metric.resourceType,
          metric.resourceId,
          metric.metricDate,
          metric.subjectId,
          metric.gradeId,
          metric.conceptId,
          metric.attemptCount,
          metric.completionCount,
          metric.correctCount,
          metric.accuracy,
          metric.averageResponseTimeMs,
          metric.averageAttempts,
          metric.hintRate,
          metric.discriminationIndex,
          metric.supportCount,
          JSON.stringify(metric.metadata),
        ],
      );
    }
  }

  async upsertSnapshot(input: {
    id: string;
    profileId: string;
    snapshotType: AnalyticsSnapshotRecord["snapshotType"];
    snapshotDate: string;
    metrics: Record<string, unknown>;
  }): Promise<AnalyticsSnapshotRecord> {
    await this.execute(
      `INSERT INTO analytics_snapshots (id, profile_id, snapshot_type, snapshot_date, metrics_json) VALUES (?, ?, ?, ?, ?) ON CONFLICT(profile_id, snapshot_type, snapshot_date) DO UPDATE SET metrics_json = excluded.metrics_json`,
      `INSERT INTO analytics_snapshots (id, profile_id, snapshot_type, snapshot_date, metrics_json) VALUES ($1, $2, $3, $4, $5) ON CONFLICT(profile_id, snapshot_type, snapshot_date) DO UPDATE SET metrics_json = EXCLUDED.metrics_json`,
      [
        input.id || randomUUID(),
        input.profileId,
        input.snapshotType,
        input.snapshotDate,
        JSON.stringify(input.metrics),
      ],
    );
    const row = await this.one<DbRow>(
      "SELECT id, profile_id, snapshot_type, snapshot_date, metrics_json, created_at FROM analytics_snapshots WHERE profile_id = ? AND snapshot_type = ? AND snapshot_date = ?",
      "SELECT id, profile_id, snapshot_type, snapshot_date, metrics_json, created_at FROM analytics_snapshots WHERE profile_id = $1 AND snapshot_type = $2 AND snapshot_date = $3",
      [input.profileId, input.snapshotType, input.snapshotDate],
    );
    if (!row) throw new NotFoundError("Analytics snapshot", input.snapshotDate);
    return mapSnapshotRecord(row);
  }
}

export function getAnalyticsRepository(database?: DatabaseHandle): AnalyticsRepository {
  return new SqlAnalyticsRepository(database);
}
