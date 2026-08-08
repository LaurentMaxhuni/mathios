import { z } from "zod";

export const onboardingSchema = z.object({
  curriculum: z.string().trim().max(160).default(""),
  currentGrade: z.string().trim().max(80).default(""),
  targetGrade: z.string().trim().max(80).default(""),
  subjects: z
    .array(z.string().trim().min(1).max(80))
    .min(1, "Choose at least one subject.")
    .max(10),
  learningGoals: z.array(z.string().trim().min(1).max(240)).max(10).default([]),
  weeklyStudyTimeMinutes: z.number().int().min(15).max(10080).default(150),
  dailyGoalMinutes: z.number().int().min(5).max(60).default(15),
  preferredStudyDays: z.array(z.number().int().min(0).max(6)).max(7).default([]),
  difficultyPreference: z.enum(["gentle", "balanced", "challenging"]).default("balanced"),
});

export type OnboardingInput = z.infer<typeof onboardingSchema>;
