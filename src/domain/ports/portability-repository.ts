import type {
  BackupArtifactRecord,
  BackupSettings,
  PortableSnapshot,
  PortablePackage,
  RestoreMode,
  RestorePreview,
  RestoreRunRecord,
} from "@/domain/portability/types";

export interface PortabilityRepository {
  getBackupSettings(): Promise<BackupSettings>;
  updateBackupSettings(input: Partial<BackupSettings>): Promise<BackupSettings>;
  captureSnapshot(kind: BackupSettings["backupType"], profileId: string): Promise<PortableSnapshot>;
  previewRestore(
    pkg: PortablePackage,
    mode: RestoreMode,
    profileId: string,
  ): Promise<RestorePreview>;
  restoreSnapshot(
    pkg: PortablePackage,
    mode: RestoreMode,
    profileId: string,
  ): Promise<RestorePreview>;
  listBackupArtifacts(limit?: number): Promise<readonly BackupArtifactRecord[]>;
  getBackupArtifact(id: string): Promise<BackupArtifactRecord | null>;
  createBackupArtifact(
    input: Omit<BackupArtifactRecord, "createdAt">,
  ): Promise<BackupArtifactRecord>;
  markBackupDeleted(id: string): Promise<void>;
  createRestoreRun(
    input: Omit<RestoreRunRecord, "startedAt"> & { startedAt?: string },
  ): Promise<RestoreRunRecord>;
  updateRestoreRun(id: string, input: Partial<RestoreRunRecord>): Promise<RestoreRunRecord>;
}
