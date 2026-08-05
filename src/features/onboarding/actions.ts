"use server";

import { revalidatePath } from "next/cache";
import { actionStateFromError, actionStateFromZod, type ActionState } from "@/lib/action-state";
import { formLines, formNumber, formNumbers, formString, formStrings } from "@/lib/form-data";
import { getCurrentSession } from "@/infrastructure/auth/local-auth-provider";
import { getIdentityRepository } from "@/infrastructure/database/repositories/identity-repository";
import { onboardingSchema } from "@/features/onboarding/schemas";
import { skipOnboarding, saveOnboarding } from "@/features/onboarding/service";

function onboardingFormData(formData: FormData) {
  return {
    curriculum: formString(formData, "curriculum") ?? "",
    currentGrade: formString(formData, "currentGrade") ?? "",
    targetGrade: formString(formData, "targetGrade") ?? "",
    subjects: formStrings(formData, "subjects"),
    learningGoals: formLines(formString(formData, "learningGoals")),
    weeklyStudyTimeMinutes: formNumber(formData, "weeklyStudyTimeMinutes"),
    preferredStudyDays: formNumbers(formData, "preferredStudyDays"),
    difficultyPreference: formString(formData, "difficultyPreference") ?? "balanced",
  };
}

export async function saveOnboardingAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = onboardingSchema.safeParse(onboardingFormData(formData));
  if (!parsed.success) return actionStateFromZod(parsed.error);
  const repository = getIdentityRepository();
  try {
    const session = await getCurrentSession(repository);
    await saveOnboarding(parsed.data, session, repository);
    revalidatePath("/", "layout");
    revalidatePath("/onboarding");
    return { ok: true, message: "Your learning preferences are saved." };
  } catch (error) {
    return actionStateFromError(error);
  }
}

export async function skipOnboardingAction(): Promise<void> {
  const repository = getIdentityRepository();
  const session = await getCurrentSession(repository);
  await skipOnboarding(session, repository);
  revalidatePath("/", "layout");
  revalidatePath("/onboarding");
}
