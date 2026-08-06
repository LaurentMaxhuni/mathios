import { z } from "zod";

const identifier = z.string().trim().min(1).max(160);
const title = z.string().trim().min(2).max(180);
const longText = z.string().trim().max(6000);

const generatedBlockSchema = z
  .object({
    type: z.enum([
      "heading",
      "paragraph",
      "markdown",
      "formula",
      "definition",
      "example",
      "callout",
      "warning",
      "common-mistake",
    ]),
    title: z.string().trim().max(180).nullable().default(null),
    text: longText.optional(),
    markdown: longText.optional(),
    latex: z.string().trim().max(1200).optional(),
    accessibleLabel: z.string().trim().max(500).optional(),
    term: z.string().trim().max(180).optional(),
    definition: longText.optional(),
    prompt: longText.optional(),
    steps: z.array(longText).max(12).optional(),
    mistake: longText.optional(),
    correction: longText.optional(),
    tone: z.enum(["info", "success", "warning"]).optional(),
  })
  .superRefine((block, context) => {
    const addIssue = (path: string, message: string) =>
      context.addIssue({ code: "custom", path: [path], message });

    if (block.type === "heading" && !block.text) addIssue("text", "Headings need text.");
    if (block.type === "paragraph" && !block.text) addIssue("text", "Paragraphs need text.");
    if (block.type === "markdown" && !block.markdown && !block.text)
      addIssue("markdown", "Markdown blocks need content.");
    if (block.type === "formula" && !block.latex) addIssue("latex", "Formula blocks need LaTeX.");
    if (block.type === "formula" && !block.accessibleLabel)
      addIssue("accessibleLabel", "Formula blocks need an accessible label.");
    if (block.type === "definition" && (!block.term || !block.definition))
      addIssue("definition", "Definitions need a term and definition.");
    if (block.type === "example" && (!block.prompt || !block.steps?.length))
      addIssue("steps", "Examples need a prompt and at least one step.");
    if ((block.type === "callout" || block.type === "warning") && !block.text)
      addIssue("text", "Callouts and warnings need text.");
    if (block.type === "common-mistake" && (!block.mistake || !block.correction))
      addIssue("correction", "Common-mistake blocks need a mistake and correction.");
  });

const generatedSectionSchema = z.object({
  kind: z.enum([
    "introduction",
    "why-this-matters",
    "learning-objectives",
    "intuitive-explanation",
    "formal-explanation",
    "definition",
    "worked-example",
    "common-mistake",
    "summary",
  ]),
  title,
  description: z.string().trim().max(5000).default(""),
  blocks: z.array(generatedBlockSchema).min(1).max(8),
});

export const lessonDraftSchema = z.object({
  lessonTitle: title,
  lessonSummary: z.string().trim().max(5000).default(""),
  moduleTitle: title.default("Core ideas"),
  estimatedDurationMinutes: z.coerce.number().int().min(5).max(180).default(30),
  sections: z.array(generatedSectionSchema).min(1).max(8),
});

export const contentStudioGenerateSchema = z.object({
  courseTitle: title.default("AI starter course"),
  topic: z.string().trim().min(3).max(2000),
  subjectId: identifier,
  gradeId: identifier,
  difficulty: z.enum(["gentle", "balanced", "challenging"]),
  learningObjectives: z.string().trim().max(3000).default(""),
});

export const contentStudioSaveSchema = z.object({
  generationId: identifier,
  courseId: identifier.nullable().default(null),
  courseTitle: title.default("AI starter course"),
  subjectId: identifier,
  gradeId: identifier,
  difficulty: z.enum(["gentle", "balanced", "challenging"]),
  draft: z.unknown(),
});

export type LessonDraft = z.infer<typeof lessonDraftSchema>;
export type GeneratedLessonBlock = z.infer<typeof generatedBlockSchema>;
export type ContentStudioGenerateInput = z.infer<typeof contentStudioGenerateSchema>;
export type ContentStudioSaveInput = z.infer<typeof contentStudioSaveSchema>;
