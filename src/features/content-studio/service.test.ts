import { describe, expect, it } from "vitest";
import type { CourseRepository } from "@/domain/ports/course-repository";
import type { LessonDraft } from "@/features/content-studio/schemas";
import { parseLessonDraft, saveLessonDraft } from "@/features/content-studio/service";

const draft: LessonDraft = {
  lessonTitle: "Understanding slope",
  lessonSummary: "Slope describes a constant rate of change.",
  moduleTitle: "Rates of change",
  estimatedDurationMinutes: 25,
  sections: [
    {
      kind: "introduction",
      title: "A changing quantity",
      description: "Start with a familiar pattern.",
      blocks: [
        { type: "paragraph", title: null, text: "A graph can show how one quantity changes." },
      ],
    },
    {
      kind: "worked-example",
      title: "Read the rate",
      description: "Use two points to calculate the change.",
      blocks: [
        {
          type: "example",
          title: null,
          prompt: "Find the slope through (1, 2) and (3, 6).",
          steps: ["Subtract the y-values.", "Subtract the x-values.", "Divide the changes."],
        },
      ],
    },
  ],
};

describe("content studio", () => {
  it("parses a fenced AI JSON response into a supported lesson draft", () => {
    const parsed = parseLessonDraft(`\n\`\`\`json\n${JSON.stringify(draft)}\n\`\`\`\n`);
    expect(parsed.lessonTitle).toBe("Understanding slope");
    expect(parsed.sections).toHaveLength(2);
  });

  it("rejects unsupported or incomplete generated blocks", () => {
    expect(() =>
      parseLessonDraft(
        JSON.stringify({
          ...draft,
          sections: [
            {
              ...draft.sections[0],
              blocks: [{ type: "formula", latex: "m = \\frac{\\Delta y}{\\Delta x}" }],
            },
          ],
        }),
      ),
    ).toThrow("not a valid lesson draft");
  });

  it("saves generated material as draft course content", async () => {
    const courses = new Map<string, Record<string, unknown>>();
    const modules = new Map<string, Record<string, unknown>>();
    const lessons = new Map<string, Record<string, unknown>>();
    const sections = new Map<string, Record<string, unknown>>();
    const blocks = new Map<string, Record<string, unknown>>();
    const repository = {
      getCourse: async (id: string) => (courses.get(id) ?? null) as never,
      createCourse: async (input: Record<string, unknown>) => {
        const record = { ...input, status: "draft", createdAt: "now", updatedAt: "now" };
        courses.set(String(input.id), record);
        return record as never;
      },
      listModules: async (courseId: string) =>
        [...modules.values()].filter((item) => item.courseId === courseId) as never,
      createModule: async (input: Record<string, unknown>) => {
        const record = { ...input, isArchived: false, createdAt: "now", updatedAt: "now" };
        modules.set(String(input.id), record);
        return record as never;
      },
      getModule: async (id: string) => (modules.get(id) ?? null) as never,
      createLesson: async (input: Record<string, unknown>) => {
        const record = {
          ...input,
          currentVersionNumber: 0,
          publishedVersionId: null,
          createdAt: "now",
          updatedAt: "now",
        };
        lessons.set(String(input.id), record);
        return record as never;
      },
      getLesson: async (id: string) => (lessons.get(id) ?? null) as never,
      createSection: async (input: Record<string, unknown>) => {
        const record = { ...input, createdAt: "now", updatedAt: "now" };
        sections.set(String(input.id), record);
        return record as never;
      },
      getSection: async (id: string) => (sections.get(id) ?? null) as never,
      createBlock: async (input: Record<string, unknown>) => {
        const record = { ...input, createdAt: "now", updatedAt: "now" };
        blocks.set(String(input.id), record);
        return record as never;
      },
    } as unknown as CourseRepository;

    const saved = await saveLessonDraft({
      courseId: null,
      courseTitle: "Algebra foundations",
      subjectId: "subject-mathematics",
      gradeId: "grade-8",
      difficulty: "gentle",
      draft,
      createdByProfileId: "profile-author",
      repository,
    });

    expect(saved.createdCourse).toBe(true);
    expect(courses.get(saved.courseId)?.status).toBe("draft");
    expect(lessons.get(saved.lessonId)?.status).toBe("draft");
    expect(sections.size).toBe(2);
    expect(blocks.size).toBe(2);
  });
});
