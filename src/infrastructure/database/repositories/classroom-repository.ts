import { randomUUID } from "node:crypto";
import { ConflictError, NotFoundError } from "@/domain/errors/application-error";
import {
  ASSIGNABLE_RESOURCE_TYPES,
  ASSIGNMENT_STATUSES,
  INVITATION_ROLES,
  INVITATION_STATUSES,
  SUBMISSION_STATUSES,
} from "@/domain/classroom/types";
import type {
  AssignableResource,
  AssignmentRecord,
  AssignmentTargetRecord,
  ClassroomAccess,
  ClassroomAnalytics,
  ClassroomDetail,
  ClassroomListItem,
  ClassroomRecord,
  CreateAssignmentInput,
  CreateClassroomInput,
  CreateInvitationInput,
  CreateSubmissionInput,
  GradingRubricRecord,
  InvitationRecord,
  ReviewSubmissionInput,
  SubmissionRecord,
  UpdateClassroomInput,
} from "@/domain/classroom/types";
import type { ClassroomRepository } from "@/domain/ports/classroom-repository";
import { getDatabase, type DatabaseHandle } from "@/infrastructure/database/client";

type DbDate = Date | string | null | undefined;
type DbRow = Record<string, unknown>;

function asString(value: unknown, fallback = ""): string {
  return value === null || value === undefined ? fallback : String(value);
}

function asNullableString(value: unknown): string | null {
  return value === null || value === undefined || value === "" ? null : String(value);
}

function asNumber(value: unknown, fallback = 0): number {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function asBoolean(value: unknown): boolean {
  return value === true || value === 1 || value === "1" || value === "true";
}

function asIso(value: DbDate): string {
  if (value instanceof Date) return value.toISOString();
  return value ?? new Date(0).toISOString();
}

function asNullableIso(value: DbDate): string | null {
  return value === null || value === undefined ? null : asIso(value);
}

function parseJson<T>(value: unknown, fallback: T): T {
  if (typeof value !== "string" || !value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function stringList(value: unknown): string[] {
  const parsed = parseJson<unknown>(value, []);
  return Array.isArray(parsed)
    ? parsed.filter((item): item is string => typeof item === "string")
    : [];
}

function classRole(value: unknown): ClassroomListItem["role"] {
  return value === "owner" || value === "teacher" ? value : "learner";
}

function invitationRole(value: unknown): InvitationRecord["role"] {
  return INVITATION_ROLES.includes(value as InvitationRecord["role"])
    ? (value as InvitationRecord["role"])
    : "learner";
}

function invitationStatus(value: unknown): InvitationRecord["status"] {
  return INVITATION_STATUSES.includes(value as InvitationRecord["status"])
    ? (value as InvitationRecord["status"])
    : "pending";
}

function resourceType(value: unknown): AssignableResource["type"] {
  return ASSIGNABLE_RESOURCE_TYPES.includes(value as AssignableResource["type"])
    ? (value as AssignableResource["type"])
    : "lesson";
}

function assignmentStatus(value: unknown): AssignmentRecord["status"] {
  return ASSIGNMENT_STATUSES.includes(value as AssignmentRecord["status"])
    ? (value as AssignmentRecord["status"])
    : "published";
}

function submissionStatus(value: unknown): SubmissionRecord["status"] {
  return SUBMISSION_STATUSES.includes(value as SubmissionRecord["status"])
    ? (value as SubmissionRecord["status"])
    : "submitted";
}

function mapClassroom(row: DbRow): ClassroomRecord {
  return {
    id: asString(row.id),
    name: asString(row.name),
    description: asString(row.description),
    joinCode: asString(row.join_code),
    subjectIds: stringList(row.subject_ids),
    gradeIds: stringList(row.grade_ids),
    createdByProfileId: asString(row.created_by_profile_id),
    createdAt: asIso(row.created_at as DbDate),
    updatedAt: asIso(row.updated_at as DbDate),
  };
}

function mapInvitation(row: DbRow): InvitationRecord {
  return {
    id: asString(row.id),
    classId: asString(row.class_id),
    role: invitationRole(row.role),
    code: asString(row.code),
    invitedProfileId: asNullableString(row.invited_profile_id),
    invitedProfileName: asNullableString(row.invited_profile_name),
    invitedByProfileId: asString(row.invited_by_profile_id),
    status: invitationStatus(row.status),
    expiresAt: asNullableIso(row.expires_at as DbDate),
    acceptedByProfileId: asNullableString(row.accepted_by_profile_id),
    acceptedAt: asNullableIso(row.accepted_at as DbDate),
    createdAt: asIso(row.created_at as DbDate),
  };
}

function mapAssignment(row: DbRow): AssignmentRecord {
  return {
    id: asString(row.id),
    classId: asString(row.class_id),
    title: asString(row.title),
    instructions: asString(row.instructions),
    resourceType: resourceType(row.resource_type),
    resourceId: asString(row.resource_id),
    resourceTitle: asString(row.resource_title),
    targetScope: row.target_scope === "individual" ? "individual" : "class",
    startAt: asNullableIso(row.start_at as DbDate),
    dueAt: asNullableIso(row.due_at as DbDate),
    attemptLimit:
      row.attempt_limit === null || row.attempt_limit === undefined
        ? null
        : asNumber(row.attempt_limit),
    lateSubmissionRule:
      row.late_submission_rule === "allow" || row.late_submission_rule === "forbid"
        ? row.late_submission_rule
        : "flag",
    status: assignmentStatus(row.status),
    createdByProfileId: asString(row.created_by_profile_id),
    createdAt: asIso(row.created_at as DbDate),
    updatedAt: asIso(row.updated_at as DbDate),
    targets: [],
  };
}

function mapSubmission(row: DbRow): SubmissionRecord {
  const response = parseJson<unknown>(row.response_json, {});
  return {
    id: asString(row.id),
    assignmentId: asString(row.assignment_id),
    profileId: asString(row.profile_id),
    displayName: asString(row.display_name),
    attemptNumber: Math.max(1, asNumber(row.attempt_number, 1)),
    status: submissionStatus(row.status),
    response:
      response && typeof response === "object" && !Array.isArray(response) && "text" in response
        ? asString((response as { text?: unknown }).text)
        : typeof response === "string"
          ? response
          : asString(row.response_json, "{}"),
    isLate: asBoolean(row.is_late),
    submittedAt: asNullableIso(row.submitted_at as DbDate),
    returnedAt: asNullableIso(row.returned_at as DbDate),
    grade: row.grade === null || row.grade === undefined ? null : asNumber(row.grade),
    gradeMax: asNumber(row.grade_max, 100),
    teacherFeedback: asNullableString(row.teacher_feedback_body),
    rubricScores: parseJson<Record<string, number>>(row.rubric_scores_json, {}),
    reviewedByProfileId: asNullableString(row.reviewed_by_profile_id),
    reviewedAt: asNullableIso(row.reviewed_at as DbDate),
    createdAt: asIso(row.created_at as DbDate),
    updatedAt: asIso(row.updated_at as DbDate),
  };
}

function mapRubric(row: DbRow): GradingRubricRecord {
  const criteria = parseJson<unknown>(row.criteria_json, []);
  return {
    id: asString(row.id),
    assignmentId: asString(row.assignment_id),
    title: asString(row.title),
    criteria: Array.isArray(criteria)
      ? criteria.filter(
          (item): item is { id: string; label: string; maxPoints: number } =>
            Boolean(item) &&
            typeof item === "object" &&
            typeof (item as { id?: unknown }).id === "string" &&
            typeof (item as { label?: unknown }).label === "string" &&
            typeof (item as { maxPoints?: unknown }).maxPoints === "number",
        )
      : [],
    createdAt: asIso(row.created_at as DbDate),
    updatedAt: asIso(row.updated_at as DbDate),
  };
}

export class SqlClassroomRepository implements ClassroomRepository {
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

  async listClasses(profileId: string, includeAll = false): Promise<readonly ClassroomListItem[]> {
    const sqliteFilter = includeAll
      ? ""
      : "WHERE c.created_by_profile_id = ? OR EXISTS (SELECT 1 FROM class_teachers f WHERE f.class_id = c.id AND f.profile_id = ?) OR EXISTS (SELECT 1 FROM class_members m WHERE m.class_id = c.id AND m.profile_id = ? AND m.status = 'active')";
    const postgresFilter = includeAll
      ? ""
      : "WHERE c.created_by_profile_id = $1 OR EXISTS (SELECT 1 FROM class_teachers f WHERE f.class_id = c.id AND f.profile_id = $1) OR EXISTS (SELECT 1 FROM class_members m WHERE m.class_id = c.id AND m.profile_id = $1 AND m.status = 'active')";
    const queryValues = includeAll
      ? []
      : this.database.provider === "sqlite"
        ? [profileId, profileId, profileId, profileId, profileId]
        : [profileId];
    const rows = await this.rows<DbRow>(
      `SELECT c.*, CASE WHEN EXISTS (SELECT 1 FROM class_teachers f WHERE f.class_id = c.id AND f.profile_id = ${includeAll ? "c.created_by_profile_id" : "?"}) THEN COALESCE((SELECT f.role FROM class_teachers f WHERE f.class_id = c.id AND f.profile_id = ${includeAll ? "c.created_by_profile_id" : "?"} LIMIT 1), 'teacher') ELSE 'learner' END AS membership_role,
              (SELECT COUNT(*) FROM class_members m WHERE m.class_id = c.id AND m.status = 'active') AS member_count,
              (SELECT COUNT(*) FROM assignments a WHERE a.class_id = c.id AND a.status <> 'archived') AS assignment_count
       FROM classes c ${sqliteFilter} ORDER BY c.updated_at DESC, c.id`,
      `SELECT c.*, CASE WHEN EXISTS (SELECT 1 FROM class_teachers f WHERE f.class_id = c.id AND f.profile_id = ${includeAll ? "c.created_by_profile_id" : "$1"}) THEN COALESCE((SELECT f.role FROM class_teachers f WHERE f.class_id = c.id AND f.profile_id = ${includeAll ? "c.created_by_profile_id" : "$1"} LIMIT 1), 'teacher') ELSE 'learner' END AS membership_role,
              (SELECT COUNT(*) FROM class_members m WHERE m.class_id = c.id AND m.status = 'active') AS member_count,
              (SELECT COUNT(*) FROM assignments a WHERE a.class_id = c.id AND a.status <> 'archived') AS assignment_count
       FROM classes c ${postgresFilter} ORDER BY c.updated_at DESC, c.id`,
      queryValues,
    );
    return rows.map((row) => ({
      ...mapClassroom(row),
      role: classRole(row.membership_role),
      memberCount: asNumber(row.member_count),
      assignmentCount: asNumber(row.assignment_count),
    }));
  }

  async getClassroom(classId: string): Promise<ClassroomRecord | null> {
    const row = await this.one<DbRow>(
      "SELECT * FROM classes WHERE id = ?",
      "SELECT * FROM classes WHERE id = $1",
      [classId],
    );
    return row ? mapClassroom(row) : null;
  }

  async getAccess(classId: string, profileId: string): Promise<ClassroomAccess | null> {
    const row = await this.one<DbRow>(
      `SELECT c.id, c.created_by_profile_id,
              EXISTS (SELECT 1 FROM class_teachers ct WHERE ct.class_id = c.id AND ct.profile_id = ?) AS is_teacher,
              EXISTS (SELECT 1 FROM class_members cm WHERE cm.class_id = c.id AND cm.profile_id = ? AND cm.status = 'active') AS is_member
       FROM classes c WHERE c.id = ? AND (c.created_by_profile_id = ? OR EXISTS (SELECT 1 FROM class_teachers ct WHERE ct.class_id = c.id AND ct.profile_id = ?) OR EXISTS (SELECT 1 FROM class_members cm WHERE cm.class_id = c.id AND cm.profile_id = ? AND cm.status = 'active'))`,
      `SELECT c.id, c.created_by_profile_id,
              EXISTS (SELECT 1 FROM class_teachers ct WHERE ct.class_id = c.id AND ct.profile_id = $1) AS is_teacher,
              EXISTS (SELECT 1 FROM class_members cm WHERE cm.class_id = c.id AND cm.profile_id = $2 AND cm.status = 'active') AS is_member
       FROM classes c WHERE c.id = $3 AND (c.created_by_profile_id = $4 OR EXISTS (SELECT 1 FROM class_teachers ct WHERE ct.class_id = c.id AND ct.profile_id = $5) OR EXISTS (SELECT 1 FROM class_members cm WHERE cm.class_id = c.id AND cm.profile_id = $6 AND cm.status = 'active'))`,
      [profileId, profileId, classId, profileId, profileId, profileId],
    );
    if (!row) return null;
    return {
      classId,
      profileId,
      isOwner: asString(row.created_by_profile_id) === profileId,
      isTeacher: asBoolean(row.is_teacher),
      isMember: asBoolean(row.is_member),
    };
  }

  async getClassroomDetail(classId: string): Promise<ClassroomDetail | null> {
    const classroom = await this.getClassroom(classId);
    if (!classroom) return null;
    const [
      teacherRows,
      memberRows,
      invitationRows,
      assignmentRows,
      targetRows,
      submissionRows,
      rubricRows,
    ] = await Promise.all([
      this.rows<DbRow>(
        `SELECT p.id AS profile_id, p.display_name, p.avatar, ct.role, ct.created_at AS joined_at, 'active' AS status
           FROM class_teachers ct JOIN profiles p ON p.id = ct.profile_id WHERE ct.class_id = ? ORDER BY ct.role, p.display_name`,
        `SELECT p.id AS profile_id, p.display_name, p.avatar, ct.role, ct.created_at AS joined_at, 'active' AS status
           FROM class_teachers ct JOIN profiles p ON p.id = ct.profile_id WHERE ct.class_id = $1 ORDER BY ct.role, p.display_name`,
        [classId],
      ),
      this.rows<DbRow>(
        `SELECT p.id AS profile_id, p.display_name, p.avatar, 'learner' AS role, cm.joined_at, cm.status
           FROM class_members cm JOIN profiles p ON p.id = cm.profile_id WHERE cm.class_id = ? AND cm.status = 'active' ORDER BY p.display_name`,
        `SELECT p.id AS profile_id, p.display_name, p.avatar, 'learner' AS role, cm.joined_at, cm.status
           FROM class_members cm JOIN profiles p ON p.id = cm.profile_id WHERE cm.class_id = $1 AND cm.status = 'active' ORDER BY p.display_name`,
        [classId],
      ),
      this.invitationRows(classId),
      this.rows<DbRow>(
        `SELECT * FROM assignments WHERE class_id = ? ORDER BY COALESCE(due_at, start_at, created_at) DESC, id`,
        `SELECT * FROM assignments WHERE class_id = $1 ORDER BY COALESCE(due_at, start_at, created_at) DESC, id`,
        [classId],
      ),
      this.rows<DbRow>(
        `SELECT at.assignment_id, at.profile_id, p.display_name FROM assignment_targets at JOIN profiles p ON p.id = at.profile_id JOIN assignments a ON a.id = at.assignment_id WHERE a.class_id = ? ORDER BY at.assignment_id, p.display_name`,
        `SELECT at.assignment_id, at.profile_id, p.display_name FROM assignment_targets at JOIN profiles p ON p.id = at.profile_id JOIN assignments a ON a.id = at.assignment_id WHERE a.class_id = $1 ORDER BY at.assignment_id, p.display_name`,
        [classId],
      ),
      this.submissionRows(classId),
      this.rows<DbRow>(
        `SELECT gr.* FROM grading_rubrics gr JOIN assignments a ON a.id = gr.assignment_id WHERE a.class_id = ? ORDER BY gr.assignment_id, gr.created_at`,
        `SELECT gr.* FROM grading_rubrics gr JOIN assignments a ON a.id = gr.assignment_id WHERE a.class_id = $1 ORDER BY gr.assignment_id, gr.created_at`,
        [classId],
      ),
    ]);

    const teachers = teacherRows.map((row) => ({
      profileId: asString(row.profile_id),
      displayName: asString(row.display_name),
      avatar: asString(row.avatar, "orbit"),
      role: row.role === "owner" ? ("owner" as const) : ("teacher" as const),
      joinedAt: asIso(row.joined_at as DbDate),
      status: "active" as const,
    }));
    const members = memberRows.map((row) => ({
      profileId: asString(row.profile_id),
      displayName: asString(row.display_name),
      avatar: asString(row.avatar, "orbit"),
      role: "learner" as const,
      joinedAt: asIso(row.joined_at as DbDate),
      status: "active" as const,
    }));
    const submissions = submissionRows.map(mapSubmission);
    const targetsByAssignment = new Map<string, AssignmentTargetRecord[]>();
    for (const row of targetRows) {
      const assignmentId = asString(row.assignment_id);
      const profileId = asString(row.profile_id);
      const profileSubmissions = submissions
        .filter(
          (submission) =>
            submission.assignmentId === assignmentId && submission.profileId === profileId,
        )
        .sort((left, right) => right.attemptNumber - left.attemptNumber);
      const latest = profileSubmissions[0];
      const target: AssignmentTargetRecord = {
        assignmentId,
        profileId,
        displayName: asString(row.display_name),
        status: latest?.status ?? "not-started",
        submissionCount: profileSubmissions.length,
        latestSubmissionId: latest?.id ?? null,
      };
      const existing = targetsByAssignment.get(assignmentId) ?? [];
      existing.push(target);
      targetsByAssignment.set(assignmentId, existing);
    }
    const assignments = assignmentRows.map((row) => {
      const assignment = mapAssignment(row);
      return { ...assignment, targets: targetsByAssignment.get(assignment.id) ?? [] };
    });
    return {
      classroom,
      teachers,
      members,
      invitations: invitationRows.map(mapInvitation),
      assignments,
      submissions,
      rubrics: rubricRows.map(mapRubric),
      analytics: null,
    };
  }

  private async invitationRows(classId: string): Promise<DbRow[]> {
    return this.rows<DbRow>(
      `SELECT i.*, p.display_name AS invited_profile_name FROM invitations i LEFT JOIN profiles p ON p.id = i.invited_profile_id WHERE i.class_id = ? ORDER BY i.created_at DESC, i.id`,
      `SELECT i.*, p.display_name AS invited_profile_name FROM invitations i LEFT JOIN profiles p ON p.id = i.invited_profile_id WHERE i.class_id = $1 ORDER BY i.created_at DESC, i.id`,
      [classId],
    );
  }

  private async submissionRows(classId: string): Promise<DbRow[]> {
    return this.rows<DbRow>(
      `SELECT s.*, p.display_name,
              tf.body AS teacher_feedback_body, tf.rubric_scores_json
       FROM assignment_submissions s
       JOIN profiles p ON p.id = s.profile_id
       JOIN assignments a ON a.id = s.assignment_id
       LEFT JOIN teacher_feedback tf ON tf.id = (SELECT tf2.id FROM teacher_feedback tf2 WHERE tf2.submission_id = s.id ORDER BY tf2.created_at DESC, tf2.id DESC LIMIT 1)
       WHERE a.class_id = ? ORDER BY s.assignment_id, s.profile_id, s.attempt_number DESC`,
      `SELECT s.*, p.display_name,
              tf.body AS teacher_feedback_body, tf.rubric_scores_json
       FROM assignment_submissions s
       JOIN profiles p ON p.id = s.profile_id
       JOIN assignments a ON a.id = s.assignment_id
       LEFT JOIN teacher_feedback tf ON tf.id = (SELECT tf2.id FROM teacher_feedback tf2 WHERE tf2.submission_id = s.id ORDER BY tf2.created_at DESC, tf2.id DESC LIMIT 1)
       WHERE a.class_id = $1 ORDER BY s.assignment_id, s.profile_id, s.attempt_number DESC`,
      [classId],
    );
  }

  async listAssignableResources(): Promise<readonly AssignableResource[]> {
    const rows = await this.rows<DbRow>(
      `SELECT 'lesson' AS resource_type, id, title, summary AS description FROM lessons WHERE status = 'published'
       UNION ALL SELECT 'course', id, title, description FROM courses WHERE status = 'published'
       UNION ALL SELECT 'exercise-set', id, title, description FROM exercise_sets WHERE status = 'published'
       UNION ALL SELECT 'assessment', id, title, description FROM assessments WHERE status = 'published'
       UNION ALL SELECT 'simulation', id, title, description FROM simulations WHERE status = 'published'
       UNION ALL SELECT 'laboratory', id, title, description FROM laboratory_activities WHERE status = 'published'
       UNION ALL SELECT 'roadmap', id, title, description FROM roadmaps WHERE status = 'published'
       ORDER BY title, resource_type, id`,
      `SELECT 'lesson' AS resource_type, id, title, summary AS description FROM lessons WHERE status = 'published'
       UNION ALL SELECT 'course', id, title, description FROM courses WHERE status = 'published'
       UNION ALL SELECT 'exercise-set', id, title, description FROM exercise_sets WHERE status = 'published'
       UNION ALL SELECT 'assessment', id, title, description FROM assessments WHERE status = 'published'
       UNION ALL SELECT 'simulation', id, title, description FROM simulations WHERE status = 'published'
       UNION ALL SELECT 'laboratory', id, title, description FROM laboratory_activities WHERE status = 'published'
       UNION ALL SELECT 'roadmap', id, title, description FROM roadmaps WHERE status = 'published'
       ORDER BY title, resource_type, id`,
    );
    return rows.map((row) => ({
      type: resourceType(row.resource_type),
      id: asString(row.id),
      title: asString(row.title),
      description: asString(row.description),
      status: "published" as const,
    }));
  }

  async getAssignableResource(
    type: AssignableResource["type"],
    id: string,
  ): Promise<AssignableResource | null> {
    return (
      (await this.listAssignableResources()).find(
        (resource) => resource.type === type && resource.id === id,
      ) ?? null
    );
  }

  async getProfile(
    profileId: string,
  ): Promise<{ id: string; displayName: string; avatar: string } | null> {
    const row = await this.one<DbRow>(
      "SELECT id, display_name, avatar FROM profiles WHERE id = ?",
      "SELECT id, display_name, avatar FROM profiles WHERE id = $1",
      [profileId],
    );
    return row
      ? {
          id: asString(row.id),
          displayName: asString(row.display_name),
          avatar: asString(row.avatar, "orbit"),
        }
      : null;
  }

  async createClassroom(input: CreateClassroomInput): Promise<ClassroomRecord> {
    const values = [
      input.id,
      input.name,
      input.description,
      input.joinCode,
      JSON.stringify(input.subjectIds),
      JSON.stringify(input.gradeIds),
      input.createdByProfileId,
    ];
    if (this.database.provider === "sqlite") {
      const database = this.database.raw;
      database.transaction(() => {
        database
          .prepare(
            `INSERT INTO classes (id, name, description, join_code, subject_ids, grade_ids, created_by_profile_id) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          )
          .run(...values);
        database
          .prepare(`INSERT INTO class_teachers (class_id, profile_id, role) VALUES (?, ?, 'owner')`)
          .run(input.id, input.createdByProfileId);
      })();
    } else {
      await this.database.raw.begin(async (transaction) => {
        await transaction`
          INSERT INTO classes (id, name, description, join_code, subject_ids, grade_ids, created_by_profile_id)
          VALUES (${input.id}, ${input.name}, ${input.description}, ${input.joinCode}, ${JSON.stringify(input.subjectIds)}, ${JSON.stringify(input.gradeIds)}, ${input.createdByProfileId})
        `;
        await transaction`
          INSERT INTO class_teachers (class_id, profile_id, role) VALUES (${input.id}, ${input.createdByProfileId}, 'owner')
        `;
      });
    }
    const created = await this.getClassroom(input.id);
    if (!created) throw new NotFoundError("Classroom", input.id);
    return created;
  }

  async updateClassroom(classId: string, input: UpdateClassroomInput): Promise<ClassroomRecord> {
    await this.execute(
      `UPDATE classes SET name = ?, description = ?, subject_ids = ?, grade_ids = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      `UPDATE classes SET name = $1, description = $2, subject_ids = $3, grade_ids = $4, updated_at = NOW() WHERE id = $5`,
      [
        input.name,
        input.description,
        JSON.stringify(input.subjectIds),
        JSON.stringify(input.gradeIds),
        classId,
      ],
    );
    const updated = await this.getClassroom(classId);
    if (!updated) throw new NotFoundError("Classroom", classId);
    return updated;
  }

  async joinClassroom(classId: string, profileId: string): Promise<void> {
    if (!(await this.getClassroom(classId))) throw new NotFoundError("Classroom", classId);
    await this.execute(
      `INSERT INTO class_members (class_id, profile_id, status) VALUES (?, ?, 'active') ON CONFLICT(class_id, profile_id) DO UPDATE SET status = 'active', updated_at = CURRENT_TIMESTAMP`,
      `INSERT INTO class_members (class_id, profile_id, status) VALUES ($1, $2, 'active') ON CONFLICT (class_id, profile_id) DO UPDATE SET status = 'active', updated_at = NOW()`,
      [classId, profileId],
    );
  }

  async addTeacher(classId: string, profileId: string, role: "owner" | "teacher"): Promise<void> {
    if (!(await this.getClassroom(classId))) throw new NotFoundError("Classroom", classId);
    await this.execute(
      `INSERT INTO class_teachers (class_id, profile_id, role) VALUES (?, ?, ?) ON CONFLICT(class_id, profile_id) DO UPDATE SET role = excluded.role`,
      `INSERT INTO class_teachers (class_id, profile_id, role) VALUES ($1, $2, $3) ON CONFLICT (class_id, profile_id) DO UPDATE SET role = EXCLUDED.role`,
      [classId, profileId, role],
    );
  }

  async createInvitation(input: CreateInvitationInput): Promise<InvitationRecord> {
    await this.execute(
      `INSERT INTO invitations (id, class_id, role, code, invited_profile_id, invited_by_profile_id, status, expires_at) VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)`,
      `INSERT INTO invitations (id, class_id, role, code, invited_profile_id, invited_by_profile_id, status, expires_at) VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7)`,
      [
        input.id,
        input.classId,
        input.role,
        input.code,
        input.invitedProfileId,
        input.invitedByProfileId,
        input.expiresAt,
      ],
    );
    const row = await this.one<DbRow>(
      `SELECT i.*, p.display_name AS invited_profile_name FROM invitations i LEFT JOIN profiles p ON p.id = i.invited_profile_id WHERE i.id = ?`,
      `SELECT i.*, p.display_name AS invited_profile_name FROM invitations i LEFT JOIN profiles p ON p.id = i.invited_profile_id WHERE i.id = $1`,
      [input.id],
    );
    if (!row) throw new NotFoundError("Invitation", input.id);
    return mapInvitation(row);
  }

  async listInvitations(classId: string): Promise<readonly InvitationRecord[]> {
    return (await this.invitationRows(classId)).map(mapInvitation);
  }

  async acceptInvitation(invitationId: string, profileId: string): Promise<InvitationRecord> {
    const row = await this.one<DbRow>(
      "SELECT * FROM invitations WHERE id = ?",
      "SELECT * FROM invitations WHERE id = $1",
      [invitationId],
    );
    if (!row) throw new NotFoundError("Invitation", invitationId);
    if (asString(row.status) !== "pending")
      throw new ConflictError("This invitation is no longer pending.");
    const expiresAt = row.expires_at as DbDate;
    if (expiresAt && Date.parse(asIso(expiresAt)) <= Date.now()) {
      await this.execute(
        "UPDATE invitations SET status = 'expired' WHERE id = ?",
        "UPDATE invitations SET status = 'expired' WHERE id = $1",
        [invitationId],
      );
      throw new ConflictError("This invitation has expired.");
    }
    if (row.invited_profile_id && asString(row.invited_profile_id) !== profileId) {
      throw new ConflictError("This invitation was issued to another profile.");
    }
    const role = invitationRole(row.role);
    if (role === "teacher") await this.addTeacher(asString(row.class_id), profileId, "teacher");
    else await this.joinClassroom(asString(row.class_id), profileId);
    await this.execute(
      `UPDATE invitations SET status = 'accepted', accepted_by_profile_id = ?, accepted_at = CURRENT_TIMESTAMP WHERE id = ?`,
      `UPDATE invitations SET status = 'accepted', accepted_by_profile_id = $1, accepted_at = NOW() WHERE id = $2`,
      [profileId, invitationId],
    );
    const accepted = await this.one<DbRow>(
      `SELECT i.*, p.display_name AS invited_profile_name FROM invitations i LEFT JOIN profiles p ON p.id = i.invited_profile_id WHERE i.id = ?`,
      `SELECT i.*, p.display_name AS invited_profile_name FROM invitations i LEFT JOIN profiles p ON p.id = i.invited_profile_id WHERE i.id = $1`,
      [invitationId],
    );
    if (!accepted) throw new NotFoundError("Invitation", invitationId);
    return mapInvitation(accepted);
  }

  async acceptInvitationByCode(code: string, profileId: string): Promise<InvitationRecord> {
    const row = await this.one<DbRow>(
      "SELECT id FROM invitations WHERE code = ?",
      "SELECT id FROM invitations WHERE code = $1",
      [code],
    );
    if (!row) throw new NotFoundError("Invitation", code);
    return this.acceptInvitation(asString(row.id), profileId);
  }

  async joinByCode(joinCode: string, profileId: string): Promise<ClassroomRecord> {
    const row = await this.one<DbRow>(
      "SELECT * FROM classes WHERE join_code = ?",
      "SELECT * FROM classes WHERE join_code = $1",
      [joinCode],
    );
    if (!row) throw new NotFoundError("Classroom for join code", joinCode);
    await this.joinClassroom(asString(row.id), profileId);
    return mapClassroom(row);
  }

  async createAssignment(input: CreateAssignmentInput): Promise<AssignmentRecord> {
    const values = [
      input.id,
      input.classId,
      input.title,
      input.instructions,
      input.resourceType,
      input.resourceId,
      input.resourceTitle,
      input.targetScope,
      input.startAt,
      input.dueAt,
      input.attemptLimit,
      input.lateSubmissionRule,
      input.createdByProfileId,
    ];
    if (this.database.provider === "sqlite") {
      const database = this.database.raw;
      database.transaction(() => {
        database
          .prepare(
            `INSERT INTO assignments (id, class_id, title, instructions, resource_type, resource_id, resource_title, target_scope, start_at, due_at, attempt_limit, late_submission_rule, status, created_by_profile_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'published', ?)`,
          )
          .run(...values);
        const insertTarget = database.prepare(
          "INSERT INTO assignment_targets (assignment_id, profile_id) VALUES (?, ?)",
        );
        for (const profileId of input.targetProfileIds) insertTarget.run(input.id, profileId);
        if (input.rubric) {
          database
            .prepare(
              `INSERT INTO grading_rubrics (id, assignment_id, title, criteria_json) VALUES (?, ?, ?, ?)`,
            )
            .run(
              input.rubric.id,
              input.id,
              input.rubric.title,
              JSON.stringify(input.rubric.criteria),
            );
        }
      })();
    } else {
      await this.database.raw.begin(async (transaction) => {
        await transaction`
          INSERT INTO assignments (id, class_id, title, instructions, resource_type, resource_id, resource_title, target_scope, start_at, due_at, attempt_limit, late_submission_rule, status, created_by_profile_id)
          VALUES (${input.id}, ${input.classId}, ${input.title}, ${input.instructions}, ${input.resourceType}, ${input.resourceId}, ${input.resourceTitle}, ${input.targetScope}, ${input.startAt}, ${input.dueAt}, ${input.attemptLimit}, ${input.lateSubmissionRule}, 'published', ${input.createdByProfileId})
        `;
        for (const profileId of input.targetProfileIds) {
          await transaction`
            INSERT INTO assignment_targets (assignment_id, profile_id) VALUES (${input.id}, ${profileId})
          `;
        }
        if (input.rubric) {
          await transaction`
            INSERT INTO grading_rubrics (id, assignment_id, title, criteria_json)
            VALUES (${input.rubric.id}, ${input.id}, ${input.rubric.title}, ${JSON.stringify(input.rubric.criteria)})
          `;
        }
      });
    }
    const created = await this.getAssignment(input.id);
    if (!created) throw new NotFoundError("Assignment", input.id);
    return created;
  }

  async getAssignment(assignmentId: string): Promise<AssignmentRecord | null> {
    const row = await this.one<DbRow>(
      "SELECT class_id FROM assignments WHERE id = ?",
      "SELECT class_id FROM assignments WHERE id = $1",
      [assignmentId],
    );
    if (!row) return null;
    const detail = await this.getClassroomDetail(asString(row.class_id));
    return detail?.assignments.find((assignment) => assignment.id === assignmentId) ?? null;
  }

  async createSubmission(input: CreateSubmissionInput): Promise<SubmissionRecord> {
    await this.execute(
      `INSERT INTO assignment_submissions (id, assignment_id, profile_id, attempt_number, status, response_json, is_late, submitted_at) VALUES (?, ?, ?, ?, 'submitted', ?, ?, ?)`,
      `INSERT INTO assignment_submissions (id, assignment_id, profile_id, attempt_number, status, response_json, is_late, submitted_at) VALUES ($1, $2, $3, $4, 'submitted', $5, $6, $7)`,
      [
        input.id,
        input.assignmentId,
        input.profileId,
        input.attemptNumber,
        JSON.stringify({ text: input.response }),
        this.database.provider === "sqlite" ? (input.isLate ? 1 : 0) : input.isLate,
        input.submittedAt,
      ],
    );
    const classId = await this.getAssignmentClassId(input.assignmentId);
    const submission = classId
      ? (await this.getClassroomDetail(classId))?.submissions.find((item) => item.id === input.id)
      : null;
    if (!submission) throw new NotFoundError("Submission", input.id);
    return submission;
  }

  private async getAssignmentClassId(assignmentId: string): Promise<string | null> {
    const row = await this.one<DbRow>(
      "SELECT class_id FROM assignments WHERE id = ?",
      "SELECT class_id FROM assignments WHERE id = $1",
      [assignmentId],
    );
    return row ? asString(row.class_id) : null;
  }

  async reviewSubmission(
    submissionId: string,
    input: ReviewSubmissionInput,
  ): Promise<SubmissionRecord> {
    const row = await this.one<DbRow>(
      `SELECT s.assignment_id, a.class_id FROM assignment_submissions s JOIN assignments a ON a.id = s.assignment_id WHERE s.id = ?`,
      `SELECT s.assignment_id, a.class_id FROM assignment_submissions s JOIN assignments a ON a.id = s.assignment_id WHERE s.id = $1`,
      [submissionId],
    );
    if (!row) throw new NotFoundError("Submission", submissionId);
    const feedbackId = randomUUID();
    const returnedAt =
      input.status === "returned" || input.status === "resubmission-required"
        ? input.reviewedAt
        : null;
    if (this.database.provider === "sqlite") {
      const database = this.database.raw;
      database.transaction(() => {
        database
          .prepare(
            `UPDATE assignment_submissions SET status = ?, returned_at = ?, grade = ?, grade_max = ?, reviewed_by_profile_id = ?, reviewed_at = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
          )
          .run(
            input.status,
            returnedAt,
            input.grade,
            input.gradeMax,
            input.reviewedByProfileId,
            input.reviewedAt,
            submissionId,
          );
        database
          .prepare(
            `INSERT INTO teacher_feedback (id, submission_id, teacher_profile_id, body, grade, grade_max, rubric_scores_json, return_for_resubmission) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          )
          .run(
            feedbackId,
            submissionId,
            input.reviewedByProfileId,
            input.feedback,
            input.grade,
            input.gradeMax,
            JSON.stringify(input.rubricScores),
            input.status === "resubmission-required" ? 1 : 0,
          );
      })();
    } else {
      await this.database.raw.begin(async (transaction) => {
        await transaction`
          UPDATE assignment_submissions SET status = ${input.status}, returned_at = ${returnedAt}, grade = ${input.grade}, grade_max = ${input.gradeMax}, reviewed_by_profile_id = ${input.reviewedByProfileId}, reviewed_at = ${input.reviewedAt}, updated_at = NOW() WHERE id = ${submissionId}
        `;
        await transaction`
          INSERT INTO teacher_feedback (id, submission_id, teacher_profile_id, body, grade, grade_max, rubric_scores_json, return_for_resubmission)
          VALUES (${feedbackId}, ${submissionId}, ${input.reviewedByProfileId}, ${input.feedback}, ${input.grade}, ${input.gradeMax}, ${JSON.stringify(input.rubricScores)}, ${input.status === "resubmission-required"})
        `;
      });
    }
    const detail = await this.getClassroomDetail(asString(row.class_id));
    const submission = detail?.submissions.find((item) => item.id === submissionId);
    if (!submission) throw new NotFoundError("Submission", submissionId);
    return submission;
  }

  async listClassroomAnalytics(classId: string): Promise<ClassroomAnalytics> {
    const detail = await this.getClassroomDetail(classId);
    if (!detail) throw new NotFoundError("Classroom", classId);
    const assignments = detail.assignments.filter((assignment) => assignment.status !== "archived");
    const submissions = detail.submissions.filter((submission) => submission.status !== "draft");
    const targetRows = assignments.flatMap((assignment) => assignment.targets);
    const graded = submissions.filter((submission) => submission.grade !== null);
    const gradeValues = graded.map((submission) => submission.grade! / submission.gradeMax);
    const learners = detail.members.map((member) => {
      const targets = targetRows.filter((target) => target.profileId === member.profileId);
      const learnerSubmissions = submissions.filter(
        (submission) => submission.profileId === member.profileId,
      );
      const learnerGraded = learnerSubmissions.filter((submission) => submission.grade !== null);
      const learnerGrades = learnerGraded.map(
        (submission) => submission.grade! / submission.gradeMax,
      );
      return {
        profileId: member.profileId,
        displayName: member.displayName,
        assignedCount: targets.length,
        submittedCount: learnerSubmissions.length,
        gradedCount: learnerGraded.length,
        averageGrade: learnerGrades.length
          ? learnerGrades.reduce((sum, value) => sum + value, 0) / learnerGrades.length
          : null,
        completionRate: targets.length ? learnerSubmissions.length / targets.length : 0,
      };
    });
    return {
      classId,
      memberCount: detail.members.length,
      assignmentCount: assignments.length,
      submissionCount: submissions.length,
      gradedSubmissionCount: graded.length,
      lateSubmissionCount: submissions.filter((submission) => submission.isLate).length,
      averageGrade: gradeValues.length
        ? gradeValues.reduce((sum, value) => sum + value, 0) / gradeValues.length
        : null,
      completionRate: targetRows.length ? submissions.length / targetRows.length : 0,
      learners,
    };
  }
}

export function getClassroomRepository(database?: DatabaseHandle): ClassroomRepository {
  return new SqlClassroomRepository(database);
}
