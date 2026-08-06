import { randomUUID } from "node:crypto";
import { detectSessionConflicts } from "@/domain/planner/rules";
import type {
  PlannerOptions,
  PlannerWorkItem,
  StudyAvailabilityRecord,
  StudyCompletionEventRecord,
  StudyExceptionRecord,
  StudyGoalRecord,
  StudyPlanDetail,
  StudyPlanItemRecord,
  StudyPlanRecord,
  StudySessionRecord,
  StudySessionStatus,
  StudyGoalType,
  StudyDifficulty,
  StudyExceptionKind,
  StudyCompletionEventType,
  StudyItemType,
  Weekday,
} from "@/domain/planner/types";
import type { StudyPlannerRepository } from "@/domain/ports/planner-repository";
import { NotFoundError } from "@/domain/errors/application-error";
import { getDatabase, type DatabaseHandle } from "@/infrastructure/database/client";

type DbDate = string | Date | null;
type DbRow = Record<string, unknown>;

const asNumber = (value: unknown, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};
const asNullableNumber = (value: unknown) => {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};
const asIso = (value: DbDate) =>
  value instanceof Date ? value.toISOString() : (value ?? new Date(0).toISOString());

function parseJson<T>(value: unknown, fallback: T): T {
  if (value && typeof value === "object") return value as T;
  if (typeof value !== "string" || !value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function weekdays(value: unknown): Weekday[] {
  return [
    ...new Set(
      parseJson<unknown[]>(value, []).filter(
        (day): day is number =>
          typeof day === "number" && Number.isInteger(day) && day >= 1 && day <= 7,
      ),
    ),
  ] as Weekday[];
}

function goalType(value: unknown): StudyGoalType {
  const allowed: readonly StudyGoalType[] = [
    "grade-completion",
    "subject-completion",
    "course-completion",
    "roadmap-completion",
    "exam-preparation",
    "concept-mastery",
    "weekly-study-time",
  ];
  return allowed.includes(value as StudyGoalType) ? (value as StudyGoalType) : "weekly-study-time";
}

function difficulty(value: unknown): StudyDifficulty {
  return value === "gentle" || value === "challenging" ? value : "balanced";
}

function sessionStatus(value: unknown): StudySessionStatus {
  const allowed: readonly StudySessionStatus[] = [
    "scheduled",
    "in-progress",
    "completed",
    "skipped",
    "missed",
    "cancelled",
  ];
  return allowed.includes(value as StudySessionStatus)
    ? (value as StudySessionStatus)
    : "scheduled";
}

function itemType(value: unknown): StudyItemType {
  const allowed: readonly StudyItemType[] = [
    "lesson",
    "exercise",
    "review",
    "simulation",
    "laboratory",
    "assessment",
    "catch-up",
  ];
  return allowed.includes(value as StudyItemType) ? (value as StudyItemType) : "lesson";
}

function mapGoal(row: DbRow): StudyGoalRecord {
  const status = row.status;
  return {
    id: String(row.id),
    profileId: String(row.profile_id),
    title: String(row.title),
    description: String(row.description ?? ""),
    goalType: goalType(row.goal_type),
    targetId: row.target_id ? String(row.target_id) : null,
    targetTitle: String(row.target_title ?? ""),
    startDate: String(row.start_date),
    targetDate: String(row.target_date),
    weeklyStudyMinutes: asNumber(row.weekly_study_minutes),
    availableDays: weekdays(row.available_days),
    sessionDurationMinutes: asNumber(row.session_duration_minutes, 30),
    prioritySubjectIds: parseJson<string[]>(row.priority_subject_ids, []),
    restDays: weekdays(row.rest_days),
    difficultyPreference: difficulty(row.difficulty_preference),
    reviewFrequencyDays: asNumber(row.review_frequency_days),
    status:
      status === "paused" || status === "completed" || status === "archived" ? status : "active",
    createdAt: asIso(row.created_at as DbDate),
    updatedAt: asIso(row.updated_at as DbDate),
  };
}

function mapPlan(row: DbRow): StudyPlanRecord {
  const realism = row.realism;
  return {
    id: String(row.id),
    profileId: String(row.profile_id),
    goalId: String(row.goal_id),
    sourceType: row.source_type === "roadmap" ? "roadmap" : "goal",
    sourceId: row.source_id ? String(row.source_id) : null,
    status:
      row.status === "draft" ||
      row.status === "completed" ||
      row.status === "paused" ||
      row.status === "archived"
        ? row.status
        : "active",
    generatedAt: asIso(row.generated_at as DbDate),
    targetDate: String(row.target_date),
    weeklyStudyMinutes: asNumber(row.weekly_study_minutes),
    totalMinutes: asNumber(row.total_minutes),
    scheduledMinutes: asNumber(row.scheduled_minutes),
    unallocatedMinutes: asNumber(row.unallocated_minutes),
    capacityMinutes: asNumber(row.capacity_minutes),
    realism: realism === "tight" || realism === "infeasible" ? realism : "realistic",
    warnings: parseJson<string[]>(row.warnings, []),
    createdAt: asIso(row.created_at as DbDate),
    updatedAt: asIso(row.updated_at as DbDate),
  };
}

function mapItem(row: DbRow): StudyPlanItemRecord {
  return {
    id: String(row.id),
    planId: String(row.plan_id),
    itemType: itemType(row.item_type),
    sourceId: row.source_id ? String(row.source_id) : null,
    title: String(row.title),
    description: String(row.description ?? ""),
    subjectId: row.subject_id ? String(row.subject_id) : null,
    estimatedMinutes: asNumber(row.estimated_minutes),
    priority: asNumber(row.priority),
    sortOrder: asNumber(row.sort_order),
    metadata: parseJson<Record<string, unknown>>(row.metadata, {}),
    createdAt: asIso(row.created_at as DbDate),
  };
}

function mapSession(row: DbRow): StudySessionRecord {
  return {
    id: String(row.id),
    profileId: String(row.profile_id),
    planId: String(row.plan_id),
    planItemId: String(row.plan_item_id),
    itemType: itemType(row.item_type),
    sourceId: row.source_id ? String(row.source_id) : null,
    title: String(row.title),
    subjectId: row.subject_id ? String(row.subject_id) : null,
    scheduledDate: String(row.scheduled_date),
    startMinute: asNumber(row.start_minute),
    durationMinutes: asNumber(row.duration_minutes),
    status: sessionStatus(row.status),
    rescheduledFromDate: row.rescheduled_from_date ? String(row.rescheduled_from_date) : null,
    skipReason: row.skip_reason ? String(row.skip_reason) : null,
    completedAt: row.completed_at ? asIso(row.completed_at as DbDate) : null,
    updatedAt: asIso(row.updated_at as DbDate),
  };
}

function mapAvailability(row: DbRow): StudyAvailabilityRecord {
  return {
    id: String(row.id),
    profileId: String(row.profile_id),
    weekday: asNumber(row.weekday, 1) as Weekday,
    startMinute: asNumber(row.start_minute),
    endMinute: asNumber(row.end_minute),
    maxMinutes: asNullableNumber(row.max_minutes),
    label: String(row.label ?? "Study time"),
    createdAt: asIso(row.created_at as DbDate),
    updatedAt: asIso(row.updated_at as DbDate),
  };
}

function mapException(row: DbRow): StudyExceptionRecord {
  const kind: StudyExceptionKind =
    row.kind === "blocked" || row.kind === "extra-availability" ? row.kind : "unavailable";
  return {
    id: String(row.id),
    profileId: String(row.profile_id),
    exceptionDate: String(row.exception_date),
    kind,
    startMinute: asNullableNumber(row.start_minute),
    endMinute: asNullableNumber(row.end_minute),
    reason: String(row.reason ?? ""),
    createdAt: asIso(row.created_at as DbDate),
  };
}

function mapEvent(row: DbRow): StudyCompletionEventRecord {
  const eventType: StudyCompletionEventType =
    row.event_type === "skipped" || row.event_type === "missed" || row.event_type === "rescheduled"
      ? row.event_type
      : "completed";
  return {
    id: String(row.id),
    profileId: String(row.profile_id),
    sessionId: String(row.session_id),
    planItemId: String(row.plan_item_id),
    eventType,
    minutes: asNumber(row.minutes),
    metadata: parseJson<Record<string, unknown>>(row.metadata, {}),
    createdAt: asIso(row.created_at as DbDate),
  };
}

export class SqlStudyPlannerRepository implements StudyPlannerRepository {
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

  private readonly planSelect = `SELECT id, profile_id, goal_id, source_type, source_id, status, generated_at, target_date, weekly_study_minutes, total_minutes, scheduled_minutes, unallocated_minutes, capacity_minutes, realism, warnings, created_at, updated_at FROM study_plans`;
  private readonly itemSelect = `SELECT id, plan_id, item_type, source_id, title, description, subject_id, estimated_minutes, priority, sort_order, metadata, created_at FROM study_plan_items`;
  private readonly sessionSelect = `SELECT s.id, s.profile_id, s.plan_id, s.plan_item_id, i.item_type, i.source_id, i.title, i.subject_id, s.scheduled_date, s.start_minute, s.duration_minutes, s.status, s.rescheduled_from_date, s.skip_reason, s.completed_at, s.updated_at FROM study_sessions s JOIN study_plan_items i ON i.id = s.plan_item_id`;

  async listGoals(profileId: string): Promise<readonly StudyGoalRecord[]> {
    const rows = await this.rows(
      `SELECT id, profile_id, title, description, goal_type, target_id, target_title, start_date, target_date, weekly_study_minutes, available_days, session_duration_minutes, priority_subject_ids, rest_days, difficulty_preference, review_frequency_days, status, created_at, updated_at FROM study_goals WHERE profile_id = ? AND status <> 'archived' ORDER BY status = 'active' DESC, target_date, updated_at DESC`,
      `SELECT id, profile_id, title, description, goal_type, target_id, target_title, start_date, target_date, weekly_study_minutes, available_days, session_duration_minutes, priority_subject_ids, rest_days, difficulty_preference, review_frequency_days, status, created_at, updated_at FROM study_goals WHERE profile_id = $1 AND status <> 'archived' ORDER BY (status = 'active') DESC, target_date, updated_at DESC`,
      [profileId],
    );
    return rows.map(mapGoal);
  }

  async getGoal(profileId: string, goalId: string): Promise<StudyGoalRecord | null> {
    const row = await this.one(
      `SELECT id, profile_id, title, description, goal_type, target_id, target_title, start_date, target_date, weekly_study_minutes, available_days, session_duration_minutes, priority_subject_ids, rest_days, difficulty_preference, review_frequency_days, status, created_at, updated_at FROM study_goals WHERE profile_id = ? AND id = ?`,
      `SELECT id, profile_id, title, description, goal_type, target_id, target_title, start_date, target_date, weekly_study_minutes, available_days, session_duration_minutes, priority_subject_ids, rest_days, difficulty_preference, review_frequency_days, status, created_at, updated_at FROM study_goals WHERE profile_id = $1 AND id = $2`,
      [profileId, goalId],
    );
    return row ? mapGoal(row) : null;
  }

  async createGoal(
    input: Omit<StudyGoalRecord, "createdAt" | "updatedAt">,
  ): Promise<StudyGoalRecord> {
    await this.execute(
      `INSERT INTO study_goals (id, profile_id, title, description, goal_type, target_id, target_title, start_date, target_date, weekly_study_minutes, available_days, session_duration_minutes, priority_subject_ids, rest_days, difficulty_preference, review_frequency_days, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      `INSERT INTO study_goals (id, profile_id, title, description, goal_type, target_id, target_title, start_date, target_date, weekly_study_minutes, available_days, session_duration_minutes, priority_subject_ids, rest_days, difficulty_preference, review_frequency_days, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)`,
      [
        input.id,
        input.profileId,
        input.title,
        input.description,
        input.goalType,
        input.targetId,
        input.targetTitle,
        input.startDate,
        input.targetDate,
        input.weeklyStudyMinutes,
        JSON.stringify(input.availableDays),
        input.sessionDurationMinutes,
        JSON.stringify(input.prioritySubjectIds),
        JSON.stringify(input.restDays),
        input.difficultyPreference,
        input.reviewFrequencyDays,
        input.status,
      ],
    );
    return (await this.getGoal(input.profileId, input.id))!;
  }

  async updateGoal(
    profileId: string,
    goalId: string,
    input: Omit<StudyGoalRecord, "id" | "profileId" | "createdAt" | "updatedAt">,
  ): Promise<StudyGoalRecord> {
    await this.execute(
      `UPDATE study_goals SET title = ?, description = ?, goal_type = ?, target_id = ?, target_title = ?, start_date = ?, target_date = ?, weekly_study_minutes = ?, available_days = ?, session_duration_minutes = ?, priority_subject_ids = ?, rest_days = ?, difficulty_preference = ?, review_frequency_days = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE profile_id = ? AND id = ?`,
      `UPDATE study_goals SET title = $1, description = $2, goal_type = $3, target_id = $4, target_title = $5, start_date = $6, target_date = $7, weekly_study_minutes = $8, available_days = $9, session_duration_minutes = $10, priority_subject_ids = $11, rest_days = $12, difficulty_preference = $13, review_frequency_days = $14, status = $15, updated_at = NOW() WHERE profile_id = $16 AND id = $17`,
      [
        input.title,
        input.description,
        input.goalType,
        input.targetId,
        input.targetTitle,
        input.startDate,
        input.targetDate,
        input.weeklyStudyMinutes,
        JSON.stringify(input.availableDays),
        input.sessionDurationMinutes,
        JSON.stringify(input.prioritySubjectIds),
        JSON.stringify(input.restDays),
        input.difficultyPreference,
        input.reviewFrequencyDays,
        input.status,
        profileId,
        goalId,
      ],
    );
    const goal = await this.getGoal(profileId, goalId);
    if (!goal) throw new NotFoundError("Study goal", goalId);
    return goal;
  }

  async setGoalStatus(
    profileId: string,
    goalId: string,
    status: StudyGoalRecord["status"],
  ): Promise<StudyGoalRecord> {
    await this.execute(
      `UPDATE study_goals SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE profile_id = ? AND id = ?`,
      `UPDATE study_goals SET status = $1, updated_at = NOW() WHERE profile_id = $2 AND id = $3`,
      [status, profileId, goalId],
    );
    const goal = await this.getGoal(profileId, goalId);
    if (!goal) throw new NotFoundError("Study goal", goalId);
    return goal;
  }

  async listAvailability(profileId: string): Promise<readonly StudyAvailabilityRecord[]> {
    const rows = await this.rows(
      `SELECT id, profile_id, weekday, start_minute, end_minute, max_minutes, label, created_at, updated_at FROM study_availability WHERE profile_id = ? ORDER BY weekday, start_minute, id`,
      `SELECT id, profile_id, weekday, start_minute, end_minute, max_minutes, label, created_at, updated_at FROM study_availability WHERE profile_id = $1 ORDER BY weekday, start_minute, id`,
      [profileId],
    );
    return rows.map(mapAvailability);
  }

  async replaceAvailability(
    profileId: string,
    input: readonly Omit<StudyAvailabilityRecord, "id" | "profileId" | "createdAt" | "updatedAt">[],
  ): Promise<readonly StudyAvailabilityRecord[]> {
    if (this.database.provider === "sqlite") {
      const database = this.database.raw;
      const replace = database.transaction(() => {
        database.prepare("DELETE FROM study_availability WHERE profile_id = ?").run(profileId);
        const insert = database.prepare(
          "INSERT INTO study_availability (id, profile_id, weekday, start_minute, end_minute, max_minutes, label) VALUES (?, ?, ?, ?, ?, ?, ?)",
        );
        for (const slot of input) {
          insert.run(
            `study-availability-${randomUUID()}`,
            profileId,
            slot.weekday,
            slot.startMinute,
            slot.endMinute,
            slot.maxMinutes,
            slot.label,
          );
        }
      });
      replace();
    } else {
      await this.database.raw.begin(async (transaction) => {
        await transaction`DELETE FROM study_availability WHERE profile_id = ${profileId}`;
        for (const slot of input) {
          await transaction`
            INSERT INTO study_availability (id, profile_id, weekday, start_minute, end_minute, max_minutes, label)
            VALUES (${`study-availability-${randomUUID()}`}, ${profileId}, ${slot.weekday}, ${slot.startMinute}, ${slot.endMinute}, ${slot.maxMinutes}, ${slot.label})
          `;
        }
      });
    }
    return this.listAvailability(profileId);
  }

  async listExceptions(
    profileId: string,
    options: { from?: string; to?: string } = {},
  ): Promise<readonly StudyExceptionRecord[]> {
    const values: unknown[] = [profileId];
    const sqliteConditions = ["profile_id = ?"];
    const postgresConditions = ["profile_id = $1"];
    if (options.from) {
      values.push(options.from);
      sqliteConditions.push("exception_date >= ?");
      postgresConditions.push(`exception_date >= $${values.length}`);
    }
    if (options.to) {
      values.push(options.to);
      sqliteConditions.push("exception_date <= ?");
      postgresConditions.push(`exception_date <= $${values.length}`);
    }
    const rows = await this.rows(
      `SELECT id, profile_id, exception_date, kind, start_minute, end_minute, reason, created_at FROM study_exceptions WHERE ${sqliteConditions.join(" AND ")} ORDER BY exception_date, start_minute, id`,
      `SELECT id, profile_id, exception_date, kind, start_minute, end_minute, reason, created_at FROM study_exceptions WHERE ${postgresConditions.join(" AND ")} ORDER BY exception_date, start_minute, id`,
      values,
    );
    return rows.map(mapException);
  }

  async createException(
    input: Omit<StudyExceptionRecord, "createdAt">,
  ): Promise<StudyExceptionRecord> {
    await this.execute(
      `INSERT INTO study_exceptions (id, profile_id, exception_date, kind, start_minute, end_minute, reason) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      `INSERT INTO study_exceptions (id, profile_id, exception_date, kind, start_minute, end_minute, reason) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        input.id,
        input.profileId,
        input.exceptionDate,
        input.kind,
        input.startMinute,
        input.endMinute,
        input.reason,
      ],
    );
    const row = await this.one(
      `SELECT id, profile_id, exception_date, kind, start_minute, end_minute, reason, created_at FROM study_exceptions WHERE profile_id = ? AND id = ?`,
      `SELECT id, profile_id, exception_date, kind, start_minute, end_minute, reason, created_at FROM study_exceptions WHERE profile_id = $1 AND id = $2`,
      [input.profileId, input.id],
    );
    if (!row) throw new NotFoundError("Study exception", input.id);
    return mapException(row);
  }

  async deleteException(profileId: string, exceptionId: string): Promise<void> {
    await this.execute(
      `DELETE FROM study_exceptions WHERE profile_id = ? AND id = ?`,
      `DELETE FROM study_exceptions WHERE profile_id = $1 AND id = $2`,
      [profileId, exceptionId],
    );
  }

  async listPlanningItems(
    profileId: string,
    goal: StudyGoalRecord,
  ): Promise<readonly PlannerWorkItem[]> {
    let rows: DbRow[] = [];
    if (goal.goalType === "roadmap-completion" && goal.targetId) {
      rows = await this.rows(
        `SELECT COALESCE(n.reference_id, n.id) AS source_id, n.id AS roadmap_node_id, CASE n.node_type WHEN 'assessment' THEN 'assessment' WHEN 'simulation' THEN 'simulation' WHEN 'laboratory-activity' THEN 'laboratory' WHEN 'concept' THEN 'review' WHEN 'milestone' THEN 'review' ELSE 'lesson' END AS item_type, n.title, n.description, n.subject_id, CASE WHEN n.estimated_duration_minutes > 0 THEN n.estimated_duration_minutes ELSE 30 END AS estimated_minutes, CASE WHEN n.is_required = 1 THEN 20 ELSE 5 END AS priority, n.sort_order, n.metadata, r.id AS roadmap_id FROM roadmap_nodes n JOIN roadmap_versions v ON v.id = n.roadmap_version_id JOIN roadmaps r ON r.id = v.roadmap_id WHERE r.id = ? AND v.status = 'published' ORDER BY n.sort_order, n.id`,
        `SELECT COALESCE(n.reference_id, n.id) AS source_id, n.id AS roadmap_node_id, CASE n.node_type WHEN 'assessment' THEN 'assessment' WHEN 'simulation' THEN 'simulation' WHEN 'laboratory-activity' THEN 'laboratory' WHEN 'concept' THEN 'review' WHEN 'milestone' THEN 'review' ELSE 'lesson' END AS item_type, n.title, n.description, n.subject_id, CASE WHEN n.estimated_duration_minutes > 0 THEN n.estimated_duration_minutes ELSE 30 END AS estimated_minutes, CASE WHEN n.is_required THEN 20 ELSE 5 END AS priority, n.sort_order, n.metadata, r.id AS roadmap_id FROM roadmap_nodes n JOIN roadmap_versions v ON v.id = n.roadmap_version_id JOIN roadmaps r ON r.id = v.roadmap_id WHERE r.id = $1 AND v.status = 'published' ORDER BY n.sort_order, n.id`,
        [goal.targetId],
      );
    } else if (goal.goalType === "exam-preparation" && goal.targetId) {
      rows = await this.rows(
        `SELECT id AS source_id, 'assessment' AS item_type, title, description, subject_id, COALESCE(time_limit_seconds / 60, 45) AS estimated_minutes, 25 AS priority, 0 AS sort_order, '{}' AS metadata FROM assessments WHERE id = ? AND status = 'published'`,
        `SELECT id AS source_id, 'assessment' AS item_type, title, description, subject_id, COALESCE(time_limit_seconds / 60, 45) AS estimated_minutes, 25 AS priority, 0 AS sort_order, '{}' AS metadata FROM assessments WHERE id = $1 AND status = 'published'`,
        [goal.targetId],
      );
    } else if (goal.goalType === "concept-mastery" && goal.targetId) {
      rows = await this.rows(
        `SELECT id AS source_id, 'review' AS item_type, name AS title, description, subject_id, 25 AS estimated_minutes, 30 AS priority, 0 AS sort_order, '{}' AS metadata FROM concepts WHERE id = ? AND is_archived = 0`,
        `SELECT id AS source_id, 'review' AS item_type, name AS title, description, subject_id, 25 AS estimated_minutes, 30 AS priority, 0 AS sort_order, '{}' AS metadata FROM concepts WHERE id = $1 AND is_archived = FALSE`,
        [goal.targetId],
      );
    } else {
      const values: unknown[] = [profileId];
      const sqliteScopes: string[] = [];
      const postgresScopes: string[] = [];
      if (goal.goalType === "subject-completion" && goal.targetId) {
        values.push(goal.targetId);
        sqliteScopes.push("c.subject_id = ?");
        postgresScopes.push(`c.subject_id = $${values.length}`);
      } else if (goal.goalType === "course-completion" && goal.targetId) {
        values.push(goal.targetId);
        sqliteScopes.push("c.id = ?");
        postgresScopes.push(`c.id = $${values.length}`);
      } else if (goal.goalType === "grade-completion" && goal.targetId) {
        values.push(goal.targetId);
        sqliteScopes.push(
          "EXISTS (SELECT 1 FROM course_grades scoped_grade WHERE scoped_grade.course_id = c.id AND scoped_grade.grade_id = ?)",
        );
        postgresScopes.push(
          `EXISTS (SELECT 1 FROM course_grades scoped_grade WHERE scoped_grade.course_id = c.id AND scoped_grade.grade_id = $${values.length})`,
        );
      }
      const scopeSqlite = sqliteScopes.length ? ` AND ${sqliteScopes.join(" AND ")}` : "";
      const scopePostgres = postgresScopes.length ? ` AND ${postgresScopes.join(" AND ")}` : "";
      rows = await this.rows(
        `SELECT l.id AS source_id, 'lesson' AS item_type, l.title, l.summary AS description, c.subject_id, CASE WHEN l.estimated_duration_minutes > 0 THEN l.estimated_duration_minutes ELSE 25 END AS estimated_minutes, CASE WHEN c.is_required = 1 THEN 20 ELSE 5 END AS priority, (m.sort_order * 1000 + l.sort_order) AS sort_order, json_object('courseId', c.id, 'moduleId', m.id) AS metadata FROM lessons l JOIN modules m ON m.id = l.module_id JOIN courses c ON c.id = m.course_id LEFT JOIN user_lesson_progress progress ON progress.profile_id = ? AND progress.lesson_id = l.id WHERE c.status = 'published' AND l.status = 'published' AND (progress.completion_percentage IS NULL OR progress.completion_percentage < 100)${scopeSqlite} ORDER BY m.sort_order, l.sort_order, l.id`,
        `SELECT l.id AS source_id, 'lesson' AS item_type, l.title, l.summary AS description, c.subject_id, CASE WHEN l.estimated_duration_minutes > 0 THEN l.estimated_duration_minutes ELSE 25 END AS estimated_minutes, CASE WHEN c.is_required THEN 20 ELSE 5 END AS priority, (m.sort_order * 1000 + l.sort_order) AS sort_order, json_build_object('courseId', c.id, 'moduleId', m.id) AS metadata FROM lessons l JOIN modules m ON m.id = l.module_id JOIN courses c ON c.id = m.course_id LEFT JOIN user_lesson_progress progress ON progress.profile_id = $1 AND progress.lesson_id = l.id WHERE c.status = 'published' AND l.status = 'published' AND (progress.completion_percentage IS NULL OR progress.completion_percentage < 100)${scopePostgres} ORDER BY m.sort_order, l.sort_order, l.id`,
        values,
      );
    }
    const items = rows.map((row, index) => ({
      sourceId: row.source_id ? String(row.source_id) : null,
      itemType: itemType(row.item_type),
      title: String(row.title),
      description: String(row.description ?? ""),
      subjectId: row.subject_id ? String(row.subject_id) : null,
      estimatedMinutes: Math.max(10, asNumber(row.estimated_minutes, 30)),
      priority: asNumber(row.priority),
      sortOrder: asNumber(row.sort_order, index),
      metadata: {
        ...parseJson<Record<string, unknown>>(row.metadata, {}),
        ...(row.roadmap_id
          ? { roadmapId: String(row.roadmap_id), roadmapNodeId: String(row.roadmap_node_id) }
          : {}),
      },
    }));
    if (!items.length && goal.targetId && goal.goalType === "course-completion") {
      return [
        {
          sourceId: goal.targetId,
          itemType: "lesson",
          title: goal.targetTitle || "Course study block",
          description: "A focused course study block.",
          subjectId: null,
          estimatedMinutes: 30,
          priority: 10,
          sortOrder: 0,
          metadata: { courseId: goal.targetId },
        },
      ];
    }
    return items;
  }

  async listPlannerOptions(): Promise<PlannerOptions> {
    const [grades, roadmaps, courses, subjects, assessments, concepts] = await Promise.all([
      this.rows(
        `SELECT id, name AS title FROM grades WHERE is_archived = 0 ORDER BY sort_order, name COLLATE NOCASE`,
        `SELECT id, name AS title FROM grades WHERE is_archived = FALSE ORDER BY sort_order, name`,
      ),
      this.rows(
        `SELECT id, title, estimated_duration_minutes FROM roadmaps WHERE status = 'published' ORDER BY title COLLATE NOCASE`,
        `SELECT id, title, estimated_duration_minutes FROM roadmaps WHERE status = 'published' ORDER BY title`,
      ),
      this.rows(
        `SELECT id, title, subject_id, estimated_duration_minutes FROM courses WHERE status = 'published' ORDER BY title COLLATE NOCASE`,
        `SELECT id, title, subject_id, estimated_duration_minutes FROM courses WHERE status = 'published' ORDER BY title`,
      ),
      this.rows(
        `SELECT id, name AS title FROM subjects WHERE is_archived = 0 ORDER BY sort_order, name COLLATE NOCASE`,
        `SELECT id, name AS title FROM subjects WHERE is_archived = FALSE ORDER BY sort_order, name`,
      ),
      this.rows(
        `SELECT id, title, subject_id FROM assessments WHERE status = 'published' ORDER BY title COLLATE NOCASE`,
        `SELECT id, title, subject_id FROM assessments WHERE status = 'published' ORDER BY title`,
      ),
      this.rows(
        `SELECT id, name AS title, subject_id FROM concepts WHERE is_archived = 0 ORDER BY name COLLATE NOCASE`,
        `SELECT id, name AS title, subject_id FROM concepts WHERE is_archived = FALSE ORDER BY name`,
      ),
    ]);
    return {
      roadmaps: roadmaps.map((row) => ({
        id: String(row.id),
        title: String(row.title),
        estimatedMinutes: asNumber(row.estimated_duration_minutes),
      })),
      courses: courses.map((row) => ({
        id: String(row.id),
        title: String(row.title),
        subjectId: String(row.subject_id),
        estimatedMinutes: asNumber(row.estimated_duration_minutes),
      })),
      grades: grades.map((row) => ({ id: String(row.id), title: String(row.title) })),
      subjects: subjects.map((row) => ({ id: String(row.id), title: String(row.title) })),
      assessments: assessments.map((row) => ({
        id: String(row.id),
        title: String(row.title),
        subjectId: row.subject_id ? String(row.subject_id) : null,
      })),
      concepts: concepts.map((row) => ({
        id: String(row.id),
        title: String(row.title),
        subjectId: String(row.subject_id),
      })),
    };
  }

  async createPlan(input: {
    plan: Omit<StudyPlanRecord, "createdAt" | "updatedAt">;
    items: readonly Omit<StudyPlanItemRecord, "createdAt">[];
    sessions: readonly Omit<
      StudySessionRecord,
      "profileId" | "itemType" | "sourceId" | "title" | "subjectId" | "updatedAt"
    >[];
  }): Promise<StudyPlanDetail> {
    const planValues = [
      input.plan.id,
      input.plan.profileId,
      input.plan.goalId,
      input.plan.sourceType,
      input.plan.sourceId,
      input.plan.status,
      input.plan.generatedAt,
      input.plan.targetDate,
      input.plan.weeklyStudyMinutes,
      input.plan.totalMinutes,
      input.plan.scheduledMinutes,
      input.plan.unallocatedMinutes,
      input.plan.capacityMinutes,
      input.plan.realism,
      JSON.stringify(input.plan.warnings),
    ];
    if (this.database.provider === "sqlite") {
      const database = this.database.raw;
      const create = database.transaction(() => {
        database
          .prepare(
            "UPDATE study_plans SET status = 'archived', updated_at = CURRENT_TIMESTAMP WHERE profile_id = ? AND goal_id = ? AND status = 'active'",
          )
          .run(input.plan.profileId, input.plan.goalId);
        database
          .prepare(
            "INSERT INTO study_plans (id, profile_id, goal_id, source_type, source_id, status, generated_at, target_date, weekly_study_minutes, total_minutes, scheduled_minutes, unallocated_minutes, capacity_minutes, realism, warnings) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
          )
          .run(...planValues);
        const insertItem = database.prepare(
          "INSERT INTO study_plan_items (id, plan_id, item_type, source_id, title, description, subject_id, estimated_minutes, priority, sort_order, metadata) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        );
        for (const item of input.items)
          insertItem.run(
            item.id,
            item.planId,
            item.itemType,
            item.sourceId,
            item.title,
            item.description,
            item.subjectId,
            item.estimatedMinutes,
            item.priority,
            item.sortOrder,
            JSON.stringify(item.metadata),
          );
        const insertSession = database.prepare(
          "INSERT INTO study_sessions (id, profile_id, plan_id, plan_item_id, scheduled_date, start_minute, duration_minutes, status, rescheduled_from_date, skip_reason, completed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        );
        for (const session of input.sessions)
          insertSession.run(
            session.id,
            input.plan.profileId,
            session.planId,
            session.planItemId,
            session.scheduledDate,
            session.startMinute,
            session.durationMinutes,
            session.status,
            session.rescheduledFromDate,
            session.skipReason,
            session.completedAt,
          );
      });
      create();
    } else {
      await this.database.raw.begin(async (transaction) => {
        await transaction`UPDATE study_plans SET status = 'archived', updated_at = NOW() WHERE profile_id = ${input.plan.profileId} AND goal_id = ${input.plan.goalId} AND status = 'active'`;
        await transaction`INSERT INTO study_plans (id, profile_id, goal_id, source_type, source_id, status, generated_at, target_date, weekly_study_minutes, total_minutes, scheduled_minutes, unallocated_minutes, capacity_minutes, realism, warnings) VALUES (${input.plan.id}, ${input.plan.profileId}, ${input.plan.goalId}, ${input.plan.sourceType}, ${input.plan.sourceId}, ${input.plan.status}, ${input.plan.generatedAt}, ${input.plan.targetDate}, ${input.plan.weeklyStudyMinutes}, ${input.plan.totalMinutes}, ${input.plan.scheduledMinutes}, ${input.plan.unallocatedMinutes}, ${input.plan.capacityMinutes}, ${input.plan.realism}, ${JSON.stringify(input.plan.warnings)})`;
        for (const item of input.items)
          await transaction`INSERT INTO study_plan_items (id, plan_id, item_type, source_id, title, description, subject_id, estimated_minutes, priority, sort_order, metadata) VALUES (${item.id}, ${item.planId}, ${item.itemType}, ${item.sourceId}, ${item.title}, ${item.description}, ${item.subjectId}, ${item.estimatedMinutes}, ${item.priority}, ${item.sortOrder}, ${JSON.stringify(item.metadata)})`;
        for (const session of input.sessions)
          await transaction`INSERT INTO study_sessions (id, profile_id, plan_id, plan_item_id, scheduled_date, start_minute, duration_minutes, status, rescheduled_from_date, skip_reason, completed_at) VALUES (${session.id}, ${input.plan.profileId}, ${session.planId}, ${session.planItemId}, ${session.scheduledDate}, ${session.startMinute}, ${session.durationMinutes}, ${session.status}, ${session.rescheduledFromDate}, ${session.skipReason}, ${session.completedAt})`;
      });
    }
    const detail = await this.getPlan(input.plan.profileId, input.plan.id);
    if (!detail) throw new NotFoundError("Study plan", input.plan.id);
    return detail;
  }

  async getPlan(profileId: string, planId: string): Promise<StudyPlanDetail | null> {
    const planRow = await this.one(
      `${this.planSelect} WHERE profile_id = ? AND id = ?`,
      `${this.planSelect} WHERE profile_id = $1 AND id = $2`,
      [profileId, planId],
    );
    if (!planRow) return null;
    const goal = await this.getGoal(profileId, String(planRow.goal_id));
    if (!goal) return null;
    const itemRows = await this.rows(
      `${this.itemSelect} WHERE plan_id = ? ORDER BY sort_order, id`,
      `${this.itemSelect} WHERE plan_id = $1 ORDER BY sort_order, id`,
      [planId],
    );
    const sessionRows = await this.rows(
      `${this.sessionSelect} WHERE s.profile_id = ? AND s.plan_id = ? ORDER BY s.scheduled_date, s.start_minute, s.id`,
      `${this.sessionSelect} WHERE s.profile_id = $1 AND s.plan_id = $2 ORDER BY s.scheduled_date, s.start_minute, s.id`,
      [profileId, planId],
    );
    const sessions = sessionRows.map(mapSession);
    return {
      plan: mapPlan(planRow),
      goal,
      items: itemRows.map(mapItem),
      sessions,
      conflicts: detectSessionConflicts(sessions),
    };
  }

  async getActivePlan(profileId: string, goalId?: string): Promise<StudyPlanDetail | null> {
    const values: unknown[] = [profileId];
    const sqliteWhere = ["profile_id = ?", "status = 'active'"];
    const postgresWhere = ["profile_id = $1", "status = 'active'"];
    if (goalId) {
      values.push(goalId);
      sqliteWhere.push("goal_id = ?");
      postgresWhere.push(`goal_id = $${values.length}`);
    }
    const row = await this.one(
      `${this.planSelect} WHERE ${sqliteWhere.join(" AND ")} ORDER BY updated_at DESC, id DESC LIMIT 1`,
      `${this.planSelect} WHERE ${postgresWhere.join(" AND ")} ORDER BY updated_at DESC, id DESC LIMIT 1`,
      values,
    );
    return row ? this.getPlan(profileId, String(row.id)) : null;
  }

  async setPlanStatus(
    profileId: string,
    planId: string,
    status: StudyPlanRecord["status"],
  ): Promise<StudyPlanRecord> {
    await this.execute(
      `UPDATE study_plans SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE profile_id = ? AND id = ?`,
      `UPDATE study_plans SET status = $1, updated_at = NOW() WHERE profile_id = $2 AND id = $3`,
      [status, profileId, planId],
    );
    const row = await this.one(
      `${this.planSelect} WHERE profile_id = ? AND id = ?`,
      `${this.planSelect} WHERE profile_id = $1 AND id = $2`,
      [profileId, planId],
    );
    if (!row) throw new NotFoundError("Study plan", planId);
    return mapPlan(row);
  }

  async listSessions(
    profileId: string,
    options: { from?: string; to?: string } = {},
  ): Promise<readonly StudySessionRecord[]> {
    const values: unknown[] = [profileId];
    const sqliteWhere = ["s.profile_id = ?", "s.status <> 'cancelled'"];
    const postgresWhere = ["s.profile_id = $1", "s.status <> 'cancelled'"];
    if (options.from) {
      values.push(options.from);
      sqliteWhere.push("s.scheduled_date >= ?");
      postgresWhere.push(`s.scheduled_date >= $${values.length}`);
    }
    if (options.to) {
      values.push(options.to);
      sqliteWhere.push("s.scheduled_date <= ?");
      postgresWhere.push(`s.scheduled_date <= $${values.length}`);
    }
    const rows = await this.rows(
      `${this.sessionSelect} WHERE ${sqliteWhere.join(" AND ")} ORDER BY s.scheduled_date, s.start_minute, s.id`,
      `${this.sessionSelect} WHERE ${postgresWhere.join(" AND ")} ORDER BY s.scheduled_date, s.start_minute, s.id`,
      values,
    );
    return rows.map(mapSession);
  }

  async getSession(profileId: string, sessionId: string): Promise<StudySessionRecord | null> {
    const row = await this.one(
      `${this.sessionSelect} WHERE s.profile_id = ? AND s.id = ?`,
      `${this.sessionSelect} WHERE s.profile_id = $1 AND s.id = $2`,
      [profileId, sessionId],
    );
    return row ? mapSession(row) : null;
  }

  async updateSession(input: {
    profileId: string;
    sessionId: string;
    scheduledDate: string;
    startMinute: number;
    status?: StudySessionStatus;
    rescheduledFromDate?: string | null;
    skipReason?: string | null;
    completedAt?: string | null;
  }): Promise<StudySessionRecord> {
    const current = await this.getSession(input.profileId, input.sessionId);
    if (!current) throw new NotFoundError("Study session", input.sessionId);
    const status = input.status ?? current.status;
    const rescheduledFromDate =
      input.rescheduledFromDate === undefined
        ? current.rescheduledFromDate
        : input.rescheduledFromDate;
    const skipReason = input.skipReason === undefined ? current.skipReason : input.skipReason;
    const completedAt = input.completedAt === undefined ? current.completedAt : input.completedAt;
    await this.execute(
      `UPDATE study_sessions SET scheduled_date = ?, start_minute = ?, status = ?, rescheduled_from_date = ?, skip_reason = ?, completed_at = ?, updated_at = CURRENT_TIMESTAMP WHERE profile_id = ? AND id = ?`,
      `UPDATE study_sessions SET scheduled_date = $1, start_minute = $2, status = $3, rescheduled_from_date = $4, skip_reason = $5, completed_at = $6, updated_at = NOW() WHERE profile_id = $7 AND id = $8`,
      [
        input.scheduledDate,
        input.startMinute,
        status,
        rescheduledFromDate,
        skipReason,
        completedAt,
        input.profileId,
        input.sessionId,
      ],
    );
    return (await this.getSession(input.profileId, input.sessionId))!;
  }

  async saveCompletionEvent(
    input: Omit<StudyCompletionEventRecord, "createdAt">,
  ): Promise<StudyCompletionEventRecord> {
    await this.execute(
      `INSERT INTO study_completion_events (id, profile_id, session_id, plan_item_id, event_type, minutes, metadata) VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT(session_id, event_type) DO UPDATE SET minutes = excluded.minutes, metadata = excluded.metadata`,
      `INSERT INTO study_completion_events (id, profile_id, session_id, plan_item_id, event_type, minutes, metadata) VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (session_id, event_type) DO UPDATE SET minutes = EXCLUDED.minutes, metadata = EXCLUDED.metadata`,
      [
        input.id,
        input.profileId,
        input.sessionId,
        input.planItemId,
        input.eventType,
        input.minutes,
        JSON.stringify(input.metadata),
      ],
    );
    const row = await this.one(
      `SELECT id, profile_id, session_id, plan_item_id, event_type, minutes, metadata, created_at FROM study_completion_events WHERE profile_id = ? AND session_id = ? AND event_type = ?`,
      `SELECT id, profile_id, session_id, plan_item_id, event_type, minutes, metadata, created_at FROM study_completion_events WHERE profile_id = $1 AND session_id = $2 AND event_type = $3`,
      [input.profileId, input.sessionId, input.eventType],
    );
    if (!row) throw new NotFoundError("Study completion event", input.id);
    return mapEvent(row);
  }

  async listCompletionEvents(
    profileId: string,
    sessionId: string,
  ): Promise<readonly StudyCompletionEventRecord[]> {
    const rows = await this.rows(
      `SELECT id, profile_id, session_id, plan_item_id, event_type, minutes, metadata, created_at FROM study_completion_events WHERE profile_id = ? AND session_id = ? ORDER BY created_at, id`,
      `SELECT id, profile_id, session_id, plan_item_id, event_type, minutes, metadata, created_at FROM study_completion_events WHERE profile_id = $1 AND session_id = $2 ORDER BY created_at, id`,
      [profileId, sessionId],
    );
    return rows.map(mapEvent);
  }
}

export function getStudyPlannerRepository(database?: DatabaseHandle): StudyPlannerRepository {
  return new SqlStudyPlannerRepository(database);
}
