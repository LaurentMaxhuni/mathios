"use client";

import * as React from "react";
import { Archive, ArchiveRestore, Send } from "lucide-react";
import { ActionFeedback } from "@/components/shared/action-feedback";
import { Button } from "@/components/ui/button";
import { initialActionState } from "@/lib/action-state";
import { setCourseStatusAction } from "@/features/courses/actions";
import type { CourseStatus } from "@/domain/course/types";

export function CourseStatusControls({
  courseId,
  status,
}: {
  courseId: string;
  status: CourseStatus;
}) {
  const [state, formAction, pending] = React.useActionState(
    setCourseStatusAction,
    initialActionState,
  );
  const nextStatus =
    status === "published" ? "archived" : status === "archived" ? "draft" : "published";
  const label =
    nextStatus === "published"
      ? "Publish course"
      : nextStatus === "archived"
        ? "Archive course"
        : "Restore draft";
  const Icon =
    nextStatus === "published" ? Send : nextStatus === "archived" ? Archive : ArchiveRestore;
  return (
    <div className="flex flex-wrap items-center gap-3">
      <form action={formAction}>
        <input type="hidden" name="courseId" value={courseId} />
        <input type="hidden" name="status" value={nextStatus} />
        <Button
          type="submit"
          size="sm"
          variant={nextStatus === "published" ? "default" : "outline"}
          disabled={pending}
        >
          <Icon className="h-4 w-4" aria-hidden="true" />
          {pending ? "Saving…" : label}
        </Button>
      </form>
      <ActionFeedback state={state} />
    </div>
  );
}
