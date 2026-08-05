"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { actionStateFromError, actionStateFromZod, type ActionState } from "@/lib/action-state";
import { formBoolean, formString } from "@/lib/form-data";
import { getCurrentSession } from "@/infrastructure/auth/local-auth-provider";
import { getIdentityRepository } from "@/infrastructure/database/repositories/identity-repository";
import { createProfile, deleteProfile, updateProfile } from "@/features/profiles/service";
import { profileCreateSchema, profileUpdateSchema } from "@/features/profiles/schemas";

function profileFormData(formData: FormData) {
  return {
    profileId: formString(formData, "profileId"),
    displayName: formString(formData, "displayName") ?? "",
    avatar: formString(formData, "avatar") ?? "orbit",
    preferredTheme: formString(formData, "preferredTheme") ?? "system",
    preferredLanguage: formString(formData, "preferredLanguage") ?? "en",
    pin: formString(formData, "pin"),
    pinConfirmation: formString(formData, "pinConfirmation"),
    clearPin: formBoolean(formData, "clearPin"),
  };
}

export async function createProfileAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = profileCreateSchema.safeParse(profileFormData(formData));
  if (!parsed.success) return actionStateFromZod(parsed.error);
  const repository = getIdentityRepository();
  let profile;
  try {
    const session = await getCurrentSession(repository);
    profile = await createProfile(parsed.data, session, repository);
  } catch (error) {
    return actionStateFromError(error);
  }
  revalidatePath("/", "layout");
  revalidatePath("/profiles");
  redirect(`/auth/sign-in?profileId=${encodeURIComponent(profile.id)}&created=1`);
}

export async function updateProfileAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = profileUpdateSchema.safeParse(profileFormData(formData));
  if (!parsed.success) return actionStateFromZod(parsed.error);
  const repository = getIdentityRepository();
  let profile;
  try {
    const session = await getCurrentSession(repository);
    profile = await updateProfile(parsed.data, session, repository);
  } catch (error) {
    return actionStateFromError(error);
  }
  revalidatePath("/", "layout");
  revalidatePath("/profiles");
  redirect(`/profiles/${profile.id}/edit?updated=1`);
}

export async function deleteProfileAction(formData: FormData): Promise<void> {
  const profileId = formString(formData, "profileId");
  if (!profileId) return;
  const repository = getIdentityRepository();
  const session = await getCurrentSession(repository);
  await deleteProfile(profileId, session, repository);
  if (session?.principal.profileId === profileId) {
    const { getAuthProvider } = await import("@/infrastructure/auth/local-auth-provider");
    await getAuthProvider(repository).signOut();
  }
  revalidatePath("/", "layout");
  revalidatePath("/profiles");
  redirect("/profiles");
}
