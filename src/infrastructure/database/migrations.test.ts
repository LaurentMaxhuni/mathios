import Database from "better-sqlite3";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { runMigrations } from "@/infrastructure/database/migrations";

describe("database migrations", () => {
  it("applies SQLite migrations once and records the result", async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), "mathios-db-"));
    const databaseUrl = `file:${path.join(directory, "test.db")}`;
    let database: Database.Database | undefined;

    try {
      const first = await runMigrations({ provider: "sqlite", databaseUrl });
      const second = await runMigrations({ provider: "sqlite", databaseUrl });
      database = new Database(path.join(directory, "test.db"));

      expect(first.applied).toEqual(["0000_foundation.sql"]);
      expect(second.applied).toEqual([]);
      expect(second.skipped).toEqual(["0000_foundation.sql"]);
      expect(database.prepare("SELECT key FROM app_metadata").all()).toEqual([]);
    } finally {
      database?.close();
      await rm(directory, { recursive: true, force: true });
    }
  });
});
