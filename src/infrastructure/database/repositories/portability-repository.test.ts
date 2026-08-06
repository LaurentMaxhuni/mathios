import Database from "better-sqlite3";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { DatabaseHandle } from "@/infrastructure/database/client";
import { runSeed } from "@/infrastructure/database/seed";
import { SqlPortabilityRepository } from "@/infrastructure/database/repositories/portability-repository";
import type { PortablePackage } from "@/domain/portability/types";

describe("portability repository", () => {
  it("captures content and profile-scoped settings using stable table identifiers", async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), "mathios-portability-"));
    const databaseUrl = `file:${path.join(directory, "portability.db")}`;
    let raw: Database.Database | undefined;
    try {
      await runSeed({ provider: "sqlite", databaseUrl });
      raw = new Database(path.join(directory, "portability.db"));
      raw.pragma("foreign_keys = ON");
      raw
        .prepare("INSERT INTO users (id, identifier) VALUES (?, ?)")
        .run("user-portability", "portability-user");
      raw
        .prepare(
          "INSERT INTO profiles (id, user_id, display_name, secret_hash) VALUES (?, ?, ?, ?)",
        )
        .run("profile-portability", "user-portability", "Portable learner", "secret-hash");
      raw.prepare("INSERT INTO user_settings (profile_id) VALUES (?)").run("profile-portability");
      raw.close();
      raw = undefined;

      const database = new Database(path.join(directory, "portability.db"));
      database.pragma("foreign_keys = ON");
      const handle = {
        provider: "sqlite",
        raw: database,
        db: undefined as never,
      } as unknown as DatabaseHandle;
      const repository = new SqlPortabilityRepository(handle);
      const content = await repository.captureSnapshot("content", "profile-portability");
      const settings = await repository.captureSnapshot("settings", "profile-portability");
      expect(
        content.tables.find((table) => table.name === "curricula")?.rows.length,
      ).toBeGreaterThan(0);
      const profile = settings.tables.find((table) => table.name === "profiles");
      expect(profile?.rows).toEqual([
        {
          avatar: "orbit",
          created_at: expect.any(String),
          current_curriculum: null,
          current_grade: null,
          display_name: "Portable learner",
          id: "profile-portability",
          preferred_language: "en",
          preferred_theme: "system",
          target_grade: null,
          updated_at: expect.any(String),
          user_id: "user-portability",
        },
      ]);
      expect(profile?.columns).not.toContain("secret_hash");
      database.close();
    } finally {
      raw?.close();
      await rm(directory, { recursive: true, force: true });
    }
  });

  it("previews merge and applies replace in a single database transaction", async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), "mathios-portability-restore-"));
    const databaseUrl = `file:${path.join(directory, "restore.db")}`;
    let database: Database.Database | undefined;
    try {
      await runSeed({ provider: "sqlite", databaseUrl });
      database = new Database(path.join(directory, "restore.db"));
      database.pragma("foreign_keys = ON");
      const handle = {
        provider: "sqlite",
        raw: database,
        db: undefined as never,
      } as unknown as DatabaseHandle;
      const repository = new SqlPortabilityRepository(handle);
      const current = await repository.getBackupSettings();
      const pkg: PortablePackage = {
        manifest: {
          magic: "mathios-portable",
          formatVersion: 1,
          phase: 15,
          kind: "settings",
          createdAt: "2026-08-06T00:00:00.000Z",
          databaseProvider: "sqlite",
          tableCount: 1,
          rowCount: 1,
          fileCount: 0,
          includedTables: ["backup_settings"],
          checksum: "fixture",
        },
        tables: [
          {
            name: "backup_settings",
            columns: [
              "id",
              "enabled",
              "schedule",
              "backup_type",
              "retention_count",
              "location",
              "encryption_enabled",
              "last_run_at",
              "created_at",
              "updated_at",
            ],
            primaryKey: ["id"],
            rows: [
              {
                id: 1,
                enabled: true,
                schedule: current.schedule,
                backup_type: current.backupType,
                retention_count: current.retentionCount,
                location: current.location,
                encryption_enabled: current.encryptionEnabled,
                last_run_at: null,
                created_at: current.createdAt,
                updated_at: current.updatedAt,
              },
            ],
          },
        ],
        files: [],
      };
      const preview = await repository.previewRestore(
        pkg,
        "replace",
        "profile-missing-but-not-needed",
      );
      expect(preview.totalUpdates).toBe(1);
      await repository.restoreSnapshot(pkg, "replace", "profile-missing-but-not-needed");
      expect((await repository.getBackupSettings()).enabled).toBe(true);
    } finally {
      database?.close();
      await rm(directory, { recursive: true, force: true });
    }
  });
});
