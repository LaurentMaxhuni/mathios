import Database from "better-sqlite3";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { phase20TopicSeed } from "@/infrastructure/database/phase20-content";
import {
  assessmentQuestionSeed,
  assessmentSectionSeed,
  assessmentSeed,
  blockSeed,
  conceptApplicationSeed,
  conceptLessonSeed,
  conceptMisconceptionSeed,
  conceptRelationshipSeed,
  conceptSeed,
  coursePrerequisiteSeed,
  courseSeed,
  domainSeed,
  exerciseSetQuestionSeed,
  exerciseSetSeed,
  lessonSeed,
  lessonVersionSeed,
  learningObjectiveSeed,
  moduleSeed,
  questionSeed,
  questionTemplateSeed,
  roadmapEdgeSeed,
  roadmapNodeSeed,
  roadmapPrerequisiteSeed,
  roadmapSeed,
  roadmapSubjectSeed,
  roadmapVersionSeed,
  runSeed,
} from "@/infrastructure/database/seed";

describe("Phase 20 seed data", () => {
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
        count: domainSeed.length,
      });
      expect(database.prepare("SELECT COUNT(*) AS count FROM learning_objectives").get()).toEqual({
        count: learningObjectiveSeed.length,
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
      expect(database.prepare("SELECT COUNT(*) AS count FROM courses").get()).toEqual({
        count: courseSeed.length,
      });
      expect(database.prepare("SELECT COUNT(*) AS count FROM modules").get()).toEqual({
        count: moduleSeed.length,
      });
      expect(database.prepare("SELECT COUNT(*) AS count FROM lessons").get()).toEqual({
        count: lessonSeed.length,
      });
      expect(database.prepare("SELECT COUNT(*) AS count FROM lesson_blocks").get()).toEqual({
        count: blockSeed.length,
      });
      expect(database.prepare("SELECT COUNT(*) AS count FROM lesson_versions").get()).toEqual({
        count: lessonVersionSeed.length,
      });
      expect(database.prepare("SELECT COUNT(*) AS count FROM concepts").get()).toEqual({
        count: conceptSeed.length,
      });
      expect(database.prepare("SELECT COUNT(*) AS count FROM concept_relationships").get()).toEqual(
        {
          count: conceptRelationshipSeed.length,
        },
      );
      expect(database.prepare("SELECT COUNT(*) AS count FROM lesson_concepts").get()).toEqual({
        count: conceptLessonSeed.length,
      });
      expect(database.prepare("SELECT COUNT(*) AS count FROM concept_applications").get()).toEqual({
        count: conceptApplicationSeed.length,
      });
      expect(
        database.prepare("SELECT COUNT(*) AS count FROM concept_misconceptions").get(),
      ).toEqual({
        count: conceptMisconceptionSeed.length,
      });
      expect(database.prepare("SELECT COUNT(*) AS count FROM questions").get()).toEqual({
        count: questionSeed.length,
      });
      expect(database.prepare("SELECT COUNT(*) AS count FROM question_versions").get()).toEqual({
        count: questionSeed.length,
      });
      expect(database.prepare("SELECT COUNT(*) AS count FROM question_options").get()).toEqual({
        count: questionSeed.reduce((total, question) => total + question.options.length, 0),
      });
      expect(database.prepare("SELECT COUNT(*) AS count FROM exercise_sets").get()).toEqual({
        count: exerciseSetSeed.length,
      });
      expect(
        database.prepare("SELECT COUNT(*) AS count FROM exercise_set_questions").get(),
      ).toEqual({
        count: exerciseSetQuestionSeed.length,
      });
      expect(database.prepare("SELECT COUNT(*) AS count FROM question_templates").get()).toEqual({
        count: questionTemplateSeed.length,
      });
      expect(database.prepare("SELECT COUNT(*) AS count FROM assessments").get()).toEqual({
        count: assessmentSeed.length,
      });
      expect(database.prepare("SELECT COUNT(*) AS count FROM assessment_sections").get()).toEqual({
        count: assessmentSectionSeed.length,
      });
      expect(database.prepare("SELECT COUNT(*) AS count FROM assessment_pools").get()).toEqual({
        count: 1,
      });
      expect(database.prepare("SELECT COUNT(*) AS count FROM assessment_questions").get()).toEqual({
        count: assessmentQuestionSeed.length,
      });
      expect(database.prepare("SELECT COUNT(*) AS count FROM roadmaps").get()).toEqual({
        count: roadmapSeed.length,
      });
      expect(database.prepare("SELECT COUNT(*) AS count FROM roadmap_versions").get()).toEqual({
        count: roadmapVersionSeed.length,
      });
      expect(database.prepare("SELECT COUNT(*) AS count FROM roadmap_nodes").get()).toEqual({
        count: roadmapNodeSeed.length,
      });
      expect(database.prepare("SELECT COUNT(*) AS count FROM roadmap_edges").get()).toEqual({
        count: roadmapEdgeSeed.length,
      });
      expect(database.prepare("SELECT COUNT(*) AS count FROM roadmap_subjects").get()).toEqual({
        count: roadmapSubjectSeed.length,
      });
      expect(database.prepare("SELECT COUNT(*) AS count FROM roadmap_prerequisites").get()).toEqual(
        { count: roadmapPrerequisiteSeed.length },
      );
      expect(database.prepare("SELECT COUNT(*) AS count FROM mastery_rules").get()).toEqual({
        count: 1,
      });
      expect(database.prepare("SELECT COUNT(*) AS count FROM recommendation_rules").get()).toEqual({
        count: 1,
      });
      expect(database.prepare("SELECT COUNT(*) AS count FROM laboratory_activities").get()).toEqual(
        {
          count: 7,
        },
      );
      expect(database.prepare("SELECT COUNT(*) AS count FROM laboratory_steps").get()).toEqual({
        count: 28,
      });
      expect(database.prepare("SELECT COUNT(*) AS count FROM laboratory_variables").get()).toEqual({
        count: 28,
      });
      expect(
        database
          .prepare(
            "SELECT mode, status FROM laboratory_activities WHERE slug = 'determine-acceleration-from-motion-data'",
          )
          .get(),
      ).toEqual({ mode: "hybrid", status: "published" });
      expect(
        database.prepare("SELECT configuration FROM mastery_rules WHERE slug = 'default'").get(),
      ).toEqual({
        configuration: expect.stringContaining('"minimumEvidenceForMastery"'),
      });
      expect(
        database.prepare("SELECT value FROM app_metadata WHERE key = 'seed_version'").get(),
      ).toEqual({ value: "phase-20" });
      expect(
        database
          .prepare("SELECT COUNT(*) AS count FROM courses WHERE id LIKE 'course-phase20-%'")
          .get(),
      ).toEqual({ count: phase20TopicSeed.length });
      expect(
        database
          .prepare("SELECT COUNT(*) AS count FROM concepts WHERE id LIKE 'concept-phase20-%'")
          .get(),
      ).toEqual({ count: phase20TopicSeed.length });
      expect(
        database
          .prepare("SELECT COUNT(*) AS count FROM questions WHERE id LIKE 'question-phase20-%'")
          .get(),
      ).toEqual({ count: phase20TopicSeed.length });
      expect(
        database
          .prepare(
            "SELECT COUNT(*) AS count FROM exercise_sets WHERE id LIKE 'exercise-set-phase20-%'",
          )
          .get(),
      ).toEqual({ count: phase20TopicSeed.length });
      expect(
        database
          .prepare("SELECT COUNT(*) AS count FROM assessments WHERE id LIKE 'assessment-phase20-%'")
          .get(),
      ).toEqual({ count: phase20TopicSeed.length });
      expect(
        database
          .prepare(
            "SELECT COUNT(*) AS count FROM lesson_blocks WHERE id LIKE 'block-phase20-%-formula'",
          )
          .get(),
      ).toEqual({ count: phase20TopicSeed.length });
      expect(
        database
          .prepare(
            "SELECT COUNT(*) AS count FROM lesson_blocks WHERE id LIKE 'block-phase20-%-diagram'",
          )
          .get(),
      ).toEqual({ count: phase20TopicSeed.length });
      expect(database.prepare("SELECT COUNT(*) AS count FROM course_prerequisites").get()).toEqual({
        count: coursePrerequisiteSeed.length,
      });
      expect(
        database
          .prepare(
            "SELECT COUNT(*) AS count FROM roadmap_nodes JOIN roadmap_versions ON roadmap_versions.id = roadmap_nodes.roadmap_version_id WHERE roadmap_versions.roadmap_id = 'roadmap-phase20-scientific-content'",
          )
          .get(),
      ).toEqual({ count: phase20TopicSeed.length });
      const gradeCoverage = database
        .prepare(
          "SELECT g.id, COUNT(DISTINCT cg.course_id) AS count FROM grades g LEFT JOIN course_grades cg ON cg.grade_id = g.id AND cg.course_id LIKE 'course-phase20-%' GROUP BY g.id",
        )
        .all() as Array<{ id: string; count: number }>;
      expect(gradeCoverage.every((grade) => grade.count > 0)).toBe(true);
      expect(database.prepare("SELECT COUNT(*) AS count FROM learning_sessions").get()).toEqual({
        count: 0,
      });
      expect(database.prepare("SELECT COUNT(*) AS count FROM activity_events").get()).toEqual({
        count: 0,
      });
      expect(database.prepare("SELECT mode FROM ai_settings WHERE id = 1").get()).toEqual({
        mode: "disabled",
      });
    } finally {
      database?.close();
      await rm(directory, { recursive: true, force: true });
    }
  });

  it("seeds a classroom, learner assignment, and rubric when profiles exist", async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), "mathios-classroom-seed-"));
    const databaseUrl = `file:${path.join(directory, "seed.db")}`;
    let database: Database.Database | undefined;
    try {
      await runSeed({ provider: "sqlite", databaseUrl });
      database = new Database(path.join(directory, "seed.db"));
      database.exec(`
        INSERT INTO users (id, identifier) VALUES ('seed-user-teacher', 'seed-teacher');
        INSERT INTO profiles (id, user_id, display_name) VALUES ('seed-profile-teacher', 'seed-user-teacher', 'Seed Teacher');
        INSERT INTO users (id, identifier) VALUES ('seed-user-learner', 'seed-learner');
        INSERT INTO profiles (id, user_id, display_name) VALUES ('seed-profile-learner', 'seed-user-learner', 'Seed Learner');
      `);
      database.close();
      database = undefined;

      await runSeed({ provider: "sqlite", databaseUrl });
      await runSeed({ provider: "sqlite", databaseUrl });
      database = new Database(path.join(directory, "seed.db"));
      expect(database.prepare("SELECT COUNT(*) AS count FROM classes").get()).toEqual({ count: 1 });
      expect(
        database
          .prepare("SELECT role FROM class_teachers WHERE class_id = 'seed-classroom-physics'")
          .get(),
      ).toEqual({ role: "owner" });
      expect(
        database
          .prepare("SELECT status FROM class_members WHERE class_id = 'seed-classroom-physics'")
          .get(),
      ).toEqual({ status: "active" });
      expect(
        database
          .prepare(
            "SELECT resource_type, target_scope, status FROM assignments WHERE id = 'seed-assignment-constant-acceleration'",
          )
          .get(),
      ).toEqual({ resource_type: "lesson", target_scope: "individual", status: "published" });
      expect(database.prepare("SELECT COUNT(*) AS count FROM assignment_targets").get()).toEqual({
        count: 1,
      });
      expect(database.prepare("SELECT COUNT(*) AS count FROM grading_rubrics").get()).toEqual({
        count: 1,
      });
    } finally {
      database?.close();
      await rm(directory, { recursive: true, force: true });
    }
  });
});
