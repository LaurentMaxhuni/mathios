import { z } from "zod";

export const onboardingSchema = z.object({
  curriculum: z.string().trim().min(1, "Enter a curriculum or learning pathway.").max(160),
  currentGrade: z.string().trim().min(1, "Enter the current grade or level.").max(80),
  targetGrade: z.string().trim().min(1, "Enter a target grade or level.").max(80),
  subjects: z
    .array(z.string().trim().min(1).max(80))
    .min(1, "Choose at least one subject.")
    .max(10),
  learningGoals: z
    .array(z.string().trim().min(1).max(240))
    .min(1, "Add at least one learning goal.")
    .max(10),
  weeklyStudyTimeMinutes: z.number().int().min(15).max(10080),
  preferredStudyDays: z
    .array(z.number().int().min(0).max(6))
    .min(1, "Choose at least one study day.")
    .max(7),
  difficultyPreference: z.enum(["gentle", "balanced", "challenging"]),
});

export type OnboardingInput = z.infer<typeof onboardingSchema>;
