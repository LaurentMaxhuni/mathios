"use client";

import * as React from "react";
import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { SkipLink } from "@/components/layout/skip-link";
import { ProfilePreferenceSync } from "@/components/layout/profile-preference-sync";
import type { UserSettingsRecord } from "@/domain/identity/types";
import type { AuthenticatedPrincipal } from "@/infrastructure/auth/auth-provider";

export function AppShell({
  children,
  principal,
  settings,
}: {
  children: React.ReactNode;
  principal: AuthenticatedPrincipal | null;
  settings: UserSettingsRecord | null;
}) {
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const mobileMenuButtonRef = React.useRef<HTMLButtonElement>(null);
  const closeMobileNavigation = React.useCallback(() => setMobileOpen(false), []);
  const openMobileNavigation = React.useCallback(() => setMobileOpen(true), []);

  return (
    <div className="flex min-h-screen">
      <SkipLink />
      <Sidebar
        mobileOpen={mobileOpen}
        onMobileClose={closeMobileNavigation}
        mobileMenuButtonRef={mobileMenuButtonRef}
        principal={principal}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header
          mobileNavigationOpen={mobileOpen}
          mobileMenuButtonRef={mobileMenuButtonRef}
          onMobileMenuOpen={openMobileNavigation}
          principal={principal}
        />
        <main id="main-content" className="flex-1" tabIndex={-1}>
          {children}
        </main>
      </div>
      <ProfilePreferenceSync principal={principal} settings={settings} />
    </div>
  );
}
