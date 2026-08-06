import { randomUUID } from "node:crypto";
import { ValidationError } from "@/domain/errors/application-error";
import {
  isPortableTableName,
  normalizeBackupSettings,
  planRestore,
  sortTableRows,
  stableStringify,
  tableNamesForKind,
  validatePortablePackage,
} from "@/domain/portability/rules";
import type {
  BackupArtifactRecord,
  BackupSettings,
  BackupType,
  JsonRecord,
  JsonValue,
  PortablePackage,
  PortableSnapshot,
  PortableTableSnapshot,
  RestoreMode,
  RestorePreview,
  RestoreRunRecord,
} from "@/domain/portability/types";
import type { PortabilityRepository } from "@/domain/ports/portability-repository";
import { getDatabase, type DatabaseHandle } from "@/infrastructure/database/client";

type DbRow = Record<string, unknown>;

interface ForeignKey {
  columns: readonly string[];
  referencedTable: string;
  referencedColumns: readonly string[];
}

interface TableDefinition {
  name: string;
  columns: readonly string[];
  primaryKey: readonly string[];
  foreignKeys: readonly ForeignKey[];
}

function asString(value: unknown, fallback = ""): string {
  return value === null || value === undefined ? fallback : String(value);
}

function asNullableString(value: unknown): string | null {
  return value === null || value === undefined || value === "" ? null : String(value);
}

function asNumber(value: unknown, fallback = 0): number {
  const result = Number(value);
  return Number.isFinite(result) ? result : fallback;
}

function asBoolean(value: unknown): boolean {
  return value === true || value === 1 || value === "1" || value === "true";
}

function asIso(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  return asString(value, new Date(0).toISOString());
}

function parseJson<T>(value: unknown, fallback: T): T {
  if (typeof value !== "string" || !value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function quoteIdentifier(identifier: string): string {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(identifier)) {
    throw new ValidationError("A database identifier in the portability package is unsafe.");
  }
  return `"${identifier}"`;
}

function toJsonValue(value: unknown): JsonValue {
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") return Number.isFinite(value) ? value : String(value);
  if (value instanceof Date) return value.toISOString();
  if (value instanceof Uint8Array) {
    let binary = "";
    for (const byte of value) binary += String.fromCharCode(byte);
    return { type: "bytes", base64: btoa(binary) };
  }
  if (Array.isArray(value)) return value.map(toJsonValue);
  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, item]) => [
        key,
        toJsonValue(item),
      ]),
    );
  }
  return String(value);
}

function toJsonRecord(row: DbRow, columns: readonly string[]): JsonRecord {
  return Object.fromEntries(columns.map((column) => [column, toJsonValue(row[column] ?? null)]));
}

function fromJsonValue(value: JsonValue): unknown {
  if (
    value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    value.type === "bytes" &&
    typeof value.base64 === "string"
  ) {
    let binary = "";
    try {
      binary = atob(value.base64);
    } catch {
      throw new ValidationError("The portability package contains invalid binary data.");
    }
    return Buffer.from(binary, "binary");
  }
  if (Array.isArray(value)) return value.map(fromJsonValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, fromJsonValue(item)]),
    );
  }
  return value;
}

function groupForeignKeys(rows: readonly DbRow[]): ForeignKey[] {
  const grouped = new Map<
    string,
    { table: string; items: Array<{ seq: number; from: string; to: string }> }
  >();
  for (const row of rows) {
    const id = `${row.id ?? 0}`;
    const item = { seq: asNumber(row.seq), from: asString(row.from), to: asString(row.to) };
    const group = grouped.get(id) ?? { table: asString(row.table), items: [] };
    group.items.push(item);
    grouped.set(id, group);
  }
  return [...grouped.values()].map((group) => {
    const items = group.items.sort((left, right) => left.seq - right.seq);
    return {
      columns: items.map((item) => item.from),
      referencedTable: group.table,
      referencedColumns: items.map((item) => item.to),
    };
  });
}

function mapSettings(row: DbRow | undefined): BackupSettings {
  return normalizeBackupSettings({
    id: 1,
    enabled: asBoolean(row?.enabled),
    schedule: asString(row?.schedule, "weekly") as BackupSettings["schedule"],
    backupType: asString(row?.backup_type, "full") as BackupType,
    retentionCount: asNumber(row?.retention_count, 5),
    location: asString(row?.location, "backups"),
    encryptionEnabled: asBoolean(row?.encryption_enabled),
    lastRunAt: asNullableString(row?.last_run_at),
    createdAt: asIso(row?.created_at),
    updatedAt: asIso(row?.updated_at),
  });
}

function mapManifest(value: unknown): PortablePackage["manifest"] {
  const manifest = parseJson<PortablePackage["manifest"]>(value, {
    magic: "mathios-portable",
    formatVersion: 1,
    phase: 15,
    kind: "full",
    createdAt: new Date(0).toISOString(),
    databaseProvider: "sqlite",
    tableCount: 0,
    rowCount: 0,
    fileCount: 0,
    includedTables: [],
    checksum: "",
  });
  return manifest;
}

function mapArtifact(row: DbRow): BackupArtifactRecord {
  return {
    id: asString(row.id),
    kind: asString(row.kind) as BackupArtifactRecord["kind"],
    format: asString(row.format) as BackupArtifactRecord["format"],
    storageKey: asString(row.storage_key),
    fileName: asString(row.file_name),
    contentType: asString(row.content_type),
    byteSize: asNumber(row.byte_size),
    checksum: asString(row.checksum),
    manifest: mapManifest(row.manifest_json),
    encryptionEnabled: asBoolean(row.encryption_enabled),
    status: asString(row.status, "ready") as BackupArtifactRecord["status"],
    createdByProfileId: asNullableString(row.created_by_profile_id),
    createdAt: asIso(row.created_at),
    expiresAt: asNullableString(row.expires_at),
    errorMessage: asNullableString(row.error_message),
  };
}

function mapRestoreRun(row: DbRow): RestoreRunRecord {
  return {
    id: asString(row.id),
    backupId: asNullableString(row.backup_id),
    profileId: asString(row.profile_id),
    sourceFileName: asNullableString(row.source_file_name),
    mode: asString(row.mode) as RestoreMode,
    status: asString(row.status) as RestoreRunRecord["status"],
    packageChecksum: asString(row.package_checksum),
    conflictCount: asNumber(row.conflict_count),
    insertedCount: asNumber(row.inserted_count),
    updatedCount: asNumber(row.updated_count),
    preview: parseJson(row.preview_json, null),
    startedAt: asIso(row.started_at),
    completedAt: asNullableString(row.completed_at),
    errorMessage: asNullableString(row.error_message),
  };
}

export class SqlPortabilityRepository implements PortabilityRepository {
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

  private async definitions(): Promise<TableDefinition[]> {
    if (this.database.provider === "sqlite") {
      const tableRows = await this.rows<{ name: string }>(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name <> '_mathios_migrations'",
        "SELECT table_name AS name FROM information_schema.tables WHERE table_schema = 'public'",
      );
      const definitions: TableDefinition[] = [];
      for (const tableRow of tableRows.filter((row) => isPortableTableName(row.name))) {
        const name = tableRow.name;
        const columns = await this.rows<{ name: string; pk: number }>(
          `PRAGMA table_info(${quoteIdentifier(name)})`,
          "SELECT column_name AS name, 0 AS pk FROM information_schema.columns WHERE FALSE",
        );
        const foreignKeys = await this.rows<DbRow>(
          `PRAGMA foreign_key_list(${quoteIdentifier(name)})`,
          "SELECT 0 AS id, 0 AS seq, '' AS table, '' AS from, '' AS to WHERE FALSE",
        );
        definitions.push({
          name,
          columns: columns.map((column) => column.name),
          primaryKey: columns
            .filter((column) => column.pk > 0)
            .sort((left, right) => left.pk - right.pk)
            .map((column) => column.name),
          foreignKeys: groupForeignKeys(foreignKeys),
        });
      }
      return definitions;
    }

    const tableRows = await this.rows<{ name: string }>(
      "SELECT table_name AS name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'",
      "SELECT table_name AS name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'",
    );
    const columns = await this.rows<DbRow>(
      "SELECT table_name AS table_name, column_name AS name, ordinal_position AS position FROM information_schema.columns WHERE table_schema = 'public' ORDER BY table_name, ordinal_position",
      "SELECT table_name AS table_name, column_name AS name, ordinal_position AS position FROM information_schema.columns WHERE table_schema = 'public' ORDER BY table_name, ordinal_position",
    );
    const primaryKeys = await this.rows<DbRow>(
      `SELECT kcu.table_name, kcu.column_name AS name, kcu.ordinal_position AS position
       FROM information_schema.table_constraints tc
       JOIN information_schema.key_column_usage kcu ON kcu.constraint_name = tc.constraint_name AND kcu.table_schema = tc.table_schema AND kcu.table_name = tc.table_name
       WHERE tc.table_schema = 'public' AND tc.constraint_type = 'PRIMARY KEY'
       ORDER BY kcu.table_name, kcu.ordinal_position`,
      `SELECT kcu.table_name, kcu.column_name AS name, kcu.ordinal_position AS position
       FROM information_schema.table_constraints tc
       JOIN information_schema.key_column_usage kcu ON kcu.constraint_name = tc.constraint_name AND kcu.table_schema = tc.table_schema AND kcu.table_name = tc.table_name
       WHERE tc.table_schema = 'public' AND tc.constraint_type = 'PRIMARY KEY'
       ORDER BY kcu.table_name, kcu.ordinal_position`,
    );
    const foreignKeys = await this.rows<DbRow>(
      `SELECT kcu.table_name, kcu.column_name AS from, ccu.table_name AS "table", ccu.column_name AS to, kcu.ordinal_position AS seq, tc.constraint_name AS id
       FROM information_schema.table_constraints tc
       JOIN information_schema.key_column_usage kcu ON kcu.constraint_name = tc.constraint_name AND kcu.table_schema = tc.table_schema AND kcu.table_name = tc.table_name
       JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema
       WHERE tc.table_schema = 'public' AND tc.constraint_type = 'FOREIGN KEY'
       ORDER BY kcu.table_name, tc.constraint_name, kcu.ordinal_position`,
      `SELECT kcu.table_name, kcu.column_name AS from, ccu.table_name AS "table", ccu.column_name AS to, kcu.ordinal_position AS seq, tc.constraint_name AS id
       FROM information_schema.table_constraints tc
       JOIN information_schema.key_column_usage kcu ON kcu.constraint_name = tc.constraint_name AND kcu.table_schema = tc.table_schema AND kcu.table_name = tc.table_name
       JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema
       WHERE tc.table_schema = 'public' AND tc.constraint_type = 'FOREIGN KEY'
       ORDER BY kcu.table_name, tc.constraint_name, kcu.ordinal_position`,
    );
    return tableRows
      .filter((row) => isPortableTableName(row.name))
      .map((row) => ({
        name: row.name,
        columns: columns
          .filter((column) => column.table_name === row.name)
          .sort((left, right) => asNumber(left.position) - asNumber(right.position))
          .map((column) => asString(column.name)),
        primaryKey: primaryKeys
          .filter((column) => column.table_name === row.name)
          .sort((left, right) => asNumber(left.position) - asNumber(right.position))
          .map((column) => asString(column.name)),
        foreignKeys: groupForeignKeys(
          foreignKeys.filter((foreignKey) => foreignKey.table_name === row.name),
        ),
      }));
  }

  private async selectTable(definition: TableDefinition): Promise<PortableTableSnapshot> {
    const rows = await this.rows<DbRow>(
      `SELECT * FROM ${quoteIdentifier(definition.name)}`,
      `SELECT * FROM ${quoteIdentifier(definition.name)}`,
    );
    const columns = definition.columns.filter(
      (column) => !(definition.name === "profiles" && column === "secret_hash"),
    );
    return sortTableRows({
      name: definition.name,
      columns,
      primaryKey: definition.primaryKey.filter((column) => columns.includes(column)),
      rows: rows.map((row) => toJsonRecord(row, columns)),
    });
  }

  private filterToProfile(
    tables: readonly PortableTableSnapshot[],
    definitions: readonly TableDefinition[],
    profileId: string,
  ): PortableTableSnapshot[] {
    const definitionByName = new Map(
      definitions.map((definition) => [definition.name, definition]),
    );
    const tableByName = new Map(tables.map((table) => [table.name, table]));
    const included = new Map<string, Set<string>>();
    const keyFor = (table: PortableTableSnapshot, row: JsonRecord) =>
      stableStringify(
        Object.fromEntries(
          (table.primaryKey.length ? table.primaryKey : table.columns).map((column) => [
            column,
            row[column] ?? null,
          ]),
        ),
      );
    const add = (table: PortableTableSnapshot, row: JsonRecord): boolean => {
      const keys = included.get(table.name) ?? new Set<string>();
      const key = keyFor(table, row);
      if (keys.has(key)) return false;
      keys.add(key);
      included.set(table.name, keys);
      return true;
    };

    for (const table of tables) {
      for (const row of table.rows) {
        if (
          (table.name === "profiles" && row.id === profileId) ||
          row.profile_id === profileId ||
          (table.name === "app_metadata" && row.key !== undefined) ||
          (table.name === "backup_settings" && row.id === 1)
        ) {
          add(table, row);
        }
      }
    }

    let changed = true;
    while (changed) {
      changed = false;
      for (const table of tables) {
        const definition = definitionByName.get(table.name);
        if (!definition) continue;
        const selectedKeys = included.get(table.name) ?? new Set<string>();
        for (const row of table.rows) {
          const rowSelected = selectedKeys.has(keyFor(table, row));
          for (const foreignKey of definition.foreignKeys) {
            const parent = tableByName.get(foreignKey.referencedTable);
            if (!parent) continue;
            const childValues = foreignKey.columns.map((column) => row[column]);
            if (childValues.some((value) => value === null || value === undefined)) continue;
            const parentRow = parent.rows.find((candidate) =>
              foreignKey.referencedColumns.every(
                (column, index) => candidate[column] === childValues[index],
              ),
            );
            if (rowSelected && parentRow) changed = add(parent, parentRow) || changed;
            if (!rowSelected && included.get(parent.name)?.has(keyFor(parent, parentRow ?? {}))) {
              changed = add(table, row) || changed;
            }
          }
        }
      }
    }

    return tables
      .map((table) => ({
        ...table,
        rows: table.rows.filter((row) => included.get(table.name)?.has(keyFor(table, row))),
      }))
      .filter((table) => table.rows.length > 0);
  }

  async getBackupSettings(): Promise<BackupSettings> {
    const row = await this.one<DbRow>(
      "SELECT * FROM backup_settings WHERE id = 1",
      "SELECT * FROM backup_settings WHERE id = 1",
    );
    return mapSettings(row);
  }

  async updateBackupSettings(input: Partial<BackupSettings>): Promise<BackupSettings> {
    const current = await this.getBackupSettings();
    const settings = normalizeBackupSettings({
      ...current,
      ...input,
      updatedAt: new Date().toISOString(),
    });
    const values = [
      settings.enabled,
      settings.schedule,
      settings.backupType,
      settings.retentionCount,
      settings.location,
      settings.encryptionEnabled,
      settings.lastRunAt,
    ];
    if (this.database.provider === "sqlite") {
      this.database.raw
        .prepare(
          `INSERT INTO backup_settings (id, enabled, schedule, backup_type, retention_count, location, encryption_enabled, last_run_at) VALUES (1, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET enabled = excluded.enabled, schedule = excluded.schedule, backup_type = excluded.backup_type, retention_count = excluded.retention_count, location = excluded.location, encryption_enabled = excluded.encryption_enabled, last_run_at = excluded.last_run_at, updated_at = CURRENT_TIMESTAMP`,
        )
        .run(...values.map((value) => (typeof value === "boolean" ? (value ? 1 : 0) : value)));
    } else {
      await this.database.raw.unsafe(
        `INSERT INTO backup_settings (id, enabled, schedule, backup_type, retention_count, location, encryption_enabled, last_run_at) VALUES (1, $1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (id) DO UPDATE SET enabled = EXCLUDED.enabled, schedule = EXCLUDED.schedule, backup_type = EXCLUDED.backup_type, retention_count = EXCLUDED.retention_count, location = EXCLUDED.location, encryption_enabled = EXCLUDED.encryption_enabled, last_run_at = EXCLUDED.last_run_at, updated_at = NOW()`,
        values,
      );
    }
    return this.getBackupSettings();
  }

  async captureSnapshot(kind: BackupType, profileId: string): Promise<PortableSnapshot> {
    const definitions = await this.definitions();
    const selectedNames = new Set(tableNamesForKind(kind));
    const selectedDefinitions = definitions.filter((definition) =>
      selectedNames.has(definition.name),
    );
    const tables = await Promise.all(
      selectedDefinitions.map((definition) => this.selectTable(definition)),
    );
    const filtered =
      kind === "user-data" || kind === "settings"
        ? this.filterToProfile(tables, definitions, profileId)
        : tables;
    return {
      kind,
      databaseProvider: this.database.provider,
      tables: filtered.sort((left, right) => left.name.localeCompare(right.name)),
      files: [],
    };
  }

  private async validateDefinitions(pkg: PortablePackage): Promise<Map<string, TableDefinition>> {
    validatePortablePackage(pkg);
    const definitions = await this.definitions();
    const byName = new Map(definitions.map((definition) => [definition.name, definition]));
    for (const table of pkg.tables) {
      const definition = byName.get(table.name);
      if (!definition)
        throw new ValidationError(`Table '${table.name}' is not available on this installation.`);
      if (table.primaryKey.join("\u0000") !== definition.primaryKey.join("\u0000")) {
        throw new ValidationError(`Table '${table.name}' has an incompatible primary key.`);
      }
      if (table.columns.some((column) => !definition.columns.includes(column))) {
        throw new ValidationError(
          `Table '${table.name}' contains columns this installation does not know.`,
        );
      }
    }
    return byName;
  }

  private orderDefinitions(
    tables: readonly PortableTableSnapshot[],
    definitions: ReadonlyMap<string, TableDefinition>,
  ): TableDefinition[] {
    const selected = new Map(tables.map((table) => [table.name, definitions.get(table.name)]));
    const dependencies = new Map<string, Set<string>>();
    for (const table of tables) {
      const definition = selected.get(table.name);
      const set = new Set<string>();
      for (const foreignKey of definition?.foreignKeys ?? []) {
        if (selected.has(foreignKey.referencedTable) && foreignKey.referencedTable !== table.name) {
          set.add(foreignKey.referencedTable);
        }
      }
      dependencies.set(table.name, set);
    }
    const ordered: TableDefinition[] = [];
    while (dependencies.size) {
      const ready = [...dependencies.entries()]
        .filter(([, dependsOn]) => dependsOn.size === 0)
        .map(([name]) => name)
        .sort();
      const names = ready.length ? ready : [[...dependencies.keys()].sort()[0]];
      for (const name of names) {
        const definition = selected.get(name);
        if (definition) ordered.push(definition);
        dependencies.delete(name);
        for (const dependsOn of dependencies.values()) dependsOn.delete(name);
      }
    }
    return ordered;
  }

  private async currentAndPlan(
    pkg: PortablePackage,
    mode: RestoreMode,
    profileId: string,
  ): Promise<RestorePreview> {
    const current = await this.captureSnapshot(pkg.manifest.kind, profileId);
    return planRestore(pkg, current.tables, mode);
  }

  async previewRestore(
    pkg: PortablePackage,
    mode: RestoreMode,
    profileId: string,
  ): Promise<RestorePreview> {
    await this.validateDefinitions(pkg);
    return this.currentAndPlan(pkg, mode, profileId);
  }

  private upsertSqlite(
    definition: TableDefinition,
    table: PortableTableSnapshot,
    mode: RestoreMode,
  ): (row: JsonRecord) => void {
    const columns = table.columns.filter((column) => definition.columns.includes(column));
    const quotedColumns = columns.map(quoteIdentifier).join(", ");
    const primaryKey = definition.primaryKey.map(quoteIdentifier).join(", ");
    const updates = columns
      .filter((column) => !definition.primaryKey.includes(column))
      .map((column) => `${quoteIdentifier(column)} = excluded.${quoteIdentifier(column)}`)
      .join(", ");
    const conflict = mode === "merge" || !updates ? "DO NOTHING" : `DO UPDATE SET ${updates}`;
    const statement =
      this.database.provider === "sqlite"
        ? this.database.raw.prepare(
            `INSERT INTO ${quoteIdentifier(definition.name)} (${quotedColumns}) VALUES (${columns.map(() => "?").join(", ")}) ON CONFLICT (${primaryKey}) ${conflict}`,
          )
        : null;
    return (row) => {
      if (!statement) return;
      statement.run(
        ...columns.map((column) => {
          const value = fromJsonValue(row[column] ?? null);
          return typeof value === "boolean" ? (value ? 1 : 0) : value;
        }),
      );
    };
  }

  private async restorePostgres(
    pkg: PortablePackage,
    mode: RestoreMode,
    definitions: ReadonlyMap<string, TableDefinition>,
  ): Promise<void> {
    if (this.database.provider !== "postgres")
      throw new ValidationError("PostgreSQL restore was not selected.");
    const database = this.database.raw;
    const ordered = this.orderDefinitions(pkg.tables, definitions);
    await database.begin(async (transaction) => {
      for (const definition of ordered) {
        const table = pkg.tables.find((candidate) => candidate.name === definition.name);
        if (!table) continue;
        const columns = table.columns.filter((column) => definition.columns.includes(column));
        const quotedColumns = columns.map(quoteIdentifier).join(", ");
        const primaryKey = definition.primaryKey.map(quoteIdentifier).join(", ");
        const updates = columns
          .filter((column) => !definition.primaryKey.includes(column))
          .map((column) => `${quoteIdentifier(column)} = EXCLUDED.${quoteIdentifier(column)}`)
          .join(", ");
        const conflict = mode === "merge" || !updates ? "DO NOTHING" : `DO UPDATE SET ${updates}`;
        for (const row of table.rows) {
          const values = columns.map((column) => fromJsonValue(row[column] ?? null));
          const placeholders = values.map((_, index) => `$${index + 1}`).join(", ");
          await transaction.unsafe(
            `INSERT INTO ${quoteIdentifier(definition.name)} (${quotedColumns}) VALUES (${placeholders}) ON CONFLICT (${primaryKey}) ${conflict}`,
            values as never[],
          );
        }
      }
    });
  }

  async restoreSnapshot(
    pkg: PortablePackage,
    mode: RestoreMode,
    profileId: string,
  ): Promise<RestorePreview> {
    const definitions = await this.validateDefinitions(pkg);
    const preview = await this.currentAndPlan(pkg, mode, profileId);
    if (this.database.provider === "postgres") {
      await this.restorePostgres(pkg, mode, definitions);
    } else {
      const transaction = this.database.raw.transaction(() => {
        for (const definition of this.orderDefinitions(pkg.tables, definitions)) {
          const table = pkg.tables.find((candidate) => candidate.name === definition.name);
          if (!table) continue;
          const insert = this.upsertSqlite(definition, table, mode);
          for (const row of table.rows) insert(row);
        }
      });
      transaction();
    }
    return preview;
  }

  async listBackupArtifacts(limit = 50): Promise<readonly BackupArtifactRecord[]> {
    const rows = await this.rows<DbRow>(
      "SELECT * FROM backup_artifacts ORDER BY created_at DESC, id DESC LIMIT ?",
      "SELECT * FROM backup_artifacts ORDER BY created_at DESC, id DESC LIMIT $1",
      [Math.max(1, Math.min(200, Math.trunc(limit)))],
    );
    return rows.map(mapArtifact);
  }

  async getBackupArtifact(id: string): Promise<BackupArtifactRecord | null> {
    const row = await this.one<DbRow>(
      "SELECT * FROM backup_artifacts WHERE id = ?",
      "SELECT * FROM backup_artifacts WHERE id = $1",
      [id],
    );
    return row ? mapArtifact(row) : null;
  }

  async createBackupArtifact(
    input: Omit<BackupArtifactRecord, "createdAt">,
  ): Promise<BackupArtifactRecord> {
    const createdAt = new Date().toISOString();
    const values = [
      input.id || randomUUID(),
      input.kind,
      input.format,
      input.storageKey,
      input.fileName,
      input.contentType,
      input.byteSize,
      input.checksum,
      JSON.stringify(input.manifest),
      input.encryptionEnabled,
      input.status,
      input.createdByProfileId,
      createdAt,
      input.expiresAt,
      input.errorMessage,
    ];
    if (this.database.provider === "sqlite") {
      this.database.raw
        .prepare(
          `INSERT INTO backup_artifacts (id, kind, format, storage_key, file_name, content_type, byte_size, checksum, manifest_json, encryption_enabled, status, created_by_profile_id, created_at, expires_at, error_message) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(...values.map((value) => (typeof value === "boolean" ? (value ? 1 : 0) : value)));
    } else {
      await this.database.raw.unsafe(
        `INSERT INTO backup_artifacts (id, kind, format, storage_key, file_name, content_type, byte_size, checksum, manifest_json, encryption_enabled, status, created_by_profile_id, created_at, expires_at, error_message) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
        values,
      );
    }
    const result = await this.getBackupArtifact(String(values[0]));
    if (!result) throw new ValidationError("The backup artifact could not be recorded.");
    return result;
  }

  async markBackupDeleted(id: string): Promise<void> {
    if (this.database.provider === "sqlite") {
      this.database.raw
        .prepare("UPDATE backup_artifacts SET status = 'deleted' WHERE id = ?")
        .run(id);
    } else {
      await this.database.raw.unsafe(
        "UPDATE backup_artifacts SET status = 'deleted' WHERE id = $1",
        [id],
      );
    }
  }

  async createRestoreRun(
    input: Omit<RestoreRunRecord, "startedAt"> & { startedAt?: string },
  ): Promise<RestoreRunRecord> {
    const startedAt = input.startedAt ?? new Date().toISOString();
    const values = [
      input.id,
      input.backupId,
      input.profileId,
      input.sourceFileName,
      input.mode,
      input.status,
      input.packageChecksum,
      input.conflictCount,
      input.insertedCount,
      input.updatedCount,
      JSON.stringify(input.preview ?? {}),
      startedAt,
      input.completedAt,
      input.errorMessage,
    ];
    if (this.database.provider === "sqlite") {
      this.database.raw
        .prepare(
          `INSERT INTO restore_runs (id, backup_id, profile_id, source_file_name, mode, status, package_checksum, conflict_count, inserted_count, updated_count, preview_json, started_at, completed_at, error_message) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(...values);
    } else {
      await this.database.raw.unsafe(
        `INSERT INTO restore_runs (id, backup_id, profile_id, source_file_name, mode, status, package_checksum, conflict_count, inserted_count, updated_count, preview_json, started_at, completed_at, error_message) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
        values,
      );
    }
    return this.getRestoreRun(input.id);
  }

  private async getRestoreRun(id: string): Promise<RestoreRunRecord> {
    const row = await this.one<DbRow>(
      "SELECT * FROM restore_runs WHERE id = ?",
      "SELECT * FROM restore_runs WHERE id = $1",
      [id],
    );
    if (!row) throw new ValidationError("The restore run could not be recorded.");
    return mapRestoreRun(row);
  }

  async updateRestoreRun(id: string, input: Partial<RestoreRunRecord>): Promise<RestoreRunRecord> {
    const assignments: string[] = [];
    const values: unknown[] = [];
    const add = (column: string, value: unknown) => {
      assignments.push(
        `${quoteIdentifier(column)} = ${this.database.provider === "sqlite" ? "?" : `$${values.length + 1}`}`,
      );
      values.push(value);
    };
    if (input.status !== undefined) add("status", input.status);
    if (input.conflictCount !== undefined) add("conflict_count", input.conflictCount);
    if (input.insertedCount !== undefined) add("inserted_count", input.insertedCount);
    if (input.updatedCount !== undefined) add("updated_count", input.updatedCount);
    if (input.preview !== undefined) add("preview_json", JSON.stringify(input.preview));
    if (input.completedAt !== undefined) add("completed_at", input.completedAt);
    if (input.errorMessage !== undefined) add("error_message", input.errorMessage);
    if (!assignments.length) return this.getRestoreRun(id);
    values.push(id);
    const idPlaceholder = this.database.provider === "sqlite" ? "?" : `$${values.length}`;
    if (this.database.provider === "sqlite") {
      this.database.raw
        .prepare(`UPDATE restore_runs SET ${assignments.join(", ")} WHERE id = ${idPlaceholder}`)
        .run(...values);
    } else {
      await this.database.raw.unsafe(
        `UPDATE restore_runs SET ${assignments.join(", ")} WHERE id = ${idPlaceholder}`,
        values as never[],
      );
    }
    return this.getRestoreRun(id);
  }
}

export function getPortabilityRepository(database?: DatabaseHandle): PortabilityRepository {
  return new SqlPortabilityRepository(database);
}
