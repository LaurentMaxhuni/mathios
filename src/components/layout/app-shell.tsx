"use client";

import * as React from "react";
import { motion, useReducedMotion } from "motion/react";
import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { SkipLink } from "@/components/layout/skip-link";
import { ProfilePreferenceSync } from "@/components/layout/profile-preference-sync";
import { usePathname } from "next/navigation";
import type { UserSettingsRecord } from "@/domain/identity/types";
import type { AuthenticatedPrincipal } from "@/infrastructure/auth/auth-provider";
import type { AuthMode } from "@/infrastructure/auth/auth-provider";

export function AppShell({
  children,
  authMode,
  principal,
  settings,
}: {
  children: React.ReactNode;
  authMode: AuthMode;
  principal: AuthenticatedPrincipal | null;
  settings: UserSettingsRecord | null;
}) {
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const mobileMenuButtonRef = React.useRef<HTMLButtonElement>(null);
  const closeMobileNavigation = React.useCallback(() => setMobileOpen(false), []);
  const openMobileNavigation = React.useCallback(() => setMobileOpen(true), []);
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();
  const isStandaloneRoute =
    pathname === "/auth" || pathname?.startsWith("/auth/") || (!principal && pathname === "/");

  if (isStandaloneRoute) {
    return (
      <div className="min-h-[100dvh]">
        <SkipLink />
        <main id="main-content" tabIndex={-1}>
          <motion.div
            key={pathname ?? "standalone"}
            initial={reduceMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.35, ease: [0.16, 1, 0.3, 1] }}
          >
            {children}
          </motion.div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <SkipLink />
      <Sidebar
        mobileOpen={mobileOpen}
        onMobileClose={closeMobileNavigation}
        mobileMenuButtonRef={mobileMenuButtonRef}
        authMode={authMode}
        principal={principal}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header
          mobileNavigationOpen={mobileOpen}
          mobileMenuButtonRef={mobileMenuButtonRef}
          onMobileMenuOpen={openMobileNavigation}
          authMode={authMode}
          principal={principal}
        />
        <main id="main-content" className="app-main flex-1" tabIndex={-1}>
          <motion.div
            key={pathname ?? "app"}
            initial={reduceMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.35, ease: [0.16, 1, 0.3, 1] }}
          >
            {children}
          </motion.div>
        </main>
      </div>
      <ProfilePreferenceSync principal={principal} settings={settings} />
    </div>
  );
}
