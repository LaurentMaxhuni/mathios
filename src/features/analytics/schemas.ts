import { z } from "zod";
import { ACTIVITY_EVENT_TYPES, LEARNING_SESSION_TYPES } from "@/domain/analytics/types";

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD dates.");
const idSchema = z.string().trim().min(1).max(160);
const metadataSchema = z.record(z.string(), z.unknown()).default({});

export const analyticsRangeSchema = z.object({
  from: dateSchema.optional(),
  to: dateSchema.optional(),
});

export const activityEventSchema = z.object({
  id: idSchema,
  eventType: z.enum(ACTIVITY_EVENT_TYPES),
  resourceType: z.string().trim().min(1).max(80).nullable().optional(),
  resourceId: idSchema.nullable().optional(),
  subjectId: idSchema.nullable().optional(),
  gradeId: idSchema.nullable().optional(),
  conceptId: idSchema.nullable().optional(),
  learningSessionId: idSchema.nullable().optional(),
  occurredAt: z.string().datetime({ offset: true }).optional(),
  durationSeconds: z.number().int().min(0).max(86_400).optional(),
  score: z.number().min(0).max(1).nullable().optional(),
  isCorrect: z.boolean().nullable().optional(),
  hintsUsed: z.number().int().min(0).max(100).optional(),
  attemptNumber: z.number().int().min(1).max(100).optional(),
  responseTimeMs: z.number().int().min(0).max(86_400_000).nullable().optional(),
  dedupeKey: z.string().trim().min(1).max(200).nullable().optional(),
  metadata: metadataSchema,
});

export const learningSessionStartSchema = z.object({
  id: idSchema,
  sessionType: z.enum(LEARNING_SESSION_TYPES),
  sourceType: z.string().trim().min(1).max(80).nullable().optional(),
  sourceId: idSchema.nullable().optional(),
  startedAt: z.string().datetime({ offset: true }).optional(),
  metadata: metadataSchema,
});

export const learningSessionCompleteSchema = z.object({
  endedAt: z.string().datetime({ offset: true }).optional(),
  durationSeconds: z.number().int().min(0).max(86_400).optional(),
  status: z.enum(["completed", "abandoned"]).default("completed"),
});

export type AnalyticsRangeInput = z.infer<typeof analyticsRangeSchema>;
export type ActivityEventInput = z.infer<typeof activityEventSchema>;
export type LearningSessionStartInput = z.infer<typeof learningSessionStartSchema>;
export type LearningSessionCompleteInput = z.infer<typeof learningSessionCompleteSchema>;

export function parseAnalyticsRange(params: URLSearchParams): AnalyticsRangeInput {
  return analyticsRangeSchema.parse({
    from: params.get("from") ?? undefined,
    to: params.get("to") ?? undefined,
  });
}
