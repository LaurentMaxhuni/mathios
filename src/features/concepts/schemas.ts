import { z } from "zod";
import { CONCEPT_DIFFICULTIES, CONCEPT_RELATIONSHIP_TYPES } from "@/domain/concept/types";

const idSchema = z.string().trim().min(1).max(200);
const slugSchema = z
  .string()
  .trim()
  .min(2)
  .max(120)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers, and hyphens.");
const descriptionSchema = z.string().trim().max(10000).default("");
const nullableIdSchema = z.preprocess(
  (value) => (typeof value === "string" && !value.trim() ? null : value),
  idSchema.nullable(),
);

export const conceptSchema = z.object({
  id: idSchema.optional(),
  slug: slugSchema,
  name: z.string().trim().min(2).max(200),
  description: descriptionSchema,
  subjectId: idSchema,
  domainId: nullableIdSchema,
  gradeMinId: nullableIdSchema,
  gradeMaxId: nullableIdSchema,
  difficulty: z.enum(CONCEPT_DIFFICULTIES),
  masteryThreshold: z.coerce.number().int().min(0).max(100),
});

export const conceptRelationshipSchema = z.object({
  id: idSchema.optional(),
  sourceConceptId: idSchema,
  targetConceptId: idSchema,
  type: z.enum(CONCEPT_RELATIONSHIP_TYPES),
});

export const lessonConceptSchema = z.object({
  conceptId: idSchema,
  lessonId: idSchema,
  sortOrder: z.coerce.number().int().min(0).max(10000),
});

export const conceptObjectiveSchema = z.object({
  conceptId: idSchema,
  objectiveId: idSchema,
  sortOrder: z.coerce.number().int().min(0).max(10000),
});

export const conceptApplicationSchema = z.object({
  id: idSchema.optional(),
  conceptId: idSchema,
  title: z.string().trim().min(2).max(200),
  description: z.string().trim().min(2).max(10000),
  sortOrder: z.coerce.number().int().min(0).max(10000),
});

export const conceptMisconceptionSchema = z.object({
  id: idSchema.optional(),
  conceptId: idSchema,
  misconception: z.string().trim().min(2).max(2000),
  correction: z.string().trim().min(2).max(5000),
  sortOrder: z.coerce.number().int().min(0).max(10000),
});

export const archiveConceptSchema = z.object({
  id: idSchema,
  isArchived: z.coerce.boolean(),
});

export const bulkRelationshipSchema = z.object({
  rows: z.string().trim().min(1).max(50000),
});

export const graphQuerySchema = z.object({
  search: z.string().trim().max(200).optional(),
  subjectId: idSchema.optional(),
  domainId: idSchema.optional(),
  gradeId: idSchema.optional(),
  difficulty: z.enum(CONCEPT_DIFFICULTIES).optional(),
  relationshipTypes: z.array(z.enum(CONCEPT_RELATIONSHIP_TYPES)).default([]),
  masteryState: z.enum(["all", "unassessed"]).default("all"),
});

export type ConceptInput = z.infer<typeof conceptSchema>;
export type ConceptRelationshipInput = z.infer<typeof conceptRelationshipSchema>;
