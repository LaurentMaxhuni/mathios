import Database from "better-sqlite3";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { runMigrations } from "@/infrastructure/database/migrations";

describe("database migrations", () => {
  it("applies SQLite migrations once and records the result", async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), "mathios-db-"));
    const databaseUrl = `file:${path.join(directory, "test.db")}`;
    let database: Database.Database | undefined;

    try {
      const first = await runMigrations({ provider: "sqlite", databaseUrl });
      const second = await runMigrations({ provider: "sqlite", databaseUrl });
      database = new Database(path.join(directory, "test.db"));

      expect(first.applied).toEqual([
        "0000_foundation.sql",
        "0001_phase1_identity.sql",
        "0002_phase2_curriculum_structure.sql",
        "0003_phase3_courses_lessons.sql",
        "0004_phase4_concepts_knowledge_graph.sql",
        "0005_phase5_exercises_questions.sql",
        "0006_phase6_assessments.sql",
        "0007_phase7_mastery_recommendations.sql",
        "0008_phase8_roadmaps_paths.sql",
        "0009_phase9_simulations.sql",
      ]);
      expect(second.applied).toEqual([]);
      expect(second.skipped).toEqual([
        "0000_foundation.sql",
        "0001_phase1_identity.sql",
        "0002_phase2_curriculum_structure.sql",
        "0003_phase3_courses_lessons.sql",
        "0004_phase4_concepts_knowledge_graph.sql",
        "0005_phase5_exercises_questions.sql",
        "0006_phase6_assessments.sql",
        "0007_phase7_mastery_recommendations.sql",
        "0008_phase8_roadmaps_paths.sql",
        "0009_phase9_simulations.sql",
      ]);
      expect(database.prepare("SELECT key FROM app_metadata").all()).toEqual([]);
      expect(
        database
          .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'profiles'")
          .get(),
      ).toEqual({ name: "profiles" });
      expect(
        database
          .prepare(
            "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'grade_subject_domains'",
          )
          .get(),
      ).toEqual({ name: "grade_subject_domains" });
      expect(
        database
          .prepare(
            "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'lesson_versions'",
          )
          .get(),
      ).toEqual({ name: "lesson_versions" });
      expect(
        database
          .prepare(
            "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'concept_relationships'",
          )
          .get(),
      ).toEqual({ name: "concept_relationships" });
      expect(
        database
          .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'questions'")
          .get(),
      ).toEqual({ name: "questions" });
      for (const name of [
        "assessments",
        "assessment_sections",
        "assessment_questions",
        "assessment_pools",
        "assessment_attempts",
        "assessment_section_results",
        "diagnostic_results",
        "placement_results",
        "user_concept_mastery",
        "mastery_events",
        "mastery_snapshots",
        "mastery_rules",
        "recommendation_rules",
        "recommendations",
        "recommendation_dismissals",
        "roadmaps",
        "roadmap_versions",
        "roadmap_nodes",
        "roadmap_edges",
        "roadmap_prerequisites",
        "roadmap_subjects",
        "user_roadmaps",
        "user_roadmap_progress",
        "personalized_paths",
        "simulations",
        "simulation_versions",
        "simulation_inputs",
        "simulation_presets",
        "lesson_simulations",
        "user_simulation_sessions",
        "simulation_results",
      ]) {
        expect(
          database
            .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?")
            .get(name),
        ).toEqual({ name });
      }
      expect(database.prepare("PRAGMA table_info(question_attempts)").all()).toEqual(
        expect.arrayContaining([expect.objectContaining({ name: "assessment_attempt_id" })]),
      );
    } finally {
      database?.close();
      await rm(directory, { recursive: true, force: true });
    }
  });
});
