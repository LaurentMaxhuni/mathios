"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { actionStateFromError, actionStateFromZod, type ActionState } from "@/lib/action-state";
import { formString, formStrings } from "@/lib/form-data";
import { getCurrentSession } from "@/infrastructure/auth/local-auth-provider";
import { getIdentityRepository } from "@/infrastructure/database/repositories/identity-repository";
import { replaceProfileRoles } from "@/features/auth/roles-service";

const roleUpdateSchema = z.object({
  profileId: z.string().uuid("Choose a valid profile."),
  roles: z.array(z.enum(["learner", "teacher", "content-creator", "administrator"])).min(1),
});

export async function updateProfileRolesAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = roleUpdateSchema.safeParse({
    profileId: formString(formData, "profileId"),
    roles: formStrings(formData, "roles"),
  });
  if (!parsed.success) return actionStateFromZod(parsed.error);
  const repository = getIdentityRepository();
  try {
    const session = await getCurrentSession(repository);
    await replaceProfileRoles(parsed.data.profileId, parsed.data.roles, session, repository);
    revalidatePath("/settings/roles");
    return { ok: true, message: "Roles updated." };
  } catch (error) {
    return actionStateFromError(error);
  }
}
