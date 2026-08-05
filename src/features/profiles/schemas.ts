import { z } from "zod";

const optionalSecret = z.preprocess((value) => {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}, z.string().min(4, "Use at least 4 characters.").max(128).optional());

export const profileAvatars = ["orbit", "atom", "leaf", "spark", "moon"] as const;

const profileFields = z.object({
  displayName: z.string().trim().min(1, "Enter a display name.").max(80),
  avatar: z.enum(profileAvatars),
  preferredTheme: z.enum(["system", "light", "dark"]),
  preferredLanguage: z.enum(["en", "sq", "de"]),
  pin: optionalSecret,
  pinConfirmation: optionalSecret,
});

function validateMatchingPin(value: z.infer<typeof profileFields>, context: z.RefinementCtx): void {
  if (value.pin !== value.pinConfirmation) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["pinConfirmation"],
      message: "The PIN or password entries do not match.",
    });
  }
}

export const profileCreateSchema = profileFields.superRefine(validateMatchingPin);

export const profileUpdateSchema = profileFields
  .extend({
    profileId: z.string().uuid("Choose a valid profile."),
    clearPin: z.boolean().default(false),
  })
  .superRefine(validateMatchingPin);

export type ProfileCreateInput = z.infer<typeof profileCreateSchema>;
export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;

export const avatarLabels: Record<(typeof profileAvatars)[number], string> = {
  orbit: "Orbit",
  atom: "Atom",
  leaf: "Leaf",
  spark: "Spark",
  moon: "Moon",
};

export const avatarGlyphs: Record<(typeof profileAvatars)[number], string> = {
  orbit: "◉",
  atom: "⚛",
  leaf: "✦",
  spark: "✳",
  moon: "◐",
};
