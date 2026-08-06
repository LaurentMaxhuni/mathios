import { z } from "zod";
import {
  STUDY_EXCEPTION_KINDS,
  STUDY_GOAL_STATUSES,
  STUDY_GOAL_TYPES,
  STUDY_SESSION_STATUSES,
} from "@/domain/planner/types";

const idSchema = z.string().trim().min(1).max(200);
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD.");
const weekdaySchema = z.number().int().min(1).max(7);

export const studyGoalSchema = z
  .object({
    id: idSchema.optional(),
    title: z.string().trim().min(2).max(160),
    description: z.string().trim().max(2000).default(""),
    goalType: z.enum(STUDY_GOAL_TYPES),
    targetId: idSchema.nullable().default(null),
    targetTitle: z.string().trim().max(240).default(""),
    startDate: dateSchema,
    targetDate: dateSchema,
    weeklyStudyMinutes: z.number().int().min(30).max(10080),
    availableDays: z.array(weekdaySchema).min(1).max(7),
    sessionDurationMinutes: z.number().int().min(10).max(240),
    prioritySubjectIds: z.array(idSchema).max(20).default([]),
    restDays: z.array(weekdaySchema).max(7).default([]),
    difficultyPreference: z.enum(["gentle", "balanced", "challenging"]).default("balanced"),
    reviewFrequencyDays: z.number().int().min(0).max(90).default(7),
    status: z.enum(STUDY_GOAL_STATUSES).default("active"),
  })
  .superRefine((value, context) => {
    if (value.targetDate < value.startDate) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["targetDate"],
        message: "Target date must be on or after the start date.",
      });
    }
    if (value.restDays.some((day) => !value.availableDays.includes(day))) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["restDays"],
        message: "Rest days must be selected from available days.",
      });
    }
  });

export const studyGoalStatusSchema = z.object({
  status: z.enum(STUDY_GOAL_STATUSES),
});

export const studySessionMoveSchema = z.object({
  scheduledDate: dateSchema,
  startMinute: z.number().int().min(0).max(1439),
});

export const studySessionStatusSchema = z.object({
  status: z.enum(STUDY_SESSION_STATUSES),
  reason: z.string().trim().max(500).default(""),
});

export const studyAvailabilitySchema = z
  .object({
    weekday: weekdaySchema,
    startMinute: z.number().int().min(0).max(1439),
    endMinute: z.number().int().min(1).max(1440),
    maxMinutes: z.number().int().min(10).max(1440).nullable().default(null),
    label: z.string().trim().max(120).default("Study time"),
  })
  .superRefine((value, context) => {
    if (value.endMinute <= value.startMinute) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endMinute"],
        message: "End must be after start.",
      });
    }
  });

export const studyAvailabilityListSchema = z.object({
  slots: z.array(studyAvailabilitySchema).max(50),
});

export const studyExceptionSchema = z
  .object({
    exceptionDate: dateSchema,
    kind: z.enum(STUDY_EXCEPTION_KINDS),
    startMinute: z.number().int().min(0).max(1439).nullable().default(null),
    endMinute: z.number().int().min(1).max(1440).nullable().default(null),
    reason: z.string().trim().max(500).default(""),
  })
  .superRefine((value, context) => {
    if ((value.startMinute === null) !== (value.endMinute === null)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endMinute"],
        message: "Start and end must be provided together.",
      });
    }
    if (
      value.startMinute !== null &&
      value.endMinute !== null &&
      value.endMinute <= value.startMinute
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endMinute"],
        message: "End must be after start.",
      });
    }
    if (value.kind === "extra-availability" && value.startMinute === null) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["startMinute"],
        message: "Extra availability needs a time window.",
      });
    }
  });
