import { randomUUID } from "node:crypto";
import { ConflictError, NotFoundError } from "@/domain/errors/application-error";
import {
  ASSESSMENT_ATTEMPT_STATUSES,
  ASSESSMENT_FEEDBACK_VISIBILITIES,
  ASSESSMENT_RETAKE_RULES,
  ASSESSMENT_REVIEW_MODES,
  ASSESSMENT_STATUSES,
  ASSESSMENT_TYPES,
  type AssessmentAttemptRecord,
  type AssessmentConfiguration,
  type AssessmentDetail,
  type AssessmentFeedbackVisibility,
  type AssessmentPoolRecord,
  type AssessmentQuestionAttemptRecord,
  type AssessmentQuestionRecord,
  type AssessmentQuestionOrdering,
  type AssessmentRecord,
  type AssessmentRetakeRule,
  type AssessmentReviewMode,
  type AssessmentSectionDetail,
  type AssessmentSectionRecord,
  type AssessmentStatus,
  type AssessmentType,
  type CreateAssessmentInput,
  type CreateAssessmentPoolInput,
  type CreateAssessmentSectionInput,
  type DiagnosticRecommendation,
  type DiagnosticResultRecord,
  type PlacementResultRecord,
  type SaveAssessmentQuestionAttemptInput,
  type SaveAssessmentQuestionInput,
  type UpdateAssessmentInput,
} from "@/domain/assessment/types";
import type { JsonValue, QuestionListEntry, QuestionType } from "@/domain/exercise/types";
import { buildMistakeCategories } from "@/domain/assessment/rules";
import type { AssessmentRepository } from "@/domain/ports/assessment-repository";
import { getDatabase, type DatabaseHandle } from "@/infrastructure/database/client";

type DbDate = Date | string | null;
type DbBoolean = boolean | number | string | null;

interface AssessmentDbRow {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  assessment_type: string;
  subject_id: string | null;
  grade_id: string | null;
  status: string;
  time_limit_seconds: number | string | null;
  attempt_limit: number | string | null;
  passing_threshold: number | string;
  partial_credit: DbBoolean;
  feedback_visibility: string;
  review_mode: string;
  retake_rule: string;
  question_ordering: string;
  auto_submit: DbBoolean;
  configuration: string | null;
  created_by_profile_id: string | null;
  created_at: DbDate;
  updated_at: DbDate;
}

interface SectionDbRow {
  id: string;
  assessment_id: string;
  title: string;
  description: string | null;
  sort_order: number | string;
  points: number | string;
  time_limit_seconds: number | string | null;
  question_ordering: string;
  created_at: DbDate;
  updated_at: DbDate;
}

interface PoolDbRow {
  id: string;
  assessment_id: string;
  section_id: string;
  title: string;
  selection_count: number | string;
  difficulty_distribution: string | null;
  concept_ids: string | null;
  question_ordering: string;
  created_at: DbDate;
  updated_at: DbDate;
}

interface QuestionDbRow {
  id: string;
  slug: string;
  title: string;
  question_type: string;
  subject_id: string;
  subject_name?: string;
  grade_min_id: string | null;
  grade_max_id: string | null;
  difficulty: string;
  estimated_time_seconds: number | string;
  source: string | null;
  author_profile_id: string | null;
  tags: string | null;
  status: string;
  current_version_number: number | string;
  created_at: DbDate;
  updated_at: DbDate;
  concept_count?: number | string;
  exercise_set_count?: number | string;
  assessment_question_id?: string;
  assessment_id?: string;
  section_id?: string;
  pool_id?: string | null;
  sort_order?: number | string;
  points?: number | string;
  is_required?: DbBoolean;
}

interface AttemptDbRow {
  id: string;
  assessment_id: string;
  profile_id: string;
  status: string;
  seed: number | string;
  score: number | string;
  max_score: number | string;
  percentage: number | string;
  passed: DbBoolean;
  question_order: string | null;
  question_instances: string | null;
  started_at: DbDate;
  expires_at: DbDate;
  submitted_at: DbDate;
}

interface QuestionAttemptDbRow {
  id: string;
  exercise_attempt_id: string | null;
  assessment_attempt_id: string | null;
  question_id: string;
  question_version_id: string;
  template_id: string | null;
  instance_seed: number | string | null;
  response: string | null;
  validation_result: string | null;
  score: number | string;
  max_score: number | string;
  answered_at: DbDate;
}

interface SectionResultDbRow {
  id: string;
  assessment_attempt_id: string;
  section_id: string;
  score: number | string;
  max_score: number | string;
  percentage: number | string;
  correct_count: number | string;
  answered_count: number | string;
  question_count: number | string;
  concept_scores: string | null;
}

interface DiagnosticDbRow {
  id: string;
  assessment_attempt_id: string;
  readiness_grade_id: string | null;
  readiness_label: string;
  subject_strengths: string | null;
  weak_concept_ids: string | null;
  missing_prerequisite_concept_ids: string | null;
  recommendations: string | null;
  explanation: string | null;
  created_at: DbDate;
}

interface PlacementDbRow {
  id: string;
  assessment_attempt_id: string;
  recommended_grade_id: string | null;
  starting_level: string;
  confidence: number | string;
  review_question_ids: string | null;
  recommendations: string | null;
  explanation: string | null;
  created_at: DbDate;
}

function asNumber(value: number | string | null | undefined): number {
  return typeof value === "number" ? value : Number(value ?? 0);
}

function asNullableNumber(value: number | string | null | undefined): number | null {
  return value === null || value === undefined ? null : asNumber(value);
}

function asBoolean(value: DbBoolean): boolean {
  return value === true || value === 1 || value === "1" || value === "true";
}

function asNullableBoolean(value: DbBoolean): boolean | null {
  if (value === null || value === undefined) return null;
  return asBoolean(value);
}

function asIso(value: DbDate): string {
  if (value instanceof Date) return value.toISOString();
  return value ?? new Date(0).toISOString();
}

function asJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function asType(value: string): AssessmentType {
  return ASSESSMENT_TYPES.includes(value as AssessmentType)
    ? (value as AssessmentType)
    : "untimed-practice";
}

function asStatus(value: string): AssessmentStatus {
  return ASSESSMENT_STATUSES.includes(value as AssessmentStatus)
    ? (value as AssessmentStatus)
    : "draft";
}

function asFeedback(value: string): AssessmentFeedbackVisibility {
  return ASSESSMENT_FEEDBACK_VISIBILITIES.includes(value as AssessmentFeedbackVisibility)
    ? (value as AssessmentFeedbackVisibility)
    : "after-submit";
}

function asReview(value: string): AssessmentReviewMode {
  return ASSESSMENT_REVIEW_MODES.includes(value as AssessmentReviewMode)
    ? (value as AssessmentReviewMode)
    : "full";
}

function asRetake(value: string): AssessmentRetakeRule {
  return ASSESSMENT_RETAKE_RULES.includes(value as AssessmentRetakeRule)
    ? (value as AssessmentRetakeRule)
    : "after-failure";
}

function asOrdering(value: string): AssessmentQuestionOrdering {
  return value === "randomized" ? "randomized" : "fixed";
}

function asAttemptStatus(value: string): AssessmentAttemptRecord["status"] {
  return ASSESSMENT_ATTEMPT_STATUSES.includes(value as AssessmentAttemptRecord["status"])
    ? (value as AssessmentAttemptRecord["status"])
    : "in-progress";
}

function asQuestionType(value: string): QuestionType {
  const types = [
    "multiple-choice",
    "multiple-selection",
    "true-false",
    "numeric",
    "numeric-tolerance",
    "numeric-unit",
    "algebraic-expression",
    "formula",
    "short-answer",
    "long-answer",
    "matching",
    "ordering",
    "diagram-labeling",
    "graph-interpretation",
    "table-interpretation",
    "multi-step",
  ] as const;
  return types.includes(value as QuestionType) ? (value as QuestionType) : "short-answer";
}

function mapAssessment(row: AssessmentDbRow): AssessmentRecord {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description ?? "",
    type: asType(row.assessment_type),
    subjectId: row.subject_id,
    gradeId: row.grade_id,
    status: asStatus(row.status),
    timeLimitSeconds: asNullableNumber(row.time_limit_seconds),
    attemptLimit: asNullableNumber(row.attempt_limit),
    passingThreshold: asNumber(row.passing_threshold),
    partialCredit: asBoolean(row.partial_credit),
    feedbackVisibility: asFeedback(row.feedback_visibility),
    reviewMode: asReview(row.review_mode),
    retakeRule: asRetake(row.retake_rule),
    questionOrdering: asOrdering(row.question_ordering),
    autoSubmit: asBoolean(row.auto_submit),
    configuration: asJson<AssessmentConfiguration>(row.configuration, {}),
    createdByProfileId: row.created_by_profile_id,
    createdAt: asIso(row.created_at),
    updatedAt: asIso(row.updated_at),
  };
}

function mapSection(row: SectionDbRow): AssessmentSectionRecord {
  return {
    id: row.id,
    assessmentId: row.assessment_id,
    title: row.title,
    description: row.description ?? "",
    sortOrder: asNumber(row.sort_order),
    points: asNumber(row.points),
    timeLimitSeconds: asNullableNumber(row.time_limit_seconds),
    questionOrdering: asOrdering(row.question_ordering),
    createdAt: asIso(row.created_at),
    updatedAt: asIso(row.updated_at),
  };
}

function mapPool(row: PoolDbRow): AssessmentPoolRecord {
  return {
    id: row.id,
    assessmentId: row.assessment_id,
    sectionId: row.section_id,
    title: row.title,
    selectionCount: asNumber(row.selection_count),
    difficultyDistribution: asJson(row.difficulty_distribution, {}),
    conceptIds: asJson<string[]>(row.concept_ids, []),
    questionOrdering: asOrdering(row.question_ordering),
    createdAt: asIso(row.created_at),
    updatedAt: asIso(row.updated_at),
  };
}

function mapQuestion(row: QuestionDbRow): QuestionListEntry {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    type: asQuestionType(row.question_type),
    subjectId: row.subject_id,
    subjectName: row.subject_name,
    gradeMinId: row.grade_min_id,
    gradeMaxId: row.grade_max_id,
    difficulty:
      row.difficulty === "gentle" || row.difficulty === "challenging" ? row.difficulty : "balanced",
    estimatedTimeSeconds: asNumber(row.estimated_time_seconds),
    source: row.source ?? "",
    authorProfileId: row.author_profile_id,
    tags: asJson<string[]>(row.tags, []),
    status: row.status === "published" || row.status === "archived" ? row.status : "draft",
    currentVersionNumber: asNumber(row.current_version_number),
    createdAt: asIso(row.created_at),
    updatedAt: asIso(row.updated_at),
    conceptCount: asNumber(row.concept_count),
    exerciseSetCount: asNumber(row.exercise_set_count),
  };
}

function mapAssessmentQuestion(
  row: QuestionDbRow,
  conceptIds: readonly string[],
): AssessmentQuestionRecord {
  return {
    id: row.assessment_question_id ?? row.id,
    assessmentId: row.assessment_id ?? "",
    sectionId: row.section_id ?? "",
    poolId: row.pool_id ?? null,
    questionId: row.id,
    sortOrder: asNumber(row.sort_order),
    points: asNumber(row.points) || 1,
    isRequired: asBoolean(row.is_required ?? true),
    question: mapQuestion(row),
    conceptIds,
  };
}

function mapAttempt(row: AttemptDbRow): AssessmentAttemptRecord {
  return {
    id: row.id,
    assessmentId: row.assessment_id,
    profileId: row.profile_id,
    status: asAttemptStatus(row.status),
    seed: asNumber(row.seed),
    score: asNumber(row.score),
    maxScore: asNumber(row.max_score),
    percentage: asNumber(row.percentage),
    passed: asNullableBoolean(row.passed),
    questionOrder: asJson<string[]>(row.question_order, []),
    questionInstances: asJson<AssessmentAttemptRecord["questionInstances"]>(
      row.question_instances,
      [],
    ),
    startedAt: asIso(row.started_at),
    expiresAt: row.expires_at ? asIso(row.expires_at) : null,
    submittedAt: row.submitted_at ? asIso(row.submitted_at) : null,
  };
}

function mapQuestionAttempt(row: QuestionAttemptDbRow): AssessmentQuestionAttemptRecord {
  return {
    id: row.id,
    exerciseAttemptId: row.exercise_attempt_id,
    assessmentAttemptId: row.assessment_attempt_id ?? "",
    questionId: row.question_id,
    questionVersionId: row.question_version_id,
    templateId: row.template_id,
    instanceSeed: row.instance_seed === null ? null : asNumber(row.instance_seed),
    response: asJson<JsonValue>(row.response, null),
    validationResult: asJson<JsonValue>(row.validation_result, {}),
    score: asNumber(row.score),
    maxScore: asNumber(row.max_score),
    answeredAt: asIso(row.answered_at),
  };
}

function mapSectionResult(row: SectionResultDbRow) {
  return {
    id: row.id,
    assessmentAttemptId: row.assessment_attempt_id,
    sectionId: row.section_id,
    score: asNumber(row.score),
    maxScore: asNumber(row.max_score),
    percentage: asNumber(row.percentage),
    correctCount: asNumber(row.correct_count),
    answeredCount: asNumber(row.answered_count),
    questionCount: asNumber(row.question_count),
    conceptScores: asJson<JsonValue>(row.concept_scores, {}),
  };
}

function mapDiagnostic(row: DiagnosticDbRow): DiagnosticResultRecord {
  return {
    id: row.id,
    assessmentAttemptId: row.assessment_attempt_id,
    readinessGradeId: row.readiness_grade_id,
    readinessLabel: row.readiness_label,
    subjectStrengths: asJson<string[]>(row.subject_strengths, []),
    weakConceptIds: asJson<string[]>(row.weak_concept_ids, []),
    missingPrerequisiteConceptIds: asJson<string[]>(row.missing_prerequisite_concept_ids, []),
    recommendations: asJson<DiagnosticRecommendation[]>(row.recommendations, []),
    explanation: row.explanation ?? "",
    createdAt: asIso(row.created_at),
  };
}

function mapPlacement(row: PlacementDbRow): PlacementResultRecord {
  return {
    id: row.id,
    assessmentAttemptId: row.assessment_attempt_id,
    recommendedGradeId: row.recommended_grade_id,
    startingLevel: row.starting_level,
    confidence: asNumber(row.confidence),
    reviewQuestionIds: asJson<string[]>(row.review_question_ids, []),
    recommendations: asJson<DiagnosticRecommendation[]>(row.recommendations, []),
    explanation: row.explanation ?? "",
    createdAt: asIso(row.created_at),
  };
}

function asConflict(error: unknown): never {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes("UNIQUE") || message.includes("duplicate key")) {
    throw new ConflictError(
      "That assessment, section, pool, or assessment question already exists.",
    );
  }
  throw error;
}

const assessmentSelect =
  "SELECT id, slug, title, description, assessment_type, subject_id, grade_id, status, time_limit_seconds, attempt_limit, passing_threshold, partial_credit, feedback_visibility, review_mode, retake_rule, question_ordering, auto_submit, configuration, created_by_profile_id, created_at, updated_at FROM assessments";
const questionSelect =
  "SELECT q.id, q.slug, q.title, q.question_type, q.subject_id, s.name AS subject_name, q.grade_min_id, q.grade_max_id, q.difficulty, q.estimated_time_seconds, q.source, q.author_profile_id, q.tags, q.status, q.current_version_number, q.created_at, q.updated_at, (SELECT COUNT(*) FROM question_concepts qc WHERE qc.question_id = q.id) AS concept_count, (SELECT COUNT(*) FROM exercise_set_questions esq WHERE esq.question_id = q.id) AS exercise_set_count";

export class SqlAssessmentRepository implements AssessmentRepository {
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

  async listAssessments(
    options: {
      includeArchived?: boolean;
      includeDraft?: boolean;
      type?: string;
      subjectId?: string;
      gradeId?: string;
    } = {},
  ): Promise<readonly AssessmentRecord[]> {
    const sqliteWhere: string[] = [];
    const postgresWhere: string[] = [];
    const values: unknown[] = [];
    const add = (sqlite: string, postgres: string, ...next: unknown[]) => {
      const start = values.length + 1;
      values.push(...next);
      sqliteWhere.push(sqlite);
      let expression = postgres;
      next.forEach((_, index) => {
        expression = expression.replace("$value", "$" + (start + index));
      });
      postgresWhere.push(expression);
    };
    if (!options.includeDraft) add("status = 'published'", "status = 'published'");
    else if (!options.includeArchived) add("status <> 'archived'", "status <> 'archived'");
    if (options.type) add("assessment_type = $value", "assessment_type = $value", options.type);
    if (options.subjectId) add("subject_id = $value", "subject_id = $value", options.subjectId);
    if (options.gradeId) add("grade_id = $value", "grade_id = $value", options.gradeId);
    const sqlite = await this.rows<AssessmentDbRow>(
      assessmentSelect +
        (sqliteWhere.length ? " WHERE " + sqliteWhere.join(" AND ") : "") +
        " ORDER BY title COLLATE NOCASE",
      assessmentSelect +
        (postgresWhere.length ? " WHERE " + postgresWhere.join(" AND ") : "") +
        " ORDER BY title",
      values,
    );
    return sqlite.map(mapAssessment);
  }

  private async conceptIds(questionId: string): Promise<readonly string[]> {
    const rows = await this.rows<{ concept_id: string }>(
      "SELECT concept_id FROM question_concepts WHERE question_id = ? ORDER BY sort_order, concept_id",
      "SELECT concept_id FROM question_concepts WHERE question_id = $1 ORDER BY sort_order, concept_id",
      [questionId],
    );
    return rows.map((row) => row.concept_id);
  }

  async getAssessment(
    id: string,
    options: { includeDraft?: boolean } = {},
  ): Promise<AssessmentDetail | null> {
    const includeDraft = options.includeDraft ?? false;
    const assessment = await this.one<AssessmentDbRow>(
      assessmentSelect +
        (includeDraft ? " WHERE id = ?" : " WHERE id = ? AND status = 'published'"),
      assessmentSelect +
        (includeDraft ? " WHERE id = $1" : " WHERE id = $1 AND status = 'published'"),
      [id],
    );
    if (!assessment) return null;
    const sections = await this.rows<SectionDbRow>(
      "SELECT id, assessment_id, title, description, sort_order, points, time_limit_seconds, question_ordering, created_at, updated_at FROM assessment_sections WHERE assessment_id = ? ORDER BY sort_order, title COLLATE NOCASE",
      "SELECT id, assessment_id, title, description, sort_order, points, time_limit_seconds, question_ordering, created_at, updated_at FROM assessment_sections WHERE assessment_id = $1 ORDER BY sort_order, title",
      [id],
    );
    const pools = await this.rows<PoolDbRow>(
      "SELECT id, assessment_id, section_id, title, selection_count, difficulty_distribution, concept_ids, question_ordering, created_at, updated_at FROM assessment_pools WHERE assessment_id = ? ORDER BY section_id, title COLLATE NOCASE",
      "SELECT id, assessment_id, section_id, title, selection_count, difficulty_distribution, concept_ids, question_ordering, created_at, updated_at FROM assessment_pools WHERE assessment_id = $1 ORDER BY section_id, title",
      [id],
    );
    const questionRows = await this.rows<QuestionDbRow>(
      `${questionSelect}, aq.id AS assessment_question_id, aq.assessment_id, aq.section_id, aq.pool_id, aq.sort_order, aq.points, aq.is_required FROM assessment_questions aq JOIN questions q ON q.id = aq.question_id JOIN subjects s ON s.id = q.subject_id WHERE aq.assessment_id = ? ${includeDraft ? "" : "AND q.status = 'published'"} ORDER BY aq.section_id, aq.sort_order, q.title COLLATE NOCASE`,
      `${questionSelect}, aq.id AS assessment_question_id, aq.assessment_id, aq.section_id, aq.pool_id, aq.sort_order, aq.points, aq.is_required FROM assessment_questions aq JOIN questions q ON q.id = aq.question_id JOIN subjects s ON s.id = q.subject_id WHERE aq.assessment_id = $1 ${includeDraft ? "" : "AND q.status = 'published'"} ORDER BY aq.section_id, aq.sort_order, q.title`,
      [id],
    );
    const questions = await Promise.all(
      questionRows.map(async (row) => mapAssessmentQuestion(row, await this.conceptIds(row.id))),
    );
    const sectionDetails: AssessmentSectionDetail[] = sections.map((sectionRow) => {
      const section = mapSection(sectionRow);
      return {
        section,
        pools: pools.filter((pool) => pool.section_id === section.id).map(mapPool),
        questions: questions.filter((question) => question.sectionId === section.id),
      };
    });
    return { assessment: mapAssessment(assessment), sections: sectionDetails, questions };
  }

  async createAssessment(input: CreateAssessmentInput): Promise<AssessmentRecord> {
    try {
      await this.execute(
        "INSERT INTO assessments (id, slug, title, description, assessment_type, subject_id, grade_id, status, time_limit_seconds, attempt_limit, passing_threshold, partial_credit, feedback_visibility, review_mode, retake_rule, question_ordering, auto_submit, configuration, created_by_profile_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        "INSERT INTO assessments (id, slug, title, description, assessment_type, subject_id, grade_id, status, time_limit_seconds, attempt_limit, passing_threshold, partial_credit, feedback_visibility, review_mode, retake_rule, question_ordering, auto_submit, configuration, created_by_profile_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)",
        [
          input.id,
          input.slug,
          input.title,
          input.description,
          input.type,
          input.subjectId,
          input.gradeId,
          input.status,
          input.timeLimitSeconds,
          input.attemptLimit,
          input.passingThreshold,
          this.database.provider === "sqlite" ? (input.partialCredit ? 1 : 0) : input.partialCredit,
          input.feedbackVisibility,
          input.reviewMode,
          input.retakeRule,
          input.questionOrdering,
          this.database.provider === "sqlite" ? (input.autoSubmit ? 1 : 0) : input.autoSubmit,
          JSON.stringify(input.configuration),
          input.createdByProfileId,
        ],
      );
    } catch (error) {
      asConflict(error);
    }
    const row = await this.one<AssessmentDbRow>(
      assessmentSelect + " WHERE id = ?",
      assessmentSelect + " WHERE id = $1",
      [input.id],
    );
    if (!row) throw new NotFoundError("Assessment", input.id);
    return mapAssessment(row);
  }

  async updateAssessment(id: string, input: UpdateAssessmentInput): Promise<AssessmentRecord> {
    await this.execute(
      "UPDATE assessments SET slug = ?, title = ?, description = ?, assessment_type = ?, subject_id = ?, grade_id = ?, status = ?, time_limit_seconds = ?, attempt_limit = ?, passing_threshold = ?, partial_credit = ?, feedback_visibility = ?, review_mode = ?, retake_rule = ?, question_ordering = ?, auto_submit = ?, configuration = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      "UPDATE assessments SET slug = $1, title = $2, description = $3, assessment_type = $4, subject_id = $5, grade_id = $6, status = $7, time_limit_seconds = $8, attempt_limit = $9, passing_threshold = $10, partial_credit = $11, feedback_visibility = $12, review_mode = $13, retake_rule = $14, question_ordering = $15, auto_submit = $16, configuration = $17, updated_at = NOW() WHERE id = $18",
      [
        input.slug,
        input.title,
        input.description,
        input.type,
        input.subjectId,
        input.gradeId,
        input.status,
        input.timeLimitSeconds,
        input.attemptLimit,
        input.passingThreshold,
        this.database.provider === "sqlite" ? (input.partialCredit ? 1 : 0) : input.partialCredit,
        input.feedbackVisibility,
        input.reviewMode,
        input.retakeRule,
        input.questionOrdering,
        this.database.provider === "sqlite" ? (input.autoSubmit ? 1 : 0) : input.autoSubmit,
        JSON.stringify(input.configuration),
        id,
      ],
    );
    const row = await this.one<AssessmentDbRow>(
      assessmentSelect + " WHERE id = ?",
      assessmentSelect + " WHERE id = $1",
      [id],
    );
    if (!row) throw new NotFoundError("Assessment", id);
    return mapAssessment(row);
  }

  async setAssessmentStatus(id: string, status: AssessmentStatus): Promise<AssessmentRecord> {
    await this.execute(
      "UPDATE assessments SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      "UPDATE assessments SET status = $1, updated_at = NOW() WHERE id = $2",
      [status, id],
    );
    const row = await this.one<AssessmentDbRow>(
      assessmentSelect + " WHERE id = ?",
      assessmentSelect + " WHERE id = $1",
      [id],
    );
    if (!row) throw new NotFoundError("Assessment", id);
    return mapAssessment(row);
  }

  async createSection(input: CreateAssessmentSectionInput): Promise<void> {
    await this.execute(
      "INSERT INTO assessment_sections (id, assessment_id, title, description, sort_order, points, time_limit_seconds, question_ordering) VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET assessment_id = excluded.assessment_id, title = excluded.title, description = excluded.description, sort_order = excluded.sort_order, points = excluded.points, time_limit_seconds = excluded.time_limit_seconds, question_ordering = excluded.question_ordering, updated_at = CURRENT_TIMESTAMP",
      "INSERT INTO assessment_sections (id, assessment_id, title, description, sort_order, points, time_limit_seconds, question_ordering) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT (id) DO UPDATE SET assessment_id = EXCLUDED.assessment_id, title = EXCLUDED.title, description = EXCLUDED.description, sort_order = EXCLUDED.sort_order, points = EXCLUDED.points, time_limit_seconds = EXCLUDED.time_limit_seconds, question_ordering = EXCLUDED.question_ordering, updated_at = NOW()",
      [
        input.id,
        input.assessmentId,
        input.title,
        input.description,
        input.sortOrder,
        input.points,
        input.timeLimitSeconds,
        input.questionOrdering,
      ],
    );
  }

  async createPool(input: CreateAssessmentPoolInput): Promise<void> {
    await this.execute(
      "INSERT INTO assessment_pools (id, assessment_id, section_id, title, selection_count, difficulty_distribution, concept_ids, question_ordering) VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET assessment_id = excluded.assessment_id, section_id = excluded.section_id, title = excluded.title, selection_count = excluded.selection_count, difficulty_distribution = excluded.difficulty_distribution, concept_ids = excluded.concept_ids, question_ordering = excluded.question_ordering, updated_at = CURRENT_TIMESTAMP",
      "INSERT INTO assessment_pools (id, assessment_id, section_id, title, selection_count, difficulty_distribution, concept_ids, question_ordering) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT (id) DO UPDATE SET assessment_id = EXCLUDED.assessment_id, section_id = EXCLUDED.section_id, title = EXCLUDED.title, selection_count = EXCLUDED.selection_count, difficulty_distribution = EXCLUDED.difficulty_distribution, concept_ids = EXCLUDED.concept_ids, question_ordering = EXCLUDED.question_ordering, updated_at = NOW()",
      [
        input.id,
        input.assessmentId,
        input.sectionId,
        input.title,
        input.selectionCount,
        JSON.stringify(input.difficultyDistribution),
        JSON.stringify(input.conceptIds),
        input.questionOrdering,
      ],
    );
  }

  async saveQuestion(input: SaveAssessmentQuestionInput): Promise<void> {
    try {
      await this.execute(
        "INSERT INTO assessment_questions (id, assessment_id, section_id, pool_id, question_id, sort_order, points, is_required) VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET assessment_id = excluded.assessment_id, section_id = excluded.section_id, pool_id = excluded.pool_id, question_id = excluded.question_id, sort_order = excluded.sort_order, points = excluded.points, is_required = excluded.is_required",
        "INSERT INTO assessment_questions (id, assessment_id, section_id, pool_id, question_id, sort_order, points, is_required) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT (id) DO UPDATE SET assessment_id = EXCLUDED.assessment_id, section_id = EXCLUDED.section_id, pool_id = EXCLUDED.pool_id, question_id = EXCLUDED.question_id, sort_order = EXCLUDED.sort_order, points = EXCLUDED.points, is_required = EXCLUDED.is_required",
        [
          input.id,
          input.assessmentId,
          input.sectionId,
          input.poolId,
          input.questionId,
          input.sortOrder,
          input.points,
          this.database.provider === "sqlite" ? (input.isRequired ? 1 : 0) : input.isRequired,
        ],
      );
    } catch (error) {
      asConflict(error);
    }
  }

  async removeQuestion(input: { id: string }): Promise<void> {
    await this.execute(
      "DELETE FROM assessment_questions WHERE id = ?",
      "DELETE FROM assessment_questions WHERE id = $1",
      [input.id],
    );
  }

  async countAttempts(assessmentId: string, profileId: string): Promise<number> {
    const row = await this.one<{ count: number | string }>(
      "SELECT COUNT(*) AS count FROM assessment_attempts WHERE assessment_id = ? AND profile_id = ? AND status <> 'abandoned'",
      "SELECT COUNT(*) AS count FROM assessment_attempts WHERE assessment_id = $1 AND profile_id = $2 AND status <> 'abandoned'",
      [assessmentId, profileId],
    );
    return asNumber(row?.count);
  }

  async getLatestAttempt(
    assessmentId: string,
    profileId: string,
  ): Promise<AssessmentAttemptRecord | null> {
    const row = await this.one<AttemptDbRow>(
      "SELECT id, assessment_id, profile_id, status, seed, score, max_score, percentage, passed, question_order, question_instances, started_at, expires_at, submitted_at FROM assessment_attempts WHERE assessment_id = ? AND profile_id = ? AND status IN ('completed', 'expired') ORDER BY started_at DESC LIMIT 1",
      "SELECT id, assessment_id, profile_id, status, seed, score, max_score, percentage, passed, question_order, question_instances, started_at, expires_at, submitted_at FROM assessment_attempts WHERE assessment_id = $1 AND profile_id = $2 AND status IN ('completed', 'expired') ORDER BY started_at DESC LIMIT 1",
      [assessmentId, profileId],
    );
    return row ? mapAttempt(row) : null;
  }

  async getPreviousAttempt(
    assessmentId: string,
    profileId: string,
    beforeAttemptId: string,
  ): Promise<AssessmentAttemptRecord | null> {
    const row = await this.one<AttemptDbRow>(
      "SELECT id, assessment_id, profile_id, status, seed, score, max_score, percentage, passed, question_order, question_instances, started_at, expires_at, submitted_at FROM assessment_attempts WHERE assessment_id = ? AND profile_id = ? AND id <> ? AND status IN ('completed', 'expired') ORDER BY started_at DESC LIMIT 1",
      "SELECT id, assessment_id, profile_id, status, seed, score, max_score, percentage, passed, question_order, question_instances, started_at, expires_at, submitted_at FROM assessment_attempts WHERE assessment_id = $1 AND profile_id = $2 AND id <> $3 AND status IN ('completed', 'expired') ORDER BY started_at DESC LIMIT 1",
      [assessmentId, profileId, beforeAttemptId],
    );
    return row ? mapAttempt(row) : null;
  }

  async getActiveAttempt(
    assessmentId: string,
    profileId: string,
  ): Promise<AssessmentAttemptRecord | null> {
    const row = await this.one<AttemptDbRow>(
      "SELECT id, assessment_id, profile_id, status, seed, score, max_score, percentage, passed, question_order, question_instances, started_at, expires_at, submitted_at FROM assessment_attempts WHERE assessment_id = ? AND profile_id = ? AND status = 'in-progress' ORDER BY started_at DESC LIMIT 1",
      "SELECT id, assessment_id, profile_id, status, seed, score, max_score, percentage, passed, question_order, question_instances, started_at, expires_at, submitted_at FROM assessment_attempts WHERE assessment_id = $1 AND profile_id = $2 AND status = 'in-progress' ORDER BY started_at DESC LIMIT 1",
      [assessmentId, profileId],
    );
    return row ? mapAttempt(row) : null;
  }

  async createAttempt(input: {
    id: string;
    assessmentId: string;
    profileId: string;
    seed: number;
    maxScore: number;
    questionOrder: readonly string[];
    questionInstances: AssessmentAttemptRecord["questionInstances"];
    expiresAt: string | null;
  }): Promise<AssessmentAttemptRecord> {
    await this.execute(
      "INSERT INTO assessment_attempts (id, assessment_id, profile_id, seed, max_score, question_order, question_instances, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      "INSERT INTO assessment_attempts (id, assessment_id, profile_id, seed, max_score, question_order, question_instances, expires_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
      [
        input.id,
        input.assessmentId,
        input.profileId,
        input.seed,
        input.maxScore,
        JSON.stringify(input.questionOrder),
        JSON.stringify(input.questionInstances),
        input.expiresAt,
      ],
    );
    const row = await this.one<AttemptDbRow>(
      "SELECT id, assessment_id, profile_id, status, seed, score, max_score, percentage, passed, question_order, question_instances, started_at, expires_at, submitted_at FROM assessment_attempts WHERE id = ? AND profile_id = ?",
      "SELECT id, assessment_id, profile_id, status, seed, score, max_score, percentage, passed, question_order, question_instances, started_at, expires_at, submitted_at FROM assessment_attempts WHERE id = $1 AND profile_id = $2",
      [input.id, input.profileId],
    );
    if (!row) throw new NotFoundError("Assessment attempt", input.id);
    return mapAttempt(row);
  }

  async getAttempt(id: string, profileId: string): Promise<AssessmentAttemptRecord | null> {
    const row = await this.one<AttemptDbRow>(
      "SELECT id, assessment_id, profile_id, status, seed, score, max_score, percentage, passed, question_order, question_instances, started_at, expires_at, submitted_at FROM assessment_attempts WHERE id = ? AND profile_id = ?",
      "SELECT id, assessment_id, profile_id, status, seed, score, max_score, percentage, passed, question_order, question_instances, started_at, expires_at, submitted_at FROM assessment_attempts WHERE id = $1 AND profile_id = $2",
      [id, profileId],
    );
    return row ? mapAttempt(row) : null;
  }

  async saveQuestionAttempt(input: SaveAssessmentQuestionAttemptInput): Promise<void> {
    const values = [input.assessmentAttemptId, input.questionId];
    await this.execute(
      "DELETE FROM question_attempts WHERE assessment_attempt_id = ? AND question_id = ?",
      "DELETE FROM question_attempts WHERE assessment_attempt_id = $1 AND question_id = $2",
      values,
    );
    await this.execute(
      "INSERT INTO question_attempts (id, assessment_attempt_id, question_id, question_version_id, template_id, instance_seed, response, validation_result, score, max_score) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      "INSERT INTO question_attempts (id, assessment_attempt_id, question_id, question_version_id, template_id, instance_seed, response, validation_result, score, max_score) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)",
      [
        input.id,
        input.assessmentAttemptId,
        input.questionId,
        input.questionVersionId,
        input.templateId,
        input.instanceSeed,
        JSON.stringify(input.response),
        JSON.stringify(input.validationResult),
        input.score,
        input.maxScore,
      ],
    );
  }

  async listQuestionAttempts(
    attemptId: string,
  ): Promise<readonly AssessmentQuestionAttemptRecord[]> {
    const rows = await this.rows<QuestionAttemptDbRow>(
      "SELECT id, exercise_attempt_id, assessment_attempt_id, question_id, question_version_id, template_id, instance_seed, response, validation_result, score, max_score, answered_at FROM question_attempts WHERE assessment_attempt_id = ? ORDER BY answered_at, id",
      "SELECT id, exercise_attempt_id, assessment_attempt_id, question_id, question_version_id, template_id, instance_seed, response, validation_result, score, max_score, answered_at FROM question_attempts WHERE assessment_attempt_id = $1 ORDER BY answered_at, id",
      [attemptId],
    );
    return rows.map(mapQuestionAttempt);
  }

  async saveSectionResults(
    attemptId: string,
    results: readonly {
      id: string;
      assessmentAttemptId: string;
      sectionId: string;
      score: number;
      maxScore: number;
      percentage: number;
      correctCount: number;
      answeredCount: number;
      questionCount: number;
      conceptScores: JsonValue;
    }[],
  ): Promise<void> {
    await this.execute(
      "DELETE FROM assessment_section_results WHERE assessment_attempt_id = ?",
      "DELETE FROM assessment_section_results WHERE assessment_attempt_id = $1",
      [attemptId],
    );
    for (const result of results) {
      await this.execute(
        "INSERT INTO assessment_section_results (id, assessment_attempt_id, section_id, score, max_score, percentage, correct_count, answered_count, question_count, concept_scores) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        "INSERT INTO assessment_section_results (id, assessment_attempt_id, section_id, score, max_score, percentage, correct_count, answered_count, question_count, concept_scores) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)",
        [
          result.id,
          result.assessmentAttemptId,
          result.sectionId,
          result.score,
          result.maxScore,
          result.percentage,
          result.correctCount,
          result.answeredCount,
          result.questionCount,
          JSON.stringify(result.conceptScores),
        ],
      );
    }
  }

  async saveDiagnosticResult(result: DiagnosticResultRecord): Promise<void> {
    await this.execute(
      "DELETE FROM diagnostic_results WHERE assessment_attempt_id = ?",
      "DELETE FROM diagnostic_results WHERE assessment_attempt_id = $1",
      [result.assessmentAttemptId],
    );
    await this.execute(
      "INSERT INTO diagnostic_results (id, assessment_attempt_id, readiness_grade_id, readiness_label, subject_strengths, weak_concept_ids, missing_prerequisite_concept_ids, recommendations, explanation) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      "INSERT INTO diagnostic_results (id, assessment_attempt_id, readiness_grade_id, readiness_label, subject_strengths, weak_concept_ids, missing_prerequisite_concept_ids, recommendations, explanation) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)",
      [
        result.id,
        result.assessmentAttemptId,
        result.readinessGradeId,
        result.readinessLabel,
        JSON.stringify(result.subjectStrengths),
        JSON.stringify(result.weakConceptIds),
        JSON.stringify(result.missingPrerequisiteConceptIds),
        JSON.stringify(result.recommendations),
        result.explanation,
      ],
    );
  }

  async savePlacementResult(result: PlacementResultRecord): Promise<void> {
    await this.execute(
      "DELETE FROM placement_results WHERE assessment_attempt_id = ?",
      "DELETE FROM placement_results WHERE assessment_attempt_id = $1",
      [result.assessmentAttemptId],
    );
    await this.execute(
      "INSERT INTO placement_results (id, assessment_attempt_id, recommended_grade_id, starting_level, confidence, review_question_ids, recommendations, explanation) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      "INSERT INTO placement_results (id, assessment_attempt_id, recommended_grade_id, starting_level, confidence, review_question_ids, recommendations, explanation) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
      [
        result.id,
        result.assessmentAttemptId,
        result.recommendedGradeId,
        result.startingLevel,
        result.confidence,
        JSON.stringify(result.reviewQuestionIds),
        JSON.stringify(result.recommendations),
        result.explanation,
      ],
    );
  }

  async completeAttempt(input: {
    id: string;
    profileId: string;
    status: AssessmentAttemptRecord["status"];
    score: number;
    maxScore: number;
    percentage: number;
    passed: boolean;
    submittedAt: string;
  }): Promise<AssessmentAttemptRecord> {
    await this.execute(
      "UPDATE assessment_attempts SET status = ?, score = ?, max_score = ?, percentage = ?, passed = ?, submitted_at = ? WHERE id = ? AND profile_id = ?",
      "UPDATE assessment_attempts SET status = $1, score = $2, max_score = $3, percentage = $4, passed = $5, submitted_at = $6 WHERE id = $7 AND profile_id = $8",
      [
        input.status,
        input.score,
        input.maxScore,
        input.percentage,
        this.database.provider === "sqlite" ? (input.passed ? 1 : 0) : input.passed,
        input.submittedAt,
        input.id,
        input.profileId,
      ],
    );
    const row = await this.one<AttemptDbRow>(
      "SELECT id, assessment_id, profile_id, status, seed, score, max_score, percentage, passed, question_order, question_instances, started_at, expires_at, submitted_at FROM assessment_attempts WHERE id = ? AND profile_id = ?",
      "SELECT id, assessment_id, profile_id, status, seed, score, max_score, percentage, passed, question_order, question_instances, started_at, expires_at, submitted_at FROM assessment_attempts WHERE id = $1 AND profile_id = $2",
      [input.id, input.profileId],
    );
    if (!row) throw new NotFoundError("Assessment attempt", input.id);
    return mapAttempt(row);
  }

  async getResult(
    id: string,
    profileId: string,
  ): Promise<import("@/domain/assessment/types").AssessmentResultDetail | null> {
    const attempt = await this.getAttempt(id, profileId);
    if (!attempt) return null;
    const detail = await this.getAssessment(attempt.assessmentId, { includeDraft: true });
    if (!detail) return null;
    const sectionRows = await this.rows<SectionResultDbRow>(
      "SELECT id, assessment_attempt_id, section_id, score, max_score, percentage, correct_count, answered_count, question_count, concept_scores FROM assessment_section_results WHERE assessment_attempt_id = ? ORDER BY section_id",
      "SELECT id, assessment_attempt_id, section_id, score, max_score, percentage, correct_count, answered_count, question_count, concept_scores FROM assessment_section_results WHERE assessment_attempt_id = $1 ORDER BY section_id",
      [id],
    );
    const diagnostic = await this.one<DiagnosticDbRow>(
      "SELECT id, assessment_attempt_id, readiness_grade_id, readiness_label, subject_strengths, weak_concept_ids, missing_prerequisite_concept_ids, recommendations, explanation, created_at FROM diagnostic_results WHERE assessment_attempt_id = ?",
      "SELECT id, assessment_attempt_id, readiness_grade_id, readiness_label, subject_strengths, weak_concept_ids, missing_prerequisite_concept_ids, recommendations, explanation, created_at FROM diagnostic_results WHERE assessment_attempt_id = $1",
      [id],
    );
    const placement = await this.one<PlacementDbRow>(
      "SELECT id, assessment_attempt_id, recommended_grade_id, starting_level, confidence, review_question_ids, recommendations, explanation, created_at FROM placement_results WHERE assessment_attempt_id = ?",
      "SELECT id, assessment_attempt_id, recommended_grade_id, starting_level, confidence, review_question_ids, recommendations, explanation, created_at FROM placement_results WHERE assessment_attempt_id = $1",
      [id],
    );
    const questionAttempts = await this.listQuestionAttempts(id);
    const submittedAt = attempt.submittedAt ? Date.parse(attempt.submittedAt) : Date.now();
    const startedAt = Date.parse(attempt.startedAt);
    const timeSpentSeconds =
      Number.isFinite(startedAt) && Number.isFinite(submittedAt)
        ? Math.max(0, Math.round((submittedAt - startedAt) / 1000))
        : 0;
    return {
      assessment: detail.assessment,
      attempt,
      sections: sectionRows.map(mapSectionResult),
      questionAttempts,
      timeSpentSeconds,
      averageResponseTimeSeconds: questionAttempts.length
        ? Math.round((timeSpentSeconds / questionAttempts.length) * 10) / 10
        : null,
      mistakeCategories: buildMistakeCategories(questionAttempts),
      previousAttempt: await this.getPreviousAttempt(attempt.assessmentId, profileId, attempt.id),
      diagnostic: diagnostic ? mapDiagnostic(diagnostic) : null,
      placement: placement ? mapPlacement(placement) : null,
    };
  }
}

export function getAssessmentRepository(database?: DatabaseHandle): AssessmentRepository {
  return new SqlAssessmentRepository(database);
}

export function newAssessmentId(prefix: string): string {
  return `${prefix}-${randomUUID()}`;
}
