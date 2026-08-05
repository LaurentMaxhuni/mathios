"use client";

import type { ActionState } from "@/lib/action-state";

export function ActionFeedback({ state }: { state: ActionState }) {
  if (!state.message && !state.issues?.length) return null;
  return (
    <div
      className={
        state.ok
          ? "rounded-lg border border-accent/30 bg-accent/10 p-3 text-sm"
          : "rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm"
      }
      role={state.ok ? "status" : "alert"}
    >
      {state.message ? <p className="font-medium">{state.message}</p> : null}
      {state.issues?.length ? (
        <ul className="mt-2 list-disc space-y-1 pl-5 text-destructive">
          {state.issues.map((issue) => (
            <li key={`${issue.path}-${issue.message}`}>{issue.message}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
