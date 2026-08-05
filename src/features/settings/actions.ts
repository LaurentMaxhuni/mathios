"use server";

import { revalidatePath } from "next/cache";
import { actionStateFromError, actionStateFromZod, type ActionState } from "@/lib/action-state";
import { formBoolean, formNumber, formString, formStrings } from "@/lib/form-data";
import { getCurrentSession } from "@/infrastructure/auth/local-auth-provider";
import { getIdentityRepository } from "@/infrastructure/database/repositories/identity-repository";
import { saveAccessibilitySettings, saveSettings } from "@/features/settings/service";
import { accessibilitySettingsSchema, settingsSchema } from "@/features/settings/schemas";

function settingsFormData(formData: FormData) {
  return {
    theme: formString(formData, "theme") ?? "system",
    reducedMotion: formBoolean(formData, "reducedMotion"),
    textSize: formString(formData, "textSize") ?? "medium",
    defaultGrade: formString(formData, "defaultGrade") ?? "",
    defaultCurriculum: formString(formData, "defaultCurriculum") ?? "",
    preferredSubjects: formStrings(formData, "preferredSubjects"),
    studySessionDuration: formNumber(formData, "studySessionDuration"),
    weekStartDay: formNumber(formData, "weekStartDay"),
    formulaRendering: formString(formData, "formulaRendering") ?? "accessible",
    accessibilityPreferences: {
      highContrast: formBoolean(formData, "highContrast"),
      underlineLinks: formBoolean(formData, "underlineLinks"),
      focusIndicators: formBoolean(formData, "focusIndicators"),
      screenReaderOptimizations: formBoolean(formData, "screenReaderOptimizations"),
    },
  };
}

function accessibilityFormData(formData: FormData) {
  return {
    reducedMotion: formBoolean(formData, "reducedMotion"),
    textSize: formString(formData, "textSize") ?? "medium",
    formulaRendering: formString(formData, "formulaRendering") ?? "accessible",
    highContrast: formBoolean(formData, "highContrast"),
    underlineLinks: formBoolean(formData, "underlineLinks"),
    focusIndicators: formBoolean(formData, "focusIndicators"),
    screenReaderOptimizations: formBoolean(formData, "screenReaderOptimizations"),
  };
}

export async function saveSettingsAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = settingsSchema.safeParse(settingsFormData(formData));
  if (!parsed.success) return actionStateFromZod(parsed.error);
  const repository = getIdentityRepository();
  try {
    const session = await getCurrentSession(repository);
    await saveSettings(parsed.data, session, repository);
    revalidatePath("/", "layout");
    revalidatePath("/settings");
    revalidatePath("/settings/accessibility");
    return { ok: true, message: "Settings saved." };
  } catch (error) {
    return actionStateFromError(error);
  }
}

export async function saveAccessibilitySettingsAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = accessibilitySettingsSchema.safeParse(accessibilityFormData(formData));
  if (!parsed.success) return actionStateFromZod(parsed.error);
  const repository = getIdentityRepository();
  try {
    const session = await getCurrentSession(repository);
    await saveAccessibilitySettings(parsed.data, session, repository);
    revalidatePath("/", "layout");
    revalidatePath("/settings");
    revalidatePath("/settings/accessibility");
    return { ok: true, message: "Accessibility settings saved." };
  } catch (error) {
    return actionStateFromError(error);
  }
}
