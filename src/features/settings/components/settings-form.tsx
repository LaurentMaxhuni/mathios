"use client";

import * as React from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ActionFeedback } from "@/components/shared/action-feedback";
import { saveSettingsAction } from "@/features/settings/actions";
import type { UserSettingsRecord } from "@/domain/identity/types";
import { initialActionState } from "@/lib/action-state";

const subjects = [
  ["mathematics", "Mathematics"],
  ["physics", "Physics"],
  ["chemistry", "Chemistry"],
  ["biology", "Biology"],
  ["astronomy", "Astronomy"],
] as const;

const weekDays = [
  [0, "Sunday"],
  [1, "Monday"],
  [2, "Tuesday"],
  [3, "Wednesday"],
  [4, "Thursday"],
  [5, "Friday"],
  [6, "Saturday"],
] as const;

export function SettingsForm({ settings }: { settings: UserSettingsRecord }) {
  const [state, formAction, pending] = React.useActionState(saveSettingsAction, initialActionState);
  const { setTheme } = useTheme();
  return (
    <form action={formAction} className="space-y-7">
      <section className="grid gap-5 sm:grid-cols-2" aria-labelledby="workspace-preferences">
        <div className="sm:col-span-2">
          <h2 id="workspace-preferences" className="text-base font-semibold">
            Workspace preferences
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            These choices belong to the selected local profile.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="theme">Theme</Label>
          <select
            id="theme"
            name="theme"
            defaultValue={settings.theme}
            onChange={(event) => setTheme(event.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="system">Follow device</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="textSize">Text size</Label>
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
          <Label htmlFor="defaultCurriculum">Default curriculum</Label>
          <Input
            id="defaultCurriculum"
            name="defaultCurriculum"
            defaultValue={settings.defaultCurriculum ?? ""}
            placeholder="e.g. National curriculum"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="defaultGrade">Default grade or level</Label>
          <Input
            id="defaultGrade"
            name="defaultGrade"
            defaultValue={settings.defaultGrade ?? ""}
            placeholder="e.g. Grade 8"
          />
        </div>
      </section>

      <fieldset>
        <legend className="text-base font-semibold">Preferred subjects</legend>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose the subjects to surface first when learning features arrive.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {subjects.map(([value, label]) => (
            <label
              key={value}
              className="flex items-center gap-3 rounded-lg border p-3 text-sm hover:bg-muted/50"
            >
              <input
                type="checkbox"
                name="preferredSubjects"
                value={value}
                defaultChecked={settings.preferredSubjects.includes(value)}
                className="h-4 w-4 rounded border-input"
              />
              {label}
            </label>
          ))}
        </div>
      </fieldset>

      <section className="grid gap-5 sm:grid-cols-2" aria-labelledby="study-preferences">
        <div className="sm:col-span-2">
          <h2 id="study-preferences" className="text-base font-semibold">
            Study preferences
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            These settings will guide future personal study sessions.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="studySessionDuration">Study-session duration</Label>
          <select
            id="studySessionDuration"
            name="studySessionDuration"
            defaultValue={settings.studySessionDuration}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {[15, 25, 30, 45, 60, 90].map((minutes) => (
              <option key={minutes} value={minutes}>
                {minutes} minutes
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="weekStartDay">Week starts on</Label>
          <select
            id="weekStartDay"
            name="weekStartDay"
            defaultValue={settings.weekStartDay}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {weekDays.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="formulaRendering">Formula rendering</Label>
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
      </section>

      <fieldset>
        <legend className="text-base font-semibold">Accessibility preferences</legend>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <PreferenceCheckbox
            name="reducedMotion"
            label="Reduce motion"
            checked={settings.reducedMotion}
            description="Minimize animation and transitions."
          />
          <PreferenceCheckbox
            name="highContrast"
            label="Higher contrast"
            checked={settings.accessibilityPreferences.highContrast}
            description="Increase contrast for important surfaces."
          />
          <PreferenceCheckbox
            name="underlineLinks"
            label="Underline links"
            checked={settings.accessibilityPreferences.underlineLinks}
            description="Make links identifiable without color alone."
          />
          <PreferenceCheckbox
            name="focusIndicators"
            label="Strong focus indicators"
            checked={settings.accessibilityPreferences.focusIndicators}
            description="Keep keyboard focus visibly outlined."
          />
          <PreferenceCheckbox
            name="screenReaderOptimizations"
            label="Screen-reader optimizations"
            checked={settings.accessibilityPreferences.screenReaderOptimizations}
            description="Prefer additional structural announcements."
          />
        </div>
        <Link
          href="/settings/accessibility"
          className="mt-4 inline-block text-sm font-medium text-accent hover:underline"
        >
          Open dedicated accessibility settings
        </Link>
      </fieldset>

      <ActionFeedback state={state} />
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save settings"}
      </Button>
    </form>
  );
}

function PreferenceCheckbox({
  name,
  label,
  checked,
  description,
}: {
  name: string;
  label: string;
  checked: boolean;
  description: string;
}) {
  return (
    <label className="flex items-start gap-3 rounded-lg border p-3 text-sm hover:bg-muted/50">
      <input
        type="checkbox"
        name={name}
        defaultChecked={checked}
        className="mt-0.5 h-4 w-4 rounded border-input"
      />
      <span>
        <span className="block font-medium">{label}</span>
        <span className="mt-1 block text-xs leading-5 text-muted-foreground">{description}</span>
      </span>
    </label>
  );
}
