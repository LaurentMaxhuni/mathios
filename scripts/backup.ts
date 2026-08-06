import { mkdir } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";
import Database from "better-sqlite3";
import { env } from "@/lib/env";
import { resolveSqliteFilename } from "@/infrastructure/database/client";

async function main(): Promise<void> {
  const requestedOutput = process.argv[2];
  const output = path.resolve(
    requestedOutput ??
      path.join("data", "backups", `mathios-${new Date().toISOString().replaceAll(":", "-")}`),
  );
  await mkdir(path.dirname(output), { recursive: true });

  if (env.DATABASE_PROVIDER === "sqlite") {
    await backupSqlite(output);
  } else {
    await backupPostgres(output);
  }
  console.log(`Database backup written to ${output}`);
}

async function backupSqlite(output: string): Promise<void> {
  const database = new Database(resolveSqliteFilename(env.DATABASE_URL));
  try {
    database.pragma("wal_checkpoint(TRUNCATE)");
    await database.backup(output);
  } finally {
    database.close();
  }
}

async function backupPostgres(output: string): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn("pg_dump", ["--format=custom", "--file", output, env.DATABASE_URL], {
      stdio: "inherit",
      windowsHide: true,
    });
    child.once("error", reject);
    child.once("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`pg_dump exited with code ${code ?? "unknown"}.`));
    });
  });
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
