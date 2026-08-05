import Database from "better-sqlite3";
import postgres from "postgres";
import { env } from "@/lib/env";
import { resolveSqliteFilename } from "@/infrastructure/database/client";
import { runMigrations } from "@/infrastructure/database/migrations";

const foundationSeed = [
  ["installation_name", "Mathios local installation"],
  ["seed_version", "phase-0"],
] as const;

export async function runSeed(
  options: { provider?: "sqlite" | "postgres"; databaseUrl?: string } = {},
): Promise<void> {
  const provider = options.provider ?? env.DATABASE_PROVIDER;
  const databaseUrl = options.databaseUrl ?? env.DATABASE_URL;
  await runMigrations({ provider, databaseUrl });

  if (provider === "sqlite") {
    const database = new Database(resolveSqliteFilename(databaseUrl));
    try {
      const statement = database.prepare(`
        INSERT INTO app_metadata (key, value, updated_at)
        VALUES (@key, @value, CURRENT_TIMESTAMP)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
      `);
      const insert = database.transaction(() => {
        for (const [key, value] of foundationSeed) statement.run({ key, value });
      });
      insert();
    } finally {
      database.close();
    }
    return;
  }

  const database = postgres(databaseUrl, { max: 1, connect_timeout: 10 });
  try {
    await database.begin(async (transaction) => {
      for (const [key, value] of foundationSeed) {
        await transaction`
          INSERT INTO app_metadata (key, value, updated_at)
          VALUES (${key}, ${value}, NOW())
          ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
        `;
      }
    });
  } finally {
    await database.end({ timeout: 5 });
  }
}
