import Database from "better-sqlite3";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { DatabaseHandle } from "@/infrastructure/database/client";
import { runSeed } from "@/infrastructure/database/seed";
import { SqlExerciseRepository } from "@/infrastructure/database/repositories/exercise-repository";
import {
  getLearnerQuestion,
  startExerciseAttempt,
  submitQuestionAnswer,
} from "@/features/exercises/service";

describe("exercise repository and learner flow", () => {
  it("loads reusable published questions, hides answer keys for learners, and stores attempts", async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), "mathios-exercise-"));
    const databaseUrl = "file:" + path.join(directory, "exercise.db");
    let raw: Database.Database | undefined;
    try {
      await runSeed({ provider: "sqlite", databaseUrl });
      raw = new Database(path.join(directory, "exercise.db"));
      raw.pragma("foreign_keys = ON");
      raw
        .prepare("INSERT INTO users (id, identifier) VALUES (?, ?)")
        .run("user-exercise", "exercise-user");
      raw
        .prepare("INSERT INTO profiles (id, user_id, display_name) VALUES (?, ?, ?)")
        .run("profile-exercise", "user-exercise", "Exercise learner");
      const handle = {
        provider: "sqlite",
        raw,
        db: undefined as never,
      } as unknown as DatabaseHandle;
      const repository = new SqlExerciseRepository(handle);
      const questions = await repository.listQuestions();
      expect(questions).toHaveLength(8);
      const authorDetail = await repository.getQuestion("question-force-unit", {
        includeDraft: true,
      });
      expect(authorDetail?.version.answerSpec.unit).toBe("N");
      const learnerDetail = await getLearnerQuestion("question-force-unit", repository);
      expect(learnerDetail.version.answerSpec).toEqual({});
      expect(learnerDetail.version.fullSolution).toBe("");
      expect(learnerDetail.template?.answerExpression).toBe("");
      expect(learnerDetail.template?.validationSpec).toEqual({});
      const set = await repository.getExerciseSet("exercise-set-motion-practice");
      expect(set?.questions).toHaveLength(6);
      const attempt = await startExerciseAttempt(
        { exerciseSetId: "exercise-set-motion-practice", profileId: "profile-exercise", seed: 42 },
        repository,
      );
      const submitted = await submitQuestionAnswer(
        {
          attemptId: attempt.id,
          profileId: "profile-exercise",
          questionId: "question-force-unit",
          response: "12 N",
        },
        repository,
      );
      expect(submitted.result.status).toBe("correct");
      expect(await repository.listQuestionAttempts(attempt.id)).toHaveLength(1);
    } finally {
      raw?.close();
      await rm(directory, { recursive: true, force: true });
    }
  });
});
