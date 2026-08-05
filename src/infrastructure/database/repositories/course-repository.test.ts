import Database from "better-sqlite3";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { DatabaseHandle } from "@/infrastructure/database/client";
import { runSeed } from "@/infrastructure/database/seed";
import { SqlCourseRepository } from "@/infrastructure/database/repositories/course-repository";

describe("course repository", () => {
  it("hydrates the Phase 3 hierarchy and keeps draft content out of the reader", async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), "mathios-course-"));
    const databaseUrl = `file:${path.join(directory, "course.db")}`;
    let raw: Database.Database | undefined;
    try {
      await runSeed({ provider: "sqlite", databaseUrl });
      raw = new Database(path.join(directory, "course.db"));
      raw.pragma("foreign_keys = ON");
      const handle = {
        provider: "sqlite",
        raw,
        db: undefined as never,
      } as unknown as DatabaseHandle;
      const repository = new SqlCourseRepository(handle);
      const detail = await repository.getCourseDetail("course-physics-motion");
      expect(detail?.modules).toHaveLength(2);
      expect(detail?.modules[0].lessons[0].title).toBe("Describing motion");
      expect(detail?.modules[0].lessons[1].status).toBe("draft");
      const reader = await repository.getLessonReader("lesson-describing-motion");
      expect(reader?.version.status).toBe("published");
      expect(
        reader?.version.snapshot.sections
          .flatMap((entry) => entry.blocks)
          .some((block) => block.type === "formula"),
      ).toBe(true);
      expect(await repository.getLessonReader("lesson-speed-and-velocity")).toBeNull();
    } finally {
      raw?.close();
      await rm(directory, { recursive: true, force: true });
    }
  });

  it("publishes snapshots, restores them as drafts, and tracks learner progress", async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), "mathios-course-version-"));
    const databaseUrl = `file:${path.join(directory, "course.db")}`;
    let raw: Database.Database | undefined;
    try {
      await runSeed({ provider: "sqlite", databaseUrl });
      raw = new Database(path.join(directory, "course.db"));
      raw.pragma("foreign_keys = ON");
      raw
        .prepare("INSERT INTO users (id, identifier) VALUES (?, ?)")
        .run("user-progress", "progress");
      raw
        .prepare("INSERT INTO profiles (id, user_id, display_name) VALUES (?, ?, ?)")
        .run("profile-progress", "user-progress", "Progress learner");
      const handle = {
        provider: "sqlite",
        raw,
        db: undefined as never,
      } as unknown as DatabaseHandle;
      const repository = new SqlCourseRepository(handle);

      const published = await repository.publishLesson(
        "lesson-speed-and-velocity",
        "Initial publish",
        null,
      );
      expect(published).toMatchObject({ status: "published", versionNumber: 1 });
      expect((await repository.getLessonReader("lesson-speed-and-velocity"))?.version.id).toBe(
        published.id,
      );

      await repository.saveLessonProgress({
        profileId: "profile-progress",
        lessonId: "lesson-describing-motion",
        timeSpentSeconds: 30,
        lastViewedBlockId: "block-motion-observation",
        completionPercentage: 40,
        completed: false,
      });
      const progress = await repository.saveLessonProgress({
        profileId: "profile-progress",
        lessonId: "lesson-describing-motion",
        timeSpentSeconds: 60,
        lastViewedBlockId: "block-motion-formula",
        completionPercentage: 100,
        completed: true,
      });
      expect(progress).toMatchObject({ completionPercentage: 100, revisitCount: 1 });
      expect(progress.completedAt).not.toBeNull();

      const restored = await repository.restoreLessonVersion(
        "lesson-speed-and-velocity",
        published.id,
        null,
      );
      expect(restored.status).toBe("draft");
      expect(await repository.getLessonReader("lesson-speed-and-velocity")).toBeNull();
    } finally {
      raw?.close();
      await rm(directory, { recursive: true, force: true });
    }
  });
});
