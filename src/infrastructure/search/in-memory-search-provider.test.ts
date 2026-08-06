import { describe, expect, it } from "vitest";
import { InMemorySearchProvider } from "@/infrastructure/search/in-memory-search-provider";

describe("InMemorySearchProvider", () => {
  it("ranks matching documents and respects type filters", async () => {
    const provider = new InMemorySearchProvider();
    await provider.index({
      id: "lesson-1",
      type: "lesson",
      title: "Vectors",
      content: "Vectors have magnitude and direction.",
    });
    await provider.index({
      id: "note-1",
      type: "note",
      title: "Study note",
      content: "Remember direction when drawing a vector.",
    });

    const results = await provider.search({ text: "vector", types: ["lesson"] });

    expect(results).toHaveLength(1);
    expect(results[0]?.document.id).toBe("lesson-1");
    expect(results[0]?.score).toBeGreaterThan(0);
  });

  it("keeps personal documents isolated and records recent searches", async () => {
    const provider = new InMemorySearchProvider();
    await provider.index({
      id: "note-a",
      type: "note",
      profileId: "profile-a",
      title: "Private vectors",
      content: "Only profile A can see this.",
      metadata: { publicationStatus: "personal" },
    });
    await provider.index({
      id: "note-b",
      type: "note",
      profileId: "profile-b",
      title: "Private vectors",
      content: "Only profile B can see this.",
      metadata: { publicationStatus: "personal" },
    });

    expect(
      (await provider.search({ text: "vectors", profileId: "profile-a" }))[0]?.document.id,
    ).toBe("note-a");
    await provider.recordRecentSearch("profile-a", { query: "vectors" });
    expect((await provider.listRecentSearches("profile-a"))[0]?.query).toBe("vectors");
    expect(await provider.search({ text: "vectors", profileId: "profile-c" })).toHaveLength(0);
  });
});
