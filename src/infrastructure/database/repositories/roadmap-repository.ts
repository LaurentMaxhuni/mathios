import { randomUUID } from "node:crypto";
import { NotFoundError } from "@/domain/errors/application-error";
import { buildRoadmapIntegrityReport, computeRoadmapProgress } from "@/domain/roadmap/rules";
import type {
  CreateRoadmapInput,
  PersonalizedPathRecord,
  RoadmapCatalogEntry,
  RoadmapDetail,
  RoadmapDifficulty,
  RoadmapEdgeRecord,
  RoadmapEdgeType,
  RoadmapLearningContext,
  RoadmapNodeRecord,
  RoadmapNodeType,
  RoadmapPrerequisiteRecord,
  RoadmapRecord,
  RoadmapSnapshot,
  RoadmapStatus,
  RoadmapSubjectRecord,
  RoadmapVersionRecord,
  SaveRoadmapEdgeInput,
  SaveRoadmapNodeInput,
  UpdateRoadmapInput,
  UserRoadmapDetail,
  UserRoadmapProgressRecord,
  UserRoadmapRecord,
  UserRoadmapStatus,
} from "@/domain/roadmap/types";
import type { RoadmapRepository } from "@/domain/ports/roadmap-repository";
import { getDatabase, type DatabaseHandle } from "@/infrastructure/database/client";

type DbDate = Date | string | null;
type DbBoolean = boolean | number | string;

interface RoadmapDbRow {
  id: string;
  slug: string;
  title: string;
  description: string;
  goal: string;
  target_grade_id: string | null;
  target_grade_name: string | null;
  target_difficulty: string;
  estimated_duration_minutes: number | string;
  cover_image: string | null;
  status: string;
  created_by_profile_id: string | null;
  current_version_number: number | string;
  published_version_id: string | null;
  created_at: DbDate;
  updated_at: DbDate;
}

interface VersionDbRow {
  id: string;
  roadmap_id: string;
  version_number: number | string;
  status: string;
  change_summary: string;
  snapshot: string | null;
  created_by_profile_id: string | null;
  created_at: DbDate;
  published_at: DbDate;
}

interface SubjectDbRow {
  roadmap_id: string;
  subject_id: string;
  sort_order: number | string;
  created_at: DbDate;
  subject_name: string;
  subject_slug: string;
}

interface PrerequisiteDbRow {
  roadmap_id: string;
  prerequisite_roadmap_id: string;
  is_required: DbBoolean;
  created_at: DbDate;
  prerequisite_title: string;
}

interface NodeDbRow {
  id: string;
  roadmap_version_id: string;
  node_key: string;
  node_type: string;
  title: string;
  description: string;
  reference_id: string | null;
  reference_title: string | null;
  subject_id: string | null;
  subject_name: string | null;
  is_required: DbBoolean;
  is_checkpoint: DbBoolean;
  is_optional_branch: DbBoolean;
  sort_order: number | string;
  estimated_duration_minutes: number | string;
  metadata: string | null;
  created_at: DbDate;
  updated_at: DbDate;
}

interface EdgeDbRow {
  id: string;
  roadmap_version_id: string;
  source_node_id: string;
  target_node_id: string;
  edge_type: string;
  sort_order: number | string;
  created_at: DbDate;
}

interface UserRoadmapDbRow {
  id: string;
  profile_id: string;
  roadmap_id: string;
  roadmap_version_id: string;
  status: string;
  selected_goal: string | null;
  started_at: DbDate;
  completed_at: DbDate;
  created_at: DbDate;
  updated_at: DbDate;
}

interface ProgressDbRow {
  user_roadmap_id: string;
  profile_id: string;
  roadmap_node_id: string;
  status: string;
  completion_percentage: number | string;
  unlocked_at: DbDate;
  started_at: DbDate;
  completed_at: DbDate;
  updated_at: DbDate;
}

interface ProfileContextDbRow {
  profile_id: string;
  current_grade_id: string | null;
  target_grade_id: string | null;
  preferred_subjects: string | null;
  learning_goals: string | null;
  weekly_study_time_minutes: number | string | null;
}

interface DiagnosticContextDbRow {
  weak_concept_ids: string | null;
  missing_prerequisite_concept_ids: string | null;
}

interface MasteryContextDbRow {
  concept_id: string;
  state: string;
  score: number | string;
  confidence: number | string;
  evidence_count: number | string;
}

interface PersonalizedPathDbRow {
  id: string;
  profile_id: string;
  roadmap_id: string;
  user_roadmap_id: string | null;
  current_grade_id: string | null;
  target_grade_id: string | null;
  selected_goal: string | null;
  weekly_study_time_minutes: number | string | null;
  estimated_duration_minutes: number | string;
  estimated_weeks: number | string | null;
  included_topics: string | null;
  skipped_mastered_topics: string | null;
  missing_prerequisites: string | null;
  path_nodes: string | null;
  generated_at: DbDate;
}

function asNumber(value: number | string | null | undefined): number {
  return typeof value === "number" ? value : Number(value ?? 0);
}

function asIso(value: DbDate): string {
  if (value instanceof Date) return value.toISOString();
  return value ?? new Date(0).toISOString();
}

function asNullableIso(value: DbDate): string | null {
  return value === null || value === undefined ? null : asIso(value);
}

function asBoolean(value: DbBoolean | null | undefined): boolean {
  return value === true || value === 1 || value === "1" || value === "true";
}

function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function roadmapStatus(value: string): RoadmapStatus {
  return value === "published" || value === "archived" ? value : "draft";
}

function userRoadmapStatus(value: string): UserRoadmapStatus {
  return value === "paused" || value === "completed" || value === "archived" ? value : "active";
}

function difficulty(value: string): RoadmapDifficulty {
  return value === "gentle" || value === "challenging" ? value : "balanced";
}

function nodeType(value: string): RoadmapNodeType {
  const types: readonly RoadmapNodeType[] = [
    "concept",
    "lesson",
    "course",
    "module",
    "assessment",
    "simulation",
    "laboratory-activity",
    "milestone",
  ];
  return types.includes(value as RoadmapNodeType) ? (value as RoadmapNodeType) : "milestone";
}

function edgeType(value: string): RoadmapEdgeType {
  return value === "recommended" || value === "optional" ? value : "requires";
}

function mapRoadmap(row: RoadmapDbRow): RoadmapRecord {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    goal: row.goal,
    targetGradeId: row.target_grade_id,
    targetDifficulty: difficulty(row.target_difficulty),
    estimatedDurationMinutes: asNumber(row.estimated_duration_minutes),
    coverImage: row.cover_image,
    status: roadmapStatus(row.status),
    createdByProfileId: row.created_by_profile_id,
    currentVersionNumber: asNumber(row.current_version_number),
    publishedVersionId: row.published_version_id,
    createdAt: asIso(row.created_at),
    updatedAt: asIso(row.updated_at),
  };
}

function mapVersion(row: VersionDbRow): RoadmapVersionRecord {
  return {
    id: row.id,
    roadmapId: row.roadmap_id,
    versionNumber: asNumber(row.version_number),
    status: roadmapStatus(row.status),
    changeSummary: row.change_summary,
    snapshot: parseJson<RoadmapSnapshot>(row.snapshot, {
      roadmap: {
        id: row.roadmap_id,
        slug: "",
        title: "",
        description: "",
        goal: "",
        targetGradeId: null,
        targetDifficulty: "balanced",
        estimatedDurationMinutes: 0,
        coverImage: null,
      },
      subjects: [],
      prerequisites: [],
      nodes: [],
      edges: [],
    }),
    createdByProfileId: row.created_by_profile_id,
    createdAt: asIso(row.created_at),
    publishedAt: asNullableIso(row.published_at),
  };
}

function mapSubject(row: SubjectDbRow): RoadmapSubjectRecord {
  return {
    roadmapId: row.roadmap_id,
    subjectId: row.subject_id,
    sortOrder: asNumber(row.sort_order),
    createdAt: asIso(row.created_at),
    subjectName: row.subject_name,
    subjectSlug: row.subject_slug,
  };
}

function mapPrerequisite(row: PrerequisiteDbRow): RoadmapPrerequisiteRecord {
  return {
    roadmapId: row.roadmap_id,
    prerequisiteRoadmapId: row.prerequisite_roadmap_id,
    isRequired: asBoolean(row.is_required),
    createdAt: asIso(row.created_at),
    prerequisiteTitle: row.prerequisite_title,
  };
}

function mapNode(row: NodeDbRow): RoadmapNodeRecord {
  return {
    id: row.id,
    roadmapVersionId: row.roadmap_version_id,
    nodeKey: row.node_key,
    type: nodeType(row.node_type),
    title: row.title,
    description: row.description,
    referenceId: row.reference_id,
    referenceTitle: row.reference_title,
    subjectId: row.subject_id,
    subjectName: row.subject_name,
    isRequired: asBoolean(row.is_required),
    isCheckpoint: asBoolean(row.is_checkpoint),
    isOptionalBranch: asBoolean(row.is_optional_branch),
    sortOrder: asNumber(row.sort_order),
    estimatedDurationMinutes: asNumber(row.estimated_duration_minutes),
    metadata: parseJson<Record<string, unknown>>(row.metadata, {}),
    createdAt: asIso(row.created_at),
    updatedAt: asIso(row.updated_at),
  };
}

function mapEdge(row: EdgeDbRow): RoadmapEdgeRecord {
  return {
    id: row.id,
    roadmapVersionId: row.roadmap_version_id,
    sourceNodeId: row.source_node_id,
    targetNodeId: row.target_node_id,
    type: edgeType(row.edge_type),
    sortOrder: asNumber(row.sort_order),
    createdAt: asIso(row.created_at),
  };
}

function mapEnrollment(row: UserRoadmapDbRow): UserRoadmapRecord {
  return {
    id: row.id,
    profileId: row.profile_id,
    roadmapId: row.roadmap_id,
    roadmapVersionId: row.roadmap_version_id,
    status: userRoadmapStatus(row.status),
    selectedGoal: row.selected_goal,
    startedAt: asIso(row.started_at),
    completedAt: asNullableIso(row.completed_at),
    createdAt: asIso(row.created_at),
    updatedAt: asIso(row.updated_at),
  };
}

function mapProgress(row: ProgressDbRow): UserRoadmapProgressRecord {
  const statuses = ["locked", "available", "in-progress", "completed", "skipped"] as const;
  return {
    userRoadmapId: row.user_roadmap_id,
    profileId: row.profile_id,
    roadmapNodeId: row.roadmap_node_id,
    status: statuses.includes(row.status as (typeof statuses)[number])
      ? (row.status as (typeof statuses)[number])
      : "locked",
    completionPercentage: Math.max(0, Math.min(100, asNumber(row.completion_percentage))),
    unlockedAt: asNullableIso(row.unlocked_at),
    startedAt: asNullableIso(row.started_at),
    completedAt: asNullableIso(row.completed_at),
    updatedAt: asIso(row.updated_at),
  };
}

function mapPath(row: PersonalizedPathDbRow): PersonalizedPathRecord {
  return {
    id: row.id,
    profileId: row.profile_id,
    roadmapId: row.roadmap_id,
    userRoadmapId: row.user_roadmap_id,
    currentGradeId: row.current_grade_id,
    targetGradeId: row.target_grade_id,
    selectedGoal: row.selected_goal,
    weeklyStudyTimeMinutes:
      row.weekly_study_time_minutes === null ? null : asNumber(row.weekly_study_time_minutes),
    estimatedDurationMinutes: asNumber(row.estimated_duration_minutes),
    estimatedWeeks: row.estimated_weeks === null ? null : asNumber(row.estimated_weeks),
    includedTopics: parseJson<string[]>(row.included_topics, []),
    skippedMasteredTopics: parseJson<string[]>(row.skipped_mastered_topics, []),
    missingPrerequisites: parseJson<string[]>(row.missing_prerequisites, []),
    pathNodes: parseJson<PersonalizedPathRecord["pathNodes"]>(row.path_nodes, []),
    generatedAt: asIso(row.generated_at),
  };
}

const roadmapSelect = `
  SELECT r.id, r.slug, r.title, r.description, r.goal, r.target_grade_id,
         g.name AS target_grade_name, r.target_difficulty, r.estimated_duration_minutes,
         r.cover_image, r.status, r.created_by_profile_id, r.current_version_number,
         r.published_version_id, r.created_at, r.updated_at
  FROM roadmaps r
  LEFT JOIN grades g ON g.id = r.target_grade_id
`;

const versionSelect = `
  SELECT id, roadmap_id, version_number, status, change_summary, snapshot,
         created_by_profile_id, created_at, published_at
  FROM roadmap_versions
`;

const subjectSelect = `
  SELECT rs.roadmap_id, rs.subject_id, rs.sort_order, rs.created_at,
         s.name AS subject_name, s.slug AS subject_slug
  FROM roadmap_subjects rs JOIN subjects s ON s.id = rs.subject_id
`;

const prerequisiteSelect = `
  SELECT rp.roadmap_id, rp.prerequisite_roadmap_id, rp.is_required, rp.created_at,
         prerequisite.title AS prerequisite_title
  FROM roadmap_prerequisites rp JOIN roadmaps prerequisite ON prerequisite.id = rp.prerequisite_roadmap_id
`;

const nodeSelect = `
  SELECT n.id, n.roadmap_version_id, n.node_key, n.node_type, n.title, n.description,
         n.reference_id, n.reference_title, n.subject_id, s.name AS subject_name,
         n.is_required, n.is_checkpoint, n.is_optional_branch, n.sort_order,
         n.estimated_duration_minutes, n.metadata, n.created_at, n.updated_at
  FROM roadmap_nodes n LEFT JOIN subjects s ON s.id = n.subject_id
`;

const edgeSelect = `
  SELECT id, roadmap_version_id, source_node_id, target_node_id, edge_type,
         sort_order, created_at
  FROM roadmap_edges
`;

const enrollmentSelect = `
  SELECT id, profile_id, roadmap_id, roadmap_version_id, status, selected_goal,
         started_at, completed_at, created_at, updated_at
  FROM user_roadmaps
`;

const progressSelect = `
  SELECT user_roadmap_id, profile_id, roadmap_node_id, status, completion_percentage,
         unlocked_at, started_at, completed_at, updated_at
  FROM user_roadmap_progress
`;

const pathSelect = `
  SELECT id, profile_id, roadmap_id, user_roadmap_id, current_grade_id, target_grade_id,
         selected_goal, weekly_study_time_minutes, estimated_duration_minutes, estimated_weeks,
         included_topics, skipped_mastered_topics, missing_prerequisites, path_nodes, generated_at
  FROM personalized_paths
`;

export class SqlRoadmapRepository implements RoadmapRepository {
  constructor(private readonly database: DatabaseHandle = getDatabase()) {}

  private async rows<T>(
    sqliteQuery: string,
    postgresQuery: string,
    values: readonly unknown[] = [],
  ): Promise<T[]> {
    if (this.database.provider === "sqlite") {
      return this.database.raw.prepare(sqliteQuery).all(...values) as T[];
    }
    return (await this.database.raw.unsafe(postgresQuery, values as never[])) as T[];
  }

  private async one<T>(
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
    if (this.database.provider === "sqlite") {
      this.database.raw.prepare(sqliteQuery).run(...values);
      return;
    }
    await this.database.raw.unsafe(postgresQuery, values as never[]);
  }

  private async getRoadmapRecord(id: string): Promise<RoadmapDbRow | undefined> {
    return this.one<RoadmapDbRow>(
      `${roadmapSelect} WHERE r.id = ?`,
      `${roadmapSelect} WHERE r.id = $1`,
      [id],
    );
  }

  private async getVersionDetail(
    record: RoadmapDbRow,
    versionId: string,
  ): Promise<RoadmapDetail | null> {
    const versionRow = await this.one<VersionDbRow>(
      `${versionSelect} WHERE id = ? AND roadmap_id = ?`,
      `${versionSelect} WHERE id = $1 AND roadmap_id = $2`,
      [versionId, record.id],
    );
    if (!versionRow) return null;
    const [subjectRows, prerequisiteRows, nodeRows, edgeRows] = await Promise.all([
      this.rows<SubjectDbRow>(
        `${subjectSelect} WHERE rs.roadmap_id = ? ORDER BY rs.sort_order, rs.subject_id`,
        `${subjectSelect} WHERE rs.roadmap_id = $1 ORDER BY rs.sort_order, rs.subject_id`,
        [record.id],
      ),
      this.rows<PrerequisiteDbRow>(
        `${prerequisiteSelect} WHERE rp.roadmap_id = ? ORDER BY prerequisite.title, rp.prerequisite_roadmap_id`,
        `${prerequisiteSelect} WHERE rp.roadmap_id = $1 ORDER BY prerequisite.title, rp.prerequisite_roadmap_id`,
        [record.id],
      ),
      this.rows<NodeDbRow>(
        `${nodeSelect} WHERE n.roadmap_version_id = ? ORDER BY n.sort_order, n.node_key`,
        `${nodeSelect} WHERE n.roadmap_version_id = $1 ORDER BY n.sort_order, n.node_key`,
        [versionId],
      ),
      this.rows<EdgeDbRow>(
        `${edgeSelect} WHERE roadmap_version_id = ? ORDER BY sort_order, id`,
        `${edgeSelect} WHERE roadmap_version_id = $1 ORDER BY sort_order, id`,
        [versionId],
      ),
    ]);
    const nodes = nodeRows.map(mapNode);
    const edges = edgeRows.map(mapEdge);
    return {
      roadmap: mapRoadmap(record),
      version: mapVersion(versionRow),
      subjects: subjectRows.map(mapSubject),
      prerequisites: prerequisiteRows.map(mapPrerequisite),
      nodes,
      edges,
      integrity: buildRoadmapIntegrityReport(nodes, edges),
    };
  }

  async listRoadmaps(
    options: {
      includeArchived?: boolean;
      includeDraft?: boolean;
      subjectId?: string;
      targetGradeId?: string;
    } = {},
  ): Promise<readonly RoadmapCatalogEntry[]> {
    const conditionsSqlite: string[] = [];
    const conditionsPostgres: string[] = [];
    const values: unknown[] = [];
    if (!options.includeArchived) {
      conditionsSqlite.push("r.status <> 'archived'");
      conditionsPostgres.push("r.status <> 'archived'");
    }
    if (!options.includeDraft) {
      conditionsSqlite.push("r.status = 'published'");
      conditionsPostgres.push("r.status = 'published'");
    }
    if (options.subjectId) {
      values.push(options.subjectId);
      conditionsSqlite.push(
        `EXISTS (SELECT 1 FROM roadmap_subjects filter_rs WHERE filter_rs.roadmap_id = r.id AND filter_rs.subject_id = ?)`,
      );
      conditionsPostgres.push(
        `EXISTS (SELECT 1 FROM roadmap_subjects filter_rs WHERE filter_rs.roadmap_id = r.id AND filter_rs.subject_id = $${values.length})`,
      );
    }
    if (options.targetGradeId) {
      values.push(options.targetGradeId);
      conditionsSqlite.push("r.target_grade_id = ?");
      conditionsPostgres.push(`r.target_grade_id = $${values.length}`);
    }
    const whereSqlite = conditionsSqlite.length ? ` WHERE ${conditionsSqlite.join(" AND ")}` : "";
    const wherePostgres = conditionsPostgres.length
      ? ` WHERE ${conditionsPostgres.join(" AND ")}`
      : "";
    const records = await this.rows<RoadmapDbRow>(
      `${roadmapSelect}${whereSqlite} ORDER BY r.updated_at DESC, r.title COLLATE NOCASE`,
      `${roadmapSelect}${wherePostgres} ORDER BY r.updated_at DESC, r.title`,
      values,
    );
    return Promise.all(
      records.map(async (record) => {
        const roadmap = mapRoadmap(record);
        const [subjects, version] = await Promise.all([
          this.rows<SubjectDbRow>(
            `${subjectSelect} WHERE rs.roadmap_id = ? ORDER BY rs.sort_order, rs.subject_id`,
            `${subjectSelect} WHERE rs.roadmap_id = $1 ORDER BY rs.sort_order, rs.subject_id`,
            [record.id],
          ),
          this.one<VersionDbRow>(
            `${versionSelect} WHERE id = ?`,
            `${versionSelect} WHERE id = $1`,
            [
              options.includeDraft
                ? `${record.id}-version-${record.current_version_number}`
                : (record.published_version_id ??
                  `${record.id}-version-${record.current_version_number}`),
            ],
          ),
        ]);
        const counts = version
          ? await this.one<{
              node_count: number | string;
              required_node_count: number | string;
              checkpoint_count: number | string;
            }>(
              `SELECT COUNT(*) AS node_count, SUM(CASE WHEN is_required = 1 THEN 1 ELSE 0 END) AS required_node_count, SUM(CASE WHEN is_checkpoint = 1 THEN 1 ELSE 0 END) AS checkpoint_count FROM roadmap_nodes WHERE roadmap_version_id = ?`,
              `SELECT COUNT(*) AS node_count, SUM(CASE WHEN is_required = TRUE THEN 1 ELSE 0 END) AS required_node_count, SUM(CASE WHEN is_checkpoint = TRUE THEN 1 ELSE 0 END) AS checkpoint_count FROM roadmap_nodes WHERE roadmap_version_id = $1`,
              [version.id],
            )
          : undefined;
        return {
          ...roadmap,
          targetGradeName: record.target_grade_name,
          subjectNames: subjects.map((subject) => subject.subject_name),
          nodeCount: asNumber(counts?.node_count),
          requiredNodeCount: asNumber(counts?.required_node_count),
          checkpointCount: asNumber(counts?.checkpoint_count),
        };
      }),
    );
  }

  async getRoadmap(
    id: string,
    options: { includeDraft?: boolean } = {},
  ): Promise<RoadmapDetail | null> {
    const record = await this.getRoadmapRecord(id);
    if (!record) return null;
    if (!options.includeDraft && record.status !== "published") return null;
    const versionId = options.includeDraft
      ? `${record.id}-version-${record.current_version_number}`
      : (record.published_version_id ?? `${record.id}-version-${record.current_version_number}`);
    return this.getVersionDetail(record, versionId);
  }

  async createRoadmap(input: CreateRoadmapInput): Promise<RoadmapRecord> {
    const versionId = `${input.id}-version-1`;
    await this.execute(
      `INSERT INTO roadmaps (id, slug, title, description, goal, target_grade_id, target_difficulty, estimated_duration_minutes, cover_image, status, created_by_profile_id, current_version_number, published_version_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NULL)`,
      `INSERT INTO roadmaps (id, slug, title, description, goal, target_grade_id, target_difficulty, estimated_duration_minutes, cover_image, status, created_by_profile_id, current_version_number, published_version_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 1, NULL)`,
      [
        input.id,
        input.slug,
        input.title,
        input.description,
        input.goal,
        input.targetGradeId,
        input.targetDifficulty,
        input.estimatedDurationMinutes,
        input.coverImage,
        input.status,
        input.createdByProfileId,
      ],
    );
    await this.execute(
      `INSERT INTO roadmap_versions (id, roadmap_id, version_number, status, change_summary, snapshot, created_by_profile_id) VALUES (?, ?, 1, ?, 'Initial roadmap draft.', '{}', ?)`,
      `INSERT INTO roadmap_versions (id, roadmap_id, version_number, status, change_summary, snapshot, created_by_profile_id) VALUES ($1, $2, 1, $3, 'Initial roadmap draft.', '{}', $4)`,
      [versionId, input.id, input.status, input.createdByProfileId],
    );
    const record = await this.getRoadmapRecord(input.id);
    if (!record) throw new NotFoundError("Roadmap", input.id);
    return mapRoadmap(record);
  }

  async updateRoadmap(id: string, input: UpdateRoadmapInput): Promise<RoadmapRecord> {
    await this.execute(
      `UPDATE roadmaps SET slug = ?, title = ?, description = ?, goal = ?, target_grade_id = ?, target_difficulty = ?, estimated_duration_minutes = ?, cover_image = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      `UPDATE roadmaps SET slug = $1, title = $2, description = $3, goal = $4, target_grade_id = $5, target_difficulty = $6, estimated_duration_minutes = $7, cover_image = $8, status = $9, updated_at = NOW() WHERE id = $10`,
      [
        input.slug,
        input.title,
        input.description,
        input.goal,
        input.targetGradeId,
        input.targetDifficulty,
        input.estimatedDurationMinutes,
        input.coverImage,
        input.status,
        id,
      ],
    );
    const record = await this.getRoadmapRecord(id);
    if (!record) throw new NotFoundError("Roadmap", id);
    return mapRoadmap(record);
  }

  async setRoadmapStatus(id: string, status: RoadmapStatus): Promise<RoadmapRecord> {
    const record = await this.getRoadmapRecord(id);
    if (!record) throw new NotFoundError("Roadmap", id);
    const versionId = `${record.id}-version-${record.current_version_number}`;
    await this.execute(
      `UPDATE roadmaps SET status = ?, published_version_id = CASE WHEN ? = 'published' THEN ? ELSE published_version_id END, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      `UPDATE roadmaps SET status = $1, published_version_id = CASE WHEN $2 = 'published' THEN $3 ELSE published_version_id END, updated_at = NOW() WHERE id = $4`,
      [status, status, versionId, id],
    );
    await this.execute(
      `UPDATE roadmap_versions SET status = ?, published_at = CASE WHEN ? = 'published' THEN CURRENT_TIMESTAMP ELSE published_at END WHERE id = ?`,
      `UPDATE roadmap_versions SET status = $1, published_at = CASE WHEN $1 = 'published' THEN NOW() ELSE published_at END WHERE id = $2`,
      [status, status, versionId],
    );
    const updated = await this.getRoadmapRecord(id);
    if (!updated) throw new NotFoundError("Roadmap", id);
    return mapRoadmap(updated);
  }

  async createVersion(input: {
    id: string;
    roadmapId: string;
    versionNumber: number;
    status: RoadmapStatus;
    changeSummary: string;
    snapshot: RoadmapSnapshot;
    createdByProfileId: string | null;
    publishedAt: string | null;
  }): Promise<RoadmapVersionRecord> {
    await this.execute(
      `INSERT INTO roadmap_versions (id, roadmap_id, version_number, status, change_summary, snapshot, created_by_profile_id, published_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      `INSERT INTO roadmap_versions (id, roadmap_id, version_number, status, change_summary, snapshot, created_by_profile_id, published_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        input.id,
        input.roadmapId,
        input.versionNumber,
        input.status,
        input.changeSummary,
        JSON.stringify(input.snapshot),
        input.createdByProfileId,
        input.publishedAt,
      ],
    );
    await this.execute(
      `UPDATE roadmaps SET current_version_number = ?, published_version_id = CASE WHEN ? = 'published' THEN ? ELSE published_version_id END, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      `UPDATE roadmaps SET current_version_number = $1, published_version_id = CASE WHEN $2 = 'published' THEN $3 ELSE published_version_id END, updated_at = NOW() WHERE id = $4`,
      [input.versionNumber, input.status, input.id, input.roadmapId],
    );
    const row = await this.one<VersionDbRow>(
      `${versionSelect} WHERE id = ?`,
      `${versionSelect} WHERE id = $1`,
      [input.id],
    );
    if (!row) throw new NotFoundError("Roadmap version", input.id);
    return mapVersion(row);
  }

  async listVersions(roadmapId: string): Promise<readonly RoadmapVersionRecord[]> {
    const rows = await this.rows<VersionDbRow>(
      `${versionSelect} WHERE roadmap_id = ? ORDER BY version_number DESC`,
      `${versionSelect} WHERE roadmap_id = $1 ORDER BY version_number DESC`,
      [roadmapId],
    );
    return rows.map(mapVersion);
  }

  async getVersion(id: string): Promise<RoadmapVersionRecord | null> {
    const row = await this.one<VersionDbRow>(
      `${versionSelect} WHERE id = ?`,
      `${versionSelect} WHERE id = $1`,
      [id],
    );
    return row ? mapVersion(row) : null;
  }

  async saveSubject(input: Omit<RoadmapSubjectRecord, "createdAt">): Promise<void> {
    await this.execute(
      `INSERT INTO roadmap_subjects (roadmap_id, subject_id, sort_order) VALUES (?, ?, ?) ON CONFLICT(roadmap_id, subject_id) DO UPDATE SET sort_order = excluded.sort_order`,
      `INSERT INTO roadmap_subjects (roadmap_id, subject_id, sort_order) VALUES ($1, $2, $3) ON CONFLICT (roadmap_id, subject_id) DO UPDATE SET sort_order = EXCLUDED.sort_order`,
      [input.roadmapId, input.subjectId, input.sortOrder],
    );
  }

  async deleteSubject(input: { roadmapId: string; subjectId: string }): Promise<void> {
    await this.execute(
      "DELETE FROM roadmap_subjects WHERE roadmap_id = ? AND subject_id = ?",
      "DELETE FROM roadmap_subjects WHERE roadmap_id = $1 AND subject_id = $2",
      [input.roadmapId, input.subjectId],
    );
  }

  async savePrerequisite(input: Omit<RoadmapPrerequisiteRecord, "createdAt">): Promise<void> {
    await this.execute(
      `INSERT INTO roadmap_prerequisites (roadmap_id, prerequisite_roadmap_id, is_required) VALUES (?, ?, ?) ON CONFLICT(roadmap_id, prerequisite_roadmap_id) DO UPDATE SET is_required = excluded.is_required`,
      `INSERT INTO roadmap_prerequisites (roadmap_id, prerequisite_roadmap_id, is_required) VALUES ($1, $2, $3) ON CONFLICT (roadmap_id, prerequisite_roadmap_id) DO UPDATE SET is_required = EXCLUDED.is_required`,
      [
        input.roadmapId,
        input.prerequisiteRoadmapId,
        this.database.provider === "sqlite" ? (input.isRequired ? 1 : 0) : input.isRequired,
      ],
    );
  }

  async deletePrerequisite(input: {
    roadmapId: string;
    prerequisiteRoadmapId: string;
  }): Promise<void> {
    await this.execute(
      "DELETE FROM roadmap_prerequisites WHERE roadmap_id = ? AND prerequisite_roadmap_id = ?",
      "DELETE FROM roadmap_prerequisites WHERE roadmap_id = $1 AND prerequisite_roadmap_id = $2",
      [input.roadmapId, input.prerequisiteRoadmapId],
    );
  }

  async saveNode(input: SaveRoadmapNodeInput): Promise<void> {
    const values = [
      input.id,
      input.roadmapVersionId,
      input.nodeKey,
      input.type,
      input.title,
      input.description,
      input.referenceId,
      input.referenceTitle,
      input.subjectId,
      input.isRequired,
      input.isCheckpoint,
      input.isOptionalBranch,
      input.sortOrder,
      input.estimatedDurationMinutes,
      JSON.stringify(input.metadata),
    ];
    const sqliteValues = values.map((value, index) =>
      index >= 9 && index <= 11 && typeof value === "boolean" ? (value ? 1 : 0) : value,
    );
    await this.execute(
      `INSERT INTO roadmap_nodes (id, roadmap_version_id, node_key, node_type, title, description, reference_id, reference_title, subject_id, is_required, is_checkpoint, is_optional_branch, sort_order, estimated_duration_minutes, metadata) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET roadmap_version_id = excluded.roadmap_version_id, node_key = excluded.node_key, node_type = excluded.node_type, title = excluded.title, description = excluded.description, reference_id = excluded.reference_id, reference_title = excluded.reference_title, subject_id = excluded.subject_id, is_required = excluded.is_required, is_checkpoint = excluded.is_checkpoint, is_optional_branch = excluded.is_optional_branch, sort_order = excluded.sort_order, estimated_duration_minutes = excluded.estimated_duration_minutes, metadata = excluded.metadata, updated_at = CURRENT_TIMESTAMP`,
      `INSERT INTO roadmap_nodes (id, roadmap_version_id, node_key, node_type, title, description, reference_id, reference_title, subject_id, is_required, is_checkpoint, is_optional_branch, sort_order, estimated_duration_minutes, metadata) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15) ON CONFLICT (id) DO UPDATE SET roadmap_version_id = EXCLUDED.roadmap_version_id, node_key = EXCLUDED.node_key, node_type = EXCLUDED.node_type, title = EXCLUDED.title, description = EXCLUDED.description, reference_id = EXCLUDED.reference_id, reference_title = EXCLUDED.reference_title, subject_id = EXCLUDED.subject_id, is_required = EXCLUDED.is_required, is_checkpoint = EXCLUDED.is_checkpoint, is_optional_branch = EXCLUDED.is_optional_branch, sort_order = EXCLUDED.sort_order, estimated_duration_minutes = EXCLUDED.estimated_duration_minutes, metadata = EXCLUDED.metadata, updated_at = NOW()`,
      this.database.provider === "sqlite" ? sqliteValues : values,
    );
  }

  async deleteNode(id: string): Promise<void> {
    await this.execute(
      "DELETE FROM roadmap_nodes WHERE id = ?",
      "DELETE FROM roadmap_nodes WHERE id = $1",
      [id],
    );
  }

  async reorderNodes(input: {
    roadmapVersionId: string;
    orderedNodeIds: readonly string[];
  }): Promise<void> {
    for (const [sortOrder, nodeId] of input.orderedNodeIds.entries()) {
      await this.execute(
        "UPDATE roadmap_nodes SET sort_order = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND roadmap_version_id = ?",
        "UPDATE roadmap_nodes SET sort_order = $1, updated_at = NOW() WHERE id = $2 AND roadmap_version_id = $3",
        [sortOrder, nodeId, input.roadmapVersionId],
      );
    }
  }

  async saveEdge(input: SaveRoadmapEdgeInput): Promise<void> {
    await this.execute(
      `INSERT INTO roadmap_edges (id, roadmap_version_id, source_node_id, target_node_id, edge_type, sort_order) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET roadmap_version_id = excluded.roadmap_version_id, source_node_id = excluded.source_node_id, target_node_id = excluded.target_node_id, edge_type = excluded.edge_type, sort_order = excluded.sort_order`,
      `INSERT INTO roadmap_edges (id, roadmap_version_id, source_node_id, target_node_id, edge_type, sort_order) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (id) DO UPDATE SET roadmap_version_id = EXCLUDED.roadmap_version_id, source_node_id = EXCLUDED.source_node_id, target_node_id = EXCLUDED.target_node_id, edge_type = EXCLUDED.edge_type, sort_order = EXCLUDED.sort_order`,
      [
        input.id,
        input.roadmapVersionId,
        input.sourceNodeId,
        input.targetNodeId,
        input.type,
        input.sortOrder,
      ],
    );
  }

  async deleteEdge(id: string): Promise<void> {
    await this.execute(
      "DELETE FROM roadmap_edges WHERE id = ?",
      "DELETE FROM roadmap_edges WHERE id = $1",
      [id],
    );
  }

  async listUserRoadmaps(profileId: string): Promise<readonly UserRoadmapRecord[]> {
    const rows = await this.rows<UserRoadmapDbRow>(
      `${enrollmentSelect} WHERE profile_id = ? ORDER BY updated_at DESC, id`,
      `${enrollmentSelect} WHERE profile_id = $1 ORDER BY updated_at DESC, id`,
      [profileId],
    );
    return rows.map(mapEnrollment);
  }

  async getUserRoadmap(profileId: string, roadmapId: string): Promise<UserRoadmapDetail | null> {
    const enrollmentRow = await this.one<UserRoadmapDbRow>(
      `${enrollmentSelect} WHERE profile_id = ? AND roadmap_id = ?`,
      `${enrollmentSelect} WHERE profile_id = $1 AND roadmap_id = $2`,
      [profileId, roadmapId],
    );
    if (!enrollmentRow) return null;
    const record = await this.getRoadmapRecord(roadmapId);
    if (!record) return null;
    const detail = await this.getVersionDetail(record, enrollmentRow.roadmap_version_id);
    if (!detail) return null;
    const progressRows = await this.rows<ProgressDbRow>(
      `${progressSelect} WHERE user_roadmap_id = ? ORDER BY roadmap_node_id`,
      `${progressSelect} WHERE user_roadmap_id = $1 ORDER BY roadmap_node_id`,
      [enrollmentRow.id],
    );
    const progress = progressRows.map(mapProgress);
    return {
      enrollment: mapEnrollment(enrollmentRow),
      roadmap: detail.roadmap,
      version: detail.version,
      subjects: detail.subjects,
      prerequisites: detail.prerequisites,
      nodes: detail.nodes,
      edges: detail.edges,
      progress,
      summary: computeRoadmapProgress(detail.nodes, progress, detail.edges),
    };
  }

  async enrollUser(input: {
    id: string;
    profileId: string;
    roadmapId: string;
    roadmapVersionId: string;
    selectedGoal: string | null;
  }): Promise<UserRoadmapRecord> {
    await this.execute(
      `INSERT INTO user_roadmaps (id, profile_id, roadmap_id, roadmap_version_id, status, selected_goal) VALUES (?, ?, ?, ?, 'active', ?) ON CONFLICT(profile_id, roadmap_id) DO UPDATE SET roadmap_version_id = excluded.roadmap_version_id, status = CASE WHEN user_roadmaps.status = 'completed' THEN 'completed' ELSE 'active' END, selected_goal = excluded.selected_goal, updated_at = CURRENT_TIMESTAMP`,
      `INSERT INTO user_roadmaps (id, profile_id, roadmap_id, roadmap_version_id, status, selected_goal) VALUES ($1, $2, $3, $4, 'active', $5) ON CONFLICT (profile_id, roadmap_id) DO UPDATE SET roadmap_version_id = EXCLUDED.roadmap_version_id, status = CASE WHEN user_roadmaps.status = 'completed' THEN 'completed' ELSE 'active' END, selected_goal = EXCLUDED.selected_goal, updated_at = NOW()`,
      [input.id, input.profileId, input.roadmapId, input.roadmapVersionId, input.selectedGoal],
    );
    const enrollment = await this.one<UserRoadmapDbRow>(
      `${enrollmentSelect} WHERE profile_id = ? AND roadmap_id = ?`,
      `${enrollmentSelect} WHERE profile_id = $1 AND roadmap_id = $2`,
      [input.profileId, input.roadmapId],
    );
    if (!enrollment) throw new NotFoundError("Roadmap enrollment", input.roadmapId);
    const record = await this.getRoadmapRecord(input.roadmapId);
    const detail = record ? await this.getVersionDetail(record, input.roadmapVersionId) : null;
    if (detail) {
      const requiredIncoming = new Set(
        detail.edges.filter((edge) => edge.type === "requires").map((edge) => edge.targetNodeId),
      );
      for (const node of detail.nodes) {
        const initialStatus = requiredIncoming.has(node.id) ? "locked" : "available";
        await this.execute(
          `INSERT INTO user_roadmap_progress (user_roadmap_id, profile_id, roadmap_node_id, status, completion_percentage, unlocked_at) VALUES (?, ?, ?, ?, 0, CASE WHEN ? = 'available' THEN CURRENT_TIMESTAMP ELSE NULL END) ON CONFLICT(user_roadmap_id, roadmap_node_id) DO UPDATE SET status = CASE WHEN user_roadmap_progress.status IN ('completed', 'skipped', 'in-progress') THEN user_roadmap_progress.status ELSE excluded.status END`,
          `INSERT INTO user_roadmap_progress (user_roadmap_id, profile_id, roadmap_node_id, status, completion_percentage, unlocked_at) VALUES ($1, $2, $3, $4, 0, CASE WHEN $5 = 'available' THEN NOW() ELSE NULL END) ON CONFLICT (user_roadmap_id, roadmap_node_id) DO UPDATE SET status = CASE WHEN user_roadmap_progress.status IN ('completed', 'skipped', 'in-progress') THEN user_roadmap_progress.status ELSE EXCLUDED.status END`,
          [enrollment.id, input.profileId, node.id, initialStatus, initialStatus],
        );
      }
    }
    return mapEnrollment(enrollment);
  }

  async updateUserRoadmapStatus(
    profileId: string,
    roadmapId: string,
    status: UserRoadmapStatus,
  ): Promise<UserRoadmapRecord> {
    await this.execute(
      `UPDATE user_roadmaps SET status = ?, completed_at = CASE WHEN ? = 'completed' THEN CURRENT_TIMESTAMP ELSE completed_at END, updated_at = CURRENT_TIMESTAMP WHERE profile_id = ? AND roadmap_id = ?`,
      `UPDATE user_roadmaps SET status = $1, completed_at = CASE WHEN $2 = 'completed' THEN NOW() ELSE completed_at END, updated_at = NOW() WHERE profile_id = $3 AND roadmap_id = $4`,
      [status, status, profileId, roadmapId],
    );
    const row = await this.one<UserRoadmapDbRow>(
      `${enrollmentSelect} WHERE profile_id = ? AND roadmap_id = ?`,
      `${enrollmentSelect} WHERE profile_id = $1 AND roadmap_id = $2`,
      [profileId, roadmapId],
    );
    if (!row) throw new NotFoundError("Roadmap enrollment", roadmapId);
    return mapEnrollment(row);
  }

  async saveProgress(input: {
    userRoadmapId: string;
    profileId: string;
    roadmapNodeId: string;
    status: UserRoadmapProgressRecord["status"];
    completionPercentage: number;
  }): Promise<UserRoadmapProgressRecord> {
    const enrollment = await this.one<{ roadmap_id: string }>(
      "SELECT roadmap_id FROM user_roadmaps WHERE id = ? AND profile_id = ?",
      "SELECT roadmap_id FROM user_roadmaps WHERE id = $1 AND profile_id = $2",
      [input.userRoadmapId, input.profileId],
    );
    if (!enrollment) throw new NotFoundError("Roadmap enrollment", input.userRoadmapId);
    const percentage = Math.max(0, Math.min(100, Math.round(input.completionPercentage)));
    const completed = input.status === "completed" || input.status === "skipped";
    const started = input.status === "in-progress" || completed;
    await this.execute(
      `INSERT INTO user_roadmap_progress (user_roadmap_id, profile_id, roadmap_node_id, status, completion_percentage, unlocked_at, started_at, completed_at) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CASE WHEN ? = 1 THEN CURRENT_TIMESTAMP ELSE NULL END, CASE WHEN ? = 1 THEN CURRENT_TIMESTAMP ELSE NULL END) ON CONFLICT(user_roadmap_id, roadmap_node_id) DO UPDATE SET status = excluded.status, completion_percentage = excluded.completion_percentage, started_at = COALESCE(user_roadmap_progress.started_at, excluded.started_at), completed_at = excluded.completed_at, updated_at = CURRENT_TIMESTAMP`,
      `INSERT INTO user_roadmap_progress (user_roadmap_id, profile_id, roadmap_node_id, status, completion_percentage, unlocked_at, started_at, completed_at) VALUES ($1, $2, $3, $4, $5, NOW(), CASE WHEN $6 = TRUE THEN NOW() ELSE NULL END, CASE WHEN $7 = TRUE THEN NOW() ELSE NULL END) ON CONFLICT (user_roadmap_id, roadmap_node_id) DO UPDATE SET status = EXCLUDED.status, completion_percentage = EXCLUDED.completion_percentage, started_at = COALESCE(user_roadmap_progress.started_at, EXCLUDED.started_at), completed_at = EXCLUDED.completed_at, updated_at = NOW()`,
      [
        input.userRoadmapId,
        input.profileId,
        input.roadmapNodeId,
        input.status,
        percentage,
        this.database.provider === "sqlite" ? (started ? 1 : 0) : started,
        this.database.provider === "sqlite" ? (completed ? 1 : 0) : completed,
      ],
    );
    await this.refreshProgressLocks(input.userRoadmapId, input.profileId);
    const row = await this.one<ProgressDbRow>(
      `${progressSelect} WHERE user_roadmap_id = ? AND roadmap_node_id = ?`,
      `${progressSelect} WHERE user_roadmap_id = $1 AND roadmap_node_id = $2`,
      [input.userRoadmapId, input.roadmapNodeId],
    );
    if (!row) throw new NotFoundError("Roadmap progress", input.roadmapNodeId);
    return mapProgress(row);
  }

  private async refreshProgressLocks(userRoadmapId: string, profileId: string): Promise<void> {
    const enrollment = await this.one<{ roadmap_id: string; roadmap_version_id: string }>(
      "SELECT roadmap_id, roadmap_version_id FROM user_roadmaps WHERE id = ? AND profile_id = ?",
      "SELECT roadmap_id, roadmap_version_id FROM user_roadmaps WHERE id = $1 AND profile_id = $2",
      [userRoadmapId, profileId],
    );
    if (!enrollment) return;
    const record = await this.getRoadmapRecord(enrollment.roadmap_id);
    if (!record) return;
    const detail = await this.getVersionDetail(record, enrollment.roadmap_version_id);
    if (!detail) return;
    const progressRows = await this.rows<ProgressDbRow>(
      `${progressSelect} WHERE user_roadmap_id = ?`,
      `${progressSelect} WHERE user_roadmap_id = $1`,
      [userRoadmapId],
    );
    const progress = new Map(progressRows.map((row) => [row.roadmap_node_id, mapProgress(row)]));
    const done = new Set(
      progressRows
        .filter((row) => row.status === "completed" || row.status === "skipped")
        .map((row) => row.roadmap_node_id),
    );
    for (const node of detail.nodes) {
      const current = progress.get(node.id);
      if (
        !current ||
        current.status === "completed" ||
        current.status === "skipped" ||
        current.status === "in-progress"
      )
        continue;
      const prerequisites = detail.edges
        .filter((edge) => edge.type === "requires" && edge.targetNodeId === node.id)
        .map((edge) => edge.sourceNodeId);
      const nextStatus = prerequisites.every((prerequisite) => done.has(prerequisite))
        ? "available"
        : "locked";
      await this.execute(
        `UPDATE user_roadmap_progress SET status = ?, unlocked_at = CASE WHEN ? = 'available' THEN COALESCE(unlocked_at, CURRENT_TIMESTAMP) ELSE NULL END, updated_at = CURRENT_TIMESTAMP WHERE user_roadmap_id = ? AND roadmap_node_id = ?`,
        `UPDATE user_roadmap_progress SET status = $1, unlocked_at = CASE WHEN $1 = 'available' THEN COALESCE(unlocked_at, NOW()) ELSE NULL END, updated_at = NOW() WHERE user_roadmap_id = $2 AND roadmap_node_id = $3`,
        [nextStatus, nextStatus, userRoadmapId, node.id],
      );
    }
    const required = detail.nodes.filter((node) => node.isRequired);
    if (required.length && required.every((node) => done.has(node.id))) {
      await this.execute(
        "UPDATE user_roadmaps SET status = 'completed', completed_at = COALESCE(completed_at, CURRENT_TIMESTAMP), updated_at = CURRENT_TIMESTAMP WHERE id = ? AND status <> 'archived'",
        "UPDATE user_roadmaps SET status = 'completed', completed_at = COALESCE(completed_at, NOW()), updated_at = NOW() WHERE id = $1 AND status <> 'archived'",
        [userRoadmapId],
      );
    }
  }

  async getLearningContext(profileId: string, roadmapId: string): Promise<RoadmapLearningContext> {
    const profile = await this.one<ProfileContextDbRow>(
      `SELECT p.id AS profile_id, cg.id AS current_grade_id, tg.id AS target_grade_id, s.preferred_subjects, o.learning_goals, o.weekly_study_time_minutes FROM profiles p LEFT JOIN grades cg ON cg.id = p.current_grade LEFT JOIN grades tg ON tg.id = p.target_grade LEFT JOIN user_settings s ON s.profile_id = p.id LEFT JOIN onboarding_responses o ON o.profile_id = p.id WHERE p.id = ?`,
      `SELECT p.id AS profile_id, cg.id AS current_grade_id, tg.id AS target_grade_id, s.preferred_subjects, o.learning_goals, o.weekly_study_time_minutes FROM profiles p LEFT JOIN grades cg ON cg.id = p.current_grade LEFT JOIN grades tg ON tg.id = p.target_grade LEFT JOIN user_settings s ON s.profile_id = p.id LEFT JOIN onboarding_responses o ON o.profile_id = p.id WHERE p.id = $1`,
      [profileId],
    );
    const diagnostic = await this.one<DiagnosticContextDbRow>(
      `SELECT dr.weak_concept_ids, dr.missing_prerequisite_concept_ids FROM diagnostic_results dr JOIN assessment_attempts aa ON aa.id = dr.assessment_attempt_id WHERE aa.profile_id = ? ORDER BY dr.created_at DESC, dr.id DESC LIMIT 1`,
      `SELECT dr.weak_concept_ids, dr.missing_prerequisite_concept_ids FROM diagnostic_results dr JOIN assessment_attempts aa ON aa.id = dr.assessment_attempt_id WHERE aa.profile_id = $1 ORDER BY dr.created_at DESC, dr.id DESC LIMIT 1`,
      [profileId],
    );
    const mastery = await this.rows<MasteryContextDbRow>(
      "SELECT concept_id, state, score, confidence, evidence_count FROM user_concept_mastery WHERE profile_id = ? ORDER BY concept_id",
      "SELECT concept_id, state, score, confidence, evidence_count FROM user_concept_mastery WHERE profile_id = $1 ORDER BY concept_id",
      [profileId],
    );
    const completed = await this.rows<{ roadmap_node_id: string }>(
      `SELECT p.roadmap_node_id FROM user_roadmap_progress p JOIN user_roadmaps ur ON ur.id = p.user_roadmap_id WHERE ur.profile_id = ? AND ur.roadmap_id = ? AND p.status IN ('completed', 'skipped')`,
      `SELECT p.roadmap_node_id FROM user_roadmap_progress p JOIN user_roadmaps ur ON ur.id = p.user_roadmap_id WHERE ur.profile_id = $1 AND ur.roadmap_id = $2 AND p.status IN ('completed', 'skipped')`,
      [profileId, roadmapId],
    );
    const goals = parseJson<string[]>(profile?.learning_goals, []);
    const preferredSubjects = parseJson<string[]>(profile?.preferred_subjects, []);
    const diagnosticWeak = parseJson<string[]>(diagnostic?.weak_concept_ids, []);
    const diagnosticMissing = parseJson<string[]>(diagnostic?.missing_prerequisite_concept_ids, []);
    return {
      profile: {
        profileId,
        currentGradeId: profile?.current_grade_id ?? null,
        targetGradeId: profile?.target_grade_id ?? null,
        selectedGoal: goals[0] ?? null,
        weeklyStudyTimeMinutes:
          profile?.weekly_study_time_minutes === null ||
          profile?.weekly_study_time_minutes === undefined
            ? null
            : asNumber(profile.weekly_study_time_minutes),
        preferredSubjects,
        diagnosticWeakConceptIds: diagnosticWeak,
        diagnosticMissingPrerequisiteConceptIds: diagnosticMissing,
      },
      mastery: mastery.map((row) => ({
        conceptId: row.concept_id,
        state: row.state,
        score: asNumber(row.score),
        confidence: asNumber(row.confidence),
        evidenceCount: asNumber(row.evidence_count),
      })),
      completedNodeIds: completed.map((row) => row.roadmap_node_id),
    };
  }

  async savePersonalizedPath(input: PersonalizedPathRecord): Promise<PersonalizedPathRecord> {
    await this.execute(
      `INSERT INTO personalized_paths (id, profile_id, roadmap_id, user_roadmap_id, current_grade_id, target_grade_id, selected_goal, weekly_study_time_minutes, estimated_duration_minutes, estimated_weeks, included_topics, skipped_mastered_topics, missing_prerequisites, path_nodes, generated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      `INSERT INTO personalized_paths (id, profile_id, roadmap_id, user_roadmap_id, current_grade_id, target_grade_id, selected_goal, weekly_study_time_minutes, estimated_duration_minutes, estimated_weeks, included_topics, skipped_mastered_topics, missing_prerequisites, path_nodes, generated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
      [
        input.id,
        input.profileId,
        input.roadmapId,
        input.userRoadmapId,
        input.currentGradeId,
        input.targetGradeId,
        input.selectedGoal,
        input.weeklyStudyTimeMinutes,
        input.estimatedDurationMinutes,
        input.estimatedWeeks,
        JSON.stringify(input.includedTopics),
        JSON.stringify(input.skippedMasteredTopics),
        JSON.stringify(input.missingPrerequisites),
        JSON.stringify(input.pathNodes),
        input.generatedAt,
      ],
    );
    return input;
  }

  async getLatestPersonalizedPath(
    profileId: string,
    roadmapId: string,
  ): Promise<PersonalizedPathRecord | null> {
    const row = await this.one<PersonalizedPathDbRow>(
      `${pathSelect} WHERE profile_id = ? AND roadmap_id = ? ORDER BY generated_at DESC, id DESC LIMIT 1`,
      `${pathSelect} WHERE profile_id = $1 AND roadmap_id = $2 ORDER BY generated_at DESC, id DESC LIMIT 1`,
      [profileId, roadmapId],
    );
    return row ? mapPath(row) : null;
  }
}

export function getRoadmapRepository(database?: DatabaseHandle): RoadmapRepository {
  return new SqlRoadmapRepository(database);
}

export function newRoadmapId(prefix: string): string {
  return `${prefix}-${randomUUID()}`;
}

export function newRoadmapNodeId(prefix = "roadmap-node"): string {
  return `${prefix}-${randomUUID()}`;
}

export function newRoadmapEdgeId(prefix = "roadmap-edge"): string {
  return `${prefix}-${randomUUID()}`;
}
