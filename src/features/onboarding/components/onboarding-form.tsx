"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ActionFeedback } from "@/components/shared/action-feedback";
import { saveOnboardingAction, skipOnboardingAction } from "@/features/onboarding/actions";
import type { OnboardingResponseRecord } from "@/domain/identity/types";
import { initialActionState } from "@/lib/action-state";

const subjects = [
  ["mathematics", "Mathematics"],
  ["physics", "Physics"],
  ["chemistry", "Chemistry"],
  ["biology", "Biology"],
  ["astronomy", "Astronomy"],
] as const;
const days = [
  [0, "Sunday"],
  [1, "Monday"],
  [2, "Tuesday"],
  [3, "Wednesday"],
  [4, "Thursday"],
  [5, "Friday"],
  [6, "Saturday"],
] as const;

export function OnboardingForm({ response }: { response: OnboardingResponseRecord | null }) {
  const [state, formAction, pending] = React.useActionState(
    saveOnboardingAction,
    initialActionState,
  );
  const selectedSubjects = response?.subjects ?? [];
  const selectedDays = response?.preferredStudyDays ?? [];
  return (
    <div className="space-y-5">
      <form action={formAction} className="space-y-7">
        <section className="grid gap-5 sm:grid-cols-2" aria-labelledby="pathway-heading">
          <div className="sm:col-span-2">
            <h2 id="pathway-heading" className="text-base font-semibold">
              Your learning pathway
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              These are personal starting points; curricula and grade structures will be
              configurable in a later phase.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="curriculum">Curriculum or pathway</Label>
            <Input
              id="curriculum"
              name="curriculum"
              defaultValue={response?.curriculum ?? ""}
              placeholder="e.g. National curriculum"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="currentGrade">Current grade or level</Label>
            <Input
              id="currentGrade"
              name="currentGrade"
              defaultValue={response?.currentGrade ?? ""}
              placeholder="e.g. Grade 8"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="targetGrade">Target grade or level</Label>
            <Input
              id="targetGrade"
              name="targetGrade"
              defaultValue={response?.targetGrade ?? ""}
              placeholder="e.g. Grade 10"
              required
            />
          </div>
        </section>

        <fieldset>
          <legend className="text-base font-semibold">Subjects</legend>
          <p className="mt-1 text-sm text-muted-foreground">
            Choose the areas you want to keep close at hand.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {subjects.map(([value, label]) => (
              <label
                key={value}
                className="flex items-center gap-3 rounded-lg border p-3 text-sm hover:bg-muted/50"
              >
                <input
                  type="checkbox"
                  name="subjects"
                  value={value}
                  defaultChecked={selectedSubjects.includes(value)}
                  className="h-4 w-4 rounded border-input"
                />
                {label}
              </label>
            ))}
          </div>
        </fieldset>

        <section className="grid gap-5 sm:grid-cols-2" aria-labelledby="goals-heading">
          <div className="sm:col-span-2">
            <h2 id="goals-heading" className="text-base font-semibold">
              Goals and rhythm
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">Put one learning goal per line.</p>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="learningGoals">Learning goals</Label>
            <textarea
              id="learningGoals"
              name="learningGoals"
              defaultValue={(response?.learningGoals ?? []).join("\n")}
              rows={4}
              placeholder="Understand algebraic equations\nBuild confidence with physics problems"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="weeklyStudyTimeMinutes">Weekly study time</Label>
            <select
              id="weeklyStudyTimeMinutes"
              name="weeklyStudyTimeMinutes"
              defaultValue={response?.weeklyStudyTimeMinutes ?? 150}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="60">1 hour</option>
              <option value="150">2.5 hours</option>
              <option value="300">5 hours</option>
              <option value="600">10 hours</option>
              <option value="1000">More than 16 hours</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="difficultyPreference">Difficulty preference</Label>
            <select
              id="difficultyPreference"
              name="difficultyPreference"
              defaultValue={response?.difficultyPreference ?? "balanced"}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="gentle">Gentle and confidence-building</option>
              <option value="balanced">Balanced</option>
              <option value="challenging">Challenging</option>
            </select>
          </div>
        </section>

        <fieldset>
          <legend className="text-base font-semibold">Preferred study days</legend>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {days.map(([value, label]) => (
              <label
                key={value}
                className="flex items-center gap-3 rounded-lg border p-3 text-sm hover:bg-muted/50"
              >
                <input
                  type="checkbox"
                  name="preferredStudyDays"
                  value={value}
                  defaultChecked={selectedDays.includes(value)}
                  className="h-4 w-4 rounded border-input"
                />
                {label}
              </label>
            ))}
          </div>
        </fieldset>
        <ActionFeedback state={state} />
        <div className="flex flex-wrap gap-3">
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : "Save onboarding"}
          </Button>
          <button
            type="submit"
            formAction={skipOnboardingAction}
            className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted"
            disabled={pending}
          >
            Skip for now
          </button>
        </div>
      </form>
    </div>
  );
}
