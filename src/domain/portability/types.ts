export const PORTABLE_PACKAGE_MAGIC = "mathios-portable" as const;
export const PORTABLE_PACKAGE_VERSION = 1 as const;
export const PORTABILITY_PHASE = 15 as const;

export const BACKUP_TYPES = ["full", "content", "user-data", "settings"] as const;
export type BackupType = (typeof BACKUP_TYPES)[number];

export const EXPORT_FORMATS = ["json", "markdown", "csv", "zip", "html", "pdf"] as const;
export type ExportFormat = (typeof EXPORT_FORMATS)[number];

export const BACKUP_SCHEDULES = ["daily", "weekly", "monthly"] as const;
export type BackupSchedule = (typeof BACKUP_SCHEDULES)[number];

export const RESTORE_MODES = ["merge", "replace"] as const;
export type RestoreMode = (typeof RESTORE_MODES)[number];

export const BACKUP_STATUSES = ["ready", "failed", "deleted"] as const;
export type BackupStatus = (typeof BACKUP_STATUSES)[number];

export const RESTORE_STATUSES = ["previewed", "completed", "failed"] as const;
export type RestoreStatus = (typeof RESTORE_STATUSES)[number];

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };
export type JsonRecord = { [key: string]: JsonValue };

export interface PortableTableSnapshot {
  name: string;
  columns: readonly string[];
  primaryKey: readonly string[];
  rows: readonly JsonRecord[];
}

export interface PortableFile {
  path: string;
  contentType: string;
  size: number;
  checksum: string;
  bodyBase64: string;
}

export interface PortableManifest {
  magic: typeof PORTABLE_PACKAGE_MAGIC;
  formatVersion: typeof PORTABLE_PACKAGE_VERSION;
  phase: typeof PORTABILITY_PHASE;
  kind: BackupType;
  createdAt: string;
  databaseProvider: "sqlite" | "postgres";
  tableCount: number;
  rowCount: number;
  fileCount: number;
  includedTables: readonly string[];
  checksum: string;
}

export interface PortablePackage {
  manifest: PortableManifest;
  tables: readonly PortableTableSnapshot[];
  files: readonly PortableFile[];
}

export interface BackupSettings {
  id: 1;
  enabled: boolean;
  schedule: BackupSchedule;
  backupType: BackupType;
  retentionCount: number;
  location: string;
  encryptionEnabled: boolean;
  lastRunAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BackupArtifactRecord {
  id: string;
  kind: BackupType;
  format: ExportFormat;
  storageKey: string;
  fileName: string;
  contentType: string;
  byteSize: number;
  checksum: string;
  manifest: PortableManifest;
  encryptionEnabled: boolean;
  status: BackupStatus;
  createdByProfileId: string | null;
  createdAt: string;
  expiresAt: string | null;
  errorMessage: string | null;
}

export interface RestoreRunRecord {
  id: string;
  backupId: string | null;
  profileId: string;
  sourceFileName: string | null;
  mode: RestoreMode;
  status: RestoreStatus;
  packageChecksum: string;
  conflictCount: number;
  insertedCount: number;
  updatedCount: number;
  preview: RestorePreview | null;
  startedAt: string;
  completedAt: string | null;
  errorMessage: string | null;
}

export interface RestoreConflict {
  table: string;
  key: string;
  existing: JsonRecord;
  incoming: JsonRecord;
}

export interface RestoreTablePlan {
  table: string;
  incomingRows: number;
  existingRows: number;
  inserts: number;
  updates: number;
}

export interface RestorePreview {
  mode: RestoreMode;
  tablePlans: readonly RestoreTablePlan[];
  conflicts: readonly RestoreConflict[];
  fileCount: number;
  totalInserts: number;
  totalUpdates: number;
}

export interface PortableSnapshot {
  kind: BackupType;
  databaseProvider: "sqlite" | "postgres";
  tables: readonly PortableTableSnapshot[];
  files: readonly PortableFile[];
}
