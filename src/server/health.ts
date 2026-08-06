import { getDatabase } from "@/infrastructure/database/client";
import { getStorage } from "@/infrastructure/storage";
import type { HealthCheckableStorage, StorageHealth } from "@/infrastructure/storage/storage";
import { getErrorTracker } from "@/infrastructure/observability/error-tracker";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";

export const LATEST_MIGRATION = "0018_phase18_deployment_hardening.sql";

export interface HealthReport {
  status: "ok" | "degraded";
  timestamp: string;
  checks: {
    database: "ok" | "error";
  };
  latencyMs: number;
}

export interface ReadinessReport {
  status: "ready" | "not_ready";
  timestamp: string;
  checks: {
    database: "ok" | "error";
    migrations: "ok" | "error";
    storage: "ok" | "error";
    configuration: "ok" | "error";
  };
  details: {
    databaseProvider: "sqlite" | "postgres";
    storageProvider: "local" | "s3";
    latestMigration: string | null;
  };
  latencyMs: number;
}

export async function getHealthReport(): Promise<HealthReport> {
  const startedAt = performance.now();

  try {
    await pingDatabase();
    return {
      status: "ok",
      timestamp: new Date().toISOString(),
      checks: { database: "ok" },
      latencyMs: Math.round(performance.now() - startedAt),
    };
  } catch (error) {
    logHealthFailure("Health check failed", error);
    return {
      status: "degraded",
      timestamp: new Date().toISOString(),
      checks: { database: "error" },
      latencyMs: Math.round(performance.now() - startedAt),
    };
  }
}

export async function getReadinessReport(): Promise<ReadinessReport> {
  const startedAt = performance.now();
  let database: ReturnType<typeof getDatabase> | undefined;
  let databaseStatus: "ok" | "error" = "ok";
  let migrationStatus: "ok" | "error" = "ok";
  let storageStatus: "ok" | "error" = "ok";
  let configurationStatus: "ok" | "error" = "ok";
  let latestMigration: string | null = null;

  try {
    database = getDatabase();
    await pingDatabase(database);
  } catch (error) {
    databaseStatus = "error";
    logHealthFailure("Readiness database check failed", error);
  }

  try {
    if (!database) throw new Error("Database handle is unavailable.");
    latestMigration = await readLatestMigration(database);
    migrationStatus = latestMigration === LATEST_MIGRATION ? "ok" : "error";
  } catch (error) {
    migrationStatus = "error";
    logHealthFailure("Readiness migration check failed", error);
  }

  try {
    const storage = getStorage();
    const health = isHealthCheckable(storage)
      ? await storage.checkHealth()
      : ({ provider: env.STORAGE_PROVIDER, status: "ok" } satisfies StorageHealth);
    storageStatus = health.status;
    if (health.status === "error") logger.error("Storage readiness check failed", { ...health });
  } catch (error) {
    storageStatus = "error";
    logHealthFailure("Readiness storage check failed", error);
  }

  try {
    validateRuntimeConfiguration();
  } catch (error) {
    configurationStatus = "error";
    logHealthFailure("Readiness configuration check failed", error);
  }

  const ready =
    databaseStatus === "ok" &&
    migrationStatus === "ok" &&
    storageStatus === "ok" &&
    configurationStatus === "ok";
  return {
    status: ready ? "ready" : "not_ready",
    timestamp: new Date().toISOString(),
    checks: {
      database: databaseStatus,
      migrations: migrationStatus,
      storage: storageStatus,
      configuration: configurationStatus,
    },
    details: {
      databaseProvider: database?.provider ?? env.DATABASE_PROVIDER,
      storageProvider: env.STORAGE_PROVIDER,
      latestMigration,
    },
    latencyMs: Math.round(performance.now() - startedAt),
  };
}

async function pingDatabase(database = getDatabase()): Promise<void> {
  if (database.provider === "sqlite") {
    database.raw.prepare("SELECT 1").get();
  } else {
    await database.raw`SELECT 1`;
  }
}

async function readLatestMigration(
  database: ReturnType<typeof getDatabase>,
): Promise<string | null> {
  if (database.provider === "sqlite") {
    const row = database.raw
      .prepare("SELECT name FROM _mathios_migrations ORDER BY name DESC LIMIT 1")
      .get() as { name: string } | undefined;
    return row?.name ?? null;
  }
  const rows = await database.raw<{ name: string }[]>`
    SELECT name FROM _mathios_migrations ORDER BY name DESC LIMIT 1
  `;
  return rows[0]?.name ?? null;
}

function validateRuntimeConfiguration(): void {
  if (env.APP_ENV === "hosted-production") {
    if (env.DATABASE_PROVIDER !== "postgres" || env.STORAGE_PROVIDER !== "s3") {
      throw new Error("Hosted production requires PostgreSQL and S3-compatible storage.");
    }
  }
  if (env.STORAGE_PROVIDER === "s3" && !env.S3_BUCKET) {
    throw new Error("S3_BUCKET is not configured.");
  }
}

function isHealthCheckable(value: unknown): value is HealthCheckableStorage {
  return typeof (value as Partial<HealthCheckableStorage>).checkHealth === "function";
}

function logHealthFailure(message: string, error: unknown): void {
  const context = { error: error instanceof Error ? error.message : String(error) };
  logger.error(message, context);
  getErrorTracker().captureException(error, { route: "/api/health" });
}
