import Database from "better-sqlite3";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { DatabaseHandle } from "@/infrastructure/database/client";
import { runSeed } from "@/infrastructure/database/seed";
import { SqlAssessmentRepository } from "@/infrastructure/database/repositories/assessment-repository";
import { SqlExerciseRepository } from "@/infrastructure/database/repositories/exercise-repository";
import {
  completeAssessmentAttempt,
  startAssessmentAttempt,
  submitAssessmentAnswer,
} from "@/features/assessments/service";

describe("assessment repository and learner flow", () => {
  it("selects configured questions, hides answer keys, and persists scored results", async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), "mathios-assessment-"));
    const databaseUrl = `file:${path.join(directory, "assessment.db")}`;
    let raw: Database.Database | undefined;
    try {
      await runSeed({ provider: "sqlite", databaseUrl });
      raw = new Database(path.join(directory, "assessment.db"));
      raw.pragma("foreign_keys = ON");
      raw
        .prepare("INSERT INTO users (id, identifier) VALUES (?, ?)")
        .run("user-assessment", "assessment-user");
      raw
        .prepare("INSERT INTO profiles (id, user_id, display_name) VALUES (?, ?, ?)")
        .run("profile-assessment", "user-assessment", "Assessment learner");
      const handle = {
        provider: "sqlite",
        raw,
        db: undefined as never,
      } as unknown as DatabaseHandle;
      const repository = new SqlAssessmentRepository(handle);
      const exerciseRepository = new SqlExerciseRepository(handle);
      const detail = await repository.getAssessment("assessment-motion-quiz");
      expect(detail?.questions).toHaveLength(4);

      const attempt = await startAssessmentAttempt(
        { assessmentId: "assessment-motion-quiz", profileId: "profile-assessment", seed: 42 },
        repository,
        exerciseRepository,
      );
      expect(
        attempt.questionInstances[0]?.options.every((option) => !("isCorrect" in option)),
      ).toBe(true);
      expect(attempt.questionOrder).toEqual([
        "question-velocity-direction",
        "question-acceleration-numeric",
        "question-force-unit",
        "question-linear-equation-expression",
      ]);
      const first = await submitAssessmentAnswer(
        {
          attemptId: attempt.id,
          profileId: "profile-assessment",
          questionId: attempt.questionOrder[0]!,
          response: "b",
        },
        repository,
        exerciseRepository,
      );
      expect(first.result.feedback).toBe("Answer saved.");
      expect(first.result.status).toBe("needs-review");

      const result = await completeAssessmentAttempt(
        { attemptId: attempt.id, profileId: "profile-assessment" },
        repository,
      );
      expect(result.attempt.status).toBe("completed");
      expect(result.attempt.score).toBe(1);
      expect(result.sections).toHaveLength(1);
      expect(result.questionAttempts).toHaveLength(1);
      expect(result.questionAttempts[0]?.validationResult).toMatchObject({ status: "correct" });
      expect(result.timeSpentSeconds).toBeGreaterThanOrEqual(0);
      expect(result.averageResponseTimeSeconds).not.toBeNull();
      expect(
        await repository.getLatestAttempt("assessment-motion-quiz", "profile-assessment"),
      ).toMatchObject({
        id: attempt.id,
        status: "completed",
      });

      const diagnosticAttempt = await startAssessmentAttempt(
        { assessmentId: "assessment-motion-diagnostic", profileId: "profile-assessment", seed: 7 },
        repository,
        exerciseRepository,
      );
      await submitAssessmentAnswer(
        {
          attemptId: diagnosticAttempt.id,
          profileId: "profile-assessment",
          questionId: diagnosticAttempt.questionOrder[0]!,
          response: "",
        },
        repository,
        exerciseRepository,
      );
      const diagnosticResult = await completeAssessmentAttempt(
        { attemptId: diagnosticAttempt.id, profileId: "profile-assessment" },
        repository,
      );
      expect(diagnosticResult.diagnostic).toMatchObject({
        readinessLabel: "Foundational review",
        weakConceptIds: expect.arrayContaining(["concept-velocity"]),
      });
    } finally {
      raw?.close();
      await rm(directory, { recursive: true, force: true });
    }
  });
});
