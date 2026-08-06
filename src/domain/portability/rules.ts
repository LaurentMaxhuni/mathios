import { ValidationError } from "@/domain/errors/application-error";
import {
  BACKUP_SCHEDULES,
  BACKUP_TYPES,
  EXPORT_FORMATS,
  PORTABLE_PACKAGE_MAGIC,
  PORTABLE_PACKAGE_VERSION,
  PORTABILITY_PHASE,
  RESTORE_MODES,
  type BackupSchedule,
  type BackupSettings,
  type BackupType,
  type JsonRecord,
  type JsonValue,
  type PortablePackage,
  type PortableTableSnapshot,
  type RestoreMode,
  type RestorePreview,
  type RestoreConflict,
  type RestoreTablePlan,
} from "@/domain/portability/types";

export const CONTENT_TABLES = [
  "curricula",
  "grades",
  "curriculum_grades",
  "subjects",
  "curriculum_subjects",
  "grade_subjects",
  "domains",
  "subject_domains",
  "grade_subject_domains",
  "learning_objectives",
  "grade_learning_objectives",
  "courses",
  "course_curricula",
  "course_grades",
  "course_prerequisites",
  "course_learning_objectives",
  "modules",
  "module_prerequisites",
  "module_learning_objectives",
  "lessons",
  "lesson_sections",
  "lesson_blocks",
  "lesson_assets",
  "lesson_learning_objectives",
  "lesson_versions",
  "concepts",
  "lesson_concepts",
  "concept_relationships",
  "concept_learning_objectives",
  "concept_applications",
  "concept_misconceptions",
  "questions",
  "question_versions",
  "question_options",
  "question_hints",
  "question_solutions",
  "question_concepts",
  "question_learning_objectives",
  "question_templates",
  "exercise_sets",
  "exercise_set_questions",
  "assessments",
  "assessment_sections",
  "assessment_pools",
  "assessment_questions",
  "mastery_rules",
  "recommendation_rules",
  "roadmaps",
  "roadmap_versions",
  "roadmap_subjects",
  "roadmap_prerequisites",
  "roadmap_nodes",
  "roadmap_edges",
  "simulations",
  "simulation_versions",
  "simulation_inputs",
  "simulation_presets",
  "lesson_simulations",
  "laboratory_activities",
  "laboratory_steps",
  "laboratory_variables",
] as const;

export const USER_DATA_TABLES = [
  "users",
  "profiles",
  "roles",
  "permissions",
  "user_roles",
  "role_permissions",
  "user_settings",
  "onboarding_responses",
  "user_lesson_progress",
  "exercise_attempts",
  "question_attempts",
  "assessment_attempts",
  "assessment_section_results",
  "diagnostic_results",
  "placement_results",
  "user_concept_mastery",
  "mastery_events",
  "mastery_snapshots",
  "recommendations",
  "recommendation_dismissals",
  "user_roadmaps",
  "user_roadmap_progress",
  "personalized_paths",
  "user_simulation_sessions",
  "simulation_results",
  "laboratory_sessions",
  "laboratory_observations",
  "laboratory_measurements",
  "laboratory_reports",
  "laboratory_feedback",
  "study_goals",
  "study_plans",
  "study_plan_items",
  "study_sessions",
  "study_availability",
  "study_exceptions",
  "study_completion_events",
  "folders",
  "tags",
  "notes",
  "note_links",
  "note_tags",
  "note_backlinks",
  "highlights",
  "bookmarks",
  "search_recent_queries",
  "learning_sessions",
  "activity_events",
  "analytics_snapshots",
  "learner_metrics",
] as const;

export const SETTINGS_TABLES = [
  "app_metadata",
  "users",
  "profiles",
  "user_settings",
  "onboarding_responses",
  "backup_settings",
] as const;

export const DERIVED_TABLES = [
  "search_index_state",
  "search_documents",
  "content_metrics",
] as const;

export const ALL_PORTABLE_TABLES = [
  ...new Set([...CONTENT_TABLES, ...USER_DATA_TABLES, ...SETTINGS_TABLES, ...DERIVED_TABLES]),
] as readonly string[];

const safeIdentifierPattern = /^[A-Za-z_][A-Za-z0-9_]*$/;

export function isPortableTableName(value: string): boolean {
  return ALL_PORTABLE_TABLES.includes(value);
}

export function tableNamesForKind(kind: BackupType): readonly string[] {
  if (kind === "content") return CONTENT_TABLES;
  if (kind === "user-data") return USER_DATA_TABLES;
  if (kind === "settings") return SETTINGS_TABLES;
  return ALL_PORTABLE_TABLES;
}

export function isBackupType(value: unknown): value is BackupType {
  return BACKUP_TYPES.includes(value as BackupType);
}

export function isExportFormat(value: unknown): value is (typeof EXPORT_FORMATS)[number] {
  return EXPORT_FORMATS.includes(value as (typeof EXPORT_FORMATS)[number]);
}

export function isRestoreMode(value: unknown): value is RestoreMode {
  return RESTORE_MODES.includes(value as RestoreMode);
}

export function isBackupSchedule(value: unknown): value is BackupSchedule {
  return BACKUP_SCHEDULES.includes(value as BackupSchedule);
}

export function normalizeLocation(value: string): string {
  const location = value
    .trim()
    .replaceAll("\\", "/")
    .replace(/^\/+|\/+$/g, "");
  if (!location || location.split("/").some((part) => part === ".." || part === ".")) {
    throw new ValidationError("Backup location must be a non-empty relative storage path.");
  }
  if (
    !location
      .split("/")
      .every((part) => safeIdentifierPattern.test(part) || /^[A-Za-z0-9._-]+$/.test(part))
  ) {
    throw new ValidationError("Backup location contains an unsafe path segment.");
  }
  return location;
}

export function normalizeBackupSettings(input: Partial<BackupSettings>): BackupSettings {
  const schedule = isBackupSchedule(input.schedule) ? input.schedule : "weekly";
  const backupType = isBackupType(input.backupType) ? input.backupType : "full";
  const retentionCount = Math.max(1, Math.min(100, Math.trunc(input.retentionCount ?? 5)));
  const now = new Date().toISOString();
  return {
    id: 1,
    enabled: Boolean(input.enabled),
    schedule,
    backupType,
    retentionCount,
    location: normalizeLocation(input.location ?? "backups"),
    encryptionEnabled: Boolean(input.encryptionEnabled),
    lastRunAt: input.lastRunAt ?? null,
    createdAt: input.createdAt ?? now,
    updatedAt: input.updatedAt ?? now,
  };
}

export function stableValue(value: unknown): JsonValue {
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") return Number.isFinite(value) ? value : String(value);
  if (value instanceof Date) return value.toISOString();
  if (value instanceof Uint8Array) return { type: "bytes", base64: encodeBase64(value) };
  if (Array.isArray(value)) return value.map((item) => stableValue(item));
  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, stableValue(item)]),
    );
  }
  return String(value);
}

function encodeBase64(bytes: Uint8Array): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  let output = "";
  for (let index = 0; index < bytes.length; index += 3) {
    const first = bytes[index];
    const second = bytes[index + 1];
    const third = bytes[index + 2];
    output += alphabet[first >> 2];
    output += alphabet[((first & 3) << 4) | ((second ?? 0) >> 4)];
    output += second === undefined ? "=" : alphabet[((second & 15) << 2) | ((third ?? 0) >> 6)];
    output += third === undefined ? "=" : alphabet[third & 63];
  }
  return output;
}

export function stableStringify(value: unknown): string {
  return JSON.stringify(stableValue(value));
}

function rowKey(table: PortableTableSnapshot, row: JsonRecord): string {
  if (!table.primaryKey.length) return stableStringify(row);
  return stableStringify(
    Object.fromEntries(table.primaryKey.map((column) => [column, row[column] ?? null])),
  );
}

export function sortTableRows(table: PortableTableSnapshot): PortableTableSnapshot {
  return {
    ...table,
    rows: [...table.rows].sort((left, right) =>
      rowKey(table, left).localeCompare(rowKey(table, right)),
    ),
  };
}

export function packageChecksumInput(pkg: Omit<PortablePackage, "manifest">): string {
  return stableStringify({
    tables: pkg.tables.map(sortTableRows),
    files: pkg.files.map(({ path, contentType, size, checksum, bodyBase64 }) => ({
      path,
      contentType,
      size,
      checksum,
      bodyBase64,
    })),
  });
}

export function validatePortablePackage(pkg: unknown): asserts pkg is PortablePackage {
  if (!pkg || typeof pkg !== "object")
    throw new ValidationError("The backup package is not an object.");
  const candidate = pkg as Partial<PortablePackage>;
  const manifest = candidate.manifest;
  if (!manifest || manifest.magic !== PORTABLE_PACKAGE_MAGIC) {
    throw new ValidationError("This file is not a Mathios portability package.");
  }
  if (manifest.formatVersion !== PORTABLE_PACKAGE_VERSION || manifest.phase > PORTABILITY_PHASE) {
    throw new ValidationError(
      "This portability package is not compatible with this Mathios version.",
    );
  }
  if (
    !isBackupType(manifest.kind) ||
    !Array.isArray(candidate.tables) ||
    !Array.isArray(candidate.files)
  ) {
    throw new ValidationError("The portability package is incomplete.");
  }
  const tables = candidate.tables as readonly PortableTableSnapshot[];
  const files = candidate.files as readonly PortablePackage["files"][number][];
  const allowedTables = new Set(tableNamesForKind(manifest.kind));
  if (
    manifest.tableCount !== tables.length ||
    manifest.rowCount !== tables.reduce((sum, table) => sum + table.rows.length, 0) ||
    manifest.fileCount !== files.length
  ) {
    throw new ValidationError("The portability package manifest counts do not match its contents.");
  }
  const tableNames = new Set<string>();
  for (const table of tables) {
    if (
      !table ||
      !isPortableTableName(table.name) ||
      !allowedTables.has(table.name) ||
      tableNames.has(table.name)
    ) {
      throw new ValidationError("The portability package contains an unknown or duplicate table.");
    }
    tableNames.add(table.name);
    if (
      !Array.isArray(table.columns) ||
      !Array.isArray(table.primaryKey) ||
      !Array.isArray(table.rows)
    ) {
      throw new ValidationError(`Table '${table.name}' is malformed.`);
    }
    if (
      !table.columns.every(
        (column) => typeof column === "string" && safeIdentifierPattern.test(column),
      )
    ) {
      throw new ValidationError(`Table '${table.name}' contains an unsafe column name.`);
    }
    if (!table.primaryKey.every((column) => table.columns.includes(column))) {
      throw new ValidationError(`Table '${table.name}' does not include its primary-key columns.`);
    }
    if (!table.rows.every((row) => row && typeof row === "object" && !Array.isArray(row))) {
      throw new ValidationError(`Table '${table.name}' contains malformed rows.`);
    }
  }
  const fileNames = new Set<string>();
  for (const file of files) {
    if (
      !file ||
      typeof file.path !== "string" ||
      !isSafeRelativePath(file.path) ||
      fileNames.has(file.path)
    ) {
      throw new ValidationError(
        "The portability package contains an unsafe or duplicate file path.",
      );
    }
    fileNames.add(file.path);
    if (typeof file.bodyBase64 !== "string" || typeof file.checksum !== "string") {
      throw new ValidationError(`Asset '${file.path}' is malformed.`);
    }
  }
}

export function isSafeRelativePath(value: string): boolean {
  if (!value || value.startsWith("/") || value.startsWith("\\") || value.includes("\\"))
    return false;
  const parts = value.split("/");
  return parts.every(
    (part) => part.length > 0 && part !== "." && part !== ".." && /^[A-Za-z0-9._-]+$/.test(part),
  );
}

export function planRestore(
  pkg: PortablePackage,
  currentTables: readonly PortableTableSnapshot[],
  mode: RestoreMode,
): RestorePreview {
  const currentByName = new Map(currentTables.map((table) => [table.name, table]));
  const tablePlans: RestoreTablePlan[] = [];
  const conflicts: RestoreConflict[] = [];
  for (const table of pkg.tables) {
    const current = currentByName.get(table.name);
    const currentByKey = new Map(
      (current?.rows ?? []).map((row) => [rowKey(current ?? table, row), row]),
    );
    let inserts = 0;
    let updates = 0;
    for (const row of table.rows) {
      const key = rowKey(table, row);
      const existing = currentByKey.get(key);
      if (!existing) inserts += 1;
      else {
        updates += mode === "replace" ? 1 : 0;
        conflicts.push({ table: table.name, key, existing, incoming: row });
      }
    }
    tablePlans.push({
      table: table.name,
      incomingRows: table.rows.length,
      existingRows: current?.rows.length ?? 0,
      inserts,
      updates,
    });
  }
  return {
    mode,
    tablePlans,
    conflicts,
    fileCount: pkg.files.length,
    totalInserts: tablePlans.reduce((sum, table) => sum + table.inserts, 0),
    totalUpdates: tablePlans.reduce((sum, table) => sum + table.updates, 0),
  };
}

export function isBackupDue(settings: BackupSettings, now = new Date()): boolean {
  if (!settings.enabled) return false;
  if (!settings.lastRunAt) return true;
  const lastRun = new Date(settings.lastRunAt);
  if (!Number.isFinite(lastRun.getTime())) return true;
  const elapsed = now.getTime() - lastRun.getTime();
  if (settings.schedule === "daily") return elapsed >= 24 * 60 * 60 * 1000;
  if (settings.schedule === "weekly") return elapsed >= 7 * 24 * 60 * 60 * 1000;
  return (
    now.getUTCFullYear() > lastRun.getUTCFullYear() || now.getUTCMonth() > lastRun.getUTCMonth()
  );
}

export function retainLatest<T extends { createdAt: string }>(
  records: readonly T[],
  count: number,
): T[] {
  return [...records]
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .slice(0, Math.max(1, Math.trunc(count)));
}

export function packageSummary(pkg: PortablePackage): {
  tables: number;
  rows: number;
  files: number;
  checksum: string;
} {
  return {
    tables: pkg.tables.length,
    rows: pkg.tables.reduce((sum, table) => sum + table.rows.length, 0),
    files: pkg.files.length,
    checksum: pkg.manifest.checksum,
  };
}
