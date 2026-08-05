"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { ActionFeedback } from "@/components/shared/action-feedback";
import { saveAccessibilitySettingsAction } from "@/features/settings/actions";
import type { UserSettingsRecord } from "@/domain/identity/types";
import { initialActionState } from "@/lib/action-state";

export function AccessibilityForm({ settings }: { settings: UserSettingsRecord }) {
  const [state, formAction, pending] = React.useActionState(
    saveAccessibilitySettingsAction,
    initialActionState,
  );
  const preference = settings.accessibilityPreferences;
  return (
    <form action={formAction} className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex items-start gap-3 rounded-lg border p-4 text-sm">
          <input
            type="checkbox"
            name="reducedMotion"
            defaultChecked={settings.reducedMotion}
            className="mt-0.5 h-4 w-4 rounded border-input"
          />
          <span>
            <span className="block font-medium">Reduce motion</span>
            <span className="mt-1 block text-xs text-muted-foreground">
              Limit transitions, movement, and automatic animation.
            </span>
          </span>
        </label>
        <label className="flex items-start gap-3 rounded-lg border p-4 text-sm">
          <input
            type="checkbox"
            name="highContrast"
            defaultChecked={preference.highContrast}
            className="mt-0.5 h-4 w-4 rounded border-input"
          />
          <span>
            <span className="block font-medium">Higher contrast</span>
            <span className="mt-1 block text-xs text-muted-foreground">
              Strengthen contrast for important interface elements.
            </span>
          </span>
        </label>
        <label className="flex items-start gap-3 rounded-lg border p-4 text-sm">
          <input
            type="checkbox"
            name="underlineLinks"
            defaultChecked={preference.underlineLinks}
            className="mt-0.5 h-4 w-4 rounded border-input"
          />
          <span>
            <span className="block font-medium">Underline links</span>
            <span className="mt-1 block text-xs text-muted-foreground">
              Make links identifiable without relying on color.
            </span>
          </span>
        </label>
        <label className="flex items-start gap-3 rounded-lg border p-4 text-sm">
          <input
            type="checkbox"
            name="focusIndicators"
            defaultChecked={preference.focusIndicators}
            className="mt-0.5 h-4 w-4 rounded border-input"
          />
          <span>
            <span className="block font-medium">Strong focus indicators</span>
            <span className="mt-1 block text-xs text-muted-foreground">
              Keep keyboard focus visibly outlined.
            </span>
          </span>
        </label>
        <label className="flex items-start gap-3 rounded-lg border p-4 text-sm sm:col-span-2">
          <input
            type="checkbox"
            name="screenReaderOptimizations"
            defaultChecked={preference.screenReaderOptimizations}
            className="mt-0.5 h-4 w-4 rounded border-input"
          />
          <span>
            <span className="block font-medium">Screen-reader optimizations</span>
            <span className="mt-1 block text-xs text-muted-foreground">
              Prefer additional structural context when content is announced.
            </span>
          </span>
        </label>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="textSize" className="text-sm font-medium">
            Text size
          </label>
          <select
            id="textSize"
            name="textSize"
            defaultValue={settings.textSize}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="small">Small</option>
            <option value="medium">Medium</option>
            <option value="large">Large</option>
          </select>
        </div>
        <div className="space-y-2">
          <label htmlFor="formulaRendering" className="text-sm font-medium">
            Formula rendering
          </label>
          <select
            id="formulaRendering"
            name="formulaRendering"
            defaultValue={settings.formulaRendering}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="accessible">Rendered with accessible text</option>
            <option value="rendered">Rendered formulas</option>
            <option value="plain">Plain-text fallback</option>
          </select>
        </div>
      </div>
      <ActionFeedback state={state} />
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save accessibility settings"}
      </Button>
    </form>
  );
}
