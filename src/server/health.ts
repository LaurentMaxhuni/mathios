import { getDatabase } from "@/infrastructure/database/client";
import { logger } from "@/lib/logger";

export interface HealthReport {
  status: "ok" | "degraded";
  timestamp: string;
  checks: {
    database: "ok" | "error";
  };
  latencyMs: number;
}

export async function getHealthReport(): Promise<HealthReport> {
  const startedAt = performance.now();

  try {
    const database = getDatabase();
    if (database.provider === "sqlite") {
      database.raw.prepare("SELECT 1").get();
    } else {
      await database.raw`SELECT 1`;
    }

    return {
      status: "ok",
      timestamp: new Date().toISOString(),
      checks: { database: "ok" },
      latencyMs: Math.round(performance.now() - startedAt),
    };
  } catch (error) {
    logger.error("Health check failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return {
      status: "degraded",
      timestamp: new Date().toISOString(),
      checks: { database: "error" },
      latencyMs: Math.round(performance.now() - startedAt),
    };
  }
}
