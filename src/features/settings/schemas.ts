import { z } from "zod";

const optionalText = z.preprocess((value) => {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}, z.string().max(160).nullable());

export const settingsSchema = z.object({
  theme: z.enum(["system", "light", "dark"]),
  reducedMotion: z.boolean(),
  textSize: z.enum(["small", "medium", "large"]),
  defaultGrade: optionalText,
  defaultCurriculum: optionalText,
  preferredSubjects: z.array(z.string().trim().min(1).max(80)).max(10),
  studySessionDuration: z.number().int().min(5).max(180),
  weekStartDay: z.number().int().min(0).max(6),
  formulaRendering: z.enum(["rendered", "accessible", "plain"]),
  accessibilityPreferences: z.object({
    highContrast: z.boolean(),
    underlineLinks: z.boolean(),
    focusIndicators: z.boolean(),
    screenReaderOptimizations: z.boolean(),
  }),
});

export const accessibilitySettingsSchema = z.object({
  reducedMotion: z.boolean(),
  textSize: z.enum(["small", "medium", "large"]),
  formulaRendering: z.enum(["rendered", "accessible", "plain"]),
  highContrast: z.boolean(),
  underlineLinks: z.boolean(),
  focusIndicators: z.boolean(),
  screenReaderOptimizations: z.boolean(),
});

export type SettingsInput = z.infer<typeof settingsSchema>;
export type AccessibilitySettingsInput = z.infer<typeof accessibilitySettingsSchema>;
