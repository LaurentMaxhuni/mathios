import { NotFoundError } from "@/domain/errors/application-error";
import {
  AI_GENERATION_STATUSES,
  AI_MODES,
  AI_PROVIDER_KINDS,
  AI_TASKS,
  sanitizeGroundingSources,
} from "@/domain/ai/rules";
import type {
  AiGenerationRecord,
  AiProviderKind,
  AiProviderMode,
  AiSettingsRecord,
  AiSettingsView,
} from "@/domain/ai/types";
import type { AiRepository } from "@/domain/ports/ai-repository";
import { getDatabase, type DatabaseHandle } from "@/infrastructure/database/client";

type DbRow = Record<string, unknown>;
type DbDate = Date | string | null | undefined;

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

function asIso(value: DbDate): string {
  if (value instanceof Date) return value.toISOString();
  return value ?? new Date(0).toISOString();
}

function asMode(value: unknown): AiProviderMode {
  return AI_MODES.includes(value as AiProviderMode) ? (value as AiProviderMode) : "disabled";
}

function asProvider(value: unknown): AiProviderKind {
  return AI_PROVIDER_KINDS.includes(value as AiProviderKind)
    ? (value as AiProviderKind)
    : "disabled";
}

function asTask(value: unknown): AiGenerationRecord["task"] {
  return AI_TASKS.includes(value as AiGenerationRecord["task"])
    ? (value as AiGenerationRecord["task"])
    : "alternative-explanation";
}

function asStatus(value: unknown): AiGenerationRecord["status"] {
  return AI_GENERATION_STATUSES.includes(value as AiGenerationRecord["status"])
    ? (value as AiGenerationRecord["status"])
    : "generated";
}

function parseGrounding(value: unknown) {
  if (typeof value !== "string") return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? sanitizeGroundingSources(parsed) : [];
  } catch {
    return [];
  }
}

function mapSettings(row: DbRow): AiSettingsRecord {
  return {
    id: 1,
    mode: asMode(row.mode),
    localBaseUrl: asString(row.local_base_url, "http://127.0.0.1:11434"),
    localModel: asString(row.local_model, "llama3.2"),
    remoteBaseUrl: asString(row.remote_base_url, "https://api.openai.com/v1"),
    remoteModel: asString(row.remote_model, "gpt-4o-mini"),
    remoteApiKeyCiphertext: asNullableString(row.remote_api_key_ciphertext),
    maxTokens: Math.max(128, Math.min(4096, Math.round(asNumber(row.max_tokens, 800)))),
    temperature: Math.max(0, Math.min(2, asNumber(row.temperature, 0.2))),
    createdAt: asIso(row.created_at as DbDate),
    updatedAt: asIso(row.updated_at as DbDate),
  };
}

function mapGeneration(row: DbRow): AiGenerationRecord {
  return {
    id: asString(row.id),
    profileId: asString(row.profile_id),
    task: asTask(row.task),
    mode: asMode(row.mode),
    provider: asProvider(row.provider),
    model: asString(row.model),
    instruction: asString(row.instruction),
    grounding: parseGrounding(row.grounding_json),
    output: asString(row.output_text),
    status: asStatus(row.status),
    reviewedByProfileId: asNullableString(row.reviewed_by_profile_id),
    reviewedAt: row.reviewed_at ? asIso(row.reviewed_at as DbDate) : null,
    createdAt: asIso(row.created_at as DbDate),
    updatedAt: asIso(row.updated_at as DbDate),
  };
}

export class SqlAiRepository implements AiRepository {
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

  async getSettings(): Promise<AiSettingsRecord> {
    let row = await this.one<DbRow>(
      "SELECT * FROM ai_settings WHERE id = 1",
      "SELECT * FROM ai_settings WHERE id = 1",
    );
    if (!row) {
      await this.execute(
        "INSERT INTO ai_settings (id) VALUES (1) ON CONFLICT(id) DO NOTHING",
        "INSERT INTO ai_settings (id) VALUES (1) ON CONFLICT(id) DO NOTHING",
      );
      row = await this.one<DbRow>(
        "SELECT * FROM ai_settings WHERE id = 1",
        "SELECT * FROM ai_settings WHERE id = 1",
      );
    }
    if (!row) throw new NotFoundError("AI settings");
    return mapSettings(row);
  }

  async getSettingsView(): Promise<AiSettingsView> {
    const settings = await this.getSettings();
    const { remoteApiKeyCiphertext, ...view } = settings;
    return { ...view, hasRemoteApiKey: Boolean(remoteApiKeyCiphertext) };
  }

  async updateSettings(input: {
    mode: AiSettingsRecord["mode"];
    localBaseUrl: string;
    localModel: string;
    remoteBaseUrl: string;
    remoteModel: string;
    remoteApiKeyCiphertext: string | null;
    maxTokens: number;
    temperature: number;
  }): Promise<AiSettingsRecord> {
    await this.execute(
      "UPDATE ai_settings SET mode = ?, local_base_url = ?, local_model = ?, remote_base_url = ?, remote_model = ?, remote_api_key_ciphertext = ?, max_tokens = ?, temperature = ?, updated_at = CURRENT_TIMESTAMP WHERE id = 1",
      "UPDATE ai_settings SET mode = $1, local_base_url = $2, local_model = $3, remote_base_url = $4, remote_model = $5, remote_api_key_ciphertext = $6, max_tokens = $7, temperature = $8, updated_at = NOW() WHERE id = 1",
      [
        input.mode,
        input.localBaseUrl,
        input.localModel,
        input.remoteBaseUrl,
        input.remoteModel,
        input.remoteApiKeyCiphertext,
        input.maxTokens,
        input.temperature,
      ],
    );
    return this.getSettings();
  }

  async createGeneration(input: {
    id: string;
    profileId: string;
    task: AiGenerationRecord["task"];
    mode: AiGenerationRecord["mode"];
    provider: AiGenerationRecord["provider"];
    model: string;
    instruction: string;
    grounding: AiGenerationRecord["grounding"];
    output: string;
    status: AiGenerationRecord["status"];
  }): Promise<AiGenerationRecord> {
    await this.execute(
      "INSERT INTO ai_generations (id, profile_id, task, mode, provider, model, instruction, grounding_json, output_text, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      "INSERT INTO ai_generations (id, profile_id, task, mode, provider, model, instruction, grounding_json, output_text, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)",
      [
        input.id,
        input.profileId,
        input.task,
        input.mode,
        input.provider,
        input.model,
        input.instruction,
        JSON.stringify(input.grounding),
        input.output,
        input.status,
      ],
    );
    const row = await this.one<DbRow>(
      "SELECT * FROM ai_generations WHERE id = ?",
      "SELECT * FROM ai_generations WHERE id = $1",
      [input.id],
    );
    if (!row) throw new NotFoundError("AI generation", input.id);
    return mapGeneration(row);
  }

  async listGenerations(profileId: string, limit = 20): Promise<readonly AiGenerationRecord[]> {
    const boundedLimit = Math.max(1, Math.min(100, Math.round(limit)));
    const rows = await this.rows<DbRow>(
      "SELECT * FROM ai_generations WHERE profile_id = ? ORDER BY created_at DESC, id DESC LIMIT ?",
      "SELECT * FROM ai_generations WHERE profile_id = $1 ORDER BY created_at DESC, id DESC LIMIT $2",
      [profileId, boundedLimit],
    );
    return rows.map(mapGeneration);
  }

  async reviewGeneration(
    generationId: string,
    status: Extract<AiGenerationRecord["status"], "approved" | "rejected">,
    reviewedByProfileId: string,
  ): Promise<AiGenerationRecord> {
    await this.execute(
      "UPDATE ai_generations SET status = ?, reviewed_by_profile_id = ?, reviewed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      "UPDATE ai_generations SET status = $1, reviewed_by_profile_id = $2, reviewed_at = NOW(), updated_at = NOW() WHERE id = $3",
      [status, reviewedByProfileId, generationId],
    );
    const row = await this.one<DbRow>(
      "SELECT * FROM ai_generations WHERE id = ?",
      "SELECT * FROM ai_generations WHERE id = $1",
      [generationId],
    );
    if (!row) throw new NotFoundError("AI generation", generationId);
    return mapGeneration(row);
  }
}

export function getAiRepository(database?: DatabaseHandle): AiRepository {
  return new SqlAiRepository(database);
}
