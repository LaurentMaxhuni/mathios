"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ActionFeedback } from "@/components/shared/action-feedback";
import { signInAction } from "@/features/auth/actions";
import { initialActionState } from "@/lib/action-state";

export function SignInForm({
  profileId,
  requiresSecret,
}: {
  profileId: string;
  requiresSecret: boolean;
}) {
  const [state, formAction, pending] = React.useActionState(signInAction, initialActionState);
  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="profileId" value={profileId} />
      {requiresSecret ? (
        <div className="space-y-2">
          <Label htmlFor="secret">PIN or password</Label>
          <Input
            id="secret"
            name="secret"
            type="password"
            autoComplete="current-password"
            autoFocus
            required
          />
          <p className="text-xs text-muted-foreground">
            This stays on the local device and is never displayed.
          </p>
        </div>
      ) : (
        <p className="rounded-lg bg-muted/60 p-4 text-sm text-muted-foreground">
          This profile does not have a PIN or password. Continue to open the local workspace.
        </p>
      )}
      <ActionFeedback state={state} />
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Opening workspace…" : "Continue"}
      </Button>
    </form>
  );
}
