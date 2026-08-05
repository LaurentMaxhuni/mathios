import Database from "better-sqlite3";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { DatabaseHandle } from "@/infrastructure/database/client";
import { runSeed } from "@/infrastructure/database/seed";
import { SqlMasteryRepository } from "@/infrastructure/database/repositories/mastery-repository";
import { recordMasteryEvidence, refreshRecommendations } from "@/features/mastery/service";

describe("mastery repository and evidence flow", () => {
  it("upserts evidence, preserves snapshots, explains prerequisites, and dismisses recommendations", async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), "mathios-mastery-"));
    const databaseUrl = `file:${path.join(directory, "mastery.db")}`;
    let raw: Database.Database | undefined;
    try {
      await runSeed({ provider: "sqlite", databaseUrl });
      raw = new Database(path.join(directory, "mastery.db"));
      raw.pragma("foreign_keys = ON");
      raw
        .prepare("INSERT INTO users (id, identifier) VALUES (?, ?)")
        .run("user-mastery", "mastery-user");
      raw
        .prepare(
          "INSERT INTO profiles (id, user_id, display_name, current_grade, target_grade) VALUES (?, ?, ?, ?, ?)",
        )
        .run("profile-mastery", "user-mastery", "Mastery learner", "grade-7", "grade-8");
      const handle = {
        provider: "sqlite",
        raw,
        db: undefined as never,
      } as unknown as DatabaseHandle;
      const repository = new SqlMasteryRepository(handle);

      const first = await recordMasteryEvidence(
        {
          profileId: "profile-mastery",
          conceptId: "concept-velocity",
          eventType: "exercise",
          sourceId: "exercise-easy",
          score: 1,
          difficulty: "gentle",
          occurredAt: "2026-08-01T00:00:00.000Z",
        },
        repository,
      );
      expect(first.evidenceCount).toBe(1);
      expect(first.state).not.toBe("mastered");
      expect(first.confidence).toBeLessThan(1);

      await recordMasteryEvidence(
        {
          profileId: "profile-mastery",
          conceptId: "concept-position",
          eventType: "lesson-completion",
          sourceId: "lesson-motion",
          score: 1,
          difficulty: "gentle",
          occurredAt: "2026-08-02T00:00:00.000Z",
        },
        repository,
      );
      await recordMasteryEvidence(
        {
          profileId: "profile-mastery",
          conceptId: "concept-velocity",
          eventType: "exercise",
          sourceId: "exercise-balanced",
          score: 0.9,
          difficulty: "balanced",
          occurredAt: "2026-08-03T00:00:00.000Z",
        },
        repository,
      );
      const current = await recordMasteryEvidence(
        {
          profileId: "profile-mastery",
          conceptId: "concept-velocity",
          eventType: "assessment",
          sourceId: "assessment-motion",
          score: 0.9,
          difficulty: "challenging",
          metadata: { passed: true },
          occurredAt: "2026-08-04T00:00:00.000Z",
        },
        repository,
      );
      expect(current.evidenceTypeCount).toBe(2);
      expect(current.breakdown.weakPrerequisiteIds).toContain("concept-position");

      const detail = await repository.getMasteryDetail("profile-mastery", "concept-velocity");
      expect(detail?.events).toHaveLength(3);
      expect(detail?.snapshots.length).toBeGreaterThanOrEqual(3);
      expect(detail?.prerequisites.map((item) => item.id)).toContain("concept-position");

      const recommendations = await refreshRecommendations("profile-mastery", repository);
      const prerequisiteRecommendation = recommendations.find(
        (item) => item.kind === "missing-prerequisite",
      );
      expect(prerequisiteRecommendation?.reason).toContain("required before");
      expect(recommendations.some((item) => item.kind === "grade-requirement")).toBe(true);

      await repository.dismissRecommendation(
        "profile-mastery",
        prerequisiteRecommendation!.id,
        "I want to practice this later.",
      );
      expect(
        (await repository.listRecommendations("profile-mastery")).some(
          (item) => item.id === prerequisiteRecommendation!.id,
        ),
      ).toBe(false);
      expect(
        (await repository.listRecommendations("profile-mastery", { includeDismissed: true })).find(
          (item) => item.id === prerequisiteRecommendation!.id,
        ),
      ).toMatchObject({ status: "dismissed" });
      expect(
        raw
          .prepare("SELECT reason FROM recommendation_dismissals WHERE recommendation_id = ?")
          .get(prerequisiteRecommendation!.id),
      ).toEqual({ reason: "I want to practice this later." });
    } finally {
      raw?.close();
      await rm(directory, { recursive: true, force: true });
    }
  });
});
