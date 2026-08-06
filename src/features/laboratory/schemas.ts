import { z } from "zod";
import { LABORATORY_MODES, LABORATORY_STATUSES } from "@/features/laboratory/schema-constants";

const idSchema = z.string().trim().min(1).max(200);
const scalarSchema = z.union([z.string().max(20000), z.number().finite(), z.boolean()]);
const configurationSchema = z.record(z.string(), z.unknown()).default({});

export const laboratoryStepSchema = z.object({
  id: idSchema,
  type: z.enum(["setup", "procedure", "observation", "analysis", "conclusion", "extension"]),
  title: z.string().trim().min(1).max(160),
  instructions: z.string().trim().max(10000),
  expectedObservation: z.string().trim().max(2000).default(""),
  sortOrder: z.number().int().min(0).max(1000),
  isRequired: z.boolean().default(true),
});

export const laboratoryVariableSchema = z.object({
  id: idSchema,
  key: z
    .string()
    .trim()
    .min(1)
    .max(80)
    .regex(/^[a-z][a-z0-9_-]*$/),
  label: z.string().trim().min(1).max(160),
  symbol: z.string().trim().max(30).default(""),
  role: z.enum(["independent", "dependent", "controlled", "measured"]),
  dataType: z.enum(["number", "text", "boolean"]),
  unit: z.string().trim().max(30).nullable().default(null),
  description: z.string().trim().max(1000).default(""),
  defaultValue: scalarSchema.nullable().default(null),
  minValue: z.number().finite().nullable().default(null),
  maxValue: z.number().finite().nullable().default(null),
  uncertainty: z.number().finite().min(0).nullable().default(null),
  significantFigures: z.number().int().min(1).max(12).nullable().default(null),
  theoreticalValue: z.number().finite().nullable().default(null),
  configuration: configurationSchema,
  sortOrder: z.number().int().min(0).max(1000),
});

export const laboratoryActivitySchema = z.object({
  id: idSchema.optional(),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(120)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  title: z.string().trim().min(2).max(160),
  description: z.string().trim().max(2000).default(""),
  subjectId: idSchema,
  mode: z.enum(LABORATORY_MODES),
  status: z.enum(LABORATORY_STATUSES),
  objective: z.string().trim().max(10000).default(""),
  theory: z.string().trim().max(20000).default(""),
  materials: z.array(z.string().trim().min(1).max(500)).max(100).default([]),
  safetyNotes: z.array(z.string().trim().min(1).max(1000)).max(100).default([]),
  analysisPrompt: z.string().trim().max(10000).default(""),
  graphingInstructions: z.string().trim().max(10000).default(""),
  questions: z.array(z.string().trim().min(1).max(2000)).max(100).default([]),
  conclusionPrompt: z.string().trim().max(5000).default(""),
  extensionActivity: z.string().trim().max(10000).default(""),
  simulationId: idSchema.nullable().default(null),
  estimatedDurationMinutes: z.number().int().min(0).max(10000),
  steps: z
    .array(laboratoryStepSchema.omit({ id: true }))
    .max(100)
    .default([]),
  variables: z
    .array(laboratoryVariableSchema.omit({ id: true }))
    .max(100)
    .default([]),
});

export const laboratorySessionStartSchema = z.object({
  mode: z.enum(LABORATORY_MODES).optional(),
  inputs: configurationSchema,
});

export const laboratorySessionUpdateSchema = z.object({
  status: z.enum(["active", "paused", "completed", "abandoned"]),
  inputs: configurationSchema,
  state: configurationSchema,
  elapsedSeconds: z.number().int().min(0).max(86400),
  completionPercentage: z.number().int().min(0).max(100).optional(),
});

export const laboratoryObservationSchema = z.object({
  stepId: idSchema.nullable().default(null),
  prompt: z.string().trim().max(2000).default(""),
  notes: z.string().max(20000),
  sortOrder: z.number().int().min(0).max(1000).default(0),
  metadata: configurationSchema,
});

export const laboratoryMeasurementSchema = z.object({
  variableId: idSchema,
  observationId: idSchema.nullable().default(null),
  rowIndex: z.number().int().min(0).max(1000),
  value: scalarSchema,
  unit: z.string().trim().max(30).nullable().default(null),
  uncertainty: z.number().finite().min(0).nullable().default(null),
  significantFigures: z.number().int().min(1).max(12).nullable().default(null),
  source: z.enum(["manual", "simulation", "calculated"]).default("manual"),
  notes: z.string().trim().max(2000).default(""),
});

export const reportSectionSchema = z.object({
  id: idSchema,
  title: z.string().trim().min(1).max(160),
  body: z.string().max(20000),
  sortOrder: z.number().int().min(0).max(1000),
});

export const reportTableSchema = z.object({
  id: idSchema,
  title: z.string().trim().max(160),
  headers: z.array(z.string().max(200)).max(50),
  rows: z.array(z.array(z.string().max(500)).max(50)).max(1000),
});

export const reportChartSchema = z.object({
  id: idSchema,
  title: z.string().trim().max(160),
  xVariableId: idSchema,
  yVariableId: idSchema,
  showTrendline: z.boolean().default(true),
});

export const reportImageSchema = z.object({
  id: idSchema,
  src: z.string().trim().max(200000),
  alt: z.string().trim().max(500),
  caption: z.string().trim().max(500),
});

export const laboratoryReportSchema = z.object({
  status: z.enum(["draft", "submitted", "returned", "graded"]),
  title: z.string().trim().max(160),
  abstract: z.string().max(10000).default(""),
  sections: z.array(reportSectionSchema).max(100),
  tables: z.array(reportTableSchema).max(50),
  charts: z.array(reportChartSchema).max(20),
  formulas: z.array(z.string().max(2000)).max(50),
  images: z.array(reportImageSchema).max(20),
  conclusion: z.string().max(20000),
});

export const laboratoryFeedbackSchema = z.object({
  body: z.string().trim().min(1).max(20000),
  rubric: configurationSchema,
});
