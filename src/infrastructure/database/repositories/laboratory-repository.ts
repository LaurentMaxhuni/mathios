import { randomUUID } from "node:crypto";
import { NotFoundError, ValidationError } from "@/domain/errors/application-error";
import { buildGraphPoints, compareToTheory, linearRegression } from "@/domain/laboratory/rules";
import type { LaboratoryRepository } from "@/domain/ports/laboratory-repository";
import type {
  LaboratoryActivityInput,
  LaboratoryActivityRecord,
  LaboratoryConfiguration,
  LaboratoryDetail,
  LaboratoryFeedbackRecord,
  LaboratoryMeasurementRecord,
  LaboratoryObservationRecord,
  LaboratoryReportRecord,
  LaboratorySessionDetail,
  LaboratorySessionInput,
  LaboratorySessionRecord,
  LaboratoryStepRecord,
  LaboratoryVariableRecord,
} from "@/domain/laboratory/types";
import { getDatabase, type DatabaseHandle } from "@/infrastructure/database/client";

type DbDate = string | Date | null;
type DbBoolean = boolean | number | string;
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
const asNullableIso = (value: DbDate) => (value === null ? null : asIso(value));
const asBoolean = (value: DbBoolean) =>
  value === true || value === 1 || value === "1" || value === "true";

function parseJson<T>(value: unknown, fallback: T): T {
  if (typeof value !== "string" || !value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function activityStatus(value: unknown): LaboratoryActivityRecord["status"] {
  return value === "published" || value === "archived" ? value : "draft";
}
function mode(value: unknown): LaboratoryActivityRecord["mode"] {
  return value === "real-world" || value === "hybrid" ? value : "simulated";
}
function sessionStatus(value: unknown): LaboratorySessionRecord["status"] {
  if (value === "paused" || value === "completed" || value === "abandoned") return value;
  return "active";
}
function reportStatus(value: unknown): LaboratoryReportRecord["status"] {
  if (value === "submitted" || value === "returned" || value === "graded") return value;
  return "draft";
}

export class SqlLaboratoryRepository implements LaboratoryRepository {
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

  private mapActivity(row: DbRow): LaboratoryActivityRecord {
    return {
      id: String(row.id),
      slug: String(row.slug),
      title: String(row.title),
      description: String(row.description ?? ""),
      subjectId: String(row.subject_id),
      subjectName: String(row.subject_name ?? ""),
      mode: mode(row.mode),
      status: activityStatus(row.status),
      objective: String(row.objective ?? ""),
      theory: String(row.theory ?? ""),
      materials: parseJson(row.materials, []),
      safetyNotes: parseJson(row.safety_notes, []),
      analysisPrompt: String(row.analysis_prompt ?? ""),
      graphingInstructions: String(row.graphing_instructions ?? ""),
      questions: parseJson(row.questions, []),
      conclusionPrompt: String(row.conclusion_prompt ?? ""),
      extensionActivity: String(row.extension_activity ?? ""),
      simulationId: row.simulation_id ? String(row.simulation_id) : null,
      estimatedDurationMinutes: asNumber(row.estimated_duration_minutes),
      createdByProfileId: row.created_by_profile_id ? String(row.created_by_profile_id) : null,
      createdAt: asIso(row.created_at as DbDate),
      updatedAt: asIso(row.updated_at as DbDate),
      publishedAt: asNullableIso(row.published_at as DbDate),
    };
  }

  private mapStep(row: DbRow): LaboratoryStepRecord {
    const type = row.step_type;
    return {
      id: String(row.id),
      activityId: String(row.activity_id),
      type:
        type === "setup" ||
        type === "observation" ||
        type === "analysis" ||
        type === "conclusion" ||
        type === "extension"
          ? type
          : "procedure",
      title: String(row.title),
      instructions: String(row.instructions ?? ""),
      expectedObservation: String(row.expected_observation ?? ""),
      sortOrder: asNumber(row.sort_order),
      isRequired: asBoolean(row.is_required as DbBoolean),
    };
  }

  private mapVariable(row: DbRow): LaboratoryVariableRecord {
    const role = row.role;
    const dataType = row.data_type;
    return {
      id: String(row.id),
      activityId: String(row.activity_id),
      key: String(row.variable_key),
      label: String(row.label),
      symbol: String(row.symbol ?? ""),
      role:
        role === "independent" || role === "dependent" || role === "controlled" ? role : "measured",
      dataType: dataType === "text" || dataType === "boolean" ? dataType : "number",
      unit: row.unit ? String(row.unit) : null,
      description: String(row.description ?? ""),
      defaultValue: parseJson(row.default_value, null),
      minValue: asNullableNumber(row.min_value),
      maxValue: asNullableNumber(row.max_value),
      uncertainty: asNullableNumber(row.uncertainty),
      significantFigures: asNullableNumber(row.significant_figures),
      theoreticalValue: asNullableNumber(row.theoretical_value),
      configuration: parseJson(row.configuration, {}),
      sortOrder: asNumber(row.sort_order),
    };
  }

  private mapSession(row: DbRow): LaboratorySessionRecord {
    return {
      id: String(row.id),
      profileId: String(row.profile_id),
      activityId: String(row.activity_id),
      status: sessionStatus(row.status),
      mode: mode(row.mode),
      simulationSessionId: row.simulation_session_id ? String(row.simulation_session_id) : null,
      inputs: parseJson(row.inputs, {}),
      state: parseJson(row.state, {}),
      elapsedSeconds: asNumber(row.elapsed_seconds),
      completionPercentage: asNumber(row.completion_percentage),
      startedAt: asIso(row.started_at as DbDate),
      completedAt: asNullableIso(row.completed_at as DbDate),
      updatedAt: asIso(row.updated_at as DbDate),
    };
  }

  private mapObservation(row: DbRow): LaboratoryObservationRecord {
    return {
      id: String(row.id),
      sessionId: String(row.session_id),
      stepId: row.step_id ? String(row.step_id) : null,
      prompt: String(row.prompt ?? ""),
      notes: String(row.notes ?? ""),
      recordedAt: asIso(row.recorded_at as DbDate),
      sortOrder: asNumber(row.sort_order),
      metadata: parseJson(row.metadata, {}),
    };
  }

  private mapMeasurement(row: DbRow): LaboratoryMeasurementRecord {
    const source = row.source;
    return {
      id: String(row.id),
      sessionId: String(row.session_id),
      variableId: String(row.variable_id),
      observationId: row.observation_id ? String(row.observation_id) : null,
      rowIndex: asNumber(row.row_index),
      numericValue: asNullableNumber(row.numeric_value),
      textValue:
        row.text_value === null || row.text_value === undefined ? null : String(row.text_value),
      unit: row.unit ? String(row.unit) : null,
      uncertainty: asNullableNumber(row.uncertainty),
      significantFigures: asNullableNumber(row.significant_figures),
      source: source === "simulation" || source === "calculated" ? source : "manual",
      notes: String(row.notes ?? ""),
      recordedAt: asIso(row.recorded_at as DbDate),
    };
  }

  private mapFeedback(row: DbRow): LaboratoryFeedbackRecord {
    return {
      id: String(row.id),
      reportId: String(row.report_id),
      authorProfileId: String(row.author_profile_id),
      authorName: String(row.author_name ?? "Profile"),
      body: String(row.body ?? ""),
      rubric: parseJson(row.rubric, {}),
      createdAt: asIso(row.created_at as DbDate),
      updatedAt: asIso(row.updated_at as DbDate),
    };
  }

  private async mapReport(row: DbRow): Promise<LaboratoryReportRecord> {
    const feedbackRows = await this.rows(
      `SELECT f.id, f.report_id, f.author_profile_id, p.display_name AS author_name, f.body, f.rubric, f.created_at, f.updated_at
       FROM laboratory_feedback f JOIN profiles p ON p.id = f.author_profile_id
       WHERE f.report_id = ? ORDER BY f.created_at`,
      `SELECT f.id, f.report_id, f.author_profile_id, p.display_name AS author_name, f.body, f.rubric, f.created_at, f.updated_at
       FROM laboratory_feedback f JOIN profiles p ON p.id = f.author_profile_id
       WHERE f.report_id = $1 ORDER BY f.created_at`,
      [row.id],
    );
    return {
      id: String(row.id),
      sessionId: String(row.session_id),
      profileId: String(row.profile_id),
      status: reportStatus(row.status),
      title: String(row.title ?? ""),
      abstract: String(row.abstract ?? ""),
      sections: parseJson(row.sections, []),
      tables: parseJson(row.tables, []),
      charts: parseJson(row.charts, []),
      formulas: parseJson(row.formulas, []),
      images: parseJson(row.images, []),
      conclusion: String(row.conclusion ?? ""),
      submittedAt: asNullableIso(row.submitted_at as DbDate),
      createdAt: asIso(row.created_at as DbDate),
      updatedAt: asIso(row.updated_at as DbDate),
      feedback: feedbackRows.map((feedback) => this.mapFeedback(feedback)),
    };
  }

  private readonly selectActivity = `SELECT a.id, a.slug, a.title, a.description, a.subject_id, subjects.name AS subject_name,
    a.mode, a.status, a.objective, a.theory, a.materials, a.safety_notes, a.analysis_prompt,
    a.graphing_instructions, a.questions, a.conclusion_prompt, a.extension_activity, a.simulation_id,
    a.estimated_duration_minutes, a.created_by_profile_id, a.created_at, a.updated_at, a.published_at
    FROM laboratory_activities a JOIN subjects ON subjects.id = a.subject_id`;

  async listActivities(
    options: {
      includeDraft?: boolean;
      subjectId?: string;
      mode?: LaboratoryActivityRecord["mode"];
    } = {},
  ): Promise<readonly LaboratoryActivityRecord[]> {
    const sqliteConditions: string[] = [];
    const postgresConditions: string[] = [];
    const values: unknown[] = [];
    if (!options.includeDraft) {
      sqliteConditions.push("a.status = 'published'");
      postgresConditions.push("a.status = 'published'");
    }
    if (options.subjectId) {
      values.push(options.subjectId);
      sqliteConditions.push("a.subject_id = ?");
      postgresConditions.push(`a.subject_id = $${values.length}`);
    }
    if (options.mode) {
      values.push(options.mode);
      sqliteConditions.push("a.mode = ?");
      postgresConditions.push(`a.mode = $${values.length}`);
    }
    const sqliteWhere = sqliteConditions.length ? ` WHERE ${sqliteConditions.join(" AND ")}` : "";
    const postgresWhere = postgresConditions.length
      ? ` WHERE ${postgresConditions.join(" AND ")}`
      : "";
    const rows = await this.rows(
      `${this.selectActivity}${sqliteWhere} ORDER BY a.title COLLATE NOCASE`,
      `${this.selectActivity}${postgresWhere} ORDER BY a.title`,
      values,
    );
    return rows.map((row) => this.mapActivity(row));
  }

  async getActivity(
    id: string,
    options: { includeDraft?: boolean } = {},
  ): Promise<LaboratoryDetail | null> {
    const row = await this.one(
      `${this.selectActivity} WHERE (a.id = ? OR a.slug = ?)`,
      `${this.selectActivity} WHERE (a.id = $1 OR a.slug = $2)`,
      [id, id],
    );
    if (!row || (!options.includeDraft && row.status !== "published")) return null;
    const steps = await this.rows(
      `SELECT id, activity_id, step_type, title, instructions, expected_observation, sort_order, is_required FROM laboratory_steps WHERE activity_id = ? ORDER BY sort_order, id`,
      `SELECT id, activity_id, step_type, title, instructions, expected_observation, sort_order, is_required FROM laboratory_steps WHERE activity_id = $1 ORDER BY sort_order, id`,
      [row.id],
    );
    const variables = await this.rows(
      `SELECT id, activity_id, variable_key, label, symbol, role, data_type, unit, description, default_value, min_value, max_value, uncertainty, significant_figures, theoretical_value, configuration, sort_order FROM laboratory_variables WHERE activity_id = ? ORDER BY sort_order, id`,
      `SELECT id, activity_id, variable_key, label, symbol, role, data_type, unit, description, default_value, min_value, max_value, uncertainty, significant_figures, theoretical_value, configuration, sort_order FROM laboratory_variables WHERE activity_id = $1 ORDER BY sort_order, id`,
      [row.id],
    );
    return {
      activity: this.mapActivity(row),
      steps: steps.map((step) => this.mapStep(step)),
      variables: variables.map((variable) => this.mapVariable(variable)),
    };
  }

  async createActivity(
    input: LaboratoryActivityInput & { id: string; createdByProfileId: string },
  ): Promise<LaboratoryDetail> {
    await this.execute(
      `INSERT INTO laboratory_activities (id, slug, title, description, subject_id, mode, status, objective, theory, materials, safety_notes, analysis_prompt, graphing_instructions, questions, conclusion_prompt, extension_activity, simulation_id, estimated_duration_minutes, created_by_profile_id, published_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CASE WHEN ? = 'published' THEN CURRENT_TIMESTAMP ELSE NULL END)`,
      `INSERT INTO laboratory_activities (id, slug, title, description, subject_id, mode, status, objective, theory, materials, safety_notes, analysis_prompt, graphing_instructions, questions, conclusion_prompt, extension_activity, simulation_id, estimated_duration_minutes, created_by_profile_id, published_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, CASE WHEN $20 = 'published' THEN NOW() ELSE NULL END)`,
      [
        input.id,
        input.slug,
        input.title,
        input.description,
        input.subjectId,
        input.mode,
        input.status,
        input.objective,
        input.theory,
        JSON.stringify(input.materials),
        JSON.stringify(input.safetyNotes),
        input.analysisPrompt,
        input.graphingInstructions,
        JSON.stringify(input.questions),
        input.conclusionPrompt,
        input.extensionActivity,
        input.simulationId,
        input.estimatedDurationMinutes,
        input.createdByProfileId,
        input.status,
      ],
    );
    await this.replaceChildren(input.id, input.steps, input.variables);
    return (await this.getActivity(input.id, { includeDraft: true }))!;
  }

  async updateActivity(id: string, input: LaboratoryActivityInput): Promise<LaboratoryDetail> {
    await this.execute(
      `UPDATE laboratory_activities SET slug = ?, title = ?, description = ?, subject_id = ?, mode = ?, status = ?, objective = ?, theory = ?, materials = ?, safety_notes = ?, analysis_prompt = ?, graphing_instructions = ?, questions = ?, conclusion_prompt = ?, extension_activity = ?, simulation_id = ?, estimated_duration_minutes = ?, published_at = CASE WHEN ? = 'published' THEN COALESCE(published_at, CURRENT_TIMESTAMP) ELSE NULL END, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      `UPDATE laboratory_activities SET slug = $1, title = $2, description = $3, subject_id = $4, mode = $5, status = $6, objective = $7, theory = $8, materials = $9, safety_notes = $10, analysis_prompt = $11, graphing_instructions = $12, questions = $13, conclusion_prompt = $14, extension_activity = $15, simulation_id = $16, estimated_duration_minutes = $17, published_at = CASE WHEN $18 = 'published' THEN COALESCE(published_at, NOW()) ELSE NULL END, updated_at = NOW() WHERE id = $19`,
      [
        input.slug,
        input.title,
        input.description,
        input.subjectId,
        input.mode,
        input.status,
        input.objective,
        input.theory,
        JSON.stringify(input.materials),
        JSON.stringify(input.safetyNotes),
        input.analysisPrompt,
        input.graphingInstructions,
        JSON.stringify(input.questions),
        input.conclusionPrompt,
        input.extensionActivity,
        input.simulationId,
        input.estimatedDurationMinutes,
        input.status,
        id,
      ],
    );
    await this.replaceChildren(id, input.steps, input.variables);
    const detail = await this.getActivity(id, { includeDraft: true });
    if (!detail) throw new NotFoundError("Laboratory activity", id);
    return detail;
  }

  private async replaceChildren(
    activityId: string,
    steps: LaboratoryActivityInput["steps"],
    variables: LaboratoryActivityInput["variables"],
  ): Promise<void> {
    await this.execute(
      `DELETE FROM laboratory_steps WHERE activity_id = ?`,
      `DELETE FROM laboratory_steps WHERE activity_id = $1`,
      [activityId],
    );
    await this.execute(
      `DELETE FROM laboratory_variables WHERE activity_id = ?`,
      `DELETE FROM laboratory_variables WHERE activity_id = $1`,
      [activityId],
    );
    for (const step of steps) {
      await this.execute(
        `INSERT INTO laboratory_steps (id, activity_id, step_type, title, instructions, expected_observation, sort_order, is_required) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        `INSERT INTO laboratory_steps (id, activity_id, step_type, title, instructions, expected_observation, sort_order, is_required) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          step.id,
          activityId,
          step.type,
          step.title,
          step.instructions,
          step.expectedObservation,
          step.sortOrder,
          this.database.provider === "sqlite" ? (step.isRequired ? 1 : 0) : step.isRequired,
        ],
      );
    }
    for (const variable of variables) {
      await this.execute(
        `INSERT INTO laboratory_variables (id, activity_id, variable_key, label, symbol, role, data_type, unit, description, default_value, min_value, max_value, uncertainty, significant_figures, theoretical_value, configuration, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        `INSERT INTO laboratory_variables (id, activity_id, variable_key, label, symbol, role, data_type, unit, description, default_value, min_value, max_value, uncertainty, significant_figures, theoretical_value, configuration, sort_order) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)`,
        [
          variable.id,
          activityId,
          variable.key,
          variable.label,
          variable.symbol,
          variable.role,
          variable.dataType,
          variable.unit,
          variable.description,
          JSON.stringify(variable.defaultValue),
          variable.minValue,
          variable.maxValue,
          variable.uncertainty,
          variable.significantFigures,
          variable.theoreticalValue,
          JSON.stringify(variable.configuration),
          variable.sortOrder,
        ],
      );
    }
  }

  async setActivityStatus(
    id: string,
    status: LaboratoryActivityRecord["status"],
  ): Promise<LaboratoryActivityRecord> {
    await this.execute(
      `UPDATE laboratory_activities SET status = ?, published_at = CASE WHEN ? = 'published' THEN CURRENT_TIMESTAMP ELSE published_at END, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      `UPDATE laboratory_activities SET status = $1, published_at = CASE WHEN $2 = 'published' THEN NOW() ELSE published_at END, updated_at = NOW() WHERE id = $3`,
      [status, status, id],
    );
    const row = await this.one(
      this.selectActivity + " WHERE a.id = ?",
      this.selectActivity + " WHERE a.id = $1",
      [id],
    );
    if (!row) throw new NotFoundError("Laboratory activity", id);
    return this.mapActivity(row);
  }

  async createSession(input: LaboratorySessionInput): Promise<LaboratorySessionRecord> {
    await this.execute(
      `INSERT INTO laboratory_sessions (id, profile_id, activity_id, status, mode, simulation_session_id, inputs, state) VALUES (?, ?, ?, 'active', ?, ?, ?, ?)`,
      `INSERT INTO laboratory_sessions (id, profile_id, activity_id, status, mode, simulation_session_id, inputs, state) VALUES ($1, $2, $3, 'active', $4, $5, $6, $7)`,
      [
        input.id,
        input.profileId,
        input.activityId,
        input.mode,
        input.simulationSessionId ?? null,
        JSON.stringify(input.inputs ?? {}),
        JSON.stringify(input.state ?? {}),
      ],
    );
    const session = await this.getSession(input.profileId, input.id);
    if (!session) throw new NotFoundError("Laboratory session", input.id);
    return session;
  }

  async getSession(profileId: string, sessionId: string): Promise<LaboratorySessionRecord | null> {
    const row = await this.one(
      `SELECT id, profile_id, activity_id, status, mode, simulation_session_id, inputs, state, elapsed_seconds, completion_percentage, started_at, completed_at, updated_at FROM laboratory_sessions WHERE id = ? AND profile_id = ?`,
      `SELECT id, profile_id, activity_id, status, mode, simulation_session_id, inputs, state, elapsed_seconds, completion_percentage, started_at, completed_at, updated_at FROM laboratory_sessions WHERE id = $1 AND profile_id = $2`,
      [sessionId, profileId],
    );
    return row ? this.mapSession(row) : null;
  }

  async listSessions(
    profileId: string,
    activityId?: string,
  ): Promise<readonly LaboratorySessionRecord[]> {
    const rows = activityId
      ? await this.rows(
          `SELECT id, profile_id, activity_id, status, mode, simulation_session_id, inputs, state, elapsed_seconds, completion_percentage, started_at, completed_at, updated_at FROM laboratory_sessions WHERE profile_id = ? AND activity_id = ? ORDER BY updated_at DESC`,
          `SELECT id, profile_id, activity_id, status, mode, simulation_session_id, inputs, state, elapsed_seconds, completion_percentage, started_at, completed_at, updated_at FROM laboratory_sessions WHERE profile_id = $1 AND activity_id = $2 ORDER BY updated_at DESC`,
          [profileId, activityId],
        )
      : await this.rows(
          `SELECT id, profile_id, activity_id, status, mode, simulation_session_id, inputs, state, elapsed_seconds, completion_percentage, started_at, completed_at, updated_at FROM laboratory_sessions WHERE profile_id = ? ORDER BY updated_at DESC`,
          `SELECT id, profile_id, activity_id, status, mode, simulation_session_id, inputs, state, elapsed_seconds, completion_percentage, started_at, completed_at, updated_at FROM laboratory_sessions WHERE profile_id = $1 ORDER BY updated_at DESC`,
          [profileId],
        );
    return rows.map((row) => this.mapSession(row));
  }

  async updateSession(input: {
    profileId: string;
    sessionId: string;
    status: LaboratorySessionRecord["status"];
    inputs: LaboratoryConfiguration;
    state: LaboratoryConfiguration;
    elapsedSeconds: number;
    completionPercentage?: number;
  }): Promise<LaboratorySessionRecord> {
    await this.execute(
      `UPDATE laboratory_sessions SET status = ?, inputs = ?, state = ?, elapsed_seconds = ?, completion_percentage = COALESCE(?, completion_percentage), completed_at = CASE WHEN ? = 'completed' THEN CURRENT_TIMESTAMP ELSE completed_at END, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND profile_id = ?`,
      `UPDATE laboratory_sessions SET status = $1, inputs = $2, state = $3, elapsed_seconds = $4, completion_percentage = COALESCE($5, completion_percentage), completed_at = CASE WHEN $6 = 'completed' THEN NOW() ELSE completed_at END, updated_at = NOW() WHERE id = $7 AND profile_id = $8`,
      [
        input.status,
        JSON.stringify(input.inputs),
        JSON.stringify(input.state),
        input.elapsedSeconds,
        input.completionPercentage ?? null,
        input.status,
        input.sessionId,
        input.profileId,
      ],
    );
    const session = await this.getSession(input.profileId, input.sessionId);
    if (!session) throw new NotFoundError("Laboratory session", input.sessionId);
    return session;
  }

  async saveObservation(input: {
    id: string;
    profileId: string;
    sessionId: string;
    stepId: string | null;
    prompt: string;
    notes: string;
    sortOrder: number;
    metadata: LaboratoryConfiguration;
  }): Promise<LaboratoryObservationRecord> {
    await this.assertSessionOwner(input.profileId, input.sessionId);
    await this.execute(
      `INSERT INTO laboratory_observations (id, session_id, step_id, prompt, notes, sort_order, metadata) VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET step_id = excluded.step_id, prompt = excluded.prompt, notes = excluded.notes, sort_order = excluded.sort_order, metadata = excluded.metadata, recorded_at = CURRENT_TIMESTAMP`,
      `INSERT INTO laboratory_observations (id, session_id, step_id, prompt, notes, sort_order, metadata) VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (id) DO UPDATE SET step_id = EXCLUDED.step_id, prompt = EXCLUDED.prompt, notes = EXCLUDED.notes, sort_order = EXCLUDED.sort_order, metadata = EXCLUDED.metadata, recorded_at = NOW()`,
      [
        input.id,
        input.sessionId,
        input.stepId,
        input.prompt,
        input.notes,
        input.sortOrder,
        JSON.stringify(input.metadata),
      ],
    );
    const row = await this.one(
      `SELECT id, session_id, step_id, prompt, notes, recorded_at, sort_order, metadata FROM laboratory_observations WHERE id = ? AND session_id = ?`,
      `SELECT id, session_id, step_id, prompt, notes, recorded_at, sort_order, metadata FROM laboratory_observations WHERE id = $1 AND session_id = $2`,
      [input.id, input.sessionId],
    );
    if (!row) throw new NotFoundError("Laboratory observation", input.id);
    return this.mapObservation(row);
  }

  async saveMeasurement(input: {
    id: string;
    profileId: string;
    sessionId: string;
    variableId: string;
    observationId: string | null;
    rowIndex: number;
    numericValue: number | null;
    textValue: string | null;
    unit: string | null;
    uncertainty: number | null;
    significantFigures: number | null;
    source: LaboratoryMeasurementRecord["source"];
    notes: string;
  }): Promise<LaboratoryMeasurementRecord> {
    await this.assertSessionOwner(input.profileId, input.sessionId);
    await this.execute(
      `INSERT INTO laboratory_measurements (id, session_id, variable_id, observation_id, row_index, numeric_value, text_value, unit, uncertainty, significant_figures, source, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(session_id, variable_id, row_index) DO UPDATE SET observation_id = excluded.observation_id, numeric_value = excluded.numeric_value, text_value = excluded.text_value, unit = excluded.unit, uncertainty = excluded.uncertainty, significant_figures = excluded.significant_figures, source = excluded.source, notes = excluded.notes, recorded_at = CURRENT_TIMESTAMP`,
      `INSERT INTO laboratory_measurements (id, session_id, variable_id, observation_id, row_index, numeric_value, text_value, unit, uncertainty, significant_figures, source, notes) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) ON CONFLICT (session_id, variable_id, row_index) DO UPDATE SET observation_id = EXCLUDED.observation_id, numeric_value = EXCLUDED.numeric_value, text_value = EXCLUDED.text_value, unit = EXCLUDED.unit, uncertainty = EXCLUDED.uncertainty, significant_figures = EXCLUDED.significant_figures, source = EXCLUDED.source, notes = EXCLUDED.notes, recorded_at = NOW()`,
      [
        input.id,
        input.sessionId,
        input.variableId,
        input.observationId,
        input.rowIndex,
        input.numericValue,
        input.textValue,
        input.unit,
        input.uncertainty,
        input.significantFigures,
        input.source,
        input.notes,
      ],
    );
    const row = await this.one(
      `SELECT id, session_id, variable_id, observation_id, row_index, numeric_value, text_value, unit, uncertainty, significant_figures, source, notes, recorded_at FROM laboratory_measurements WHERE session_id = ? AND variable_id = ? AND row_index = ?`,
      `SELECT id, session_id, variable_id, observation_id, row_index, numeric_value, text_value, unit, uncertainty, significant_figures, source, notes, recorded_at FROM laboratory_measurements WHERE session_id = $1 AND variable_id = $2 AND row_index = $3`,
      [input.sessionId, input.variableId, input.rowIndex],
    );
    if (!row) throw new NotFoundError("Laboratory measurement", input.id);
    return this.mapMeasurement(row);
  }

  private async assertSessionOwner(profileId: string, sessionId: string): Promise<void> {
    const session = await this.getSession(profileId, sessionId);
    if (!session) throw new NotFoundError("Laboratory session", sessionId);
    if (session.status === "completed" || session.status === "abandoned") {
      throw new ValidationError("This laboratory session is no longer editable.");
    }
  }

  async getSessionDetail(
    profileId: string,
    sessionId: string,
  ): Promise<LaboratorySessionDetail | null> {
    const session = await this.getSession(profileId, sessionId);
    if (!session) return null;
    const activity = await this.getActivity(session.activityId, { includeDraft: true });
    if (!activity) return null;
    const observations = await this.rows(
      `SELECT id, session_id, step_id, prompt, notes, recorded_at, sort_order, metadata FROM laboratory_observations WHERE session_id = ? ORDER BY sort_order, recorded_at`,
      `SELECT id, session_id, step_id, prompt, notes, recorded_at, sort_order, metadata FROM laboratory_observations WHERE session_id = $1 ORDER BY sort_order, recorded_at`,
      [sessionId],
    );
    const measurements = await this.rows(
      `SELECT id, session_id, variable_id, observation_id, row_index, numeric_value, text_value, unit, uncertainty, significant_figures, source, notes, recorded_at FROM laboratory_measurements WHERE session_id = ? ORDER BY row_index, variable_id`,
      `SELECT id, session_id, variable_id, observation_id, row_index, numeric_value, text_value, unit, uncertainty, significant_figures, source, notes, recorded_at FROM laboratory_measurements WHERE session_id = $1 ORDER BY row_index, variable_id`,
      [sessionId],
    );
    const report = await this.getReportBySession(profileId, sessionId);
    const observationRecords = observations.map((row) => this.mapObservation(row));
    const measurementRecords = measurements.map((row) => this.mapMeasurement(row));
    const independent =
      activity.variables.find((variable) => variable.role === "independent") ??
      activity.variables.find((variable) => variable.dataType === "number");
    const dependent =
      activity.variables.find((variable) => variable.role === "dependent") ??
      activity.variables.find(
        (variable) => variable.dataType === "number" && variable.id !== independent?.id,
      );
    const points =
      independent && dependent ? buildGraphPoints(measurementRecords, independent, dependent) : [];
    const theoryComparisons = activity.variables.flatMap((variable) => {
      if (variable.theoreticalValue === null) return [];
      const values = measurementRecords
        .filter(
          (measurement) =>
            measurement.variableId === variable.id && measurement.numericValue !== null,
        )
        .map((measurement) => measurement.numericValue!);
      if (!values.length) return [];
      const measuredValue = values.reduce((sum, value) => sum + value, 0) / values.length;
      const uncertainty = calculateAggregateUncertainty(measurementRecords, variable.id);
      return [compareToTheory(variable.id, measuredValue, variable.theoreticalValue, uncertainty)];
    });
    return {
      session,
      activity,
      observations: observationRecords,
      measurements: measurementRecords,
      report,
      analysis: {
        graph: {
          xVariableId: independent?.id ?? null,
          yVariableId: dependent?.id ?? null,
          points,
          regression: linearRegression(points),
        },
        theoryComparisons,
        measurementCount: measurementRecords.length,
      },
    };
  }

  async getReport(profileId: string, reportId: string): Promise<LaboratoryReportRecord | null> {
    const row = await this.one(
      `SELECT r.id, r.session_id, r.profile_id, r.status, r.title, r.abstract, r.sections, r.tables, r.charts, r.formulas, r.images, r.conclusion, r.submitted_at, r.created_at, r.updated_at FROM laboratory_reports r WHERE r.id = ? AND r.profile_id = ?`,
      `SELECT r.id, r.session_id, r.profile_id, r.status, r.title, r.abstract, r.sections, r.tables, r.charts, r.formulas, r.images, r.conclusion, r.submitted_at, r.created_at, r.updated_at FROM laboratory_reports r WHERE r.id = $1 AND r.profile_id = $2`,
      [reportId, profileId],
    );
    return row ? this.mapReport(row) : null;
  }

  async getReportById(reportId: string): Promise<LaboratoryReportRecord | null> {
    const row = await this.one(
      `SELECT r.id, r.session_id, r.profile_id, r.status, r.title, r.abstract, r.sections, r.tables, r.charts, r.formulas, r.images, r.conclusion, r.submitted_at, r.created_at, r.updated_at FROM laboratory_reports r WHERE r.id = ?`,
      `SELECT r.id, r.session_id, r.profile_id, r.status, r.title, r.abstract, r.sections, r.tables, r.charts, r.formulas, r.images, r.conclusion, r.submitted_at, r.created_at, r.updated_at FROM laboratory_reports r WHERE r.id = $1`,
      [reportId],
    );
    return row ? this.mapReport(row) : null;
  }

  async getReportBySession(
    profileId: string,
    sessionId: string,
  ): Promise<LaboratoryReportRecord | null> {
    const row = await this.one(
      `SELECT r.id, r.session_id, r.profile_id, r.status, r.title, r.abstract, r.sections, r.tables, r.charts, r.formulas, r.images, r.conclusion, r.submitted_at, r.created_at, r.updated_at FROM laboratory_reports r WHERE r.session_id = ? AND r.profile_id = ?`,
      `SELECT r.id, r.session_id, r.profile_id, r.status, r.title, r.abstract, r.sections, r.tables, r.charts, r.formulas, r.images, r.conclusion, r.submitted_at, r.created_at, r.updated_at FROM laboratory_reports r WHERE r.session_id = $1 AND r.profile_id = $2`,
      [sessionId, profileId],
    );
    return row ? this.mapReport(row) : null;
  }

  async saveReport(input: {
    id: string;
    profileId: string;
    sessionId: string;
    status: LaboratoryReportRecord["status"];
    title: string;
    abstract: string;
    sections: LaboratoryReportRecord["sections"];
    tables: LaboratoryReportRecord["tables"];
    charts: LaboratoryReportRecord["charts"];
    formulas: LaboratoryReportRecord["formulas"];
    images: LaboratoryReportRecord["images"];
    conclusion: string;
  }): Promise<LaboratoryReportRecord> {
    const session = await this.getSession(input.profileId, input.sessionId);
    if (!session) throw new NotFoundError("Laboratory session", input.sessionId);
    await this.execute(
      `INSERT INTO laboratory_reports (id, session_id, profile_id, status, title, abstract, sections, tables, charts, formulas, images, conclusion, submitted_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CASE WHEN ? = 'submitted' THEN CURRENT_TIMESTAMP ELSE NULL END) ON CONFLICT(session_id) DO UPDATE SET status = excluded.status, title = excluded.title, abstract = excluded.abstract, sections = excluded.sections, tables = excluded.tables, charts = excluded.charts, formulas = excluded.formulas, images = excluded.images, conclusion = excluded.conclusion, submitted_at = CASE WHEN excluded.status = 'submitted' THEN COALESCE(laboratory_reports.submitted_at, CURRENT_TIMESTAMP) ELSE laboratory_reports.submitted_at END, updated_at = CURRENT_TIMESTAMP`,
      `INSERT INTO laboratory_reports (id, session_id, profile_id, status, title, abstract, sections, tables, charts, formulas, images, conclusion, submitted_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, CASE WHEN $13 = 'submitted' THEN NOW() ELSE NULL END) ON CONFLICT (session_id) DO UPDATE SET status = EXCLUDED.status, title = EXCLUDED.title, abstract = EXCLUDED.abstract, sections = EXCLUDED.sections, tables = EXCLUDED.tables, charts = EXCLUDED.charts, formulas = EXCLUDED.formulas, images = EXCLUDED.images, conclusion = EXCLUDED.conclusion, submitted_at = CASE WHEN EXCLUDED.status = 'submitted' THEN COALESCE(laboratory_reports.submitted_at, NOW()) ELSE laboratory_reports.submitted_at END, updated_at = NOW()`,
      [
        input.id,
        input.sessionId,
        input.profileId,
        input.status,
        input.title,
        input.abstract,
        JSON.stringify(input.sections),
        JSON.stringify(input.tables),
        JSON.stringify(input.charts),
        JSON.stringify(input.formulas),
        JSON.stringify(input.images),
        input.conclusion,
        input.status,
      ],
    );
    const report = await this.getReportBySession(input.profileId, input.sessionId);
    if (!report) throw new NotFoundError("Laboratory report", input.id);
    return report;
  }

  async addFeedback(input: {
    id: string;
    reportId: string;
    authorProfileId: string;
    body: string;
    rubric: LaboratoryConfiguration;
  }): Promise<LaboratoryFeedbackRecord> {
    await this.execute(
      `INSERT INTO laboratory_feedback (id, report_id, author_profile_id, body, rubric) VALUES (?, ?, ?, ?, ?)`,
      `INSERT INTO laboratory_feedback (id, report_id, author_profile_id, body, rubric) VALUES ($1, $2, $3, $4, $5)`,
      [input.id, input.reportId, input.authorProfileId, input.body, JSON.stringify(input.rubric)],
    );
    const row = await this.one(
      `SELECT f.id, f.report_id, f.author_profile_id, p.display_name AS author_name, f.body, f.rubric, f.created_at, f.updated_at FROM laboratory_feedback f JOIN profiles p ON p.id = f.author_profile_id WHERE f.id = ?`,
      `SELECT f.id, f.report_id, f.author_profile_id, p.display_name AS author_name, f.body, f.rubric, f.created_at, f.updated_at FROM laboratory_feedback f JOIN profiles p ON p.id = f.author_profile_id WHERE f.id = $1`,
      [input.id],
    );
    if (!row) throw new NotFoundError("Laboratory feedback", input.id);
    return this.mapFeedback(row);
  }
}

function calculateAggregateUncertainty(
  measurements: readonly LaboratoryMeasurementRecord[],
  variableId: string,
): number | null {
  const values = measurements
    .filter(
      (measurement) => measurement.variableId === variableId && measurement.uncertainty !== null,
    )
    .map((measurement) => measurement.uncertainty!);
  return values.length
    ? Math.sqrt(values.reduce((sum, value) => sum + value ** 2, 0)) / values.length
    : null;
}

export function getLaboratoryRepository(database?: DatabaseHandle): LaboratoryRepository {
  return new SqlLaboratoryRepository(database);
}

export function newLaboratoryId(prefix: string): string {
  return `${prefix}-${randomUUID()}`;
}
