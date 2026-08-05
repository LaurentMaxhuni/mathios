import { z } from "zod";
import { ROADMAP_EDGE_TYPES, ROADMAP_NODE_TYPES, ROADMAP_STATUSES } from "@/domain/roadmap/types";

const idSchema = z.string().trim().min(1).max(200);

export const roadmapSchema = z.object({
  id: idSchema.optional(),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(120)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase words separated by hyphens."),
  title: z.string().trim().min(2).max(160),
  description: z.string().trim().max(2000).default(""),
  goal: z.string().trim().max(500).default(""),
  targetGradeId: idSchema.nullable().default(null),
  targetDifficulty: z.enum(["gentle", "balanced", "challenging"]),
  estimatedDurationMinutes: z.number().int().min(0).max(100000),
  coverImage: z.string().trim().max(500).nullable().default(null),
  status: z.enum(ROADMAP_STATUSES),
});

export const roadmapStatusSchema = z.object({
  id: idSchema,
  status: z.enum(ROADMAP_STATUSES),
});

export const roadmapNodeSchema = z.object({
  id: idSchema,
  roadmapVersionId: idSchema,
  nodeKey: z
    .string()
    .trim()
    .min(1)
    .max(120)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase words separated by hyphens."),
  type: z.enum(ROADMAP_NODE_TYPES),
  title: z.string().trim().min(2).max(160),
  description: z.string().trim().max(1000).default(""),
  referenceId: idSchema.nullable().default(null),
  referenceTitle: z.string().trim().max(160).nullable().default(null),
  subjectId: idSchema.nullable().default(null),
  isRequired: z.boolean().default(true),
  isCheckpoint: z.boolean().default(false),
  isOptionalBranch: z.boolean().default(false),
  sortOrder: z.number().int().min(0).max(10000),
  estimatedDurationMinutes: z.number().int().min(0).max(100000),
  metadata: z.record(z.unknown()).default({}),
});

export const roadmapReorderSchema = z.object({
  roadmapId: idSchema,
  roadmapVersionId: idSchema,
  nodeIds: z.array(idSchema).min(1),
});

export const roadmapEdgeSchema = z.object({
  id: idSchema,
  roadmapVersionId: idSchema,
  sourceNodeId: idSchema,
  targetNodeId: idSchema,
  type: z.enum(ROADMAP_EDGE_TYPES),
  sortOrder: z.number().int().min(0).max(10000),
});

export const roadmapSubjectSchema = z.object({
  roadmapId: idSchema,
  subjectId: idSchema,
  sortOrder: z.number().int().min(0).max(1000),
});

export const roadmapPrerequisiteSchema = z.object({
  roadmapId: idSchema,
  prerequisiteRoadmapId: idSchema,
  isRequired: z.boolean(),
});

export const roadmapEnrollmentSchema = z.object({
  roadmapId: idSchema,
  selectedGoal: z.string().trim().max(500).nullable().default(null),
});

export const roadmapProgressSchema = z.object({
  roadmapId: idSchema,
  roadmapNodeId: idSchema,
  status: z.enum(["locked", "available", "in-progress", "completed", "skipped"]),
  completionPercentage: z.number().int().min(0).max(100),
});

export const personalizedPathSchema = z.object({
  roadmapId: idSchema,
});
