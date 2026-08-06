import { createCipheriv, createDecipheriv, createHash, randomBytes, randomUUID } from "node:crypto";
import { NotFoundError, ValidationError } from "@/domain/errors/application-error";
import {
  isBackupDue,
  normalizeBackupSettings,
  packageChecksumInput,
  validatePortablePackage,
} from "@/domain/portability/rules";
import type {
  BackupArtifactRecord,
  BackupSettings,
  BackupType,
  ExportFormat,
  PortableFile,
  PortablePackage,
  PortableSnapshot,
  RestoreMode,
  RestorePreview,
  RestoreRunRecord,
} from "@/domain/portability/types";
import type { PortabilityRepository } from "@/domain/ports/portability-repository";
import { getPortabilityRepository } from "@/infrastructure/database/repositories/portability-repository";
import { getStorage } from "@/infrastructure/storage";
import type { StoredObject } from "@/infrastructure/storage/storage";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { readZip } from "@/features/portability/archive";
import {
  packageCsv,
  packageHtml,
  packageJson,
  packageMarkdown,
  packagePdf,
  packageZip,
} from "@/features/portability/exporters";

const encryptionPrefix = "MATHIOS15E1";
const portabilityLogger = logger.child({ feature: "portability" });

export interface ExportArtifact {
  body: Uint8Array;
  contentType: string;
  fileName: string;
}

export interface PortabilityDashboard {
  settings: BackupSettings;
  backups: readonly BackupArtifactRecord[];
}

export interface RestoreResult {
  run: RestoreRunRecord;
  preview: RestorePreview;
}

function sha256(bytes: Uint8Array | string): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function base64(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("base64");
}

function fromBase64(value: string): Uint8Array {
  return Uint8Array.from(Buffer.from(value, "base64"));
}

function encryptionKey(): Uint8Array {
  return createHash("sha256").update(env.SESSION_SECRET).digest();
}

function encrypt(bytes: Uint8Array): Uint8Array {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(bytes), cipher.final()]);
  const tag = cipher.getAuthTag();
  return new TextEncoder().encode(
    `${encryptionPrefix}.${base64(iv)}.${base64(tag)}.${base64(encrypted)}`,
  );
}

function decrypt(bytes: Uint8Array): Uint8Array {
  const value = new TextDecoder().decode(bytes);
  const [prefix, ivValue, tagValue, bodyValue] = value.split(".");
  if (prefix !== encryptionPrefix || !ivValue || !tagValue || !bodyValue) {
    throw new ValidationError("The encrypted backup envelope is invalid.");
  }
  try {
    const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), fromBase64(ivValue));
    decipher.setAuthTag(fromBase64(tagValue));
    return Buffer.concat([decipher.update(fromBase64(bodyValue)), decipher.final()]);
  } catch (error) {
    throw new ValidationError("The backup could not be decrypted with this installation key.", [
      {
        path: "encryption",
        message: error instanceof Error ? error.message : "Authentication failed.",
      },
    ]);
  }
}

function buildPackage(
  snapshot: PortableSnapshot,
  createdAt = new Date().toISOString(),
): PortablePackage {
  const tables = [...snapshot.tables].sort((left, right) => left.name.localeCompare(right.name));
  const files = [...snapshot.files].sort((left, right) => left.path.localeCompare(right.path));
  const rowCount = tables.reduce((sum, table) => sum + table.rows.length, 0);
  const manifestWithoutChecksum = {
    magic: "mathios-portable" as const,
    formatVersion: 1 as const,
    phase: 15 as const,
    kind: snapshot.kind,
    createdAt,
    databaseProvider: snapshot.databaseProvider,
    tableCount: tables.length,
    rowCount,
    fileCount: files.length,
    includedTables: tables.map((table) => table.name),
  };
  const checksum = sha256(packageChecksumInput({ tables, files }));
  return {
    manifest: { ...manifestWithoutChecksum, checksum },
    tables,
    files,
  };
}

function verifyPackageChecksum(pkg: PortablePackage): void {
  const checksum = sha256(packageChecksumInput({ tables: pkg.tables, files: pkg.files }));
  if (checksum !== pkg.manifest.checksum)
    throw new ValidationError("The backup checksum does not match its contents.");
  for (const file of pkg.files) {
    const body = fromBase64(file.bodyBase64);
    if (body.byteLength !== file.size || sha256(body) !== file.checksum) {
      throw new ValidationError(`Asset '${file.path}' failed its integrity check.`);
    }
  }
}

function storageKeyFromSourceUrl(sourceUrl: string): string | null {
  if (sourceUrl.startsWith("storage://")) return sourceUrl.slice("storage://".length);
  if (sourceUrl.startsWith("/storage/")) return sourceUrl.slice("/storage/".length);
  if (sourceUrl.startsWith("storage/")) return sourceUrl.slice("storage/".length);
  return null;
}

async function attachAssets(snapshot: PortableSnapshot): Promise<PortableSnapshot> {
  const assetTable = snapshot.tables.find((table) => table.name === "lesson_assets");
  if (!assetTable) return snapshot;
  const storage = getStorage();
  const files: PortableFile[] = [];
  const seen = new Set<string>();
  for (const row of assetTable.rows) {
    const sourceUrl = typeof row.source_url === "string" ? row.source_url : "";
    const storageKey = storageKeyFromSourceUrl(sourceUrl);
    if (!storageKey || seen.has(storageKey)) continue;
    const object = await storage.get(storageKey);
    if (!object) continue;
    const path = `assets/${storageKey}`;
    if (!/^[A-Za-z0-9._/-]+$/.test(path) || path.includes("..")) continue;
    files.push({
      path,
      contentType:
        object.contentType ??
        (typeof row.mime_type === "string" ? row.mime_type : "application/octet-stream"),
      size: object.size,
      checksum: sha256(object.body),
      bodyBase64: base64(object.body),
    });
    seen.add(storageKey);
  }
  return { ...snapshot, files };
}

function renderPackage(pkg: PortablePackage, format: ExportFormat): ExportArtifact {
  const stem = `mathios-${pkg.manifest.kind}`;
  if (format === "json")
    return { body: packageJson(pkg), contentType: "application/json", fileName: `${stem}.json` };
  if (format === "markdown")
    return {
      body: new TextEncoder().encode(packageMarkdown(pkg)),
      contentType: "text/markdown; charset=utf-8",
      fileName: `${stem}.md`,
    };
  if (format === "csv")
    return {
      body: new TextEncoder().encode(packageCsv(pkg)),
      contentType: "text/csv; charset=utf-8",
      fileName: `${stem}.csv`,
    };
  if (format === "html")
    return {
      body: new TextEncoder().encode(packageHtml(pkg)),
      contentType: "text/html; charset=utf-8",
      fileName: `${stem}.html`,
    };
  if (format === "pdf")
    return { body: packagePdf(pkg), contentType: "application/pdf", fileName: `${stem}.pdf` };
  return { body: packageZip(pkg), contentType: "application/zip", fileName: `${stem}.zip` };
}

export function parsePortablePackage(bytes: Uint8Array, fileName = "backup.json"): PortablePackage {
  const isZip = fileName.toLowerCase().endsWith(".zip") || (bytes[0] === 0x50 && bytes[1] === 0x4b);
  let raw: string | undefined;
  if (isZip) {
    const dataFile = readZip(bytes).find((file) => file.path === "data.json");
    if (!dataFile) throw new ValidationError("The ZIP package does not contain data.json.");
    raw = new TextDecoder().decode(dataFile.body);
  } else {
    raw = new TextDecoder().decode(bytes);
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new ValidationError("Only Mathios JSON or ZIP portability packages can be restored.");
  }
  validatePortablePackage(parsed);
  verifyPackageChecksum(parsed);
  return parsed;
}

export async function getPortabilityDashboard(
  profileId: string,
  repository: PortabilityRepository = getPortabilityRepository(),
  allowScheduled = false,
): Promise<PortabilityDashboard> {
  const settings = await repository.getBackupSettings();
  if (allowScheduled && isBackupDue(settings)) {
    try {
      await createBackup({ kind: settings.backupType, profileId, scheduled: true }, repository);
    } catch (error) {
      portabilityLogger.warn("Scheduled backup could not be created.", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
  return {
    settings: await repository.getBackupSettings(),
    backups: await repository.listBackupArtifacts(),
  };
}

export async function exportPortability(
  kind: BackupType,
  format: ExportFormat,
  profileId: string,
  repository: PortabilityRepository = getPortabilityRepository(),
): Promise<ExportArtifact> {
  const snapshot = await repository.captureSnapshot(kind, profileId);
  const pkg = buildPackage(await attachAssets(snapshot));
  return renderPackage(pkg, format);
}

export async function createBackup(
  input: { kind?: BackupType; profileId: string; scheduled?: boolean },
  repository: PortabilityRepository = getPortabilityRepository(),
): Promise<BackupArtifactRecord> {
  const settings = await repository.getBackupSettings();
  const kind = input.kind ?? settings.backupType;
  const id = randomUUID();
  const snapshot = await repository.captureSnapshot(kind, input.profileId);
  const pkg = buildPackage(await attachAssets(snapshot));
  const plainBody = packageZip(pkg);
  const body = settings.encryptionEnabled ? encrypt(plainBody) : plainBody;
  const storageKey = `${normalizeBackupSettings(settings).location}/${id}.zip`;
  const stored = await getStorage().put({ key: storageKey, body, contentType: "application/zip" });
  const artifact = await repository.createBackupArtifact({
    id,
    kind,
    format: "zip",
    storageKey,
    fileName: `mathios-${kind}-${pkg.manifest.createdAt.slice(0, 10)}.zip`,
    contentType: "application/zip",
    byteSize: stored.size,
    checksum: pkg.manifest.checksum,
    manifest: pkg.manifest,
    encryptionEnabled: settings.encryptionEnabled,
    status: "ready",
    createdByProfileId: input.profileId,
    expiresAt: null,
    errorMessage: null,
  });
  await repository.updateBackupSettings({ lastRunAt: pkg.manifest.createdAt });
  const retained = (await repository.listBackupArtifacts()).filter(
    (item) => item.kind === kind && item.status === "ready",
  );
  const keep = new Set(
    retained
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
      .slice(0, settings.retentionCount)
      .map((item) => item.id),
  );
  for (const old of retained) {
    if (keep.has(old.id)) continue;
    await getStorage()
      .delete(old.storageKey)
      .catch(() => undefined);
    await repository.markBackupDeleted(old.id);
  }
  return artifact;
}

export async function downloadBackup(
  id: string,
  repository: PortabilityRepository = getPortabilityRepository(),
): Promise<ExportArtifact> {
  const artifact = await repository.getBackupArtifact(id);
  if (!artifact || artifact.status !== "ready") throw new NotFoundError("Backup", id);
  const stored = await getStorage().get(artifact.storageKey);
  if (!stored) throw new NotFoundError("Backup file", artifact.storageKey);
  const body = artifact.encryptionEnabled ? decrypt(stored.body) : stored.body;
  if (!body.byteLength) throw new ValidationError("The backup body is empty.");
  return { body, contentType: artifact.contentType, fileName: artifact.fileName };
}

export async function previewRestore(
  bytes: Uint8Array,
  fileName: string,
  mode: RestoreMode,
  profileId: string,
  repository: PortabilityRepository = getPortabilityRepository(),
): Promise<RestoreResult> {
  const pkg = parsePortablePackage(bytes, fileName);
  const preview = await repository.previewRestore(pkg, mode, profileId);
  const run = await repository.createRestoreRun({
    id: randomUUID(),
    backupId: null,
    profileId,
    sourceFileName: fileName,
    mode,
    status: "previewed",
    packageChecksum: pkg.manifest.checksum,
    conflictCount: preview.conflicts.length,
    insertedCount: preview.totalInserts,
    updatedCount: preview.totalUpdates,
    preview,
    completedAt: null,
    errorMessage: null,
  });
  return { run, preview };
}

function assetsFromPackage(pkg: PortablePackage): PortableFile[] {
  return pkg.files.filter((file) => file.path.startsWith("assets/"));
}

interface StagedAsset {
  key: string;
  previous: StoredObject | null;
}

async function restoreAssets(
  files: readonly PortableFile[],
  mode: RestoreMode,
): Promise<StagedAsset[]> {
  const storage = getStorage();
  const staged: StagedAsset[] = [];
  for (const file of files) {
    const storageKey = file.path.slice("assets/".length);
    if (!storageKey || storageKey.includes("..")) continue;
    const previous = await storage.get(storageKey);
    if (mode === "merge" && previous) continue;
    await storage.put({
      key: storageKey,
      body: fromBase64(file.bodyBase64),
      contentType: file.contentType,
    });
    staged.push({ key: storageKey, previous });
  }
  return staged;
}

export async function restorePortability(
  bytes: Uint8Array,
  fileName: string,
  mode: RestoreMode,
  profileId: string,
  repository: PortabilityRepository = getPortabilityRepository(),
): Promise<RestoreResult> {
  const pkg = parsePortablePackage(bytes, fileName);
  const preview = await repository.previewRestore(pkg, mode, profileId);
  const run = await repository.createRestoreRun({
    id: randomUUID(),
    backupId: null,
    profileId,
    sourceFileName: fileName,
    mode,
    status: "previewed",
    packageChecksum: pkg.manifest.checksum,
    conflictCount: preview.conflicts.length,
    insertedCount: preview.totalInserts,
    updatedCount: preview.totalUpdates,
    preview,
    completedAt: null,
    errorMessage: null,
  });
  let stagedAssets: StagedAsset[] = [];
  try {
    stagedAssets = await restoreAssets(assetsFromPackage(pkg), mode);
    const restored = await repository.restoreSnapshot(pkg, mode, profileId);
    const completed = await repository.updateRestoreRun(run.id, {
      status: "completed",
      conflictCount: restored.conflicts.length,
      insertedCount: restored.totalInserts,
      updatedCount: restored.totalUpdates,
      preview: restored,
      completedAt: new Date().toISOString(),
      errorMessage: null,
    });
    return { run: completed, preview: restored };
  } catch (error) {
    await Promise.all(
      stagedAssets.map(async ({ key, previous }) => {
        if (previous) {
          await getStorage().put({ key, body: previous.body, contentType: previous.contentType });
        } else {
          await getStorage().delete(key);
        }
      }),
    );
    const message = error instanceof Error ? error.message : "Restore failed.";
    const failed = await repository.updateRestoreRun(run.id, {
      status: "failed",
      completedAt: new Date().toISOString(),
      errorMessage: message,
    });
    void failed;
    throw error;
  }
}

export function artifactToJson(artifact: BackupArtifactRecord): Record<string, unknown> {
  return {
    id: artifact.id,
    kind: artifact.kind,
    fileName: artifact.fileName,
    contentType: artifact.contentType,
    byteSize: artifact.byteSize,
    checksum: artifact.checksum,
    status: artifact.status,
    encryptionEnabled: artifact.encryptionEnabled,
    createdAt: artifact.createdAt,
    expiresAt: artifact.expiresAt,
    manifest: artifact.manifest,
  };
}
