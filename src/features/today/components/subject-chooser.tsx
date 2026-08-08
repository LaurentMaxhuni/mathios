"use client";

import * as React from "react";
import { Check, ChevronDown } from "lucide-react";
import { selectActiveSubjectAction } from "@/features/today/actions";
import { ActionFeedback } from "@/components/shared/action-feedback";
import { initialActionState } from "@/lib/action-state";
import type { TodayDashboardData } from "@/domain/today/types";

export function SubjectChooser({
  subjects,
  activeSubjectId,
}: {
  subjects: TodayDashboardData["subjects"];
  activeSubjectId?: string;
}) {
  const [state, formAction, pending] = React.useActionState(
    selectActiveSubjectAction,
    initialActionState,
  );
  return (
    <form action={formAction} className="flex flex-wrap items-center gap-2">
      <label htmlFor="today-subject" className="sr-only">
        Active subject
      </label>
      <div className="relative">
        <select
          id="today-subject"
          name="subjectId"
          defaultValue={activeSubjectId ?? subjects[0]?.id ?? ""}
          className="field-select min-w-48 appearance-none pr-9"
          disabled={pending || !subjects.length}
          aria-label="Active subject"
        >
          {subjects.map((subject) => (
            <option key={subject.id} value={subject.id}>
              {subject.name}
            </option>
          ))}
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-muted-foreground"
          aria-hidden="true"
        />
      </div>
      <button
        type="submit"
        className="inline-flex h-10 items-center gap-2 rounded-md border px-3 text-sm font-medium transition hover:bg-muted disabled:opacity-50"
        disabled={pending || !subjects.length}
      >
        <Check className="h-4 w-4" aria-hidden="true" />
        {pending ? "Saving…" : "Use subject"}
      </button>
      <ActionFeedback state={state} />
    </form>
  );
}
