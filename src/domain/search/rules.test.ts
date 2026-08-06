import { describe, expect, it } from "vitest";
import {
  buildSearchHighlights,
  isSearchDocumentVisible,
  matchesSearchFilters,
  normalizeSearchQuery,
  scoreSearchDocument,
} from "@/domain/search/rules";

const lesson = {
  id: "lesson:motion",
  type: "lesson",
  resourceId: "lesson-motion",
  title: "Motion graphs",
  content: "Read position and velocity graphs to explain motion.",
  metadata: {
    subjectIds: ["subject-physics"],
    gradeIds: ["grade-8"],
    curriculumIds: ["curriculum-kosovo"],
    difficulty: "balanced" as const,
    publicationStatus: "published" as const,
  },
};

describe("search rules", () => {
  it("normalizes input and applies educational filters", () => {
    const query = normalizeSearchQuery({
      text: "  motion\n  graphs ",
      subjectIds: ["subject-physics"],
      gradeIds: ["grade-8"],
      difficulties: ["balanced"],
      limit: 200,
    });

    expect(query.text).toBe("motion graphs");
    expect(query.limit).toBe(100);
    expect(matchesSearchFilters(lesson, query)).toBe(true);
    expect(matchesSearchFilters(lesson, { ...query, subjectIds: ["subject-biology"] })).toBe(false);
  });

  it("weights title matches and keeps unpublished documents hidden by default", () => {
    const titleScore = scoreSearchDocument(lesson, "motion");
    const contentScore = scoreSearchDocument({ ...lesson, title: "Graphs" }, "motion");
    expect(titleScore).toBeGreaterThan(contentScore);
    expect(
      isSearchDocumentVisible({ ...lesson, metadata: { publicationStatus: "draft" } }, {}),
    ).toBe(false);
    expect(
      isSearchDocumentVisible(
        { ...lesson, metadata: { publicationStatus: "draft" } },
        { includeUnpublished: true },
      ),
    ).toBe(true);
  });

  it("returns a readable result highlight", () => {
    expect(buildSearchHighlights(lesson, "velocity")[0]).toContain("velocity");
  });
});
