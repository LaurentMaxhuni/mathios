import { z } from "zod";
import {
  ASSESSMENT_ATTEMPT_STATUSES,
  ASSESSMENT_FEEDBACK_VISIBILITIES,
  ASSESSMENT_QUESTION_ORDERINGS,
  ASSESSMENT_RETAKE_RULES,
  ASSESSMENT_REVIEW_MODES,
  ASSESSMENT_STATUSES,
  ASSESSMENT_TYPES,
} from "@/domain/assessment/types";

const idSchema = z.string().trim().min(1).max(200);
const slugSchema = z
  .string()
  .trim()
  .min(2)
  .max(120)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers, and hyphens.");
const nullableIdSchema = z.preprocess(
  (value) => (typeof value === "string" && !value.trim() ? null : value),
  idSchema.nullable(),
);
const jsonObjectSchema = z.record(z.any());

export const assessmentSchema = z.object({
  id: idSchema.optional(),
  slug: slugSchema,
  title: z.string().trim().min(2).max(300),
  description: z.string().trim().max(10000).default(""),
  type: z.enum(ASSESSMENT_TYPES),
  subjectId: nullableIdSchema,
  gradeId: nullableIdSchema,
  status: z.enum(ASSESSMENT_STATUSES),
  timeLimitSeconds: z.coerce.number().int().positive().nullable(),
  attemptLimit: z.coerce.number().int().positive().nullable(),
  passingThreshold: z.coerce.number().min(0).max(1),
  partialCredit: z.coerce.boolean(),
  feedbackVisibility: z.enum(ASSESSMENT_FEEDBACK_VISIBILITIES),
  reviewMode: z.enum(ASSESSMENT_REVIEW_MODES),
  retakeRule: z.enum(ASSESSMENT_RETAKE_RULES),
  questionOrdering: z.enum(ASSESSMENT_QUESTION_ORDERINGS),
  autoSubmit: z.coerce.boolean(),
  configuration: jsonObjectSchema.default({}),
});

export const assessmentStatusSchema = z.object({
  id: idSchema,
  status: z.enum(ASSESSMENT_STATUSES),
});

export const assessmentSectionSchema = z.object({
  id: idSchema.optional(),
  assessmentId: idSchema,
  title: z.string().trim().min(1).max(300),
  description: z.string().trim().max(5000).default(""),
  sortOrder: z.coerce.number().int().min(0).max(10000),
  points: z.coerce.number().positive().max(10000),
  timeLimitSeconds: z.coerce.number().int().positive().nullable(),
  questionOrdering: z.enum(ASSESSMENT_QUESTION_ORDERINGS),
});

export const assessmentPoolSchema = z.object({
  id: idSchema.optional(),
  assessmentId: idSchema,
  sectionId: idSchema,
  title: z.string().trim().min(1).max(300),
  selectionCount: z.coerce.number().int().positive().max(1000),
  difficultyDistribution: jsonObjectSchema.default({}),
  conceptIds: z.array(idSchema).max(100).default([]),
  questionOrdering: z.enum(ASSESSMENT_QUESTION_ORDERINGS),
});

export const assessmentQuestionSchema = z.object({
  id: idSchema.optional(),
  assessmentId: idSchema,
  sectionId: idSchema,
  poolId: nullableIdSchema,
  questionId: idSchema,
  sortOrder: z.coerce.number().int().min(0).max(10000),
  points: z.coerce.number().positive().max(1000),
  isRequired: z.coerce.boolean(),
});

export const startAssessmentSchema = z.object({
  assessmentId: idSchema,
  seed: z.coerce.number().int().optional(),
});

export const assessmentAnswerSchema = z.object({
  attemptId: idSchema,
  questionId: idSchema,
  response: z.unknown(),
});

export const completeAssessmentSchema = z.object({ attemptId: idSchema });

export const assessmentAttemptStatusSchema = z.object({
  id: idSchema,
  status: z.enum(ASSESSMENT_ATTEMPT_STATUSES),
});

export type AssessmentInput = z.infer<typeof assessmentSchema>;
export type AssessmentSectionInput = z.infer<typeof assessmentSectionSchema>;
export type AssessmentPoolInput = z.infer<typeof assessmentPoolSchema>;
