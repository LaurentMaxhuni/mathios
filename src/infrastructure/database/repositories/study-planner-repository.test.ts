import Database from "better-sqlite3";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { DatabaseHandle } from "@/infrastructure/database/client";
import { runSeed } from "@/infrastructure/database/seed";
import { getStudyPlannerRepository } from "@/infrastructure/database/repositories/study-planner-repository";
import {
  createGoalAndGeneratePlan,
  rescheduleStudySession,
  updateStudySessionStatus,
} from "@/features/planner/service";

describe("study planner repository and learner flow", () => {
  it("generates a course plan, persists calendar mutations, and records completion", async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), "mathios-planner-"));
    const databaseUrl = `file:${path.join(directory, "planner.db")}`;
    let raw: Database.Database | undefined;
    try {
      await runSeed({ provider: "sqlite", databaseUrl });
      raw = new Database(path.join(directory, "planner.db"));
      raw.pragma("foreign_keys = ON");
      raw
        .prepare("INSERT INTO users (id, identifier) VALUES (?, ?)")
        .run("user-planner", "planner-user");
      raw
        .prepare("INSERT INTO profiles (id, user_id, display_name) VALUES (?, ?, ?)")
        .run("profile-planner", "user-planner", "Planner learner");
      raw.close();
      raw = undefined;
      await runSeed({ provider: "sqlite", databaseUrl });
      raw = new Database(path.join(directory, "planner.db"));
      raw.pragma("foreign_keys = ON");
      const handle = {
        provider: "sqlite",
        raw,
        db: undefined as never,
      } as unknown as DatabaseHandle;
      const repository = getStudyPlannerRepository(handle);
      const options = await repository.listPlannerOptions();
      expect(options.courses.length).toBeGreaterThan(0);
      expect(options.grades.length).toBe(10);
      expect(await repository.listAvailability("profile-planner")).toHaveLength(5);
      expect(await repository.listGoals("profile-planner")).toHaveLength(1);
      expect((await repository.getActivePlan("profile-planner"))?.goal.targetId).toBe(
        "roadmap-math-physics-foundations",
      );

      const result = await createGoalAndGeneratePlan(
        "profile-planner",
        {
          title: "Finish the mathematics course",
          description: "A practical course goal.",
          goalType: "course-completion",
          targetId: options.courses[0].id,
          targetTitle: options.courses[0].title,
          startDate: "2026-08-10",
          targetDate: "2026-08-31",
          weeklyStudyMinutes: 180,
          availableDays: [1, 2, 3, 4, 5],
          sessionDurationMinutes: 45,
          prioritySubjectIds: [options.courses[0].subjectId],
          restDays: [5],
          difficultyPreference: "balanced",
          reviewFrequencyDays: 7,
          status: "active",
        },
        repository,
      );
      expect(result.plan.items.length).toBeGreaterThan(0);
      expect(result.plan.sessions.length).toBeGreaterThan(0);
      expect(result.plan.conflicts).toHaveLength(0);

      const original = result.plan.sessions[0];
      const moved = await rescheduleStudySession(
        "profile-planner",
        original.id,
        { scheduledDate: "2026-08-31", startMinute: 1080 },
        repository,
      );
      expect(moved.scheduledDate).toBe("2026-08-31");
      expect(await repository.listCompletionEvents("profile-planner", original.id)).toHaveLength(1);

      const savedProgress: unknown[] = [];
      const fakeCourseRepository = {
        saveLessonProgress: async (input: unknown) => {
          savedProgress.push(input);
        },
      };
      await updateStudySessionStatus("profile-planner", original.id, "completed", "", repository, {
        courseRepository: fakeCourseRepository as never,
      });
      expect(savedProgress).toHaveLength(1);
      const eventTypes = (
        await repository.listCompletionEvents("profile-planner", original.id)
      ).map((event) => event.eventType);
      expect(eventTypes).toHaveLength(2);
      expect(eventTypes).toEqual(expect.arrayContaining(["rescheduled", "completed"]));
      expect((await repository.getSession("profile-planner", original.id))?.status).toBe(
        "completed",
      );
    } finally {
      raw?.close();
      await rm(directory, { recursive: true, force: true });
    }
  });
});
