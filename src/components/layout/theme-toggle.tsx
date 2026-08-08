"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { saveThemePreferenceAction } from "@/features/settings/actions";
import type { ThemePreference } from "@/domain/identity/types";

export function ThemeToggle({ profileId }: { profileId?: string } = {}) {
  const { resolvedTheme, setTheme } = useTheme();
  const { toast } = useToast();
  const [mounted, setMounted] = React.useState(false);
  const [isSaving, startSaving] = React.useTransition();

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Button type="button" variant="ghost" size="icon" aria-label="Theme preference" disabled>
        <span className="h-4 w-4" aria-hidden="true" />
      </Button>
    );
  }

  const isDark = resolvedTheme === "dark";
  const nextTheme: ThemePreference = isDark ? "light" : "dark";

  const toggleTheme = () => {
    setTheme(nextTheme);
    if (!profileId) return;

    startSaving(async () => {
      try {
        const result = await saveThemePreferenceAction(nextTheme);
        if (result.ok) return;
        toast({
          title: "Theme preference not saved",
          description: result.message ?? "Your theme changed locally, but could not be saved.",
          variant: "error",
        });
      } catch {
        toast({
          title: "Theme preference not saved",
          description: "Your theme changed locally, but could not be saved.",
          variant: "error",
        });
      }
    });
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      aria-busy={isSaving}
      onClick={toggleTheme}
    >
      {isDark ? (
        <Sun className="h-4 w-4" aria-hidden="true" />
      ) : (
        <Moon className="h-4 w-4" aria-hidden="true" />
      )}
    </Button>
  );
}
