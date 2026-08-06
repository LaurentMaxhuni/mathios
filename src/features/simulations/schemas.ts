import { z } from "zod";

export const simulationIdSchema = z.string().trim().min(1).max(120);
export const sessionIdSchema = z.string().trim().min(1).max(160);
export const simulationInputsSchema = z.record(
  z.string(),
  z.union([z.string(), z.number(), z.boolean()]),
);
export const sessionUpdateSchema = z.object({
  sessionId: sessionIdSchema,
  status: z.enum(["active", "paused", "completed", "abandoned"]),
  inputs: simulationInputsSchema,
  state: z.record(z.string(), z.number()),
  elapsedSeconds: z.number().int().min(0).max(86400),
});
export const presetSchema = z.object({
  simulationId: simulationIdSchema,
  name: z.string().trim().min(1).max(80),
  values: simulationInputsSchema,
});
