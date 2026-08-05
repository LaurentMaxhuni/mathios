import { randomUUID } from "node:crypto";
import { NotFoundError } from "@/domain/errors/application-error";
import { getRegisteredSimulation } from "@/domain/simulation/registry";
import type { SimulationRepository } from "@/domain/ports/simulation-repository";
import type {
  SimulationDetail,
  SimulationPresetRecord,
  SimulationRecord,
  SimulationResultRecord,
  SimulationSessionRecord,
  SimulationVersionRecord,
} from "@/domain/simulation/types";
import { getDatabase, type DatabaseHandle } from "@/infrastructure/database/client";

type DbDate = string | Date | null;
type DbBoolean = boolean | number | string;
type DbRow = Record<string, unknown>;
const asNumber = (value: unknown) => Number(value ?? 0);
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

function status(value: unknown): SimulationRecord["status"] {
  return value === "published" || value === "archived" ? value : "draft";
}
function sessionStatus(value: unknown): SimulationSessionRecord["status"] {
  return value === "paused" || value === "completed" || value === "abandoned" ? value : "active";
}

export class SqlSimulationRepository implements SimulationRepository {
  constructor(private readonly database: DatabaseHandle = getDatabase()) {}

  private async rows<T extends DbRow>(
    sqliteQuery: string,
    postgresQuery: string,
    values: readonly unknown[] = [],
  ): Promise<T[]> {
    if (this.database.provider === "sqlite")
      return this.database.raw.prepare(sqliteQuery).all(...values) as T[];
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

  private mapSimulation(row: DbRow): SimulationRecord {
    return {
      id: String(row.id),
      slug: String(row.slug),
      title: String(row.title),
      description: String(row.description ?? ""),
      subjectId: String(row.subject_id),
      subjectName: String(row.subject_name ?? ""),
      status: status(row.status),
      estimatedDurationMinutes: asNumber(row.estimated_duration_minutes),
      currentVersionNumber: asNumber(row.current_version_number),
      publishedVersionId: row.published_version_id ? String(row.published_version_id) : null,
      createdAt: asIso(row.created_at as DbDate),
      updatedAt: asIso(row.updated_at as DbDate),
    };
  }
  private mapSession(row: DbRow): SimulationSessionRecord {
    return {
      id: String(row.id),
      profileId: String(row.profile_id),
      simulationId: String(row.simulation_id),
      simulationVersionId: String(row.simulation_version_id),
      status: sessionStatus(row.status),
      inputs: parseJson(row.inputs, {}),
      state: parseJson(row.state, {}),
      elapsedSeconds: asNumber(row.elapsed_seconds),
      startedAt: asIso(row.started_at as DbDate),
      completedAt: asNullableIso(row.completed_at as DbDate),
      updatedAt: asIso(row.updated_at as DbDate),
    };
  }
  private mapPreset(row: DbRow): SimulationPresetRecord {
    return {
      id: String(row.id),
      simulationId: String(row.simulation_id),
      profileId: row.profile_id ? String(row.profile_id) : null,
      name: String(row.name),
      values: parseJson(row.values, {}),
      isDefault: asBoolean(row.is_default as DbBoolean),
    };
  }

  async listSimulations(
    options: { includeDraft?: boolean; subjectId?: string } = {},
  ): Promise<readonly SimulationRecord[]> {
    const conditions: string[] = [];
    const values: unknown[] = [];
    if (!options.includeDraft) conditions.push("s.status = 'published'");
    if (options.subjectId) {
      values.push(options.subjectId);
      conditions.push(
        this.database.provider === "sqlite"
          ? "s.subject_id = ?"
          : `s.subject_id = $${values.length}`,
      );
    }
    const sqliteWhere = conditions.length ? ` WHERE ${conditions.join(" AND ")}` : "";
    const postgresWhere = sqliteWhere.replace("?", "$1");
    const rows = await this.rows(
      `${this.selectSimulation}${sqliteWhere} ORDER BY s.title COLLATE NOCASE`,
      `${this.selectSimulation}${postgresWhere} ORDER BY s.title`,
      values,
    );
    return rows.map((row) => this.mapSimulation(row));
  }

  private readonly selectSimulation = `SELECT s.id, s.slug, s.title, s.description, s.subject_id, subjects.name AS subject_name, s.status, s.estimated_duration_minutes, s.current_version_number, s.published_version_id, s.created_at, s.updated_at FROM simulations s JOIN subjects ON subjects.id = s.subject_id`;

  async getSimulation(
    id: string,
    options: { includeDraft?: boolean; profileId?: string | null } = {},
  ): Promise<SimulationDetail | null> {
    const row = await this.one(
      `${this.selectSimulation} WHERE (s.id = ? OR s.slug = ?)`,
      `${this.selectSimulation} WHERE (s.id = $1 OR s.slug = $1)`,
      [id, id],
    );
    if (!row || (!options.includeDraft && row.status !== "published")) return null;
    const version = options.includeDraft
      ? await this.one(
          `${this.selectVersion} WHERE sv.simulation_id = ? ORDER BY sv.version_number DESC LIMIT 1`,
          `${this.selectVersion} WHERE sv.simulation_id = $1 ORDER BY sv.version_number DESC LIMIT 1`,
          [row.id],
        )
      : await this.one(
          `${this.selectVersion} WHERE sv.simulation_id = ? AND sv.id = s.published_version_id`,
          `${this.selectVersion} WHERE sv.simulation_id = $1 AND sv.id = s.published_version_id`,
          [row.id],
        );
    if (!version) return null;
    const registered =
      getRegisteredSimulation(String(row.slug)) ?? getRegisteredSimulation(String(row.id));
    if (!registered) throw new NotFoundError("Registered simulation", String(row.id));
    const versionRecord: SimulationVersionRecord = {
      id: String(version.id),
      simulationId: String(version.simulation_id),
      versionNumber: asNumber(version.version_number),
      status: status(version.status),
      definition: registered,
      changeSummary: String(version.change_summary ?? ""),
      createdAt: asIso(version.created_at as DbDate),
      publishedAt: asNullableIso(version.published_at as DbDate),
    };
    const presetRows = await this.rows(
      `${this.selectPreset} WHERE sp.simulation_id = ? AND (sp.profile_id IS NULL OR sp.profile_id = ?) ORDER BY sp.is_default DESC, sp.name`,
      `${this.selectPreset} WHERE sp.simulation_id = $1 AND (sp.profile_id IS NULL OR sp.profile_id = $2) ORDER BY sp.is_default DESC, sp.name`,
      [row.id, options.profileId ?? null],
    );
    const linkRows = await this.rows(
      `SELECT ls.lesson_id, lessons.title AS lesson_title, ls.instructions, ls.sort_order FROM lesson_simulations ls JOIN lessons ON lessons.id = ls.lesson_id WHERE ls.simulation_id = ? ORDER BY ls.sort_order, lessons.title`,
      `SELECT ls.lesson_id, lessons.title AS lesson_title, ls.instructions, ls.sort_order FROM lesson_simulations ls JOIN lessons ON lessons.id = ls.lesson_id WHERE ls.simulation_id = $1 ORDER BY ls.sort_order, lessons.title`,
      [row.id],
    );
    return {
      simulation: this.mapSimulation(row),
      version: versionRecord,
      presets: presetRows.map((item) => this.mapPreset(item)),
      lessonLinks: linkRows.map((item) => ({
        lessonId: String(item.lesson_id),
        lessonTitle: String(item.lesson_title),
        instructions: String(item.instructions ?? ""),
        sortOrder: asNumber(item.sort_order),
      })),
    };
  }

  private readonly selectVersion =
    "SELECT sv.id, sv.simulation_id, sv.version_number, sv.status, sv.definition, sv.change_summary, sv.created_at, sv.published_at FROM simulation_versions sv JOIN simulations s ON s.id = sv.simulation_id";
  private readonly selectPreset =
    'SELECT sp.id, sp.simulation_id, sp.profile_id, sp.name, sp."values", sp.is_default FROM simulation_presets sp';

  async listLessonSimulations(lessonId: string) {
    const rows = await this.rows(
      `SELECT simulation_id FROM lesson_simulations WHERE lesson_id = ? ORDER BY sort_order`,
      `SELECT simulation_id FROM lesson_simulations WHERE lesson_id = $1 ORDER BY sort_order`,
      [lessonId],
    );
    const details = await Promise.all(
      rows.map((row) => this.getSimulation(String(row.simulation_id))),
    );
    return details.flatMap(
      (detail) =>
        detail?.lessonLinks
          .filter((link) => link.lessonId === lessonId)
          .map((link) => ({
            ...link,
            simulationId: detail.simulation.id,
            simulationTitle: detail.simulation.title,
          })) ?? [],
    );
  }

  async createSession(input: {
    id: string;
    profileId: string;
    simulationId: string;
    versionId: string;
    inputs: Record<string, unknown>;
    state: Record<string, number>;
  }): Promise<SimulationSessionRecord> {
    await this.execute(
      `INSERT INTO user_simulation_sessions (id, profile_id, simulation_id, simulation_version_id, status, inputs, state) VALUES (?, ?, ?, ?, 'active', ?, ?)`,
      `INSERT INTO user_simulation_sessions (id, profile_id, simulation_id, simulation_version_id, status, inputs, state) VALUES ($1, $2, $3, $4, 'active', $5, $6)`,
      [
        input.id,
        input.profileId,
        input.simulationId,
        input.versionId,
        JSON.stringify(input.inputs),
        JSON.stringify(input.state),
      ],
    );
    return (await this.getSession(input.profileId, input.id))!;
  }

  async getSession(profileId: string, sessionId: string) {
    const row = await this.one(
      `SELECT id, profile_id, simulation_id, simulation_version_id, status, inputs, state, elapsed_seconds, started_at, completed_at, updated_at FROM user_simulation_sessions WHERE id = ? AND profile_id = ?`,
      `SELECT id, profile_id, simulation_id, simulation_version_id, status, inputs, state, elapsed_seconds, started_at, completed_at, updated_at FROM user_simulation_sessions WHERE id = $1 AND profile_id = $2`,
      [sessionId, profileId],
    );
    return row ? this.mapSession(row) : null;
  }

  async updateSession(input: {
    profileId: string;
    sessionId: string;
    status: SimulationSessionRecord["status"];
    inputs: Record<string, unknown>;
    state: Record<string, number>;
    elapsedSeconds: number;
  }) {
    const completedAt = input.status === "completed" ? new Date().toISOString() : null;
    await this.execute(
      `UPDATE user_simulation_sessions SET status = ?, inputs = ?, state = ?, elapsed_seconds = ?, completed_at = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND profile_id = ?`,
      `UPDATE user_simulation_sessions SET status = $1, inputs = $2, state = $3, elapsed_seconds = $4, completed_at = $5, updated_at = NOW() WHERE id = $6 AND profile_id = $7`,
      [
        input.status,
        JSON.stringify(input.inputs),
        JSON.stringify(input.state),
        input.elapsedSeconds,
        completedAt,
        input.sessionId,
        input.profileId,
      ],
    );
    const session = await this.getSession(input.profileId, input.sessionId);
    if (!session) throw new NotFoundError("Simulation session", input.sessionId);
    return session;
  }

  async saveResult(input: {
    id: string;
    session: SimulationSessionRecord;
    result: SimulationResultRecord["result"];
    completionPercentage: number;
  }) {
    await this.execute(
      `INSERT INTO simulation_results (id, session_id, profile_id, simulation_id, result, completion_percentage) VALUES (?, ?, ?, ?, ?, ?)`,
      `INSERT INTO simulation_results (id, session_id, profile_id, simulation_id, result, completion_percentage) VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        input.id,
        input.session.id,
        input.session.profileId,
        input.session.simulationId,
        JSON.stringify(input.result),
        input.completionPercentage,
      ],
    );
    return {
      id: input.id,
      sessionId: input.session.id,
      profileId: input.session.profileId,
      simulationId: input.session.simulationId,
      result: input.result,
      completionPercentage: input.completionPercentage,
      createdAt: new Date().toISOString(),
    };
  }

  async savePreset(input: {
    id: string;
    simulationId: string;
    profileId: string;
    name: string;
    values: Record<string, unknown>;
  }) {
    await this.execute(
      `INSERT INTO simulation_presets (id, simulation_id, profile_id, name, "values", is_default) VALUES (?, ?, ?, ?, ?, 0) ON CONFLICT(simulation_id, profile_id, name) DO UPDATE SET "values" = excluded."values"`,
      `INSERT INTO simulation_presets (id, simulation_id, profile_id, name, "values", is_default) VALUES ($1, $2, $3, $4, $5, FALSE) ON CONFLICT(simulation_id, profile_id, name) DO UPDATE SET "values" = EXCLUDED."values"`,
      [input.id, input.simulationId, input.profileId, input.name, JSON.stringify(input.values)],
    );
    const row = await this.one(
      `${this.selectPreset} WHERE sp.simulation_id = ? AND sp.profile_id = ? AND sp.name = ?`,
      `${this.selectPreset} WHERE sp.simulation_id = $1 AND sp.profile_id = $2 AND sp.name = $3`,
      [input.simulationId, input.profileId, input.name],
    );
    if (!row) throw new NotFoundError("Simulation preset", input.name);
    return this.mapPreset(row);
  }
}

export function getSimulationRepository(database?: DatabaseHandle): SimulationRepository {
  return new SqlSimulationRepository(database);
}
export function newSimulationId(prefix: string) {
  return `${prefix}-${randomUUID()}`;
}
