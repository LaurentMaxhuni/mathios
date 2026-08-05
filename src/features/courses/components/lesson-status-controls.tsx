"use client";

import * as React from "react";
import { Archive, ArchiveRestore, Eye, Send } from "lucide-react";
import Link from "next/link";
import { ActionFeedback } from "@/components/shared/action-feedback";
import { Button, buttonVariants } from "@/components/ui/button";
import { initialActionState } from "@/lib/action-state";
import {
  archiveLessonAction,
  publishLessonAction,
  restoreLessonAction,
} from "@/features/courses/actions";

export function LessonStatusControls({
  lessonId,
  status,
}: {
  lessonId: string;
  status: "draft" | "published" | "archived";
}) {
  const [publishState, publishAction, publishing] = React.useActionState(
    publishLessonAction,
    initialActionState,
  );
  const [archiveState, archiveAction, archiving] = React.useActionState(
    archiveLessonAction,
    initialActionState,
  );
  const [restoreState, restoreAction, restoring] = React.useActionState(
    restoreLessonAction,
    initialActionState,
  );
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Link
        href={`/lessons/${lessonId}/preview`}
        className={buttonVariants({ variant: "outline", size: "sm" })}
      >
        <Eye className="h-4 w-4" aria-hidden="true" /> Preview
      </Link>
      <Link
        href={`/lessons/${lessonId}/versions`}
        className={buttonVariants({ variant: "ghost", size: "sm" })}
      >
        Versions
      </Link>
      {status !== "published" ? (
        <form action={publishAction} className="flex items-center gap-2">
          <input type="hidden" name="lessonId" value={lessonId} />
          <input type="hidden" name="changeSummary" value="Published from lesson editor" />
          <Button type="submit" size="sm" disabled={publishing}>
            <Send className="h-4 w-4" aria-hidden="true" />
            {publishing ? "Publishing…" : "Publish"}
          </Button>
        </form>
      ) : null}
      {status === "published" ? (
        <form action={archiveAction}>
          <input type="hidden" name="lessonId" value={lessonId} />
          <Button type="submit" size="sm" variant="outline" disabled={archiving}>
            <Archive className="h-4 w-4" aria-hidden="true" />
            Archive
          </Button>
        </form>
      ) : null}
      {status === "archived" ? (
        <form action={restoreAction}>
          <input type="hidden" name="lessonId" value={lessonId} />
          <Button type="submit" size="sm" variant="outline" disabled={restoring}>
            <ArchiveRestore className="h-4 w-4" aria-hidden="true" />
            Restore draft
          </Button>
        </form>
      ) : null}
      <ActionFeedback state={publishState} />
      <ActionFeedback state={archiveState} />
      <ActionFeedback state={restoreState} />
    </div>
  );
}
