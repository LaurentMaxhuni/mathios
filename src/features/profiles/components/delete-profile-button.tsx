"use client";

import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteProfileAction } from "@/features/profiles/actions";

export function DeleteProfileButton({
  profileId,
  displayName,
}: {
  profileId: string;
  displayName: string;
}) {
  return (
    <form
      action={deleteProfileAction}
      onSubmit={(event) => {
        if (!window.confirm(`Delete the profile “${displayName}”? This cannot be undone.`))
          event.preventDefault();
      }}
    >
      <input type="hidden" name="profileId" value={profileId} />
      <Button type="submit" variant="destructive" size="sm">
        <Trash2 className="h-4 w-4" aria-hidden="true" /> Delete
      </Button>
    </form>
  );
}
