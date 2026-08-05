"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { ActionFeedback } from "@/components/shared/action-feedback";
import { updateProfileRolesAction } from "@/features/auth/roles-actions";
import type { ProfileWithRoles, RoleRecord } from "@/domain/identity/types";
import { initialActionState } from "@/lib/action-state";

export function RoleAssignmentForm({
  profile,
  roles,
}: {
  profile: ProfileWithRoles;
  roles: readonly RoleRecord[];
}) {
  const [state, formAction, pending] = React.useActionState(
    updateProfileRolesAction,
    initialActionState,
  );
  return (
    <form action={formAction} className="space-y-4 rounded-xl border bg-card p-5">
      <input type="hidden" name="profileId" value={profile.id} />
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-muted text-sm font-semibold">
          {profile.displayName.slice(0, 1).toUpperCase()}
        </div>
        <div>
          <h2 className="font-semibold">{profile.displayName}</h2>
          <p className="text-xs text-muted-foreground">
            {profile.hasSecret ? "PIN protected" : "No PIN"}
          </p>
        </div>
      </div>
      <fieldset>
        <legend className="text-sm font-medium">Roles</legend>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {roles.map((role) => (
            <label
              key={role.slug}
              className="flex items-start gap-3 rounded-lg border p-3 text-sm hover:bg-muted/50"
            >
              <input
                type="checkbox"
                name="roles"
                value={role.slug}
                defaultChecked={profile.roles.includes(role.slug)}
                className="mt-0.5 h-4 w-4 rounded border-input"
              />
              <span>
                <span className="block font-medium">{role.name}</span>
                <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                  {role.description}
                </span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <ActionFeedback state={state} />
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Updating…" : "Update roles"}
      </Button>
    </form>
  );
}
