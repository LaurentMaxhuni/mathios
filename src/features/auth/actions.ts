"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { actionStateFromError, actionStateFromZod, type ActionState } from "@/lib/action-state";
import { getAuthProvider } from "@/infrastructure/auth/local-auth-provider";

const signInSchema = z.object({
  profileId: z.string().uuid("Choose a valid profile."),
  secret: z.string().max(128).optional(),
});

export async function signInAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = signInSchema.safeParse({
    profileId: formData.get("profileId"),
    secret: typeof formData.get("secret") === "string" ? formData.get("secret") : undefined,
  });
  if (!parsed.success) return actionStateFromZod(parsed.error);

  try {
    await getAuthProvider().signIn({
      identifier: parsed.data.profileId,
      secret: parsed.data.secret,
    });
  } catch (error) {
    return actionStateFromError(error);
  }
  redirect("/");
}

export async function signOutAction(): Promise<void> {
  await getAuthProvider().signOut();
  redirect("/profiles");
}
