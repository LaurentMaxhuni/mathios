"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { ActionFeedback } from "@/components/shared/action-feedback";
import { initialActionState } from "@/lib/action-state";
import { dismissRecommendationAction } from "@/features/mastery/actions";

export function DismissRecommendationForm({ recommendationId }: { recommendationId: string }) {
  const [state, formAction, pending] = React.useActionState(
    dismissRecommendationAction,
    initialActionState,
  );
  return (
    <form action={formAction} className="flex items-center gap-2">
      <input type="hidden" name="recommendationId" value={recommendationId} />
      <Button type="submit" variant="ghost" size="sm" disabled={pending || state.ok}>
        {pending ? "Dismissing…" : state.ok ? "Dismissed" : "Dismiss"}
      </Button>
      <ActionFeedback state={state} />
    </form>
  );
}
