"use server";

import { revalidatePath } from "next/cache";
import { actionStateFromError, actionStateFromZod, type ActionState } from "@/lib/action-state";
import { formString } from "@/lib/form-data";
import { getCurrentSession } from "@/infrastructure/auth/local-auth-provider";
import { getMasteryRepository } from "@/infrastructure/database/repositories/mastery-repository";
import {
  dismissRecommendation,
  refreshRecommendations,
  requireMasteryLearner,
} from "@/features/mastery/service";
import { recommendationDismissalSchema } from "@/features/mastery/schemas";

function refreshMasteryPaths() {
  revalidatePath("/mastery");
  revalidatePath("/mastery/subjects");
  revalidatePath("/mastery/grades");
  revalidatePath("/recommendations");
  revalidatePath("/review-queue");
}

export async function dismissRecommendationAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  void _previous;
  const parsed = recommendationDismissalSchema.safeParse({
    recommendationId: formString(formData, "recommendationId"),
    reason: formString(formData, "reason") ?? undefined,
  });
  if (!parsed.success) return actionStateFromZod(parsed.error);
  try {
    const principal = requireMasteryLearner(await getCurrentSession());
    await dismissRecommendation(
      principal.profileId,
      parsed.data.recommendationId,
      getMasteryRepository(),
      parsed.data.reason,
    );
    refreshMasteryPaths();
    return { ok: true, message: "Recommendation dismissed." };
  } catch (error) {
    return actionStateFromError(error);
  }
}

export async function refreshRecommendationsAction(
  _previous: ActionState,
  _formData: FormData,
): Promise<ActionState> {
  void _previous;
  void _formData;
  try {
    const principal = requireMasteryLearner(await getCurrentSession());
    await refreshRecommendations(principal.profileId, getMasteryRepository());
    refreshMasteryPaths();
    return { ok: true, message: "Recommendations refreshed." };
  } catch (error) {
    return actionStateFromError(error);
  }
}
