import Database from "better-sqlite3";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { runSeed } from "@/infrastructure/database/seed";

describe("Phase 6 seed data", () => {
  it("installs the assessment catalog and reusable curriculum structure and is safe to re-run", async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), "mathios-seed-"));
    const databaseUrl = `file:${path.join(directory, "seed.db")}`;
    let database: Database.Database | undefined;
    try {
      await runSeed({ provider: "sqlite", databaseUrl });
      await runSeed({ provider: "sqlite", databaseUrl });
      database = new Database(path.join(directory, "seed.db"));
      expect(database.prepare("SELECT COUNT(*) AS count FROM curricula").get()).toEqual({
        count: 3,
      });
      expect(database.prepare("SELECT COUNT(*) AS count FROM grades").get()).toEqual({ count: 10 });
      expect(database.prepare("SELECT COUNT(*) AS count FROM subjects").get()).toEqual({
        count: 5,
      });
      expect(database.prepare("SELECT COUNT(*) AS count FROM domains").get()).toEqual({
        count: 25,
      });
      expect(database.prepare("SELECT COUNT(*) AS count FROM learning_objectives").get()).toEqual({
        count: 78,
      });
      expect(
        database
          .prepare(
            "SELECT is_required, is_available FROM curriculum_subjects WHERE curriculum_id = 'curriculum-kosovo' AND subject_id = 'subject-mathematics'",
          )
          .get(),
      ).toEqual({ is_required: 1, is_available: 1 });
      expect(
        database
          .prepare(
            "SELECT depth FROM grade_subject_domains WHERE curriculum_id = 'curriculum-kosovo' AND grade_id = 'grade-6' AND subject_id = 'subject-mathematics' AND domain_id = 'domain-arithmetic'",
          )
          .get(),
      ).toEqual({ depth: 1 });
      expect(database.prepare("SELECT COUNT(*) AS count FROM courses").get()).toEqual({ count: 2 });
      expect(database.prepare("SELECT COUNT(*) AS count FROM modules").get()).toEqual({ count: 2 });
      expect(database.prepare("SELECT COUNT(*) AS count FROM lessons").get()).toEqual({ count: 3 });
      expect(database.prepare("SELECT COUNT(*) AS count FROM lesson_blocks").get()).toEqual({
        count: 10,
      });
      expect(database.prepare("SELECT COUNT(*) AS count FROM lesson_versions").get()).toEqual({
        count: 5,
      });
      expect(database.prepare("SELECT COUNT(*) AS count FROM concepts").get()).toEqual({
        count: 9,
      });
      expect(database.prepare("SELECT COUNT(*) AS count FROM concept_relationships").get()).toEqual(
        {
          count: 8,
        },
      );
      expect(database.prepare("SELECT COUNT(*) AS count FROM lesson_concepts").get()).toEqual({
        count: 5,
      });
      expect(database.prepare("SELECT COUNT(*) AS count FROM concept_applications").get()).toEqual({
        count: 4,
      });
      expect(
        database.prepare("SELECT COUNT(*) AS count FROM concept_misconceptions").get(),
      ).toEqual({
        count: 3,
      });
      expect(database.prepare("SELECT COUNT(*) AS count FROM questions").get()).toEqual({
        count: 8,
      });
      expect(database.prepare("SELECT COUNT(*) AS count FROM question_versions").get()).toEqual({
        count: 8,
      });
      expect(database.prepare("SELECT COUNT(*) AS count FROM question_options").get()).toEqual({
        count: 8,
      });
      expect(database.prepare("SELECT COUNT(*) AS count FROM exercise_sets").get()).toEqual({
        count: 1,
      });
      expect(
        database.prepare("SELECT COUNT(*) AS count FROM exercise_set_questions").get(),
      ).toEqual({
        count: 6,
      });
      expect(database.prepare("SELECT COUNT(*) AS count FROM question_templates").get()).toEqual({
        count: 1,
      });
      expect(database.prepare("SELECT COUNT(*) AS count FROM assessments").get()).toEqual({
        count: 3,
      });
      expect(database.prepare("SELECT COUNT(*) AS count FROM assessment_sections").get()).toEqual({
        count: 3,
      });
      expect(database.prepare("SELECT COUNT(*) AS count FROM assessment_pools").get()).toEqual({
        count: 1,
      });
      expect(database.prepare("SELECT COUNT(*) AS count FROM assessment_questions").get()).toEqual({
        count: 12,
      });
      expect(
        database.prepare("SELECT value FROM app_metadata WHERE key = 'seed_version'").get(),
      ).toEqual({ value: "phase-6" });
    } finally {
      database?.close();
      await rm(directory, { recursive: true, force: true });
    }
  });
});
