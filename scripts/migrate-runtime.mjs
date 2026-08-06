import { mkdir, readdir, readFile } from "node:fs/promises";
import path from "node:path";
import Database from "better-sqlite3";
import postgres from "postgres";

const provider = process.env.DATABASE_PROVIDER ?? "sqlite";
const databaseUrl = process.env.DATABASE_URL ?? "file:./data/mathios.db";
const root = process.env.MATHIOS_ROOT ?? process.cwd();
const migrationDirectory = path.join(root, "drizzle", provider);
const names = (await readdir(migrationDirectory)).filter((name) => name.endsWith(".sql")).sort();

if (provider === "sqlite") {
  const filename = resolveSqliteFilename(databaseUrl, root);
  if (filename !== ":memory:") await mkdir(path.dirname(filename), { recursive: true });
  const database = new Database(filename);
  try {
    database.pragma("foreign_keys = ON");
    database.exec(
      "CREATE TABLE IF NOT EXISTS _mathios_migrations (name TEXT PRIMARY KEY NOT NULL, applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)",
    );
    const applied = new Set(
      database
        .prepare("SELECT name FROM _mathios_migrations")
        .all()
        .map((row) => row.name),
    );
    for (const name of names) {
      if (applied.has(name)) continue;
      database.exec("BEGIN");
      try {
        database.exec(await readFile(path.join(migrationDirectory, name), "utf8"));
        database.prepare("INSERT INTO _mathios_migrations (name) VALUES (?)").run(name);
        database.exec("COMMIT");
      } catch (error) {
        database.exec("ROLLBACK");
        throw error;
      }
    }
  } finally {
    database.close();
  }
} else if (provider === "postgres") {
  const database = postgres(databaseUrl, { max: 1, connect_timeout: 10 });
  try {
    await database`SELECT pg_advisory_lock(hashtext('mathios:migrations'))`;
    await database.unsafe(
      "CREATE TABLE IF NOT EXISTS _mathios_migrations (name TEXT PRIMARY KEY NOT NULL, applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW())",
    );
    const applied = new Set(
      (await database`SELECT name FROM _mathios_migrations`).map((row) => row.name),
    );
    for (const name of names) {
      if (applied.has(name)) continue;
      const sql = await readFile(path.join(migrationDirectory, name), "utf8");
      await database.begin(async (transaction) => {
        await transaction.unsafe(sql);
        await transaction`INSERT INTO _mathios_migrations (name) VALUES (${name})`;
      });
    }
    await database`SELECT pg_advisory_unlock(hashtext('mathios:migrations'))`;
  } finally {
    await database.end({ timeout: 5 });
  }
} else {
  throw new Error(`Unsupported DATABASE_PROVIDER '${provider}'.`);
}

function resolveSqliteFilename(value, workingDirectory) {
  const withoutPrefix = value.startsWith("file:") ? value.slice("file:".length) : value;
  if (withoutPrefix === ":memory:" || withoutPrefix.startsWith(":memory:?")) return ":memory:";
  return path.resolve(workingDirectory, withoutPrefix);
}
