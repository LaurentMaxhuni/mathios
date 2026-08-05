import path from "node:path";
import { mkdirSync } from "node:fs";
import Database from "better-sqlite3";
import { drizzle as drizzlePostgres, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { drizzle as drizzleSqlite, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import postgres, { type Sql } from "postgres";
import { env } from "@/lib/env";
import * as postgresSchema from "@/infrastructure/database/schema/postgres";
import * as sqliteSchema from "@/infrastructure/database/schema/sqlite";

export type SqliteDatabase = BetterSQLite3Database<typeof sqliteSchema>;
export type PostgresDatabase = PostgresJsDatabase<typeof postgresSchema>;

export type DatabaseHandle =
  | { provider: "sqlite"; raw: Database.Database; db: SqliteDatabase }
  | { provider: "postgres"; raw: Sql; db: PostgresDatabase };

let databaseHandle: DatabaseHandle | undefined;

export function getDatabase(): DatabaseHandle {
  if (databaseHandle) return databaseHandle;

  if (env.DATABASE_PROVIDER === "sqlite") {
    const filename = resolveSqliteFilename(env.DATABASE_URL);
    if (filename !== ":memory:") mkdirSync(path.dirname(filename), { recursive: true });
    const raw = new Database(filename);
    raw.pragma("foreign_keys = ON");
    raw.pragma("busy_timeout = 5000");
    databaseHandle = { provider: "sqlite", raw, db: drizzleSqlite(raw, { schema: sqliteSchema }) };
    return databaseHandle;
  }

  const raw = postgres(env.DATABASE_URL, {
    max: 5,
    connect_timeout: 10,
    idle_timeout: 20,
  });
  databaseHandle = {
    provider: "postgres",
    raw,
    db: drizzlePostgres(raw, { schema: postgresSchema }),
  };
  return databaseHandle;
}

export async function closeDatabase(): Promise<void> {
  if (!databaseHandle) return;

  if (databaseHandle.provider === "sqlite") {
    databaseHandle.raw.close();
  } else {
    await databaseHandle.raw.end({ timeout: 5 });
  }

  databaseHandle = undefined;
}

export async function resetDatabaseForTests(): Promise<void> {
  await closeDatabase();
}

export function resolveSqliteFilename(databaseUrl: string): string {
  const withoutPrefix = databaseUrl.startsWith("file:")
    ? databaseUrl.slice("file:".length)
    : databaseUrl;
  if (withoutPrefix === ":memory:" || withoutPrefix.startsWith(":memory:?")) return ":memory:";
  return path.resolve(process.cwd(), withoutPrefix);
}
