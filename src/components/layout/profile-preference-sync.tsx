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
  const setThemeRef = React.useRef(setTheme);

  React.useEffect(() => {
    setThemeRef.current = setTheme;
  }, [setTheme]);

  const profileId = principal?.profileId ?? settings?.profileId ?? null;
  const savedTheme = settings?.theme ?? principal?.preferredTheme ?? "system";

  React.useEffect(() => {
    if (!profileId) return;
    setThemeRef.current(savedTheme);
  }, [profileId, savedTheme]);

  React.useEffect(() => {
    if (!principal && !settings) return;
    const root = document.documentElement;
    root.dataset.textSize = settings?.textSize ?? "medium";
    root.dataset.reducedMotion = settings?.reducedMotion ? "true" : "false";
    root.dataset.highContrast = settings?.accessibilityPreferences.highContrast ? "true" : "false";
    root.dataset.focusIndicators = settings?.accessibilityPreferences.focusIndicators
      ? "true"
      : "false";
    root.dataset.screenReaderOptimizations = settings?.accessibilityPreferences
      .screenReaderOptimizations
      ? "true"
      : "false";
    root.dataset.underlineLinks = settings?.accessibilityPreferences.underlineLinks
      ? "true"
      : "false";
  }, [principal, profileId, settings]);
  return null;
}
