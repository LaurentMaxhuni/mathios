import { z } from "zod";
import {
  EXERCISE_SET_KINDS,
  EXERCISE_SET_STATUSES,
  QUESTION_DIFFICULTIES,
  QUESTION_STATUSES,
  QUESTION_TYPES,
} from "@/domain/exercise/types";

const idSchema = z.string().trim().min(1).max(200);
const slugSchema = z
  .string()
  .trim()
  .min(2)
  .max(120)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers, and hyphens.");
const jsonObjectSchema = z.record(z.string(), z.any());
const nullableIdSchema = z.preprocess(
  (value) => (typeof value === "string" && !value.trim() ? null : value),
  idSchema.nullable(),
);

export const questionOptionSchema = z.object({
  id: idSchema.optional(),
  key: z.string().trim().min(1).max(50),
  label: z.string().trim().min(1).max(1000),
  sortOrder: z.coerce.number().int().min(0).max(10000),
  isCorrect: z.coerce.boolean().default(false),
});

export const questionHintSchema = z.object({
  id: idSchema.optional(),
  level: z.coerce.number().int().min(1).max(20),
  content: z.string().trim().min(1).max(10000),
  sortOrder: z.coerce.number().int().min(0).max(10000),
});

export const questionSolutionSchema = z.object({
  id: idSchema.optional(),
  title: z.string().trim().min(1).max(200),
  content: z.string().trim().min(1).max(30000),
  sortOrder: z.coerce.number().int().min(0).max(10000),
});

const questionTemplateVariableSchemaBase = z.object({
  name: z
    .string()
    .trim()
    .regex(/^[A-Za-z_][A-Za-z0-9_]*$/),
  label: z.string().trim().min(1).max(100),
  min: z.coerce.number().finite(),
  max: z.coerce.number().finite(),
  step: z.coerce.number().positive().optional(),
  decimals: z.coerce.number().int().min(0).max(8).optional(),
  values: z.array(z.union([z.string(), z.number()])).optional(),
});

export const questionTemplateInputSchema = z.object({
  id: idSchema.optional(),
  slug: slugSchema,
  name: z.string().trim().min(2).max(200),
  questionType: z.enum(QUESTION_TYPES),
  promptTemplate: z.string().trim().min(1).max(30000),
  variables: z.array(questionTemplateVariableSchemaBase).max(50),
  answerExpression: z.string().trim().max(5000).default(""),
  validationSpec: jsonObjectSchema.default({}),
  seed: z.coerce.number().int().nullable().default(null),
  isActive: z.coerce.boolean().default(true),
});

export const questionSchema = z.object({
  id: idSchema.optional(),
  slug: slugSchema,
  title: z.string().trim().min(2).max(300),
  type: z.enum(QUESTION_TYPES),
  subjectId: idSchema,
  gradeMinId: nullableIdSchema,
  gradeMaxId: nullableIdSchema,
  difficulty: z.enum(QUESTION_DIFFICULTIES),
  estimatedTimeSeconds: z.coerce.number().int().min(0).max(86400),
  source: z.string().trim().max(1000).default(""),
  tags: z.array(z.string().trim().min(1).max(80)).max(50).default([]),
  status: z.enum(QUESTION_STATUSES),
  prompt: z.string().trim().min(1).max(30000),
  answerSpec: jsonObjectSchema,
  explanation: z.string().trim().max(30000).default(""),
  fullSolution: z.string().trim().max(50000).default(""),
  commonWrongAnswers: z.array(z.string().trim().max(2000)).max(100).default([]),
  errorFeedback: z.record(z.string(), z.string().trim().max(5000)).default({}),
  partialCreditRules: jsonObjectSchema.nullable().default(null),
  changeSummary: z.string().trim().max(1000).default(""),
  options: z.array(questionOptionSchema).max(100).default([]),
  hints: z.array(questionHintSchema).max(20).default([]),
  solutions: z.array(questionSolutionSchema).max(50).default([]),
  conceptIds: z.array(idSchema).max(100).default([]),
  learningObjectiveIds: z.array(idSchema).max(100).default([]),
  template: questionTemplateInputSchema.nullable().optional().default(null),
});

export const questionStatusSchema = z.object({
  id: idSchema,
  status: z.enum(QUESTION_STATUSES),
});

export const exerciseSetSchema = z.object({
  id: idSchema.optional(),
  slug: slugSchema,
  title: z.string().trim().min(2).max(300),
  description: z.string().trim().max(10000).default(""),
  kind: z.enum(EXERCISE_SET_KINDS),
  subjectId: nullableIdSchema,
  gradeId: nullableIdSchema,
  difficulty: z.enum(QUESTION_DIFFICULTIES),
  status: z.enum(EXERCISE_SET_STATUSES),
  estimatedTimeSeconds: z.coerce.number().int().min(0).max(86400),
});

export const exerciseSetQuestionSchema = z.object({
  exerciseSetId: idSchema,
  questionId: idSchema,
  sortOrder: z.coerce.number().int().min(0).max(10000),
  points: z.coerce.number().positive().max(1000),
  isRequired: z.coerce.boolean(),
});

export const exerciseSetStatusSchema = z.object({
  id: idSchema,
  status: z.enum(EXERCISE_SET_STATUSES),
});

export const answerSubmissionSchema = z.object({
  attemptId: idSchema,
  questionId: idSchema,
  response: z.unknown(),
  templateId: idSchema.nullable().optional(),
  instanceSeed: z.coerce.number().int().nullable().optional(),
});

export const startAttemptSchema = z.object({
  exerciseSetId: idSchema,
  seed: z.coerce.number().int().optional(),
});

export const completeAttemptSchema = z.object({
  attemptId: idSchema,
});

export const validationPreviewSchema = z.object({
  type: z.enum(QUESTION_TYPES),
  answerSpec: jsonObjectSchema,
  response: z.unknown(),
});

export const bulkQuestionImportSchema = z.object({
  questions: z
    .array(questionSchema.omit({ id: true }))
    .min(1)
    .max(100),
});

export const templatePreviewSchema = z.object({
  templateId: idSchema,
  seeds: z.array(z.coerce.number().int()).max(10).optional(),
});

export const questionTemplateVariableSchema = questionTemplateVariableSchemaBase;

export const questionTemplateSchema = z.object({
  id: idSchema,
  questionId: idSchema.nullable(),
  slug: slugSchema,
  name: z.string().trim().min(2).max(200),
  questionType: z.enum(QUESTION_TYPES),
  promptTemplate: z.string().trim().min(1).max(30000),
  variables: z.array(questionTemplateVariableSchema).max(50),
  answerExpression: z.string().trim().max(5000),
  validationSpec: jsonObjectSchema,
  seed: z.coerce.number().int().nullable(),
  isActive: z.coerce.boolean(),
});

export type QuestionInput = z.infer<typeof questionSchema>;
export type ExerciseSetInput = z.infer<typeof exerciseSetSchema>;
export type AnswerSubmissionInput = z.infer<typeof answerSubmissionSchema>;
export type ValidationPreviewInput = z.infer<typeof validationPreviewSchema>;
export type QuestionTemplateInput = z.infer<typeof questionTemplateSchema>;
