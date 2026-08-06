import Database from "better-sqlite3";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { DatabaseHandle } from "@/infrastructure/database/client";
import {
  getCurriculumRepository,
  SqlCurriculumRepository,
} from "@/infrastructure/database/repositories/curriculum-repository";
import { domainSeed, runSeed } from "@/infrastructure/database/seed";

describe("curriculum repository", () => {
  it("hydrates curriculum, grade, subject, domain, and objective explorers", async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), "mathios-curriculum-"));
    const databaseUrl = `file:${path.join(directory, "structure.db")}`;
    let raw: Database.Database | undefined;
    try {
      await runSeed({ provider: "sqlite", databaseUrl });
      raw = new Database(path.join(directory, "structure.db"));
      raw.pragma("foreign_keys = ON");
      const handle = {
        provider: "sqlite",
        raw,
        db: undefined as never,
      } as unknown as DatabaseHandle;
      const repository = new SqlCurriculumRepository(handle);
      const curriculum = await repository.getCurriculumExplorer("curriculum-kosovo");
      expect(curriculum?.grades).toHaveLength(10);
      expect(curriculum?.subjects.map((subject) => subject.subject.slug)).toEqual([
        "mathematics",
        "physics",
        "chemistry",
        "biology",
        "astronomy",
      ]);
      const grade = await repository.getGradeExplorer("curriculum-kosovo", "grade-6");
      expect(grade?.subjects.map((subject) => subject.subject.slug)).toContain("mathematics");
      expect(
        grade?.subjects.find((subject) => subject.subject.slug === "mathematics")?.domains[0].depth,
      ).toBe(1);
      const subject = await repository.getSubjectExplorer(
        "subject-mathematics",
        "curriculum-kosovo",
      );
      expect(subject?.domains.length).toBe(
        domainSeed.filter(([, , , , subjectSlug]) => subjectSlug === "mathematics").length,
      );
      expect(subject?.grades.some((placement) => placement.gradeId === "grade-6")).toBe(true);
      expect(subject?.objectives.length).toBeGreaterThan(0);
      expect(getCurriculumRepository(handle)).toBeInstanceOf(SqlCurriculumRepository);
    } finally {
      raw?.close();
      await rm(directory, { recursive: true, force: true });
    }
  });
});
