import path from "node:path";
import { mkdirSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import Database from "better-sqlite3";
import postgres from "postgres";
import { env } from "@/lib/env";
import { resolveSqliteFilename } from "@/infrastructure/database/client";

export type MigrationProvider = "sqlite" | "postgres";

export interface MigrationResult {
  provider: MigrationProvider;
  applied: readonly string[];
  skipped: readonly string[];
}

interface MigrationFile {
  name: string;
  sql: string;
}

const migrationTable = "_mathios_migrations";

export async function runMigrations(
  options: {
    provider?: MigrationProvider;
    databaseUrl?: string;
    migrationsDirectory?: string;
  } = {},
): Promise<MigrationResult> {
  const provider = options.provider ?? env.DATABASE_PROVIDER;
  const files = await loadMigrationFiles(provider, options.migrationsDirectory);

  if (provider === "sqlite") {
    return applySqliteMigrations(files, options.databaseUrl ?? env.DATABASE_URL);
  }

  return applyPostgresMigrations(files, options.databaseUrl ?? env.DATABASE_URL);
}

async function loadMigrationFiles(
  provider: MigrationProvider,
  directory?: string,
): Promise<MigrationFile[]> {
  const migrationDirectory = directory ?? path.join(process.cwd(), "drizzle", provider);
  const names = (await readdir(migrationDirectory)).filter((name) => name.endsWith(".sql")).sort();
  return Promise.all(
    names.map(async (name) => ({
      name,
      sql: await readFile(path.join(migrationDirectory, name), "utf8"),
    })),
  );
}

function applySqliteMigrations(
  files: readonly MigrationFile[],
  databaseUrl: string,
): MigrationResult {
  const filename = resolveSqliteFilename(databaseUrl);
  if (filename !== ":memory:") {
    const directory = path.dirname(filename);
    // This synchronous directory creation keeps the migration API usable from both scripts and tests.
    mkdirSync(directory, { recursive: true });
  }

  const database = new Database(filename);
  const applied: string[] = [];
  const skipped: string[] = [];

  try {
    database.pragma("foreign_keys = ON");
    database.exec(
      `CREATE TABLE IF NOT EXISTS ${migrationTable} (name TEXT PRIMARY KEY NOT NULL, applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
    );

    const appliedRows = database
      .prepare(`SELECT name FROM ${migrationTable} ORDER BY name`)
      .all() as Array<{ name: string }>;
    const appliedNames = new Set(appliedRows.map((row) => row.name));

    for (const file of files) {
      if (appliedNames.has(file.name)) {
        skipped.push(file.name);
        continue;
      }

      database.exec("BEGIN");
      try {
        database.exec(file.sql);
        database.prepare(`INSERT INTO ${migrationTable} (name) VALUES (?)`).run(file.name);
        database.exec("COMMIT");
        applied.push(file.name);
      } catch (error) {
        database.exec("ROLLBACK");
        throw error;
      }
    }
  } finally {
    database.close();
  }

  return { provider: "sqlite", applied, skipped };
}

async function applyPostgresMigrations(
  files: readonly MigrationFile[],
  databaseUrl: string,
): Promise<MigrationResult> {
  const database = postgres(databaseUrl, { max: 1, connect_timeout: 10 });
  const applied: string[] = [];
  const skipped: string[] = [];

  try {
    await database.unsafe(
      `CREATE TABLE IF NOT EXISTS ${migrationTable} (name TEXT PRIMARY KEY NOT NULL, applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`,
    );
    const rows = await database<
      { name: string }[]
    >`SELECT name FROM _mathios_migrations ORDER BY name`;
    const appliedNames = new Set(rows.map((row) => row.name));

    for (const file of files) {
      if (appliedNames.has(file.name)) {
        skipped.push(file.name);
        continue;
      }

      await database.begin(async (transaction) => {
        await transaction.unsafe(file.sql);
        await transaction`INSERT INTO _mathios_migrations (name) VALUES (${file.name})`;
      });
      applied.push(file.name);
    }
  } finally {
    await database.end({ timeout: 5 });
  }

  return { provider: "postgres", applied, skipped };
}
