"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import {
  BarChart3,
  BookOpen,
  BrainCircuit,
  Home,
  LogOut,
  MoreHorizontal,
  Settings,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getFocusableElements } from "@/lib/focus";
import { ProfileAvatar } from "@/components/shared/profile-avatar";
import { BrandMark } from "@/components/shared/brand-mark";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Button } from "@/components/ui/button";
import { signOutAction } from "@/features/auth/actions";
import type { AuthMode, AuthenticatedPrincipal } from "@/infrastructure/auth/auth-provider";

type NavigationSection = "primary" | "settings";

const navigationSections: Array<{ id: NavigationSection; label: string }> = [
  { id: "primary", label: "Learn" },
  { id: "settings", label: "Settings" },
];

type NavigationItem = {
  href: string;
  label: string;
  icon: typeof Home;
  section: NavigationSection;
};

const navigation: NavigationItem[] = [
  { href: "/dashboard" as const, label: "Today", icon: Home, section: "primary" },
  { href: "/learn" as const, label: "Learn", icon: BookOpen, section: "primary" },
  { href: "/practice" as const, label: "Practice", icon: BrainCircuit, section: "primary" },
  { href: "/progress" as const, label: "Progress", icon: BarChart3, section: "primary" },
  { href: "/more" as const, label: "More", icon: MoreHorizontal, section: "primary" },
  { href: "/settings" as const, label: "Settings", icon: Settings, section: "settings" },
];

interface SidebarProps {
  mobileOpen: boolean;
  onMobileClose: () => void;
  mobileMenuButtonRef: React.RefObject<HTMLButtonElement | null>;
  authMode: AuthMode;
  principal: AuthenticatedPrincipal | null;
}

export function Sidebar({
  mobileOpen,
  mobileMenuButtonRef,
  onMobileClose,
  authMode,
  principal,
}: SidebarProps) {
  const pathname = usePathname();
  const sidebarRef = React.useRef<HTMLElement>(null);
  const closeButtonRef = React.useRef<HTMLButtonElement>(null);
  const restoreFocusRef = React.useRef<HTMLElement | null>(null);
  const settingsNavigation = navigation.filter((item) => item.section === "settings");
  const activeHref = navigation
    .filter((item) => {
      return pathname === item.href || pathname.startsWith(`${item.href}/`);
    })
    .sort((left, right) => right.href.length - left.href.length)[0]?.href;

  React.useEffect(() => {
    const sidebar = sidebarRef.current;
    if (!sidebar) return;

    const mediaQuery = window.matchMedia("(max-width: 1023px)");
    const updateInert = () => {
      if (mediaQuery.matches && !mobileOpen) sidebar.setAttribute("inert", "");
      else sidebar.removeAttribute("inert");
    };
    updateInert();
    mediaQuery.addEventListener("change", updateInert);
    return () => mediaQuery.removeEventListener("change", updateInert);
  }, [mobileOpen]);

  React.useEffect(() => {
    if (mobileOpen) {
      restoreFocusRef.current =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : mobileMenuButtonRef.current;
      closeButtonRef.current?.focus();
      const onKeyDown = (event: KeyboardEvent) => {
        if (event.key === "Escape") {
          event.preventDefault();
          onMobileClose();
          return;
        }
        if (event.key !== "Tab" || !sidebarRef.current) return;
        const focusable = getFocusableElements(sidebarRef.current);
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      };
      window.addEventListener("keydown", onKeyDown);
      return () => window.removeEventListener("keydown", onKeyDown);
    }

    const restore = restoreFocusRef.current;
    if (restore && document.contains(restore)) restore.focus();
    else mobileMenuButtonRef.current?.focus();
    restoreFocusRef.current = null;
  }, [mobileMenuButtonRef, mobileOpen, onMobileClose]);

  return (
    <>
      {mobileOpen ? (
        <button
          type="button"
          aria-label="Close navigation"
          className="fixed inset-0 z-30 bg-foreground/30 lg:hidden"
          onClick={onMobileClose}
        />
      ) : null}
      <aside
        ref={sidebarRef}
        id="primary-navigation"
        aria-label="Primary navigation"
        className={cn(
          "app-sidebar fixed inset-y-0 left-0 z-40 flex h-dvh w-72 flex-col border-r px-4 py-5 shadow-2xl backdrop-blur transition-transform lg:sticky lg:top-0 lg:z-auto lg:translate-x-0 lg:shadow-none",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center justify-between px-3">
          <Link
            href={"/dashboard" as never}
            className="group flex items-center gap-3"
            onClick={onMobileClose}
          >
            <BrandMark className="app-brand-mark h-10 w-10 rounded-xl shadow-sm transition-transform group-hover:-rotate-6" />
            <span>
              <span className="app-brand-name block text-sm font-bold tracking-[0.2em]">
                MATHIOS
              </span>
              <span className="app-brand-caption block text-[0.68rem] uppercase tracking-[0.18em]">
                Daily science learning
              </span>
            </span>
          </Link>
          <button
            type="button"
            aria-label="Close navigation"
            ref={closeButtonRef}
            className="rounded-md p-2 hover:bg-muted lg:hidden"
            onClick={onMobileClose}
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="mt-10 min-h-0 flex-1 overflow-y-auto">
          <nav aria-label="Primary navigation links" className="space-y-5">
            {navigationSections.map((section) => {
              if (section.id === "settings") return null;
                const sectionNavigation = navigation.filter(
                (item) => item.section === section.id,
              );
              if (!sectionNavigation.length) return null;
              return (
                <div key={section.id}>
                  <p className="app-sidebar-section-label px-3 text-[0.68rem] font-semibold uppercase tracking-[0.22em]">
                    {section.label}
                  </p>
                  <div className="mt-2 space-y-1">
                    {sectionNavigation.map((item) => {
                      return (
                        <NavigationLink
                          key={item.href}
                          item={item}
                          active={item.href === activeHref}
                          onClick={onMobileClose}
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </nav>
        </div>

        {settingsNavigation.length ? (
          <nav aria-label="Settings navigation" className="app-sidebar-settings mt-3 border-t pt-3">
            {settingsNavigation.map((item) => (
              <NavigationLink
                key={item.href}
                item={item}
                active={item.href === activeHref}
                onClick={onMobileClose}
              />
            ))}
          </nav>
        ) : null}

        <div className="app-sidebar-controls mt-3 shrink-0 border-t px-2 pt-3 pb-[calc(env(safe-area-inset-bottom)+0.25rem)]">
          {principal ? (
            <>
              <div className="flex min-w-0 items-center gap-3 px-1 py-2">
                <ProfileAvatar avatar={principal.avatar ?? "orbit"} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{principal.displayName ?? "Learner"}</p>
                  <p className="truncate text-[0.68rem] uppercase tracking-[0.14em] text-muted-foreground">
                    {authMode === "neon-auth" ? "Account" : "Local profile"}
                  </p>
                </div>
                {authMode === "neon-auth" ? (
                  <Link
                    href={"/account/settings" as never}
                    className="rounded-lg p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                    aria-label="Open account settings"
                    onClick={onMobileClose}
                  >
                    <Settings className="h-4 w-4" aria-hidden="true" />
                  </Link>
                ) : null}
              </div>
              <div className="mt-1 flex items-center gap-1">
                <ThemeToggle profileId={principal.profileId} />
                <form action={signOutAction} className="min-w-0 flex-1">
                  <Button
                    type="submit"
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start gap-2 text-[var(--mathios-ink-text)] hover:bg-muted hover:text-foreground"
                  >
                    <LogOut className="h-4 w-4" aria-hidden="true" />
                    {authMode === "neon-auth" ? "Sign out" : "Switch profile"}
                  </Button>
                </form>
              </div>
            </>
          ) : null}
        </div>
      </aside>
    </>
  );
}

function NavigationLink({
  item,
  active,
  onClick,
}: {
  item: NavigationItem;
  active: boolean;
  onClick: () => void;
}) {
  const Icon = item.icon;
  const reduceMotion = useReducedMotion();
  return (
    <Link
      href={item.href as never}
      onClick={onClick}
      className={cn(
        "app-sidebar-link relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
        active ? "app-sidebar-link-active shadow-sm" : "app-sidebar-link-idle",
      )}
      aria-current={active ? "page" : undefined}
    >
      {active && !reduceMotion ? (
        <motion.span
          layoutId="sidebar-active"
          className="absolute inset-0 rounded-xl bg-[var(--mathios-accent)]"
          transition={{ type: "spring", stiffness: 420, damping: 34 }}
          aria-hidden="true"
        />
      ) : null}
      <Icon className="relative z-10 h-4 w-4" aria-hidden="true" />
      <span className="relative z-10">{item.label}</span>
    </Link>
  );
}
