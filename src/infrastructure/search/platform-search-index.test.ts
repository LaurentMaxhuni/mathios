import Database from "better-sqlite3";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { DatabaseHandle } from "@/infrastructure/database/client";
import { runSeed } from "@/infrastructure/database/seed";
import { buildSearchDocuments } from "@/infrastructure/search/platform-search-index";
import { SqlSearchProvider } from "@/infrastructure/search/sql-search-provider";

describe("platform search index", () => {
  it("builds searchable documents across the seeded platform and ranks them locally", async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), "mathios-search-"));
    const databaseUrl = `file:${path.join(directory, "search.db")}`;
    let database: Database.Database | undefined;

    try {
      await runSeed({ provider: "sqlite", databaseUrl });
      database = new Database(path.join(directory, "search.db"));
      const handle = {
        provider: "sqlite",
        raw: database,
        db: undefined,
      } as unknown as DatabaseHandle;
      const documents = await buildSearchDocuments(handle);
      expect(documents.map((document) => document.type)).toEqual(
        expect.arrayContaining([
          "course",
          "lesson",
          "concept",
          "question",
          "roadmap",
          "laboratory",
        ]),
      );

      const provider = new SqlSearchProvider(handle);
      await provider.replaceAll(documents);
      const results = await provider.search({ text: "motion", profileId: null });

      expect(results.length).toBeGreaterThan(0);
      expect(results[0]?.document.title.toLocaleLowerCase()).toContain("motion");
      expect(results.some((result) => result.document.type === "lesson")).toBe(true);
      expect(results.some((result) => result.document.type === "course")).toBe(true);
      await expect(provider.search({ text: "!!!", profileId: null })).resolves.toEqual([]);
      const facets = await provider.listFacets({ profileId: null, includeUnpublished: false });
      expect(facets.types.some((facet) => facet.value === "lesson")).toBe(true);
      expect(facets.subjects.some((facet) => facet.label === "Physics")).toBe(true);
    } finally {
      database?.close();
      await rm(directory, { recursive: true, force: true });
    }
  });
});
