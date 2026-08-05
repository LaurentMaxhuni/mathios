import { z } from "zod";
import { LESSON_BLOCK_TYPES, LESSON_SECTION_KINDS } from "@/domain/course/types";

const idSchema = z.string().trim().min(1, "Choose a valid record.");
const slugSchema = z
  .string()
  .trim()
  .min(2, "Use at least two characters.")
  .max(100, "Keep slugs under 100 characters.")
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers, and single hyphens.");
const titleSchema = z.string().trim().min(2, "Use at least two characters.").max(180);
const descriptionSchema = z.string().trim().max(5000, "Keep descriptions under 5,000 characters.");
const orderSchema = z.coerce.number().int().min(0).max(99999);
const durationSchema = z.coerce.number().int().min(0).max(100000);

export const courseSchema = z.object({
  id: idSchema,
  slug: slugSchema,
  title: titleSchema,
  description: descriptionSchema,
  subjectId: idSchema,
  difficulty: z.enum(["gentle", "balanced", "challenging"]),
  estimatedDurationMinutes: durationSchema,
  gradeMinId: idSchema.nullable(),
  gradeMaxId: idSchema.nullable(),
  courseImage: z.string().trim().max(1000).nullable(),
  isRequired: z.boolean(),
});

export const moduleSchema = z.object({
  id: idSchema,
  courseId: idSchema,
  title: titleSchema,
  description: descriptionSchema,
  sortOrder: orderSchema,
  estimatedStudyTimeMinutes: durationSchema,
  assessmentReference: z.string().trim().max(500).nullable(),
});

export const lessonSchema = z.object({
  id: idSchema,
  moduleId: idSchema,
  slug: slugSchema,
  title: titleSchema,
  summary: descriptionSchema,
  sortOrder: orderSchema,
  estimatedDurationMinutes: durationSchema,
});

export const sectionSchema = z.object({
  id: idSchema,
  lessonId: idSchema,
  kind: z.enum(LESSON_SECTION_KINDS),
  title: titleSchema,
  description: descriptionSchema,
  sortOrder: orderSchema,
});

const payloadSchema = z.record(z.unknown());

export const blockSchema = z.object({
  id: idSchema,
  sectionId: idSchema,
  type: z.enum(LESSON_BLOCK_TYPES),
  title: z.string().trim().max(180).nullable(),
  sortOrder: orderSchema,
  payload: payloadSchema,
});

export const assetSchema = z.object({
  id: idSchema,
  lessonId: idSchema,
  blockId: idSchema.nullable(),
  kind: z.string().trim().min(2).max(40),
  name: z.string().trim().min(1).max(180),
  sourceUrl: z.string().trim().min(1).max(2000),
  mimeType: z.string().trim().max(120).nullable(),
  altText: z.string().trim().max(1000),
  metadata: payloadSchema,
});

export const courseCurriculumSchema = z.object({
  courseId: idSchema,
  curriculumId: idSchema,
});

export const courseGradeSchema = z.object({
  courseId: idSchema,
  gradeId: idSchema,
  isRequired: z.boolean(),
  sortOrder: orderSchema,
});

export const coursePrerequisiteSchema = z.object({
  courseId: idSchema,
  prerequisiteCourseId: idSchema,
});

export const courseObjectiveSchema = z.object({
  courseId: idSchema,
  objectiveId: idSchema,
  sortOrder: orderSchema,
});

export const modulePrerequisiteSchema = z.object({
  moduleId: idSchema,
  prerequisiteModuleId: idSchema,
});

export const moduleObjectiveSchema = z.object({
  moduleId: idSchema,
  objectiveId: idSchema,
  sortOrder: orderSchema,
});

export const lessonObjectiveSchema = z.object({
  lessonId: idSchema,
  objectiveId: idSchema,
  sortOrder: orderSchema,
});

export const changeSummarySchema = z.string().trim().max(1000).default("");

export const progressSchema = z.object({
  lessonId: idSchema,
  timeSpentSeconds: z.coerce.number().int().min(0).max(315360000),
  lastViewedBlockId: idSchema.nullable(),
  completionPercentage: z.coerce.number().int().min(0).max(100),
  completed: z.boolean(),
});

export const statusSchema = z.enum(["draft", "published", "archived"]);

export type CourseInput = z.infer<typeof courseSchema>;
export type ModuleInput = z.infer<typeof moduleSchema>;
export type LessonInput = z.infer<typeof lessonSchema>;
export type SectionInput = z.infer<typeof sectionSchema>;
export type BlockInput = z.infer<typeof blockSchema>;
export type AssetInput = z.infer<typeof assetSchema>;
