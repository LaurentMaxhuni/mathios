"use client";

import { useState } from "react";
import {
  Archive,
  CheckCircle2,
  Download,
  FileArchive,
  RefreshCw,
  ShieldCheck,
  Upload,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  BACKUP_SCHEDULES,
  BACKUP_TYPES,
  EXPORT_FORMATS,
  RESTORE_MODES,
  type BackupArtifactRecord,
  type BackupSettings,
  type BackupType,
  type ExportFormat,
  type RestorePreview,
} from "@/domain/portability/types";

interface Props {
  settings: BackupSettings;
  backups: readonly BackupArtifactRecord[];
  canRunBackups: boolean;
  canRestore: boolean;
  canManageSettings: boolean;
}

const kindLabels: Record<BackupType, string> = {
  full: "Full installation",
  content: "Content only",
  "user-data": "User data only",
  settings: "Settings only",
};

function formatBytes(value: number): string {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

async function errorMessage(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { message?: string };
    return body.message ?? `Request failed (${response.status}).`;
  } catch {
    return `Request failed (${response.status}).`;
  }
}

function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function PortabilityWorkspace({
  settings: initialSettings,
  backups: initialBackups,
  canRunBackups,
  canRestore,
  canManageSettings,
}: Props) {
  const [settings, setSettings] = useState(initialSettings);
  const [backups, setBackups] = useState([...initialBackups]);
  const [exportKind, setExportKind] = useState<BackupType>("content");
  const [exportFormat, setExportFormat] = useState<ExportFormat>("zip");
  const [backupKind, setBackupKind] = useState<BackupType>(initialSettings.backupType);
  const [file, setFile] = useState<File | null>(null);
  const [restoreMode, setRestoreMode] = useState<(typeof RESTORE_MODES)[number]>("merge");
  const [preview, setPreview] = useState<RestorePreview | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function refresh(): Promise<void> {
    const response = await fetch("/api/portability/backups", { cache: "no-store" });
    if (!response.ok) throw new Error(await errorMessage(response));
    const body = (await response.json()) as {
      settings: BackupSettings;
      backups: BackupArtifactRecord[];
    };
    setSettings(body.settings);
    setBackups(body.backups);
  }

  async function exportData(): Promise<void> {
    setBusy("export");
    setNotice(null);
    try {
      const response = await fetch("/api/portability/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: exportKind, format: exportFormat }),
      });
      if (!response.ok) throw new Error(await errorMessage(response));
      const disposition = response.headers.get("content-disposition") ?? "";
      const fileName =
        disposition.match(/filename="([^"]+)"/)?.[1] ?? `mathios-${exportKind}.${exportFormat}`;
      downloadBlob(await response.blob(), fileName);
      setNotice("Export is ready.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Export failed.");
    } finally {
      setBusy(null);
    }
  }

  async function createBackupNow(): Promise<void> {
    setBusy("backup");
    setNotice(null);
    try {
      const response = await fetch("/api/portability/backups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: backupKind }),
      });
      if (!response.ok) throw new Error(await errorMessage(response));
      await refresh();
      setNotice("Backup created and integrity checksum recorded.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Backup failed.");
    } finally {
      setBusy(null);
    }
  }

  async function saveSettings(): Promise<void> {
    setBusy("settings");
    setNotice(null);
    try {
      const response = await fetch("/api/portability/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled: settings.enabled,
          schedule: settings.schedule,
          backupType: settings.backupType,
          retentionCount: settings.retentionCount,
          location: settings.location,
          encryptionEnabled: settings.encryptionEnabled,
        }),
      });
      if (!response.ok) throw new Error(await errorMessage(response));
      setSettings((await response.json()) as BackupSettings);
      setNotice("Automatic backup settings saved.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Settings could not be saved.");
    } finally {
      setBusy(null);
    }
  }

  async function sendRestore(previewOnly: boolean): Promise<void> {
    if (!file) {
      setNotice("Choose a JSON or ZIP portability package first.");
      return;
    }
    if (
      !previewOnly &&
      !window.confirm(
        "Restore this package? Merge keeps existing rows; replace overwrites matching stable IDs.",
      )
    )
      return;
    setBusy(previewOnly ? "preview" : "restore");
    setNotice(null);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("mode", restoreMode);
      form.append("preview", String(previewOnly));
      const response = await fetch("/api/portability/restore", { method: "POST", body: form });
      if (!response.ok) throw new Error(await errorMessage(response));
      const body = (await response.json()) as { preview: RestorePreview };
      setPreview(body.preview);
      setNotice(
        previewOnly
          ? "Restore preview generated. No data was changed."
          : "Restore completed atomically.",
      );
      if (!previewOnly) await refresh();
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "Restore failed safely without applying changes.",
      );
    } finally {
      setBusy(null);
    }
  }

  async function downloadBackup(id: string): Promise<void> {
    setBusy(`download-${id}`);
    try {
      const response = await fetch(`/api/portability/backups/${id}/download`);
      if (!response.ok) throw new Error(await errorMessage(response));
      const disposition = response.headers.get("content-disposition") ?? "";
      const fileName = disposition.match(/filename="([^"]+)"/)?.[1] ?? "mathios-backup.zip";
      downloadBlob(await response.blob(), fileName);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Download failed.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-7">
      <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="eyebrow">Portable by design</p>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight">Import, export & backup</h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Move Mathios content, learning history, notes, plans, and settings between local
            installations with stable identifiers and an integrity-checked restore path.
          </p>
        </div>
        <Badge variant={settings.enabled ? "success" : "outline"}>
          {settings.enabled ? `Automatic ${settings.schedule} backups on` : "Automatic backups off"}
        </Badge>
      </section>

      {notice ? (
        <div className="rounded-lg border border-accent/30 bg-accent/10 p-3 text-sm" role="status">
          {notice}
        </div>
      ) : null}

      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5 text-accent" aria-hidden="true" />
              Export data
            </CardTitle>
            <CardDescription>
              Generate a readable export or a ZIP package that can be restored later.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-2 text-sm font-medium">
                Data scope
                <select
                  value={exportKind}
                  onChange={(event) => setExportKind(event.target.value as BackupType)}
                  className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="content">Content only</option>
                  <option value="user-data">User data only</option>
                  <option value="settings">Settings only</option>
                  <option value="full">Full installation</option>
                </select>
              </label>
              <label className="space-y-2 text-sm font-medium">
                Format
                <select
                  value={exportFormat}
                  onChange={(event) => setExportFormat(event.target.value as ExportFormat)}
                  className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {EXPORT_FORMATS.map((format) => (
                    <option key={format} value={format}>
                      {format.toUpperCase()}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <Button type="button" onClick={exportData} disabled={busy !== null}>
              <Download className="h-4 w-4" aria-hidden="true" />
              {busy === "export" ? "Preparing…" : "Download export"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileArchive className="h-5 w-5 text-accent" aria-hidden="true" />
              Create backup
            </CardTitle>
            <CardDescription>
              Full backups are ZIP packages with data, manifests, checksums, and available local
              assets.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <label className="block space-y-2 text-sm font-medium">
              Backup scope
              <select
                value={backupKind}
                onChange={(event) => setBackupKind(event.target.value as BackupType)}
                className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {BACKUP_TYPES.map((kind) => (
                  <option key={kind} value={kind}>
                    {kindLabels[kind]}
                  </option>
                ))}
              </select>
            </label>
            <Button
              type="button"
              onClick={createBackupNow}
              disabled={!canRunBackups || busy !== null}
            >
              <Archive className="h-4 w-4" aria-hidden="true" />
              {busy === "backup" ? "Backing up…" : "Create ZIP backup"}
            </Button>
            {!canRunBackups ? (
              <p className="text-xs text-muted-foreground">
                The current profile needs the backup permission to create installation backups.
              </p>
            ) : null}
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-accent" aria-hidden="true" />
            Automatic backup policy
          </CardTitle>
          <CardDescription>
            Encryption uses the installation session secret; the key is never stored in the database
            or sent to the browser.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <label className="flex items-center gap-2 text-sm font-medium md:col-span-2 xl:col-span-1">
              <input
                type="checkbox"
                checked={settings.enabled}
                disabled={!canManageSettings}
                onChange={(event) => setSettings({ ...settings, enabled: event.target.checked })}
              />{" "}
              Enable schedule
            </label>
            <label className="space-y-2 text-sm font-medium">
              Frequency
              <select
                value={settings.schedule}
                disabled={!canManageSettings}
                onChange={(event) =>
                  setSettings({
                    ...settings,
                    schedule: event.target.value as BackupSettings["schedule"],
                  })
                }
                className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {BACKUP_SCHEDULES.map((schedule) => (
                  <option key={schedule} value={schedule}>
                    {schedule}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-2 text-sm font-medium">
              Scheduled scope
              <select
                value={settings.backupType}
                disabled={!canManageSettings}
                onChange={(event) =>
                  setSettings({ ...settings, backupType: event.target.value as BackupType })
                }
                className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {BACKUP_TYPES.map((kind) => (
                  <option key={kind} value={kind}>
                    {kindLabels[kind]}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-2 text-sm font-medium">
              Retention count
              <Input
                type="number"
                min={1}
                max={100}
                value={settings.retentionCount}
                disabled={!canManageSettings}
                onChange={(event) =>
                  setSettings({ ...settings, retentionCount: Number(event.target.value) })
                }
              />
            </label>
            <label className="space-y-2 text-sm font-medium md:col-span-2">
              Storage location
              <Input
                value={settings.location}
                disabled={!canManageSettings}
                onChange={(event) => setSettings({ ...settings, location: event.target.value })}
              />
              <span className="block text-xs font-normal text-muted-foreground">
                Relative to the configured local/S3 storage root.
              </span>
            </label>
            <label className="flex items-center gap-2 text-sm font-medium md:col-span-2">
              <input
                type="checkbox"
                checked={settings.encryptionEnabled}
                disabled={!canManageSettings}
                onChange={(event) =>
                  setSettings({ ...settings, encryptionEnabled: event.target.checked })
                }
              />{" "}
              Encrypt automatic and manual ZIP backups
            </label>
          </div>
          {canManageSettings ? (
            <Button type="button" variant="outline" onClick={saveSettings} disabled={busy !== null}>
              {busy === "settings" ? "Saving…" : "Save backup policy"}
            </Button>
          ) : (
            <p className="text-xs text-muted-foreground">
              Application-settings permission is required to change this policy.
            </p>
          )}
          {settings.lastRunAt ? (
            <p className="text-xs text-muted-foreground">
              Last scheduled/manual backup: {new Date(settings.lastRunAt).toLocaleString()}
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-accent" aria-hidden="true" />
            Restore or import
          </CardTitle>
          <CardDescription>
            Upload a Mathios JSON or ZIP package. Preview validates compatibility and conflicts
            before anything changes.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
            <label className="space-y-2 text-sm font-medium">
              Portability package
              <Input
                type="file"
                accept=".json,.zip,application/json,application/zip"
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              />
            </label>
            <div className="flex gap-2 text-sm">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={restoreMode === "merge"}
                  onChange={() => setRestoreMode("merge")}
                />{" "}
                Merge
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={restoreMode === "replace"}
                  onChange={() => setRestoreMode("replace")}
                />{" "}
                Replace matching IDs
              </label>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => void sendRestore(true)}
              disabled={!canRestore || busy !== null}
            >
              {busy === "preview" ? "Checking…" : "Preview restore"}
            </Button>
            <Button
              type="button"
              onClick={() => void sendRestore(false)}
              disabled={!canRestore || busy !== null}
            >
              {busy === "restore" ? "Restoring…" : "Restore package"}
            </Button>
          </div>
          {!canRestore ? (
            <p className="text-xs text-muted-foreground">
              The current profile needs restore permission to apply a package.
            </p>
          ) : null}
          {preview ? (
            <div className="rounded-lg border bg-muted/30 p-4 text-sm">
              <div className="flex items-center gap-2 font-medium">
                <CheckCircle2 className="h-4 w-4 text-accent" aria-hidden="true" />
                {preview.mode} preview · {preview.totalInserts} inserts · {preview.totalUpdates}{" "}
                replacements · {preview.conflicts.length} conflicts
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {preview.fileCount} asset files are included. A restore is applied in one database
                transaction.
              </p>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between gap-4 space-y-0">
          <div>
            <CardTitle>Backup history</CardTitle>
            <CardDescription>
              Only ready artifacts are downloadable; deleted retention entries remain as audit
              metadata.
            </CardDescription>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => void refresh()}
            disabled={busy !== null}
            aria-label="Refresh backup history"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
          </Button>
        </CardHeader>
        <CardContent>
          {backups.length ? (
            <div className="divide-y">
              {backups.map((backup) => (
                <div
                  key={backup.id}
                  className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{kindLabels[backup.kind]}</span>
                      <Badge variant={backup.status === "ready" ? "success" : "outline"}>
                        {backup.status}
                      </Badge>
                      {backup.encryptionEnabled ? <Badge variant="outline">encrypted</Badge> : null}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {new Date(backup.createdAt).toLocaleString()} · {formatBytes(backup.byteSize)}{" "}
                      · {backup.checksum.slice(0, 16)}…
                    </p>
                  </div>
                  {backup.status === "ready" ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => void downloadBackup(backup.id)}
                      disabled={busy !== null}
                    >
                      <Download className="h-4 w-4" aria-hidden="true" />
                      Download
                    </Button>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No backups have been created yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
