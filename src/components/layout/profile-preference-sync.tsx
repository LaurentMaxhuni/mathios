"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import type { UserSettingsRecord } from "@/domain/identity/types";
import type { AuthenticatedPrincipal } from "@/infrastructure/auth/auth-provider";

export function ProfilePreferenceSync({
  principal,
  settings,
}: {
  principal: AuthenticatedPrincipal | null;
  settings: UserSettingsRecord | null;
}) {
  const { setTheme } = useTheme();
  React.useEffect(() => {
    if (!principal && !settings) return;
    setTheme(settings?.theme ?? principal?.preferredTheme ?? "system");
    const root = document.documentElement;
    root.dataset.textSize = settings?.textSize ?? "medium";
    root.dataset.reducedMotion = settings?.reducedMotion ? "true" : "false";
    root.dataset.highContrast = settings?.accessibilityPreferences.highContrast ? "true" : "false";
    root.dataset.underlineLinks = settings?.accessibilityPreferences.underlineLinks
      ? "true"
      : "false";
  }, [principal, setTheme, settings]);
  return null;
}
