"use server";

import { revalidatePath } from "next/cache";
import { actionStateFromError, actionStateFromZod, type ActionState } from "@/lib/action-state";
import { formBoolean, formNumber, formString } from "@/lib/form-data";
import { getCurrentSession } from "@/infrastructure/auth/local-auth-provider";
import { getAnalyticsRepository } from "@/infrastructure/database/repositories/analytics-repository";
import { getIdentityRepository } from "@/infrastructure/database/repositories/identity-repository";
import {
  completeTodaySession,
  selectActiveSubjectForProfile,
  startTodaySession,
} from "@/features/today/service";
import { z } from "zod";

const sessionSchema = z.object({
  activityId: z.string().trim().min(1).max(240),
  subjectId: z.string().trim().max(120).nullable().optional(),
});

const completeSchema = z.object({
  sessionId: z.string().trim().min(1).max(120),
  activityId: z.string().trim().max(240).nullable().optional(),
  subjectId: z.string().trim().max(120).nullable().optional(),
  completed: z.boolean().default(true),
  durationSeconds: z.number().int().min(0).max(86_400).optional(),
});

export async function startTodaySessionAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState & { sessionId?: string }> {
  const parsed = sessionSchema.safeParse({
    activityId: formString(formData, "activityId"),
    subjectId: formString(formData, "subjectId") ?? null,
  });
  if (!parsed.success) return actionStateFromZod(parsed.error);
  try {
    const session = await getCurrentSession();
    if (!session) return { ok: false, message: "Authentication is required." };
    const started = await startTodaySession(
      { profileId: session.principal.profileId, ...parsed.data },
      getAnalyticsRepository(),
    );
    return { ok: true, message: "Today session started.", sessionId: started.id };
  } catch (error) {
    return actionStateFromError(error);
  }
}

export async function completeTodaySessionAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = completeSchema.safeParse({
    sessionId: formString(formData, "sessionId"),
    activityId: formString(formData, "activityId") ?? null,
    subjectId: formString(formData, "subjectId") ?? null,
    completed: formBoolean(formData, "completed"),
    durationSeconds: formNumber(formData, "durationSeconds"),
  });
  if (!parsed.success) return actionStateFromZod(parsed.error);
  try {
    const session = await getCurrentSession();
    if (!session) return { ok: false, message: "Authentication is required." };
    await completeTodaySession(
      { profileId: session.principal.profileId, ...parsed.data },
      getAnalyticsRepository(),
    );
    revalidatePath("/dashboard");
    revalidatePath("/progress");
    revalidatePath("/analytics");
    return { ok: true, message: "Today session complete. Your progress is saved." };
  } catch (error) {
    return actionStateFromError(error);
  }
}

export async function selectActiveSubjectAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const subjectId = formString(formData, "subjectId");
  if (!subjectId) return { ok: false, message: "Choose a subject first." };
  try {
    const session = await getCurrentSession();
    if (!session) return { ok: false, message: "Authentication is required." };
    await selectActiveSubjectForProfile(
      session.principal.profileId,
      subjectId,
      getIdentityRepository(),
    );
    revalidatePath("/dashboard");
    revalidatePath("/learn");
    revalidatePath("/settings");
    return { ok: true, message: "Active subject updated." };
  } catch (error) {
    return actionStateFromError(error);
  }
}
