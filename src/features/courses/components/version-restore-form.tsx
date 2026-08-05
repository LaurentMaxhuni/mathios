"use client";

import * as React from "react";
import { RotateCcw } from "lucide-react";
import { ActionFeedback } from "@/components/shared/action-feedback";
import { Button } from "@/components/ui/button";
import { initialActionState } from "@/lib/action-state";
import { restoreLessonVersionAction } from "@/features/courses/actions";

export function VersionRestoreForm({
  lessonId,
  versionId,
  disabled,
}: {
  lessonId: string;
  versionId: string;
  disabled?: boolean;
}) {
  const [state, formAction, pending] = React.useActionState(
    restoreLessonVersionAction,
    initialActionState,
  );
  return (
    <form action={formAction} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="lessonId" value={lessonId} />
      <input type="hidden" name="versionId" value={versionId} />
      <Button type="submit" size="sm" variant="outline" disabled={disabled || pending}>
        <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
        {pending ? "Restoring…" : "Restore as draft"}
      </Button>
      <ActionFeedback state={state} />
    </form>
  );
}
