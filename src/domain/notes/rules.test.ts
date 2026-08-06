import { describe, expect, it } from "vitest";
import { buildPersonalKnowledgeMap, normalizeTagNames, slugifyTagName } from "@/domain/notes/rules";
import { parseMarkdown, parseMarkdownInline, safeMarkdownUrl } from "@/domain/notes/markdown";

describe("notes domain rules", () => {
  it("normalizes tags without losing the display label", () => {
    expect(slugifyTagName("  Kinematics & Motion  ")).toBe("kinematics-motion");
    expect(normalizeTagNames(["Physics", "physics", "  Physics  "])).toEqual(["Physics"]);
  });

  it("rejects unsafe markdown URLs while keeping internal and image URLs", () => {
    expect(safeMarkdownUrl("javascript:alert(1)")).toBeNull();
    expect(safeMarkdownUrl("/images/lesson.png", true)).toBe("/images/lesson.png");
    expect(
      parseMarkdownInline("[lesson](/lessons/one) and $a^2$").map((token) => token.type),
    ).toEqual(["link", "text", "formula"]);
  });

  it("parses note blocks and creates deterministic map edges", () => {
    expect(parseMarkdown("# Energy\n\n- Work\n- Power\n\n$$E=mc^2$$")).toHaveLength(3);
    const map = buildPersonalKnowledgeMap({
      notes: [
        { id: "note-1", title: "Energy" },
        { id: "note-2", title: "Review" },
      ],
      links: [
        {
          id: "link-1",
          noteId: "note-1",
          resourceType: "concept",
          resourceId: "c-1",
          label: "Energy",
        },
      ],
      backlinks: [
        { id: "backlink-1", sourceNoteId: "note-2", targetNoteId: "note-1", anchor: "review" },
      ],
      bookmarks: [
        { id: "bookmark-1", resourceType: "lesson", resourceId: "l-1", title: "Motion lesson" },
      ],
    });
    expect(map.nodes.map((node) => node.id)).toEqual([
      "note:note-1",
      "resource:concept:c-1",
      "resource:lesson:l-1",
      "bookmark:bookmark-1",
      "note:note-2",
    ]);
    expect(map.edges.map((edge) => edge.kind)).toEqual(["resource-link", "backlink", "bookmark"]);
  });
});
