import Database from "better-sqlite3";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { DatabaseHandle } from "@/infrastructure/database/client";
import { runSeed } from "@/infrastructure/database/seed";
import { SqlAnalyticsRepository } from "@/infrastructure/database/repositories/analytics-repository";
import { getLearnerDashboard } from "@/features/analytics/service";

describe("analytics repository", () => {
  it("keeps activity and derived analytics profile-scoped and idempotent", async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), "mathios-analytics-"));
    const databaseUrl = `file:${path.join(directory, "analytics.db")}`;
    let raw: Database.Database | undefined;
    try {
      await runSeed({ provider: "sqlite", databaseUrl });
      raw = new Database(path.join(directory, "analytics.db"));
      raw.pragma("foreign_keys = ON");
      raw
        .prepare("INSERT INTO users (id, identifier) VALUES (?, ?)")
        .run("user-analytics", "analytics-user");
      raw
        .prepare(
          "INSERT INTO profiles (id, user_id, display_name, current_grade) VALUES (?, ?, ?, ?)",
        )
        .run("profile-analytics", "user-analytics", "Analytics learner", "grade-8");
      raw.close();
      raw = undefined;

      await runSeed({ provider: "sqlite", databaseUrl });
      raw = new Database(path.join(directory, "analytics.db"));
      raw.pragma("foreign_keys = ON");
      const handle = {
        provider: "sqlite",
        raw,
        db: undefined as never,
      } as unknown as DatabaseHandle;
      const repository = new SqlAnalyticsRepository(handle);
      const range = { from: "2020-01-01", to: "2099-12-31" };
      const source = await repository.getLearnerSource("profile-analytics", range);
      expect(source?.profile.displayName).toBe("Analytics learner");
      expect(source?.events.length).toBeGreaterThanOrEqual(8);
      expect(source?.learningSessions).toHaveLength(1);
      expect(source?.currentLesson?.lessonId).toBeTruthy();

      const event = await repository.recordActivityEvent({
        id: "analytics-event-test",
        profileId: "profile-analytics",
        eventType: "lesson-view",
        resourceType: "lesson",
        resourceId: "lesson-describing-motion",
        dedupeKey: "analytics-test-view",
      });
      const duplicate = await repository.recordActivityEvent({
        ...event,
        id: "analytics-event-test-duplicate",
      });
      expect(duplicate.id).toBe(event.id);
      expect(
        (
          raw
            .prepare("SELECT COUNT(*) AS count FROM activity_events WHERE profile_id = ?")
            .get("profile-analytics") as { count: number }
        ).count,
      ).toBeGreaterThanOrEqual(9);

      const dashboard = await getLearnerDashboard("profile-analytics", repository, "2099-12-31");
      expect(dashboard.analytics.summary.questionsAttempted).toBe(0);
      expect(dashboard.weeklyStudyProgress.targetMinutes).toBe(180);
      expect(
        (
          raw
            .prepare("SELECT COUNT(*) AS count FROM learner_metrics WHERE profile_id = ?")
            .get("profile-analytics") as { count: number }
        ).count,
      ).toBeGreaterThan(0);
    } finally {
      raw?.close();
      await rm(directory, { recursive: true, force: true });
    }
  });
});
