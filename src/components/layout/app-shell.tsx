"use client";

import * as React from "react";
import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
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

  return (
    <div className="flex min-h-screen">
      <Sidebar mobileOpen={mobileOpen} onMobileClose={() => setMobileOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header onMobileMenuOpen={() => setMobileOpen(true)} principal={principal} />
        <main className="flex-1">{children}</main>
      </div>
      <ProfilePreferenceSync principal={principal} settings={settings} />
    </div>
  );
}
