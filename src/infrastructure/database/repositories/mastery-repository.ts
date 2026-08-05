import { randomUUID } from "node:crypto";
import { NotFoundError } from "@/domain/errors/application-error";
import { computeMastery } from "@/domain/mastery/rules";
import {
  DEFAULT_MASTERY_RULES,
  DEFAULT_RECOMMENDATION_RULES,
  MASTERY_DIFFICULTIES,
  MASTERY_EVENT_TYPES,
  MASTERY_STATES,
  RECOMMENDATION_KINDS,
  RECOMMENDATION_STATUSES,
  type MasteryConceptRecord,
  type MasteryConceptView,
  type MasteryDetail,
  type MasteryDifficulty,
  type MasteryEventRecord,
  type MasteryEventType,
  type MasteryEvidenceInput,
  type MasteryGradeSummary,
  type MasteryRuleConfig,
  type MasterySnapshotRecord,
  type MasteryState,
  type MasterySubjectSummary,
  type RecommendationCandidate,
  type RecommendationKind,
  type RecommendationRecord,
  type RecommendationRuleConfig,
  type RecommendationStatus,
  type UserConceptMasteryRecord,
} from "@/domain/mastery/types";
import type {
  AssessmentMasteryEvidence,
  ExerciseMasteryEvidence,
  MasteryContext,
  MasteryRepository,
} from "@/domain/ports/mastery-repository";
import { getDatabase, type DatabaseHandle } from "@/infrastructure/database/client";

type DbDate = Date | string | null;
type DbBoolean = boolean | number | string;

interface ConceptDbRow {
  id: string;
  name: string;
  slug: string;
  subject_id: string;
  subject_name: string;
  subject_slug: string;
  domain_name: string | null;
  grade_min_id: string | null;
  grade_max_id: string | null;
  difficulty: string;
  mastery_threshold: number | string;
}

interface MasteryDbRow {
  profile_id: string;
  concept_id: string;
  state: string;
  score: number | string;
  confidence: number | string;
  evidence_count: number | string;
  evidence_type_count: number | string;
  difficulty_band_count: number | string;
  last_practiced_at: DbDate;
  next_review_at: DbDate;
  breakdown: string | null;
  evidence_summary: string | null;
  current_snapshot_id: string | null;
  created_at: DbDate;
  updated_at: DbDate;
}

interface EventDbRow {
  id: string;
  profile_id: string;
  concept_id: string;
  event_type: string;
  source_id: string;
  score: number | string;
  difficulty: string;
  attempts: number | string;
  hints_used: number | string;
  partial_credit: DbBoolean;
  metadata: string | null;
  occurred_at: DbDate;
  created_at: DbDate;
}

interface SnapshotDbRow extends MasteryDbRow {
  id: string;
  reason: string;
}

interface RecommendationDbRow {
  id: string;
  profile_id: string;
  concept_id: string | null;
  kind: string;
  source_key: string;
  title: string;
  reason: string;
  priority: number | string;
  status: string;
  metadata: string | null;
  created_at: DbDate;
  updated_at: DbDate;
  expires_at: DbDate;
}

interface EvidenceDbRow {
  concept_id: string;
  score: number | string;
  max_score: number | string;
  difficulty: string;
  validation_result: string | null;
  answered_at: DbDate;
  completed_at: DbDate;
  passed?: DbBoolean | null;
  assessment_id?: string;
  assessment_threshold?: number | string;
}

interface GradeDbRow {
  id: string;
  name: string;
  sort_order: number | string;
}

interface ProfileGradeDbRow {
  current_grade: string | null;
  target_grade: string | null;
}

interface PrerequisiteDbRow {
  concept_id: string;
  prerequisite_concept_id: string;
  prerequisite_name: string;
}

function conceptIncludesGrade(
  concept: MasteryConceptRecord,
  gradeOrderById: ReadonlyMap<string, number>,
  gradeOrder: number,
): boolean {
  const minimum = concept.gradeMinId
    ? (gradeOrderById.get(concept.gradeMinId) ?? Number.NEGATIVE_INFINITY)
    : Number.NEGATIVE_INFINITY;
  const maximum = concept.gradeMaxId
    ? (gradeOrderById.get(concept.gradeMaxId) ?? Number.POSITIVE_INFINITY)
    : Number.POSITIVE_INFINITY;
  return minimum <= gradeOrder && maximum >= gradeOrder;
}

function asNumber(value: number | string | null | undefined): number {
  return typeof value === "number" ? value : Number(value ?? 0);
}

function asIso(value: DbDate): string {
  if (value instanceof Date) return value.toISOString();
  return value ?? new Date(0).toISOString();
}

function asNullableIso(value: DbDate): string | null {
  if (value === null || value === undefined) return null;
  return asIso(value);
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

function asState(value: string): MasteryState {
  return MASTERY_STATES.includes(value as MasteryState) ? (value as MasteryState) : "not-started";
}

function asEventType(value: string): MasteryEventType {
  return MASTERY_EVENT_TYPES.includes(value as MasteryEventType)
    ? (value as MasteryEventType)
    : "exercise";
}

function asDifficulty(value: string): MasteryDifficulty {
  return MASTERY_DIFFICULTIES.includes(value as MasteryDifficulty)
    ? (value as MasteryDifficulty)
    : "balanced";
}

function asRecommendationKind(value: string): RecommendationKind {
  return RECOMMENDATION_KINDS.includes(value as RecommendationKind)
    ? (value as RecommendationKind)
    : "weak-concept";
}

function asRecommendationStatus(value: string): RecommendationStatus {
  return RECOMMENDATION_STATUSES.includes(value as RecommendationStatus)
    ? (value as RecommendationStatus)
    : "active";
}

function mapConcept(row: ConceptDbRow): MasteryConceptRecord {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    subjectId: row.subject_id,
    subjectName: row.subject_name,
    subjectSlug: row.subject_slug,
    domainName: row.domain_name,
    gradeMinId: row.grade_min_id,
    gradeMaxId: row.grade_max_id,
    difficulty:
      row.difficulty === "gentle" || row.difficulty === "challenging" ? row.difficulty : "balanced",
    masteryThreshold: asNumber(row.mastery_threshold),
  };
}

function computationFromRow(row: MasteryDbRow | SnapshotDbRow) {
  return {
    score: asNumber(row.score),
    confidence: asNumber(row.confidence),
    confidenceLabel:
      asNumber(row.confidence) >= 0.75
        ? ("high" as const)
        : asNumber(row.confidence) >= 0.45
          ? ("medium" as const)
          : ("low" as const),
    state: asState(row.state),
    evidenceCount: asNumber(row.evidence_count),
    evidenceTypeCount: asNumber(row.evidence_type_count),
    difficultyBandCount: asNumber(row.difficulty_band_count),
    lastPracticedAt: asNullableIso(row.last_practiced_at),
    nextReviewAt: asNullableIso(row.next_review_at),
    breakdown: parseJson(row.breakdown, {
      weightedScore: 0,
      totalWeight: 0,
      rawScore: 0,
      recencyFactor: 0,
      consistencyFactor: 0,
      prerequisiteFactor: 1,
      evidenceCount: asNumber(row.evidence_count),
      evidenceTypeCount: asNumber(row.evidence_type_count),
      difficultyBandCount: asNumber(row.difficulty_band_count),
      eventWeights: [],
      weakPrerequisiteIds: [],
    }),
    evidenceSummary: parseJson<string[]>(row.evidence_summary, []),
  };
}

function mapMastery(row: MasteryDbRow): UserConceptMasteryRecord {
  return {
    profileId: row.profile_id,
    conceptId: row.concept_id,
    currentSnapshotId: row.current_snapshot_id,
    createdAt: asIso(row.created_at),
    updatedAt: asIso(row.updated_at),
    ...computationFromRow(row),
  };
}

function mapEvent(row: EventDbRow): MasteryEventRecord {
  return {
    id: row.id,
    profileId: row.profile_id,
    conceptId: row.concept_id,
    eventType: asEventType(row.event_type),
    sourceId: row.source_id,
    score: asNumber(row.score),
    difficulty: asDifficulty(row.difficulty),
    attempts: Math.max(1, asNumber(row.attempts)),
    hintsUsed: Math.max(0, asNumber(row.hints_used)),
    partialCredit: asBoolean(row.partial_credit),
    metadata: parseJson<Record<string, unknown>>(row.metadata, {}),
    occurredAt: asIso(row.occurred_at),
    createdAt: asIso(row.created_at),
  };
}

function mapSnapshot(row: SnapshotDbRow): MasterySnapshotRecord {
  return {
    id: row.id,
    profileId: row.profile_id,
    conceptId: row.concept_id,
    createdAt: asIso(row.created_at),
    reason: row.reason,
    ...computationFromRow(row),
  };
}

function mapRecommendation(row: RecommendationDbRow): RecommendationRecord {
  return {
    id: row.id,
    profileId: row.profile_id,
    conceptId: row.concept_id,
    kind: asRecommendationKind(row.kind),
    sourceKey: row.source_key,
    title: row.title,
    reason: row.reason,
    priority: asNumber(row.priority),
    status: asRecommendationStatus(row.status),
    metadata: parseJson<Record<string, unknown>>(row.metadata, {}),
    createdAt: asIso(row.created_at),
    updatedAt: asIso(row.updated_at),
    expiresAt: asNullableIso(row.expires_at),
  };
}

function emptyMastery(profileId: string, conceptId: string): UserConceptMasteryRecord {
  const computation = computeMastery({ events: [] });
  const now = new Date(0).toISOString();
  return {
    profileId,
    conceptId,
    currentSnapshotId: null,
    createdAt: now,
    updatedAt: now,
    ...computation,
  };
}

function questionDifficulty(value: string): "gentle" | "balanced" | "challenging" {
  return value === "gentle" || value === "challenging" ? value : "balanced";
}

function evidenceDifficulty(values: readonly string[]): MasteryDifficulty {
  const unique = new Set(values.map(questionDifficulty));
  if (unique.size > 1) return "mixed";
  return [...unique][0] ?? "balanced";
}

function parseValidation(value: string | null): Record<string, unknown> {
  return parseJson<Record<string, unknown>>(value, {});
}

const conceptSelect = `
  SELECT c.id, c.name, c.slug, c.subject_id, s.name AS subject_name, s.slug AS subject_slug,
         d.name AS domain_name, c.grade_min_id, c.grade_max_id, c.difficulty, c.mastery_threshold
  FROM concepts c
  JOIN subjects s ON s.id = c.subject_id
  LEFT JOIN domains d ON d.id = c.domain_id
`;

const masterySelect = `
  SELECT profile_id, concept_id, state, score, confidence, evidence_count, evidence_type_count,
         difficulty_band_count, last_practiced_at, next_review_at, breakdown, evidence_summary,
         current_snapshot_id, created_at, updated_at
  FROM user_concept_mastery
`;

const masteryJoinSelect = `
  SELECT m.profile_id, m.concept_id, m.state, m.score, m.confidence, m.evidence_count, m.evidence_type_count,
         m.difficulty_band_count, m.last_practiced_at, m.next_review_at, m.breakdown, m.evidence_summary,
         m.current_snapshot_id, m.created_at, m.updated_at
  FROM user_concept_mastery m JOIN concepts c ON c.id = m.concept_id
`;

const eventSelect = `
  SELECT id, profile_id, concept_id, event_type, source_id, score, difficulty, attempts, hints_used,
         partial_credit, metadata, occurred_at, created_at
  FROM mastery_events
`;

const snapshotSelect = `
  SELECT id, profile_id, concept_id, state, score, confidence, evidence_count, evidence_type_count,
         difficulty_band_count, last_practiced_at, next_review_at, breakdown, evidence_summary,
         NULL AS current_snapshot_id, created_at, created_at AS updated_at, reason
  FROM mastery_snapshots
`;

const recommendationSelect = `
  SELECT id, profile_id, concept_id, kind, source_key, title, reason, priority, status, metadata,
         created_at, updated_at, expires_at
  FROM recommendations
`;

export class SqlMasteryRepository implements MasteryRepository {
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
    const records = await this.rows<T>(sqliteQuery, postgresQuery, values);
    return records[0];
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

  private conceptWhere(options: { subjectId?: string; gradeId?: string } = {}) {
    const sqliteWhere = ["c.is_archived = 0"];
    const postgresWhere = ["c.is_archived = FALSE"];
    const values: unknown[] = [];
    if (options.subjectId) {
      values.push(options.subjectId);
      sqliteWhere.push("c.subject_id = ?");
      postgresWhere.push(`c.subject_id = $${values.length}`);
    }
    if (options.gradeId) {
      values.push(options.gradeId);
      sqliteWhere.push(`EXISTS (
        SELECT 1 FROM grades filter_grade
        LEFT JOIN grades minimum_grade ON minimum_grade.id = c.grade_min_id
        LEFT JOIN grades maximum_grade ON maximum_grade.id = c.grade_max_id
        WHERE filter_grade.id = ?
          AND (minimum_grade.sort_order IS NULL OR minimum_grade.sort_order <= filter_grade.sort_order)
          AND (maximum_grade.sort_order IS NULL OR maximum_grade.sort_order >= filter_grade.sort_order)
      )`);
      postgresWhere.push(`EXISTS (
        SELECT 1 FROM grades filter_grade
        LEFT JOIN grades minimum_grade ON minimum_grade.id = c.grade_min_id
        LEFT JOIN grades maximum_grade ON maximum_grade.id = c.grade_max_id
        WHERE filter_grade.id = $${values.length}
          AND (minimum_grade.sort_order IS NULL OR minimum_grade.sort_order <= filter_grade.sort_order)
          AND (maximum_grade.sort_order IS NULL OR maximum_grade.sort_order >= filter_grade.sort_order)
      )`);
    }
    return { sqliteWhere, postgresWhere, values };
  }

  async getRuleConfiguration(): Promise<{
    mastery: MasteryRuleConfig;
    recommendations: RecommendationRuleConfig;
  }> {
    const masteryRow = await this.one<{ configuration: string | null }>(
      "SELECT configuration FROM mastery_rules WHERE is_active = ? ORDER BY slug LIMIT 1",
      "SELECT configuration FROM mastery_rules WHERE is_active = $1 ORDER BY slug LIMIT 1",
      [this.database.provider === "sqlite" ? 1 : true],
    );
    const recommendationRow = await this.one<{ configuration: string | null }>(
      "SELECT configuration FROM recommendation_rules WHERE is_active = ? ORDER BY slug LIMIT 1",
      "SELECT configuration FROM recommendation_rules WHERE is_active = $1 ORDER BY slug LIMIT 1",
      [this.database.provider === "sqlite" ? 1 : true],
    );
    return {
      mastery: {
        ...DEFAULT_MASTERY_RULES,
        ...parseJson<Partial<MasteryRuleConfig>>(masteryRow?.configuration, {}),
      },
      recommendations: {
        ...DEFAULT_RECOMMENDATION_RULES,
        ...parseJson<Partial<RecommendationRuleConfig>>(recommendationRow?.configuration, {}),
      },
    };
  }

  async listConcepts(
    options: { subjectId?: string; gradeId?: string } = {},
  ): Promise<readonly MasteryConceptRecord[]> {
    const where = this.conceptWhere(options);
    const rows = await this.rows<ConceptDbRow>(
      `${conceptSelect} WHERE ${where.sqliteWhere.join(" AND ")} ORDER BY s.sort_order, c.name COLLATE NOCASE`,
      `${conceptSelect} WHERE ${where.postgresWhere.join(" AND ")} ORDER BY s.sort_order, c.name`,
      where.values,
    );
    return rows.map(mapConcept);
  }

  async getConcept(conceptId: string): Promise<MasteryConceptRecord | null> {
    const row = await this.one<ConceptDbRow>(
      `${conceptSelect} WHERE c.id = ?`,
      `${conceptSelect} WHERE c.id = $1`,
      [conceptId],
    );
    return row ? mapConcept(row) : null;
  }

  async getMastery(profileId: string, conceptId: string): Promise<UserConceptMasteryRecord | null> {
    const row = await this.one<MasteryDbRow>(
      `${masterySelect} WHERE profile_id = ? AND concept_id = ?`,
      `${masterySelect} WHERE profile_id = $1 AND concept_id = $2`,
      [profileId, conceptId],
    );
    return row ? mapMastery(row) : null;
  }

  async listMastery(
    profileId: string,
    options: { subjectId?: string; gradeId?: string } = {},
  ): Promise<readonly UserConceptMasteryRecord[]> {
    const where = this.conceptWhere(options);
    const values = [profileId, ...where.values];
    const sqliteWhere = [
      "m.profile_id = ?",
      ...where.sqliteWhere.map((value) => value.replaceAll("c.", "c.")),
    ];
    const postgresWhere = [
      `m.profile_id = $1`,
      ...where.postgresWhere.map((value) =>
        value.replace(/\$(\d+)/g, (_, number) => `$${Number(number) + 1}`),
      ),
    ];
    const rows = await this.rows<MasteryDbRow>(
      `${masteryJoinSelect} WHERE ${sqliteWhere.join(" AND ")} ORDER BY m.updated_at DESC, m.concept_id`,
      `${masteryJoinSelect} WHERE ${postgresWhere.join(" AND ")} ORDER BY m.updated_at DESC, m.concept_id`,
      values,
    );
    return rows.map(mapMastery);
  }

  async listEvents(profileId: string, conceptId: string): Promise<readonly MasteryEventRecord[]> {
    const rows = await this.rows<EventDbRow>(
      `${eventSelect} WHERE profile_id = ? AND concept_id = ? ORDER BY occurred_at DESC, id DESC`,
      `${eventSelect} WHERE profile_id = $1 AND concept_id = $2 ORDER BY occurred_at DESC, id DESC`,
      [profileId, conceptId],
    );
    return rows.map(mapEvent);
  }

  async listSnapshots(
    profileId: string,
    conceptId: string,
  ): Promise<readonly MasterySnapshotRecord[]> {
    const rows = await this.rows<SnapshotDbRow>(
      `${snapshotSelect} WHERE profile_id = ? AND concept_id = ? ORDER BY created_at DESC, id DESC`,
      `${snapshotSelect} WHERE profile_id = $1 AND concept_id = $2 ORDER BY created_at DESC, id DESC`,
      [profileId, conceptId],
    );
    return rows.map(mapSnapshot);
  }

  private async listPrerequisiteLinks(): Promise<MasteryContext["prerequisiteLinks"]> {
    const rows = await this.rows<PrerequisiteDbRow>(
      `SELECT r.source_concept_id AS concept_id, r.target_concept_id AS prerequisite_concept_id, prerequisite.name AS prerequisite_name
       FROM concept_relationships r JOIN concepts prerequisite ON prerequisite.id = r.target_concept_id
       WHERE r.relationship_type = 'requires' ORDER BY r.source_concept_id, prerequisite.name COLLATE NOCASE`,
      `SELECT r.source_concept_id AS concept_id, r.target_concept_id AS prerequisite_concept_id, prerequisite.name AS prerequisite_name
       FROM concept_relationships r JOIN concepts prerequisite ON prerequisite.id = r.target_concept_id
       WHERE r.relationship_type = 'requires' ORDER BY r.source_concept_id, prerequisite.name`,
    );
    return rows.map((row) => ({
      conceptId: row.concept_id,
      prerequisiteConceptId: row.prerequisite_concept_id,
      prerequisiteName: row.prerequisite_name,
    }));
  }

  private async listAllEvents(profileId: string): Promise<readonly MasteryEventRecord[]> {
    const rows = await this.rows<EventDbRow>(
      `${eventSelect} WHERE profile_id = ? ORDER BY occurred_at DESC, id DESC`,
      `${eventSelect} WHERE profile_id = $1 ORDER BY occurred_at DESC, id DESC`,
      [profileId],
    );
    return rows.map(mapEvent);
  }

  async getContext(profileId: string): Promise<MasteryContext> {
    const [concepts, mastery, prerequisiteLinks, events, profile, grades] = await Promise.all([
      this.listConcepts(),
      this.listMastery(profileId),
      this.listPrerequisiteLinks(),
      this.listAllEvents(profileId),
      this.one<ProfileGradeDbRow>(
        "SELECT current_grade, target_grade FROM profiles WHERE id = ?",
        "SELECT current_grade, target_grade FROM profiles WHERE id = $1",
        [profileId],
      ),
      this.rows<GradeDbRow>(
        "SELECT id, name, sort_order FROM grades WHERE is_archived = 0",
        "SELECT id, name, sort_order FROM grades WHERE is_archived = FALSE",
      ),
    ]);
    const failedAssessmentConceptIds = [
      ...new Set(
        events
          .filter((event) => event.eventType === "assessment" && event.metadata.passed === false)
          .map((event) => event.conceptId),
      ),
    ];
    const requiredGrades = [profile?.current_grade, profile?.target_grade].filter(
      (value): value is string => Boolean(value),
    );
    const gradeOrderById = new Map(grades.map((grade) => [grade.id, asNumber(grade.sort_order)]));
    const requiredGradeOrders = requiredGrades
      .map((gradeId) => gradeOrderById.get(gradeId))
      .filter((order): order is number => order !== undefined);
    const gradeRequiredConceptIds = concepts
      .filter((concept) =>
        requiredGradeOrders.some((gradeOrder) =>
          conceptIncludesGrade(concept, gradeOrderById, gradeOrder),
        ),
      )
      .map((concept) => concept.id);
    return {
      concepts,
      mastery,
      prerequisiteLinks,
      failedAssessmentConceptIds,
      gradeRequiredConceptIds,
      roadmapRequiredConceptIds: [],
    };
  }

  async listSubjects(profileId: string): Promise<readonly MasterySubjectSummary[]> {
    const [concepts, masteryRows] = await Promise.all([
      this.listConcepts(),
      this.listMastery(profileId),
    ]);
    const mastery = new Map(masteryRows.map((item) => [item.conceptId, item]));
    const grouped = new Map<string, MasterySubjectSummary>();
    for (const concept of concepts) {
      const current = mastery.get(concept.id);
      const existing = grouped.get(concept.subjectId) ?? {
        subjectId: concept.subjectId,
        subjectName: concept.subjectName,
        subjectSlug: concept.subjectSlug,
        conceptCount: 0,
        assessedCount: 0,
        masteredCount: 0,
        averageScore: 0,
        averageConfidence: 0,
        reviewCount: 0,
      };
      existing.conceptCount += 1;
      existing.assessedCount += current?.evidenceCount ? 1 : 0;
      existing.masteredCount += current?.state === "mastered" ? 1 : 0;
      existing.averageScore += current?.score ?? 0;
      existing.averageConfidence += current?.confidence ?? 0;
      existing.reviewCount += current?.state === "needs-review" ? 1 : 0;
      grouped.set(concept.subjectId, existing);
    }
    return [...grouped.values()].map((summary) => ({
      ...summary,
      averageScore: summary.conceptCount ? summary.averageScore / summary.conceptCount : 0,
      averageConfidence: summary.conceptCount
        ? summary.averageConfidence / summary.conceptCount
        : 0,
    }));
  }

  async listGrades(profileId: string): Promise<readonly MasteryGradeSummary[]> {
    const [concepts, masteryRows, grades] = await Promise.all([
      this.listConcepts(),
      this.listMastery(profileId),
      this.rows<GradeDbRow>(
        "SELECT id, name, sort_order FROM grades WHERE is_archived = 0 ORDER BY sort_order",
        "SELECT id, name, sort_order FROM grades WHERE is_archived = FALSE ORDER BY sort_order",
      ),
    ]);
    const mastery = new Map(masteryRows.map((item) => [item.conceptId, item]));
    const gradeOrderById = new Map(grades.map((grade) => [grade.id, asNumber(grade.sort_order)]));
    return grades.map((grade) => {
      const gradeConcepts = concepts.filter((concept) =>
        conceptIncludesGrade(concept, gradeOrderById, asNumber(grade.sort_order)),
      );
      const requirements = gradeConcepts.filter((concept) => concept.gradeMinId === grade.id);
      return {
        gradeId: grade.id,
        gradeName: grade.name,
        conceptCount: gradeConcepts.length,
        assessedCount: gradeConcepts.filter(
          (concept) => (mastery.get(concept.id)?.evidenceCount ?? 0) > 0,
        ).length,
        masteredCount: gradeConcepts.filter(
          (concept) => mastery.get(concept.id)?.state === "mastered",
        ).length,
        averageScore: gradeConcepts.length
          ? gradeConcepts.reduce((sum, concept) => sum + (mastery.get(concept.id)?.score ?? 0), 0) /
            gradeConcepts.length
          : 0,
        requirementCount: requirements.length,
        requirementMasteredCount: requirements.filter(
          (concept) => mastery.get(concept.id)?.state === "mastered",
        ).length,
      };
    });
  }

  async getMasteryDetail(profileId: string, conceptId: string): Promise<MasteryDetail | null> {
    const concept = await this.getConcept(conceptId);
    if (!concept) return null;
    const [events, snapshots, current, allConcepts, allMastery] = await Promise.all([
      this.listEvents(profileId, conceptId),
      this.listSnapshots(profileId, conceptId),
      this.getMastery(profileId, conceptId),
      this.listConcepts(),
      this.listMastery(profileId),
    ]);
    const mastery = current ?? emptyMastery(profileId, conceptId);
    const byId = new Map(allMastery.map((item) => [item.conceptId, item]));
    const conceptById = new Map(allConcepts.map((item) => [item.id, item]));
    const links = await this.listPrerequisiteLinks();
    const view = (id: string): MasteryConceptView | null => {
      const record = conceptById.get(id);
      if (!record) return null;
      return { ...record, mastery: byId.get(id) ?? emptyMastery(profileId, id) };
    };
    return {
      concept,
      mastery,
      events,
      snapshots,
      prerequisites: links
        .filter((link) => link.conceptId === conceptId)
        .map((link) => view(link.prerequisiteConceptId))
        .filter((item): item is MasteryConceptView => Boolean(item)),
      unlocks: links
        .filter((link) => link.prerequisiteConceptId === conceptId)
        .map((link) => view(link.conceptId))
        .filter((item): item is MasteryConceptView => Boolean(item)),
    };
  }

  private async evidenceRows(
    sqliteQuery: string,
    postgresQuery: string,
    values: readonly unknown[],
  ): Promise<readonly EvidenceDbRow[]> {
    return this.rows<EvidenceDbRow>(sqliteQuery, postgresQuery, values);
  }

  private aggregateEvidence(
    rows: readonly EvidenceDbRow[],
    assessment = false,
  ): readonly (ExerciseMasteryEvidence | AssessmentMasteryEvidence)[] {
    const groups = new Map<string, EvidenceDbRow[]>();
    for (const row of rows)
      groups.set(row.concept_id, [...(groups.get(row.concept_id) ?? []), row]);
    return [...groups.entries()].map(([conceptId, entries]) => {
      const totalScore = entries.reduce((sum, row) => sum + asNumber(row.score), 0);
      const totalMax = entries.reduce((sum, row) => sum + asNumber(row.max_score), 0);
      const validations = entries.map((row) => parseValidation(row.validation_result));
      const latest = entries.reduce((left, right) =>
        Date.parse(asIso(left.answered_at)) >= Date.parse(asIso(right.answered_at)) ? left : right,
      );
      const base = {
        conceptId,
        score: totalMax > 0 ? Math.min(1, Math.max(0, totalScore / totalMax)) : 0,
        difficulty: evidenceDifficulty(entries.map((row) => row.difficulty)),
        attempts: Math.max(1, entries.length),
        hintsUsed: validations.reduce(
          (sum, validation) =>
            sum + (typeof validation.hintsUsed === "number" ? validation.hintsUsed : 0),
          0,
        ),
        partialCredit: validations.some((validation) => validation.status === "partial"),
        metadata: {
          questionCount: entries.length,
          partialCredit: validations.some((validation) => validation.status === "partial"),
          ...(assessment
            ? { passed: asBoolean(latest.passed), assessmentId: latest.assessment_id }
            : {}),
        },
        occurredAt: asIso(latest.completed_at ?? latest.answered_at),
      } satisfies ExerciseMasteryEvidence;
      return assessment
        ? ({
            ...base,
            passed: asBoolean(latest.passed),
            assessmentId: latest.assessment_id ?? "",
          } satisfies AssessmentMasteryEvidence)
        : base;
    });
  }

  async getExerciseEvidence(
    profileId: string,
    attemptId: string,
  ): Promise<readonly ExerciseMasteryEvidence[]> {
    const rows = await this.evidenceRows(
      `SELECT qc.concept_id, qa.score, qa.max_score, q.difficulty, qa.validation_result, qa.answered_at,
              ea.completed_at
       FROM exercise_attempts ea
       JOIN question_attempts qa ON qa.exercise_attempt_id = ea.id
       JOIN question_concepts qc ON qc.question_id = qa.question_id
       JOIN questions q ON q.id = qa.question_id
       WHERE ea.id = ? AND ea.profile_id = ? AND ea.status = 'completed'`,
      `SELECT qc.concept_id, qa.score, qa.max_score, q.difficulty, qa.validation_result, qa.answered_at,
              ea.completed_at
       FROM exercise_attempts ea
       JOIN question_attempts qa ON qa.exercise_attempt_id = ea.id
       JOIN question_concepts qc ON qc.question_id = qa.question_id
       JOIN questions q ON q.id = qa.question_id
       WHERE ea.id = $1 AND ea.profile_id = $2 AND ea.status = 'completed'`,
      [attemptId, profileId],
    );
    return this.aggregateEvidence(rows);
  }

  async getAssessmentEvidence(
    profileId: string,
    attemptId: string,
  ): Promise<readonly AssessmentMasteryEvidence[]> {
    const rows = await this.evidenceRows(
      `SELECT aq.question_id, qc.concept_id, qa.score, qa.max_score, q.difficulty, qa.validation_result,
              qa.answered_at, aa.submitted_at AS completed_at, aa.passed, aa.id AS assessment_id
       FROM assessment_attempts aa
       JOIN question_attempts qa ON qa.assessment_attempt_id = aa.id
       JOIN assessment_questions aq ON aq.assessment_id = aa.assessment_id AND aq.question_id = qa.question_id
       JOIN question_concepts qc ON qc.question_id = qa.question_id
       JOIN questions q ON q.id = qa.question_id
       WHERE aa.id = ? AND aa.profile_id = ? AND aa.status IN ('completed', 'expired')`,
      `SELECT aq.question_id, qc.concept_id, qa.score, qa.max_score, q.difficulty, qa.validation_result,
              qa.answered_at, aa.submitted_at AS completed_at, aa.passed, aa.id AS assessment_id
       FROM assessment_attempts aa
       JOIN question_attempts qa ON qa.assessment_attempt_id = aa.id
       JOIN assessment_questions aq ON aq.assessment_id = aa.assessment_id AND aq.question_id = qa.question_id
       JOIN question_concepts qc ON qc.question_id = qa.question_id
       JOIN questions q ON q.id = qa.question_id
       WHERE aa.id = $1 AND aa.profile_id = $2 AND aa.status IN ('completed', 'expired')`,
      [attemptId, profileId],
    );
    return this.aggregateEvidence(rows, true) as readonly AssessmentMasteryEvidence[];
  }

  async getLessonConceptIds(profileId: string, lessonId: string): Promise<readonly string[]> {
    const rows = await this.rows<{ concept_id: string }>(
      `SELECT lc.concept_id FROM lesson_concepts lc JOIN user_lesson_progress p ON p.lesson_id = lc.lesson_id
       WHERE lc.lesson_id = ? AND p.profile_id = ? AND p.completed_at IS NOT NULL`,
      `SELECT lc.concept_id FROM lesson_concepts lc JOIN user_lesson_progress p ON p.lesson_id = lc.lesson_id
       WHERE lc.lesson_id = $1 AND p.profile_id = $2 AND p.completed_at IS NOT NULL`,
      [lessonId, profileId],
    );
    return rows.map((row) => row.concept_id);
  }

  async upsertEvent(input: MasteryEvidenceInput): Promise<MasteryEventRecord> {
    const difficulty: MasteryDifficulty =
      input.difficulty && MASTERY_DIFFICULTIES.includes(input.difficulty as MasteryDifficulty)
        ? (input.difficulty as MasteryDifficulty)
        : "balanced";
    const values = [
      input.id,
      input.profileId,
      input.conceptId,
      input.eventType,
      input.sourceId,
      Math.min(1, Math.max(0, input.score)),
      difficulty,
      Math.max(1, input.attempts ?? 1),
      Math.max(0, input.hintsUsed ?? 0),
      this.database.provider === "sqlite"
        ? input.partialCredit
          ? 1
          : 0
        : (input.partialCredit ?? false),
      JSON.stringify(input.metadata ?? {}),
      input.occurredAt ?? new Date().toISOString(),
    ];
    await this.execute(
      `INSERT INTO mastery_events (id, profile_id, concept_id, event_type, source_id, score, difficulty, attempts, hints_used, partial_credit, metadata, occurred_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(profile_id, concept_id, event_type, source_id) DO UPDATE SET score = excluded.score, difficulty = excluded.difficulty, attempts = excluded.attempts, hints_used = excluded.hints_used, partial_credit = excluded.partial_credit, metadata = excluded.metadata, occurred_at = excluded.occurred_at`,
      `INSERT INTO mastery_events (id, profile_id, concept_id, event_type, source_id, score, difficulty, attempts, hints_used, partial_credit, metadata, occurred_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       ON CONFLICT (profile_id, concept_id, event_type, source_id) DO UPDATE SET score = EXCLUDED.score, difficulty = EXCLUDED.difficulty, attempts = EXCLUDED.attempts, hints_used = EXCLUDED.hints_used, partial_credit = EXCLUDED.partial_credit, metadata = EXCLUDED.metadata, occurred_at = EXCLUDED.occurred_at`,
      values,
    );
    const row = await this.one<EventDbRow>(
      `${eventSelect} WHERE profile_id = ? AND concept_id = ? AND event_type = ? AND source_id = ?`,
      `${eventSelect} WHERE profile_id = $1 AND concept_id = $2 AND event_type = $3 AND source_id = $4`,
      [input.profileId, input.conceptId, input.eventType, input.sourceId],
    );
    if (!row) throw new NotFoundError("Mastery event", input.id);
    return mapEvent(row);
  }

  async saveMastery(
    input: UserConceptMasteryRecord,
    snapshot: MasterySnapshotRecord,
  ): Promise<void> {
    const masteryValues = [
      input.profileId,
      input.conceptId,
      input.state,
      input.score,
      input.confidence,
      input.evidenceCount,
      input.evidenceTypeCount,
      input.difficultyBandCount,
      input.lastPracticedAt,
      input.nextReviewAt,
      JSON.stringify(input.breakdown),
      JSON.stringify(input.evidenceSummary),
      snapshot.id,
    ];
    const snapshotValues = [
      snapshot.id,
      snapshot.profileId,
      snapshot.conceptId,
      snapshot.state,
      snapshot.score,
      snapshot.confidence,
      snapshot.evidenceCount,
      snapshot.evidenceTypeCount,
      snapshot.difficultyBandCount,
      snapshot.lastPracticedAt,
      snapshot.nextReviewAt,
      JSON.stringify(snapshot.breakdown),
      JSON.stringify(snapshot.evidenceSummary),
      snapshot.reason,
    ];
    if (this.database.provider === "sqlite") {
      const sqlite = this.database.raw;
      const transaction = sqlite.transaction(() => {
        sqlite
          .prepare(
            `INSERT INTO mastery_snapshots (id, profile_id, concept_id, state, score, confidence, evidence_count, evidence_type_count, difficulty_band_count, last_practiced_at, next_review_at, breakdown, evidence_summary, reason)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          )
          .run(...snapshotValues);
        sqlite
          .prepare(
            `INSERT INTO user_concept_mastery (profile_id, concept_id, state, score, confidence, evidence_count, evidence_type_count, difficulty_band_count, last_practiced_at, next_review_at, breakdown, evidence_summary, current_snapshot_id)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON CONFLICT(profile_id, concept_id) DO UPDATE SET state = excluded.state, score = excluded.score, confidence = excluded.confidence, evidence_count = excluded.evidence_count, evidence_type_count = excluded.evidence_type_count, difficulty_band_count = excluded.difficulty_band_count, last_practiced_at = excluded.last_practiced_at, next_review_at = excluded.next_review_at, breakdown = excluded.breakdown, evidence_summary = excluded.evidence_summary, current_snapshot_id = excluded.current_snapshot_id, updated_at = CURRENT_TIMESTAMP`,
          )
          .run(...masteryValues);
      });
      transaction();
      return;
    }
    await this.database.raw.begin(async (transaction) => {
      await transaction`INSERT INTO mastery_snapshots (id, profile_id, concept_id, state, score, confidence, evidence_count, evidence_type_count, difficulty_band_count, last_practiced_at, next_review_at, breakdown, evidence_summary, reason) VALUES (${snapshotValues[0]}, ${snapshotValues[1]}, ${snapshotValues[2]}, ${snapshotValues[3]}, ${snapshotValues[4]}, ${snapshotValues[5]}, ${snapshotValues[6]}, ${snapshotValues[7]}, ${snapshotValues[8]}, ${snapshotValues[9]}, ${snapshotValues[10]}, ${snapshotValues[11]}, ${snapshotValues[12]}, ${snapshotValues[13]})`;
      await transaction`INSERT INTO user_concept_mastery (profile_id, concept_id, state, score, confidence, evidence_count, evidence_type_count, difficulty_band_count, last_practiced_at, next_review_at, breakdown, evidence_summary, current_snapshot_id) VALUES (${masteryValues[0]}, ${masteryValues[1]}, ${masteryValues[2]}, ${masteryValues[3]}, ${masteryValues[4]}, ${masteryValues[5]}, ${masteryValues[6]}, ${masteryValues[7]}, ${masteryValues[8]}, ${masteryValues[9]}, ${masteryValues[10]}, ${masteryValues[11]}, ${masteryValues[12]}) ON CONFLICT (profile_id, concept_id) DO UPDATE SET state = EXCLUDED.state, score = EXCLUDED.score, confidence = EXCLUDED.confidence, evidence_count = EXCLUDED.evidence_count, evidence_type_count = EXCLUDED.evidence_type_count, difficulty_band_count = EXCLUDED.difficulty_band_count, last_practiced_at = EXCLUDED.last_practiced_at, next_review_at = EXCLUDED.next_review_at, breakdown = EXCLUDED.breakdown, evidence_summary = EXCLUDED.evidence_summary, current_snapshot_id = EXCLUDED.current_snapshot_id, updated_at = NOW()`;
    });
  }

  async listRecommendations(
    profileId: string,
    options: { includeDismissed?: boolean } = {},
  ): Promise<readonly RecommendationRecord[]> {
    const statusSqlite = options.includeDismissed ? "" : " AND status = 'active'";
    const statusPostgres = options.includeDismissed ? "" : " AND status = 'active'";
    const rows = await this.rows<RecommendationDbRow>(
      `${recommendationSelect} WHERE profile_id = ?${statusSqlite} ORDER BY priority DESC, created_at DESC, id`,
      `${recommendationSelect} WHERE profile_id = $1${statusPostgres} ORDER BY priority DESC, created_at DESC, id`,
      [profileId],
    );
    return rows.map(mapRecommendation);
  }

  async saveRecommendations(
    profileId: string,
    candidates: readonly RecommendationCandidate[],
  ): Promise<void> {
    for (const candidate of candidates) {
      const values = [
        `recommendation-${randomUUID()}`,
        profileId,
        candidate.conceptId,
        candidate.kind,
        candidate.sourceKey,
        candidate.title,
        candidate.reason,
        candidate.priority,
        JSON.stringify(candidate.metadata ?? {}),
        candidate.expiresAt ?? null,
      ];
      await this.execute(
        `INSERT INTO recommendations (id, profile_id, concept_id, kind, source_key, title, reason, priority, metadata, expires_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(profile_id, kind, source_key) DO UPDATE SET concept_id = excluded.concept_id, title = excluded.title, reason = excluded.reason, priority = excluded.priority, metadata = excluded.metadata, expires_at = excluded.expires_at, status = CASE WHEN recommendations.status = 'dismissed' THEN 'dismissed' ELSE 'active' END, updated_at = CURRENT_TIMESTAMP`,
        `INSERT INTO recommendations (id, profile_id, concept_id, kind, source_key, title, reason, priority, metadata, expires_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         ON CONFLICT (profile_id, kind, source_key) DO UPDATE SET concept_id = EXCLUDED.concept_id, title = EXCLUDED.title, reason = EXCLUDED.reason, priority = EXCLUDED.priority, metadata = EXCLUDED.metadata, expires_at = EXCLUDED.expires_at, status = CASE WHEN recommendations.status = 'dismissed' THEN 'dismissed' ELSE 'active' END, updated_at = NOW()`,
        values,
      );
    }
    const active = await this.listRecommendations(profileId);
    const activeKeys = new Set(
      candidates.map((candidate) => `${candidate.kind}:${candidate.sourceKey}`),
    );
    for (const recommendation of active) {
      if (activeKeys.has(`${recommendation.kind}:${recommendation.sourceKey}`)) continue;
      await this.execute(
        "UPDATE recommendations SET status = 'completed', updated_at = CURRENT_TIMESTAMP WHERE id = ? AND profile_id = ? AND status = 'active'",
        "UPDATE recommendations SET status = 'completed', updated_at = NOW() WHERE id = $1 AND profile_id = $2 AND status = 'active'",
        [recommendation.id, profileId],
      );
    }
  }

  async dismissRecommendation(
    profileId: string,
    recommendationId: string,
    reason?: string,
  ): Promise<void> {
    const recommendation = await this.one<{ id: string }>(
      "SELECT id FROM recommendations WHERE id = ? AND profile_id = ?",
      "SELECT id FROM recommendations WHERE id = $1 AND profile_id = $2",
      [recommendationId, profileId],
    );
    if (!recommendation) throw new NotFoundError("Recommendation", recommendationId);
    await this.execute(
      "UPDATE recommendations SET status = 'dismissed', updated_at = CURRENT_TIMESTAMP WHERE id = ? AND profile_id = ?",
      "UPDATE recommendations SET status = 'dismissed', updated_at = NOW() WHERE id = $1 AND profile_id = $2",
      [recommendationId, profileId],
    );
    await this.execute(
      `INSERT INTO recommendation_dismissals (id, recommendation_id, profile_id, reason)
       VALUES (?, ?, ?, ?) ON CONFLICT(profile_id, recommendation_id) DO UPDATE SET dismissed_at = CURRENT_TIMESTAMP, reason = excluded.reason`,
      `INSERT INTO recommendation_dismissals (id, recommendation_id, profile_id, reason)
       VALUES ($1, $2, $3, $4) ON CONFLICT (profile_id, recommendation_id) DO UPDATE SET dismissed_at = NOW(), reason = EXCLUDED.reason`,
      [`dismissal-${randomUUID()}`, recommendationId, profileId, reason ?? null],
    );
  }

  async getMasteryDetailForTest(
    profileId: string,
    conceptId: string,
  ): Promise<MasteryDetail | null> {
    return this.getMasteryDetail(profileId, conceptId);
  }
}

export function getMasteryRepository(database?: DatabaseHandle): MasteryRepository {
  return new SqlMasteryRepository(database);
}

export function newMasteryId(prefix: string): string {
  return `${prefix}-${randomUUID()}`;
}
