import { z } from "zod";

const idSchema = z.string().trim().min(1).max(200);

export const recommendationDismissalSchema = z.object({
  recommendationId: idSchema,
  reason: z.string().trim().max(500).optional(),
});

export const masteryFilterSchema = z.object({
  subjectId: idSchema.optional(),
  gradeId: idSchema.optional(),
});
