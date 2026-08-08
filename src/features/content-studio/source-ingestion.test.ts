import { describe, expect, it } from "vitest";
import {
  buildSourceLessonInstruction,
  chunkExtractedPages,
  parseSourceLessonBatch,
} from "@/features/content-studio/source-ingestion";

describe("source book ingestion", () => {
  it("keeps page boundaries and changes chunk size with lesson size", () => {
    const pages = Array.from({ length: 6 }, (_, index) => ({
      pageNumber: index + 1,
      text: `Page ${index + 1} ` + "science ".repeat(120),
    }));
    const small = chunkExtractedPages(pages, "small");
    const deep = chunkExtractedPages(pages, "deep");
    expect(small.length).toBeGreaterThan(deep.length);
    expect(small[0]).toMatchObject({ pageStart: 1 });
    expect(small.at(-1)).toMatchObject({ pageEnd: 6 });
  });

  it("makes learner level and lesson size explicit in the AI contract", () => {
    const instruction = buildSourceLessonInstruction({
      documentTitle: "Physics",
      subjectName: "Physics",
      gradeName: "Grade 8",
      difficulty: "gentle",
      lessonSize: "small",
      pageStart: 10,
      pageEnd: 14,
    });
    expect(instruction).toContain("Grade 8");
    expect(instruction).toContain("5 to 10 minutes");
    expect(instruction).toContain("pages: 10 through 14");
  });

  it("validates lesson drafts and bounds citations to their source chunk", () => {
    const result = parseSourceLessonBatch(
      JSON.stringify({
        lessons: [
          {
            pageStart: 1,
            pageEnd: 99,
            draft: {
              lessonTitle: "Forces in balance",
              lessonSummary: "Understand balanced forces.",
              moduleTitle: "Forces",
              estimatedDurationMinutes: 10,
              sections: [
                {
                  kind: "introduction",
                  title: "Start here",
                  description: "",
                  blocks: [{ type: "paragraph", title: null, text: "Forces can cancel." }],
                },
              ],
            },
          },
        ],
      }),
      { start: 10, end: 14 },
    );
    expect(result[0]).toMatchObject({ pageStart: 10, pageEnd: 14 });
  });
});
