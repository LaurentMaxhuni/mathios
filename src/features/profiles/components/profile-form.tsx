"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ActionFeedback } from "@/components/shared/action-feedback";
import type { PublicProfile } from "@/features/profiles/service";
import { avatarLabels, profileAvatars, type ProfileCreateInput } from "@/features/profiles/schemas";
import { createProfileAction, updateProfileAction } from "@/features/profiles/actions";
import { initialActionState } from "@/lib/action-state";

export function ProfileForm({
  mode,
  profile,
}: {
  mode: "create" | "edit";
  profile?: PublicProfile;
}) {
  const action = mode === "create" ? createProfileAction : updateProfileAction;
  const [state, formAction, pending] = React.useActionState(action, initialActionState);
  const defaultValues: Partial<ProfileCreateInput> = profile
    ? {
        displayName: profile.displayName,
        avatar: profile.avatar as ProfileCreateInput["avatar"],
        preferredTheme: profile.preferredTheme,
        preferredLanguage: profile.preferredLanguage as ProfileCreateInput["preferredLanguage"],
      }
    : {};

  return (
    <form action={formAction} className="space-y-6">
      {profile ? <input type="hidden" name="profileId" value={profile.id} /> : null}
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="displayName">Display name</Label>
          <Input
            id="displayName"
            name="displayName"
            defaultValue={defaultValues.displayName}
            placeholder="e.g. Alex"
            autoComplete="nickname"
            required
          />
          <p className="text-xs text-muted-foreground">
            This is the name shown around your workspace.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="avatar">Profile avatar</Label>
          <select
            id="avatar"
            name="avatar"
            defaultValue={defaultValues.avatar ?? "orbit"}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {profileAvatars.map((avatar) => (
              <option key={avatar} value={avatar}>
                {avatarLabels[avatar]}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="preferredLanguage">Preferred language</Label>
          <select
            id="preferredLanguage"
            name="preferredLanguage"
            defaultValue={defaultValues.preferredLanguage ?? "en"}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="en">English</option>
            <option value="sq">Shqip</option>
            <option value="de">Deutsch</option>
          </select>
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="preferredTheme">Preferred theme</Label>
          <select
            id="preferredTheme"
            name="preferredTheme"
            defaultValue={defaultValues.preferredTheme ?? "system"}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="system">Follow device</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="pin">Optional PIN or password</Label>
          <Input
            id="pin"
            name="pin"
            type="password"
            autoComplete={mode === "create" ? "new-password" : "new-password"}
            placeholder={
              mode === "edit" && profile?.hasSecret
                ? "Leave blank to keep current"
                : "At least 4 characters"
            }
          />
          <p className="text-xs text-muted-foreground">
            {mode === "edit" && profile?.hasSecret
              ? "Leave this blank to keep the current PIN or password."
              : "You can keep this profile open locally or add a short private secret."}
          </p>
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="pinConfirmation">Confirm PIN or password</Label>
          <Input
            id="pinConfirmation"
            name="pinConfirmation"
            type="password"
            autoComplete="new-password"
          />
        </div>
        {mode === "edit" && profile?.hasSecret ? (
          <label className="flex items-center gap-3 text-sm sm:col-span-2">
            <input type="checkbox" name="clearPin" className="h-4 w-4 rounded border-input" />
            Remove the PIN or password from this profile
          </label>
        ) : null}
      </div>

      <ActionFeedback state={state} />
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : mode === "create" ? "Create profile" : "Save profile"}
        </Button>
        <Link
          href={mode === "create" ? "/profiles" : "/profiles"}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
