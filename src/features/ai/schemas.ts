import { z } from "zod";
import { AI_MODES, AI_GENERATION_STATUSES, AI_TASKS } from "@/domain/ai/types";

const identifier = z.string().trim().min(1).max(160);

export const aiSettingsSchema = z.object({
  mode: z.enum(AI_MODES),
  localBaseUrl: z.string().trim().min(1).max(300),
  localModel: z.string().trim().min(1).max(160),
  remoteBaseUrl: z.string().trim().min(1).max(300),
  remoteModel: z.string().trim().min(1).max(160),
  remoteApiKey: z.string().trim().max(500).nullable().optional(),
  maxTokens: z.number().int().min(128).max(4096),
  temperature: z.number().min(0).max(2),
});

export const aiGenerationSchema = z.object({
  task: z.enum(AI_TASKS),
  instruction: z.string().trim().min(1).max(4000),
  lessonId: identifier.optional(),
  conceptId: identifier.optional(),
  gradeId: identifier.optional(),
  learnerContext: z.string().trim().max(3000).optional(),
});

export const aiReviewSchema = z.object({
  status: z.enum(AI_GENERATION_STATUSES).refine((value) => value !== "generated", {
    message: "A generated result can only be approved or rejected.",
  }),
});
