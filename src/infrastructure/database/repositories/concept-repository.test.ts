import Database from "better-sqlite3";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { DatabaseHandle } from "@/infrastructure/database/client";
import { conceptRelationshipSeed, conceptSeed, runSeed } from "@/infrastructure/database/seed";
import { SqlConceptRepository } from "@/infrastructure/database/repositories/concept-repository";

describe("concept repository", () => {
  it("hydrates concept details, derived course links, and an interactive graph", async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), "mathios-concept-"));
    const databaseUrl = `file:${path.join(directory, "concept.db")}`;
    let raw: Database.Database | undefined;
    try {
      await runSeed({ provider: "sqlite", databaseUrl });
      raw = new Database(path.join(directory, "concept.db"));
      raw.pragma("foreign_keys = ON");
      const handle = {
        provider: "sqlite",
        raw,
        db: undefined as never,
      } as unknown as DatabaseHandle;
      const repository = new SqlConceptRepository(handle);
      const detail = await repository.getConceptDetail("concept-velocity");
      expect(detail?.concept.name).toBe("Velocity");
      expect(detail?.prerequisites.map((item) => item.targetConcept.name)).toEqual(["Position"]);
      expect(detail?.lessons.map((lesson) => lesson.lessonTitle)).toContain("Describing motion");
      expect(detail?.courseIds).toContain("course-physics-motion");
      expect(detail?.exerciseReferences).toContain("question-velocity-direction");
      const graph = await repository.getGraph();
      expect(graph.nodes).toHaveLength(conceptSeed.length);
      expect(graph.edges).toHaveLength(conceptRelationshipSeed.length);
      expect(graph.requiredCycle).toBeNull();
      expect(graph.orphanedConceptIds).toEqual([]);
      expect(graph.nodes.find((node) => node.id === "concept-velocity")?.locked).toBe(true);
    } finally {
      raw?.close();
      await rm(directory, { recursive: true, force: true });
    }
  });
});
