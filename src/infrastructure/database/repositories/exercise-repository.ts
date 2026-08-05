import { randomUUID } from "node:crypto";
import { ConflictError, NotFoundError } from "@/domain/errors/application-error";
import {
  EXERCISE_ATTEMPT_STATUSES,
  EXERCISE_SET_KINDS,
  EXERCISE_SET_STATUSES,
  QUESTION_DIFFICULTIES,
  QUESTION_STATUSES,
  QUESTION_TYPES,
  type CreateExerciseSetInput,
  type CreateQuestionInput,
  type ExerciseAttemptRecord,
  type ExerciseSetDetail,
  type ExerciseSetKind,
  type ExerciseSetRecord,
  type ExerciseSetQuestionRecord,
  type ExerciseSetStatus,
  type JsonValue,
  type QuestionAttemptRecord,
  type QuestionDetail,
  type QuestionDifficulty,
  type QuestionHintRecord,
  type QuestionListEntry,
  type QuestionOptionRecord,
  type QuestionRecord,
  type QuestionSolutionRecord,
  type QuestionStatus,
  type QuestionTemplateRecord,
  type QuestionType,
  type QuestionValidationSpec,
  type QuestionVersionRecord,
  type SaveQuestionAttemptInput,
  type UpdateQuestionInput,
} from "@/domain/exercise/types";
import type { ExerciseRepository } from "@/domain/ports/exercise-repository";
import { getDatabase, type DatabaseHandle } from "@/infrastructure/database/client";

type DbDate = Date | string | null;
type DbBoolean = boolean | number | string;

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
  source: string;
  author_profile_id: string | null;
  tags: string | null;
  status: string;
  current_version_number: number | string;
  created_at: DbDate;
  updated_at: DbDate;
  concept_count?: number | string;
  exercise_set_count?: number | string;
}

interface VersionDbRow {
  id: string;
  question_id: string;
  version_number: number | string;
  status: string;
  prompt: string;
  answer_spec: string | null;
  explanation: string | null;
  full_solution: string | null;
  common_wrong_answers: string | null;
  error_feedback: string | null;
  partial_credit_rules: string | null;
  change_summary: string | null;
  created_by_profile_id: string | null;
  published_at: DbDate;
  created_at: DbDate;
}

interface OptionDbRow {
  id: string;
  question_version_id: string;
  option_key: string;
  label: string;
  sort_order: number | string;
  is_correct: DbBoolean;
}

interface HintDbRow {
  id: string;
  question_version_id: string;
  level: number | string;
  content: string;
  sort_order: number | string;
}

interface SolutionDbRow {
  id: string;
  question_version_id: string;
  title: string;
  content: string;
  sort_order: number | string;
}

interface SetDbRow {
  id: string;
  slug: string;
  title: string;
  description: string;
  kind: string;
  subject_id: string | null;
  grade_id: string | null;
  difficulty: string;
  status: string;
  estimated_time_seconds: number | string;
  created_by_profile_id: string | null;
  created_at: DbDate;
  updated_at: DbDate;
}

interface AttemptDbRow {
  id: string;
  exercise_set_id: string;
  profile_id: string;
  status: string;
  seed: number | string;
  score: number | string;
  max_score: number | string;
  started_at: DbDate;
  completed_at: DbDate;
}

interface QuestionAttemptDbRow {
  id: string;
  exercise_attempt_id: string;
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

interface TemplateDbRow {
  id: string;
  question_id: string | null;
  slug: string;
  name: string;
  question_type: string;
  prompt_template: string;
  variables: string | null;
  answer_expression: string | null;
  validation_spec: string | null;
  seed: number | string | null;
  is_active: DbBoolean;
  created_at: DbDate;
  updated_at: DbDate;
}

function asNumber(value: number | string | null | undefined): number {
  return typeof value === "number" ? value : Number(value ?? 0);
}

function asBoolean(value: DbBoolean): boolean {
  return value === true || value === 1 || value === "1" || value === "true";
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

function asQuestionType(value: string): QuestionType {
  return QUESTION_TYPES.includes(value as QuestionType) ? (value as QuestionType) : "short-answer";
}

function asDifficulty(value: string): QuestionDifficulty {
  return QUESTION_DIFFICULTIES.includes(value as QuestionDifficulty)
    ? (value as QuestionDifficulty)
    : "balanced";
}

function asQuestionStatus(value: string): QuestionStatus {
  return QUESTION_STATUSES.includes(value as QuestionStatus) ? (value as QuestionStatus) : "draft";
}

function asSetKind(value: string): ExerciseSetKind {
  return EXERCISE_SET_KINDS.includes(value as ExerciseSetKind)
    ? (value as ExerciseSetKind)
    : "custom";
}

function asSetStatus(value: string): ExerciseSetStatus {
  return EXERCISE_SET_STATUSES.includes(value as ExerciseSetStatus)
    ? (value as ExerciseSetStatus)
    : "draft";
}

function asAttemptStatus(value: string): ExerciseAttemptRecord["status"] {
  return EXERCISE_ATTEMPT_STATUSES.includes(value as ExerciseAttemptRecord["status"])
    ? (value as ExerciseAttemptRecord["status"])
    : "in-progress";
}

function mapQuestion(row: QuestionDbRow): QuestionRecord {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    type: asQuestionType(row.question_type),
    subjectId: row.subject_id,
    ...(row.subject_name ? { subjectName: row.subject_name } : {}),
    gradeMinId: row.grade_min_id,
    gradeMaxId: row.grade_max_id,
    difficulty: asDifficulty(row.difficulty),
    estimatedTimeSeconds: asNumber(row.estimated_time_seconds),
    source: row.source,
    authorProfileId: row.author_profile_id,
    tags: asJson<string[]>(row.tags, []),
    status: asQuestionStatus(row.status),
    currentVersionNumber: asNumber(row.current_version_number),
    createdAt: asIso(row.created_at),
    updatedAt: asIso(row.updated_at),
  };
}

function mapQuestionList(row: QuestionDbRow): QuestionListEntry {
  return {
    ...mapQuestion(row),
    conceptCount: asNumber(row.concept_count),
    exerciseSetCount: asNumber(row.exercise_set_count),
  };
}

function mapVersion(row: VersionDbRow): QuestionVersionRecord {
  return {
    id: row.id,
    questionId: row.question_id,
    versionNumber: asNumber(row.version_number),
    status: asQuestionStatus(row.status),
    prompt: row.prompt,
    answerSpec: asJson<QuestionValidationSpec>(row.answer_spec, {}),
    explanation: row.explanation ?? "",
    fullSolution: row.full_solution ?? "",
    commonWrongAnswers: asJson<string[]>(row.common_wrong_answers, []),
    errorFeedback: asJson<Record<string, string>>(row.error_feedback, {}),
    partialCreditRules: asJson<QuestionValidationSpec["partialCredit"] | null>(
      row.partial_credit_rules,
      null,
    ),
    changeSummary: row.change_summary ?? "",
    createdByProfileId: row.created_by_profile_id,
    publishedAt: row.published_at ? asIso(row.published_at) : null,
    createdAt: asIso(row.created_at),
  };
}

function mapOption(row: OptionDbRow, includeAnswerKey: boolean): QuestionOptionRecord {
  return {
    id: row.id,
    questionVersionId: row.question_version_id,
    key: row.option_key,
    label: row.label,
    sortOrder: asNumber(row.sort_order),
    ...(includeAnswerKey ? { isCorrect: asBoolean(row.is_correct) } : {}),
  };
}

function mapHint(row: HintDbRow): QuestionHintRecord {
  return {
    id: row.id,
    questionVersionId: row.question_version_id,
    level: asNumber(row.level),
    content: row.content,
    sortOrder: asNumber(row.sort_order),
  };
}

function mapSolution(row: SolutionDbRow): QuestionSolutionRecord {
  return {
    id: row.id,
    questionVersionId: row.question_version_id,
    title: row.title,
    content: row.content,
    sortOrder: asNumber(row.sort_order),
  };
}

function mapTemplate(row: TemplateDbRow): QuestionTemplateRecord {
  return {
    id: row.id,
    questionId: row.question_id,
    slug: row.slug,
    name: row.name,
    questionType: asQuestionType(row.question_type),
    promptTemplate: row.prompt_template,
    variables: asJson(row.variables, []),
    answerExpression: row.answer_expression ?? "",
    validationSpec: asJson<QuestionValidationSpec>(row.validation_spec, {}),
    seed: row.seed === null ? null : asNumber(row.seed),
    isActive: asBoolean(row.is_active),
    createdAt: asIso(row.created_at),
    updatedAt: asIso(row.updated_at),
  };
}

function mapSet(row: SetDbRow): ExerciseSetRecord {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    kind: asSetKind(row.kind),
    subjectId: row.subject_id,
    gradeId: row.grade_id,
    difficulty: asDifficulty(row.difficulty),
    status: asSetStatus(row.status),
    estimatedTimeSeconds: asNumber(row.estimated_time_seconds),
    createdByProfileId: row.created_by_profile_id,
    createdAt: asIso(row.created_at),
    updatedAt: asIso(row.updated_at),
  };
}

function mapAttempt(row: AttemptDbRow): ExerciseAttemptRecord {
  return {
    id: row.id,
    exerciseSetId: row.exercise_set_id,
    profileId: row.profile_id,
    status: asAttemptStatus(row.status),
    seed: asNumber(row.seed),
    score: asNumber(row.score),
    maxScore: asNumber(row.max_score),
    startedAt: asIso(row.started_at),
    completedAt: row.completed_at ? asIso(row.completed_at) : null,
  };
}

function mapQuestionAttempt(row: QuestionAttemptDbRow): QuestionAttemptRecord {
  return {
    id: row.id,
    exerciseAttemptId: row.exercise_attempt_id,
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

function asConflict(error: unknown): never {
  const message = error instanceof Error ? error.message : String(error);
  if (
    message.includes("UNIQUE constraint failed") ||
    message.includes("duplicate key") ||
    message.includes("questions_slug_idx") ||
    message.includes("exercise_sets_slug_idx")
  ) {
    throw new ConflictError(
      "That question, template, exercise set, or relationship already exists.",
    );
  }
  throw error;
}

const questionSelect =
  "SELECT q.id, q.slug, q.title, q.question_type, q.subject_id, s.name AS subject_name, q.grade_min_id, q.grade_max_id, q.difficulty, q.estimated_time_seconds, q.source, q.author_profile_id, q.tags, q.status, q.current_version_number, q.created_at, q.updated_at, (SELECT COUNT(*) FROM question_concepts qc WHERE qc.question_id = q.id) AS concept_count, (SELECT COUNT(*) FROM exercise_set_questions esq WHERE esq.question_id = q.id) AS exercise_set_count FROM questions q JOIN subjects s ON s.id = q.subject_id";
const questionBaseSelect =
  "SELECT id, slug, title, question_type, subject_id, grade_min_id, grade_max_id, difficulty, estimated_time_seconds, source, author_profile_id, tags, status, current_version_number, created_at, updated_at FROM questions";
const setSelect =
  "SELECT id, slug, title, description, kind, subject_id, grade_id, difficulty, status, estimated_time_seconds, created_by_profile_id, created_at, updated_at FROM exercise_sets";

export class SqlExerciseRepository implements ExerciseRepository {
  constructor(private readonly database: DatabaseHandle = getDatabase()) {}

  private async rows<T>(
    sqliteQuery: string,
    postgresQuery: string,
    values: readonly unknown[] = [],
  ): Promise<T[]> {
    if (this.database.provider === "sqlite")
      return this.database.raw.prepare(sqliteQuery).all(...values) as T[];
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

  async listQuestions(
    options: {
      includeArchived?: boolean;
      subjectId?: string;
      gradeId?: string;
      type?: string;
      difficulty?: string;
      search?: string;
    } = {},
  ): Promise<readonly QuestionListEntry[]> {
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
    if (!options.includeArchived) add("q.status = 'published'", "q.status = 'published'");
    if (options.subjectId) add("q.subject_id = ?", "q.subject_id = $value", options.subjectId);
    if (options.type) add("q.question_type = ?", "q.question_type = $value", options.type);
    if (options.difficulty) add("q.difficulty = ?", "q.difficulty = $value", options.difficulty);
    if (options.search?.trim()) {
      const search = "%" + options.search.trim().toLowerCase() + "%";
      add(
        "(LOWER(q.title) LIKE ? OR LOWER(q.slug) LIKE ?)",
        "(LOWER(q.title) LIKE $value OR LOWER(q.slug) LIKE $value)",
        search,
        search,
      );
    }
    const sqliteQuery =
      questionSelect +
      (sqliteWhere.length ? " WHERE " + sqliteWhere.join(" AND ") : "") +
      " ORDER BY q.title COLLATE NOCASE";
    const postgresQuery =
      questionSelect +
      (postgresWhere.length ? " WHERE " + postgresWhere.join(" AND ") : "") +
      " ORDER BY q.title";
    return (await this.rows<QuestionDbRow>(sqliteQuery, postgresQuery, values)).map(
      mapQuestionList,
    );
  }

  private async getQuestionRecord(
    id: string,
    includeDraft: boolean,
  ): Promise<QuestionRecord | null> {
    const row = await this.one<QuestionDbRow>(
      questionBaseSelect +
        (includeDraft ? " WHERE id = ?" : " WHERE id = ? AND status = 'published'"),
      questionBaseSelect +
        (includeDraft ? " WHERE id = $1" : " WHERE id = $1 AND status = 'published'"),
      [id],
    );
    return row ? mapQuestion(row) : null;
  }

  async getQuestion(
    id: string,
    options: { includeDraft?: boolean } = {},
  ): Promise<QuestionDetail | null> {
    const includeDraft = options.includeDraft ?? false;
    const question = await this.getQuestionRecord(id, includeDraft);
    if (!question) return null;
    const version = await this.one<VersionDbRow>(
      "SELECT id, question_id, version_number, status, prompt, answer_spec, explanation, full_solution, common_wrong_answers, error_feedback, partial_credit_rules, change_summary, created_by_profile_id, published_at, created_at FROM question_versions WHERE question_id = ? " +
        (includeDraft
          ? "ORDER BY version_number DESC LIMIT 1"
          : "AND status = 'published' ORDER BY version_number DESC LIMIT 1"),
      "SELECT id, question_id, version_number, status, prompt, answer_spec, explanation, full_solution, common_wrong_answers, error_feedback, partial_credit_rules, change_summary, created_by_profile_id, published_at, created_at FROM question_versions WHERE question_id = $1 " +
        (includeDraft
          ? "ORDER BY version_number DESC LIMIT 1"
          : "AND status = 'published' ORDER BY version_number DESC LIMIT 1"),
      [id],
    );
    if (!version) return null;
    const versionId = version.id;
    const [questionOptions, hints, solutions, concepts, objectives, template] = await Promise.all([
      this.rows<OptionDbRow>(
        "SELECT id, question_version_id, option_key, label, sort_order, is_correct FROM question_options WHERE question_version_id = ? ORDER BY sort_order, option_key",
        "SELECT id, question_version_id, option_key, label, sort_order, is_correct FROM question_options WHERE question_version_id = $1 ORDER BY sort_order, option_key",
        [versionId],
      ),
      this.rows<HintDbRow>(
        "SELECT id, question_version_id, level, content, sort_order FROM question_hints WHERE question_version_id = ? ORDER BY sort_order, level",
        "SELECT id, question_version_id, level, content, sort_order FROM question_hints WHERE question_version_id = $1 ORDER BY sort_order, level",
        [versionId],
      ),
      this.rows<SolutionDbRow>(
        "SELECT id, question_version_id, title, content, sort_order FROM question_solutions WHERE question_version_id = ? ORDER BY sort_order, id",
        "SELECT id, question_version_id, title, content, sort_order FROM question_solutions WHERE question_version_id = $1 ORDER BY sort_order, id",
        [versionId],
      ),
      this.rows<{ concept_id: string }>(
        "SELECT concept_id FROM question_concepts WHERE question_id = ? ORDER BY sort_order, concept_id",
        "SELECT concept_id FROM question_concepts WHERE question_id = $1 ORDER BY sort_order, concept_id",
        [id],
      ),
      this.rows<{ objective_id: string }>(
        "SELECT objective_id FROM question_learning_objectives WHERE question_id = ? ORDER BY sort_order, objective_id",
        "SELECT objective_id FROM question_learning_objectives WHERE question_id = $1 ORDER BY sort_order, objective_id",
        [id],
      ),
      this.one<TemplateDbRow>(
        "SELECT id, question_id, slug, name, question_type, prompt_template, variables, answer_expression, validation_spec, seed, is_active, created_at, updated_at FROM question_templates WHERE question_id = ? AND is_active = 1 ORDER BY id LIMIT 1",
        "SELECT id, question_id, slug, name, question_type, prompt_template, variables, answer_expression, validation_spec, seed, is_active, created_at, updated_at FROM question_templates WHERE question_id = $1 AND is_active = TRUE ORDER BY id LIMIT 1",
        [id],
      ),
    ]);
    return {
      question,
      version: mapVersion(version),
      options: questionOptions.map((row) => mapOption(row, includeDraft)),
      hints: hints.map(mapHint),
      solutions: includeDraft ? solutions.map(mapSolution) : [],
      conceptIds: concepts.map((row) => row.concept_id),
      learningObjectiveIds: objectives.map((row) => row.objective_id),
      template: template ? mapTemplate(template) : null,
    };
  }

  private async saveVersion(
    questionId: string,
    versionId: string,
    versionNumber: number,
    input: Pick<
      CreateQuestionInput,
      | "status"
      | "prompt"
      | "answerSpec"
      | "explanation"
      | "fullSolution"
      | "commonWrongAnswers"
      | "errorFeedback"
      | "partialCreditRules"
      | "changeSummary"
      | "authorProfileId"
      | "options"
      | "hints"
      | "solutions"
    >,
  ): Promise<void> {
    const publishedAt = input.status === "published" ? new Date().toISOString() : null;
    await this.execute(
      "INSERT INTO question_versions (id, question_id, version_number, status, prompt, answer_spec, explanation, full_solution, common_wrong_answers, error_feedback, partial_credit_rules, change_summary, created_by_profile_id, published_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      "INSERT INTO question_versions (id, question_id, version_number, status, prompt, answer_spec, explanation, full_solution, common_wrong_answers, error_feedback, partial_credit_rules, change_summary, created_by_profile_id, published_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)",
      [
        versionId,
        questionId,
        versionNumber,
        input.status,
        input.prompt,
        JSON.stringify(input.answerSpec),
        input.explanation,
        input.fullSolution,
        JSON.stringify(input.commonWrongAnswers),
        JSON.stringify(input.errorFeedback),
        input.partialCreditRules ? JSON.stringify(input.partialCreditRules) : null,
        input.changeSummary,
        input.authorProfileId,
        publishedAt,
      ],
    );
    for (const option of input.options) {
      await this.execute(
        "INSERT INTO question_options (id, question_version_id, option_key, label, sort_order, is_correct) VALUES (?, ?, ?, ?, ?, ?)",
        "INSERT INTO question_options (id, question_version_id, option_key, label, sort_order, is_correct) VALUES ($1, $2, $3, $4, $5, $6)",
        [
          option.id,
          versionId,
          option.key,
          option.label,
          option.sortOrder,
          this.database.provider === "sqlite"
            ? option.isCorrect
              ? 1
              : 0
            : Boolean(option.isCorrect),
        ],
      );
    }
    for (const hint of input.hints) {
      await this.execute(
        "INSERT INTO question_hints (id, question_version_id, level, content, sort_order) VALUES (?, ?, ?, ?, ?)",
        "INSERT INTO question_hints (id, question_version_id, level, content, sort_order) VALUES ($1, $2, $3, $4, $5)",
        [hint.id, versionId, hint.level, hint.content, hint.sortOrder],
      );
    }
    for (const solution of input.solutions) {
      await this.execute(
        "INSERT INTO question_solutions (id, question_version_id, title, content, sort_order) VALUES (?, ?, ?, ?, ?)",
        "INSERT INTO question_solutions (id, question_version_id, title, content, sort_order) VALUES ($1, $2, $3, $4, $5)",
        [solution.id, versionId, solution.title, solution.content, solution.sortOrder],
      );
    }
  }

  private async saveQuestionLinks(
    questionId: string,
    input: Pick<CreateQuestionInput, "conceptIds" | "learningObjectiveIds">,
  ): Promise<void> {
    await this.execute(
      "DELETE FROM question_concepts WHERE question_id = ?",
      "DELETE FROM question_concepts WHERE question_id = $1",
      [questionId],
    );
    await this.execute(
      "DELETE FROM question_learning_objectives WHERE question_id = ?",
      "DELETE FROM question_learning_objectives WHERE question_id = $1",
      [questionId],
    );
    for (const [index, conceptId] of input.conceptIds.entries()) {
      await this.execute(
        "INSERT INTO question_concepts (question_id, concept_id, sort_order) VALUES (?, ?, ?)",
        "INSERT INTO question_concepts (question_id, concept_id, sort_order) VALUES ($1, $2, $3)",
        [questionId, conceptId, index],
      );
    }
    for (const [index, objectiveId] of input.learningObjectiveIds.entries()) {
      await this.execute(
        "INSERT INTO question_learning_objectives (question_id, objective_id, sort_order) VALUES (?, ?, ?)",
        "INSERT INTO question_learning_objectives (question_id, objective_id, sort_order) VALUES ($1, $2, $3)",
        [questionId, objectiveId, index],
      );
    }
  }

  private async saveTemplate(
    questionId: string | null,
    template: CreateQuestionInput["template"],
  ): Promise<void> {
    if (!template) return;
    await this.execute(
      "INSERT INTO question_templates (id, question_id, slug, name, question_type, prompt_template, variables, answer_expression, validation_spec, seed, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET question_id = excluded.question_id, slug = excluded.slug, name = excluded.name, question_type = excluded.question_type, prompt_template = excluded.prompt_template, variables = excluded.variables, answer_expression = excluded.answer_expression, validation_spec = excluded.validation_spec, seed = excluded.seed, is_active = excluded.is_active, updated_at = CURRENT_TIMESTAMP",
      "INSERT INTO question_templates (id, question_id, slug, name, question_type, prompt_template, variables, answer_expression, validation_spec, seed, is_active) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) ON CONFLICT (id) DO UPDATE SET question_id = EXCLUDED.question_id, slug = EXCLUDED.slug, name = EXCLUDED.name, question_type = EXCLUDED.question_type, prompt_template = EXCLUDED.prompt_template, variables = EXCLUDED.variables, answer_expression = EXCLUDED.answer_expression, validation_spec = EXCLUDED.validation_spec, seed = EXCLUDED.seed, is_active = EXCLUDED.is_active, updated_at = NOW()",
      [
        template.id,
        questionId,
        template.slug,
        template.name,
        template.questionType,
        template.promptTemplate,
        JSON.stringify(template.variables),
        template.answerExpression,
        JSON.stringify(template.validationSpec),
        template.seed,
        this.database.provider === "sqlite" ? (template.isActive ? 1 : 0) : template.isActive,
      ],
    );
  }

  async createQuestion(input: CreateQuestionInput): Promise<QuestionDetail> {
    try {
      await this.execute(
        "INSERT INTO questions (id, slug, title, question_type, subject_id, grade_min_id, grade_max_id, difficulty, estimated_time_seconds, source, author_profile_id, tags, status, current_version_number) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)",
        "INSERT INTO questions (id, slug, title, question_type, subject_id, grade_min_id, grade_max_id, difficulty, estimated_time_seconds, source, author_profile_id, tags, status, current_version_number) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 1)",
        [
          input.id,
          input.slug,
          input.title,
          input.type,
          input.subjectId,
          input.gradeMinId,
          input.gradeMaxId,
          input.difficulty,
          input.estimatedTimeSeconds,
          input.source,
          input.authorProfileId,
          JSON.stringify(input.tags),
          input.status,
        ],
      );
      await this.saveVersion(input.id, "question-version-" + randomUUID(), 1, input);
      await this.saveQuestionLinks(input.id, input);
      await this.saveTemplate(input.id, input.template);
    } catch (error) {
      asConflict(error);
    }
    return (
      (await this.getQuestion(input.id, { includeDraft: true })) ??
      (() => {
        throw new NotFoundError("Question", input.id);
      })()
    );
  }

  async updateQuestion(id: string, input: UpdateQuestionInput): Promise<QuestionDetail> {
    if (!(await this.getQuestionRecord(id, true))) throw new NotFoundError("Question", id);
    const current = await this.one<{ version_number: number | string }>(
      "SELECT current_version_number AS version_number FROM questions WHERE id = ?",
      "SELECT current_version_number AS version_number FROM questions WHERE id = $1",
      [id],
    );
    const versionNumber = asNumber(current?.version_number) + 1;
    try {
      await this.execute(
        "UPDATE questions SET slug = ?, title = ?, question_type = ?, subject_id = ?, grade_min_id = ?, grade_max_id = ?, difficulty = ?, estimated_time_seconds = ?, source = ?, author_profile_id = ?, tags = ?, status = ?, current_version_number = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        "UPDATE questions SET slug = $1, title = $2, question_type = $3, subject_id = $4, grade_min_id = $5, grade_max_id = $6, difficulty = $7, estimated_time_seconds = $8, source = $9, author_profile_id = $10, tags = $11, status = $12, current_version_number = $13, updated_at = NOW() WHERE id = $14",
        [
          input.slug,
          input.title,
          input.type,
          input.subjectId,
          input.gradeMinId,
          input.gradeMaxId,
          input.difficulty,
          input.estimatedTimeSeconds,
          input.source,
          input.authorProfileId,
          JSON.stringify(input.tags),
          input.status,
          versionNumber,
          id,
        ],
      );
      await this.saveVersion(id, "question-version-" + randomUUID(), versionNumber, input);
      await this.saveQuestionLinks(id, input);
      await this.saveTemplate(id, input.template);
    } catch (error) {
      asConflict(error);
    }
    return (
      (await this.getQuestion(id, { includeDraft: true })) ??
      (() => {
        throw new NotFoundError("Question", id);
      })()
    );
  }

  async setQuestionStatus(id: string, status: QuestionStatus): Promise<QuestionRecord> {
    if (!QUESTION_STATUSES.includes(status))
      throw new ConflictError("Unsupported question status.");
    const current = await this.getQuestionRecord(id, true);
    if (!current) throw new NotFoundError("Question", id);
    await this.execute(
      "UPDATE questions SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      "UPDATE questions SET status = $1, updated_at = NOW() WHERE id = $2",
      [status, id],
    );
    await this.execute(
      "UPDATE question_versions SET status = ? WHERE question_id = ? AND version_number = (SELECT current_version_number FROM questions WHERE id = ?)",
      "UPDATE question_versions SET status = $1 WHERE question_id = $2 AND version_number = (SELECT current_version_number FROM questions WHERE id = $3)",
      [status, id, id],
    );
    return (await this.getQuestionRecord(id, true))!;
  }

  async listQuestionTemplates(
    options: { activeOnly?: boolean } = {},
  ): Promise<readonly QuestionTemplateRecord[]> {
    const sqlite =
      "SELECT id, question_id, slug, name, question_type, prompt_template, variables, answer_expression, validation_spec, seed, is_active, created_at, updated_at FROM question_templates" +
      (options.activeOnly ? " WHERE is_active = 1" : "") +
      " ORDER BY name COLLATE NOCASE";
    const postgres =
      "SELECT id, question_id, slug, name, question_type, prompt_template, variables, answer_expression, validation_spec, seed, is_active, created_at, updated_at FROM question_templates" +
      (options.activeOnly ? " WHERE is_active = TRUE" : "") +
      " ORDER BY name";
    return (await this.rows<TemplateDbRow>(sqlite, postgres)).map(mapTemplate);
  }

  async getQuestionTemplate(id: string): Promise<QuestionTemplateRecord | null> {
    const row = await this.one<TemplateDbRow>(
      "SELECT id, question_id, slug, name, question_type, prompt_template, variables, answer_expression, validation_spec, seed, is_active, created_at, updated_at FROM question_templates WHERE id = ?",
      "SELECT id, question_id, slug, name, question_type, prompt_template, variables, answer_expression, validation_spec, seed, is_active, created_at, updated_at FROM question_templates WHERE id = $1",
      [id],
    );
    return row ? mapTemplate(row) : null;
  }

  async saveQuestionTemplate(template: QuestionTemplateRecord): Promise<QuestionTemplateRecord> {
    await this.saveTemplate(template.questionId, template);
    return (await this.getQuestionTemplate(template.id))!;
  }

  async listExerciseSets(
    options: { includeArchived?: boolean; status?: string; kind?: string; subjectId?: string } = {},
  ): Promise<readonly ExerciseSetRecord[]> {
    const whereSqlite: string[] = [];
    const wherePostgres: string[] = [];
    const values: unknown[] = [];
    const add = (sqlite: string, postgres: string, value?: unknown) => {
      whereSqlite.push(sqlite);
      wherePostgres.push(postgres.replace("$value", "$" + (values.length + 1)));
      if (value !== undefined) values.push(value);
    };
    if (!options.includeArchived) add("status = 'published'", "status = 'published'");
    if (options.status) add("status = ?", "status = $value", options.status);
    if (options.kind) add("kind = ?", "kind = $value", options.kind);
    if (options.subjectId) add("subject_id = ?", "subject_id = $value", options.subjectId);
    return (
      await this.rows<SetDbRow>(
        setSelect +
          (whereSqlite.length ? " WHERE " + whereSqlite.join(" AND ") : "") +
          " ORDER BY title COLLATE NOCASE",
        setSelect +
          (wherePostgres.length ? " WHERE " + wherePostgres.join(" AND ") : "") +
          " ORDER BY title",
        values,
      )
    ).map(mapSet);
  }

  async getExerciseSet(
    id: string,
    options: { includeDraft?: boolean } = {},
  ): Promise<ExerciseSetDetail | null> {
    const includeDraft = options.includeDraft ?? false;
    const set = await this.one<SetDbRow>(
      setSelect + (includeDraft ? " WHERE id = ?" : " WHERE id = ? AND status = 'published'"),
      setSelect + (includeDraft ? " WHERE id = $1" : " WHERE id = $1 AND status = 'published'"),
      [id],
    );
    if (!set) return null;
    const rows = await this.rows<QuestionDbRow>(
      "SELECT q.id, q.slug, q.title, q.question_type, q.subject_id, s.name AS subject_name, q.grade_min_id, q.grade_max_id, q.difficulty, q.estimated_time_seconds, q.source, q.author_profile_id, q.tags, q.status, q.current_version_number, q.created_at, q.updated_at, (SELECT COUNT(*) FROM question_concepts qc WHERE qc.question_id = q.id) AS concept_count, (SELECT COUNT(*) FROM exercise_set_questions x WHERE x.question_id = q.id) AS exercise_set_count, esq.sort_order, esq.points, esq.is_required FROM exercise_set_questions esq JOIN questions q ON q.id = esq.question_id JOIN subjects s ON s.id = q.subject_id WHERE esq.exercise_set_id = ? " +
        (includeDraft ? "" : "AND q.status = 'published'") +
        " ORDER BY esq.sort_order, q.title COLLATE NOCASE",
      "SELECT q.id, q.slug, q.title, q.question_type, q.subject_id, s.name AS subject_name, q.grade_min_id, q.grade_max_id, q.difficulty, q.estimated_time_seconds, q.source, q.author_profile_id, q.tags, q.status, q.current_version_number, q.created_at, q.updated_at, (SELECT COUNT(*) FROM question_concepts qc WHERE qc.question_id = q.id) AS concept_count, (SELECT COUNT(*) FROM exercise_set_questions x WHERE x.question_id = q.id) AS exercise_set_count, esq.sort_order, esq.points, esq.is_required FROM exercise_set_questions esq JOIN questions q ON q.id = esq.question_id JOIN subjects s ON s.id = q.subject_id WHERE esq.exercise_set_id = $1 " +
        (includeDraft ? "" : "AND q.status = 'published'") +
        " ORDER BY esq.sort_order, q.title",
      [id],
    );
    return {
      exerciseSet: mapSet(set),
      questions: rows.map((row) => ({
        sortOrder: asNumber((row as QuestionDbRow & { sort_order?: number }).sort_order),
        points: asNumber((row as QuestionDbRow & { points?: number }).points),
        isRequired: asBoolean(
          (row as QuestionDbRow & { is_required?: DbBoolean }).is_required ?? 1,
        ),
        exerciseSetId: id,
        questionId: row.id,
        question: mapQuestionList(row),
      })) as readonly ExerciseSetQuestionRecord[],
    };
  }

  async createExerciseSet(input: CreateExerciseSetInput): Promise<ExerciseSetRecord> {
    try {
      await this.execute(
        "INSERT INTO exercise_sets (id, slug, title, description, kind, subject_id, grade_id, difficulty, status, estimated_time_seconds, created_by_profile_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        "INSERT INTO exercise_sets (id, slug, title, description, kind, subject_id, grade_id, difficulty, status, estimated_time_seconds, created_by_profile_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)",
        [
          input.id,
          input.slug,
          input.title,
          input.description,
          input.kind,
          input.subjectId,
          input.gradeId,
          input.difficulty,
          input.status,
          input.estimatedTimeSeconds,
          input.createdByProfileId,
        ],
      );
    } catch (error) {
      asConflict(error);
    }
    const row = await this.one<SetDbRow>(
      setSelect + " WHERE id = ?",
      setSelect + " WHERE id = $1",
      [input.id],
    );
    if (!row) throw new NotFoundError("Exercise set", input.id);
    return mapSet(row);
  }

  async setExerciseSetStatus(id: string, status: ExerciseSetStatus): Promise<ExerciseSetRecord> {
    if (!EXERCISE_SET_STATUSES.includes(status))
      throw new ConflictError("Unsupported exercise-set status.");
    await this.execute(
      "UPDATE exercise_sets SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      "UPDATE exercise_sets SET status = $1, updated_at = NOW() WHERE id = $2",
      [status, id],
    );
    const row = await this.one<SetDbRow>(
      setSelect + " WHERE id = ?",
      setSelect + " WHERE id = $1",
      [id],
    );
    if (!row) throw new NotFoundError("Exercise set", id);
    return mapSet(row);
  }

  async saveExerciseSetQuestion(input: {
    exerciseSetId: string;
    questionId: string;
    sortOrder: number;
    points: number;
    isRequired: boolean;
  }): Promise<void> {
    await this.execute(
      "INSERT INTO exercise_set_questions (exercise_set_id, question_id, sort_order, points, is_required) VALUES (?, ?, ?, ?, ?) ON CONFLICT(exercise_set_id, question_id) DO UPDATE SET sort_order = excluded.sort_order, points = excluded.points, is_required = excluded.is_required",
      "INSERT INTO exercise_set_questions (exercise_set_id, question_id, sort_order, points, is_required) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (exercise_set_id, question_id) DO UPDATE SET sort_order = EXCLUDED.sort_order, points = EXCLUDED.points, is_required = EXCLUDED.is_required",
      [
        input.exerciseSetId,
        input.questionId,
        input.sortOrder,
        input.points,
        this.database.provider === "sqlite" ? (input.isRequired ? 1 : 0) : input.isRequired,
      ],
    );
  }

  async removeExerciseSetQuestion(input: {
    exerciseSetId: string;
    questionId: string;
  }): Promise<void> {
    await this.execute(
      "DELETE FROM exercise_set_questions WHERE exercise_set_id = ? AND question_id = ?",
      "DELETE FROM exercise_set_questions WHERE exercise_set_id = $1 AND question_id = $2",
      [input.exerciseSetId, input.questionId],
    );
  }

  async createExerciseAttempt(input: {
    id: string;
    exerciseSetId: string;
    profileId: string;
    seed: number;
    maxScore: number;
  }): Promise<ExerciseAttemptRecord> {
    await this.execute(
      "INSERT INTO exercise_attempts (id, exercise_set_id, profile_id, seed, max_score) VALUES (?, ?, ?, ?, ?)",
      "INSERT INTO exercise_attempts (id, exercise_set_id, profile_id, seed, max_score) VALUES ($1, $2, $3, $4, $5)",
      [input.id, input.exerciseSetId, input.profileId, input.seed, input.maxScore],
    );
    const row = await this.one<AttemptDbRow>(
      "SELECT id, exercise_set_id, profile_id, status, seed, score, max_score, started_at, completed_at FROM exercise_attempts WHERE id = ? AND profile_id = ?",
      "SELECT id, exercise_set_id, profile_id, status, seed, score, max_score, started_at, completed_at FROM exercise_attempts WHERE id = $1 AND profile_id = $2",
      [input.id, input.profileId],
    );
    if (!row) throw new NotFoundError("Exercise attempt", input.id);
    return mapAttempt(row);
  }

  async getExerciseAttempt(id: string, profileId: string): Promise<ExerciseAttemptRecord | null> {
    const row = await this.one<AttemptDbRow>(
      "SELECT id, exercise_set_id, profile_id, status, seed, score, max_score, started_at, completed_at FROM exercise_attempts WHERE id = ? AND profile_id = ?",
      "SELECT id, exercise_set_id, profile_id, status, seed, score, max_score, started_at, completed_at FROM exercise_attempts WHERE id = $1 AND profile_id = $2",
      [id, profileId],
    );
    return row ? mapAttempt(row) : null;
  }

  async saveQuestionAttempt(input: SaveQuestionAttemptInput): Promise<QuestionAttemptRecord> {
    const values = [
      input.id,
      input.exerciseAttemptId,
      input.questionId,
      input.questionVersionId,
      input.templateId,
      input.instanceSeed,
      JSON.stringify(input.response),
      JSON.stringify(input.validationResult),
      input.score,
      input.maxScore,
    ];
    await this.execute(
      "INSERT INTO question_attempts (id, exercise_attempt_id, question_id, question_version_id, template_id, instance_seed, response, validation_result, score, max_score) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(exercise_attempt_id, question_id) DO UPDATE SET question_version_id = excluded.question_version_id, template_id = excluded.template_id, instance_seed = excluded.instance_seed, response = excluded.response, validation_result = excluded.validation_result, score = excluded.score, max_score = excluded.max_score, answered_at = CURRENT_TIMESTAMP",
      "INSERT INTO question_attempts (id, exercise_attempt_id, question_id, question_version_id, template_id, instance_seed, response, validation_result, score, max_score) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) ON CONFLICT (exercise_attempt_id, question_id) DO UPDATE SET question_version_id = EXCLUDED.question_version_id, template_id = EXCLUDED.template_id, instance_seed = EXCLUDED.instance_seed, response = EXCLUDED.response, validation_result = EXCLUDED.validation_result, score = EXCLUDED.score, max_score = EXCLUDED.max_score, answered_at = NOW()",
      values,
    );
    const row = await this.one<QuestionAttemptDbRow>(
      "SELECT id, exercise_attempt_id, question_id, question_version_id, template_id, instance_seed, response, validation_result, score, max_score, answered_at FROM question_attempts WHERE exercise_attempt_id = ? AND question_id = ?",
      "SELECT id, exercise_attempt_id, question_id, question_version_id, template_id, instance_seed, response, validation_result, score, max_score, answered_at FROM question_attempts WHERE exercise_attempt_id = $1 AND question_id = $2",
      [input.exerciseAttemptId, input.questionId],
    );
    if (!row) throw new NotFoundError("Question attempt", input.id);
    return mapQuestionAttempt(row);
  }

  async listQuestionAttempts(exerciseAttemptId: string): Promise<readonly QuestionAttemptRecord[]> {
    const rows = await this.rows<QuestionAttemptDbRow>(
      "SELECT id, exercise_attempt_id, question_id, question_version_id, template_id, instance_seed, response, validation_result, score, max_score, answered_at FROM question_attempts WHERE exercise_attempt_id = ? ORDER BY answered_at, id",
      "SELECT id, exercise_attempt_id, question_id, question_version_id, template_id, instance_seed, response, validation_result, score, max_score, answered_at FROM question_attempts WHERE exercise_attempt_id = $1 ORDER BY answered_at, id",
      [exerciseAttemptId],
    );
    return rows.map(mapQuestionAttempt);
  }

  async completeExerciseAttempt(input: {
    id: string;
    profileId: string;
    score: number;
    maxScore: number;
    status: ExerciseAttemptRecord["status"];
  }): Promise<ExerciseAttemptRecord> {
    await this.execute(
      "UPDATE exercise_attempts SET status = ?, score = ?, max_score = ?, completed_at = CURRENT_TIMESTAMP WHERE id = ? AND profile_id = ?",
      "UPDATE exercise_attempts SET status = $1, score = $2, max_score = $3, completed_at = NOW() WHERE id = $4 AND profile_id = $5",
      [input.status, input.score, input.maxScore, input.id, input.profileId],
    );
    const row = await this.one<AttemptDbRow>(
      "SELECT id, exercise_set_id, profile_id, status, seed, score, max_score, started_at, completed_at FROM exercise_attempts WHERE id = ? AND profile_id = ?",
      "SELECT id, exercise_set_id, profile_id, status, seed, score, max_score, started_at, completed_at FROM exercise_attempts WHERE id = $1 AND profile_id = $2",
      [input.id, input.profileId],
    );
    if (!row) throw new NotFoundError("Exercise attempt", input.id);
    return mapAttempt(row);
  }
}

export function getExerciseRepository(database?: DatabaseHandle): ExerciseRepository {
  return new SqlExerciseRepository(database);
}
