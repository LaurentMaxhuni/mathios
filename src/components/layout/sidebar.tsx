"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import {
  Activity,
  BarChart3,
  CalendarDays,
  Atom,
  BrainCircuit,
  BookOpen,
  BookMarked,
  ClipboardCheck,
  FlaskConical,
  Gauge,
  GitBranch,
  Home,
  Network,
  Route,
  School,
  Settings2,
  Sparkles,
  Orbit,
  StickyNote,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getFocusableElements } from "@/lib/focus";
import type { AuthMode, AuthenticatedPrincipal } from "@/infrastructure/auth/auth-provider";

type NavigationSection = "workspace" | "learn" | "plan" | "explore" | "insights" | "settings";

const navigationSections: Array<{ id: NavigationSection; label: string }> = [
  { id: "workspace", label: "Workspace" },
  { id: "learn", label: "Learn" },
  { id: "plan", label: "Plan" },
  { id: "explore", label: "Explore" },
  { id: "insights", label: "Insights" },
  { id: "settings", label: "Settings" },
];

type NavigationItem = {
  href: string;
  label: string;
  icon: typeof Home;
  section: NavigationSection;
  requiresAnalytics?: boolean;
  requiresContentAuthor?: boolean;
};

const navigation: NavigationItem[] = [
  { href: "/" as const, label: "Overview", icon: Home, section: "workspace" },
  { href: "/curricula" as const, label: "Curricula", icon: BookOpen, section: "learn" },
  { href: "/courses" as const, label: "Courses", icon: BookMarked, section: "learn" },
  {
    href: "/content-studio" as const,
    label: "Content studio",
    icon: Sparkles,
    section: "learn",
    requiresContentAuthor: true,
  },
  { href: "/concepts" as const, label: "Concepts", icon: Network, section: "learn" },
  { href: "/exercises" as const, label: "Exercises", icon: BrainCircuit, section: "learn" },
  {
    href: "/assessments" as const,
    label: "Assessments",
    icon: ClipboardCheck,
    section: "learn",
  },
  { href: "/mastery" as const, label: "Mastery", icon: Gauge, section: "learn" },
  {
    href: "/recommendations" as const,
    label: "Recommendations",
    icon: Sparkles,
    section: "plan",
  },
  { href: "/roadmaps" as const, label: "Roadmaps", icon: GitBranch, section: "plan" },
  { href: "/personalized-paths" as const, label: "My paths", icon: Route, section: "plan" },
  {
    href: "/planner" as const,
    label: "Study planner",
    icon: CalendarDays,
    section: "plan",
  },
  { href: "/simulations" as const, label: "Simulations", icon: Orbit, section: "explore" },
  { href: "/laboratories" as const, label: "Laboratory", icon: FlaskConical, section: "explore" },
  { href: "/notes" as const, label: "Knowledge base", icon: StickyNote, section: "explore" },
  { href: "/ai" as const, label: "AI studio", icon: Sparkles, section: "explore" },
  { href: "/classrooms" as const, label: "Classrooms", icon: School, section: "explore" },
  {
    href: "/analytics" as const,
    label: "Learning analytics",
    icon: BarChart3,
    section: "insights",
  },
  {
    href: "/analytics/teacher" as const,
    label: "Teacher analytics",
    icon: BarChart3,
    section: "insights",
    requiresAnalytics: true,
  },
  { href: "/settings" as const, label: "Settings", icon: Settings2, section: "settings" },
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
  const canAuthorContent = Boolean(
    principal?.permissions.includes("edit_content") &&
    principal.roles.some((role) => ["administrator", "content-creator", "teacher"].includes(role)),
  );
  const visibleNavigation = navigation.filter(
    (item) =>
      (!item.requiresAnalytics || principal?.permissions.includes("view_analytics")) &&
      (!item.requiresContentAuthor || canAuthorContent),
  );
  const settingsNavigation = visibleNavigation.filter((item) => item.section === "settings");
  const activeHref = visibleNavigation
    .filter((item) => {
      if (item.href === "/") return pathname === "/";
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
          "app-sidebar fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r px-4 py-5 shadow-2xl backdrop-blur transition-transform lg:static lg:z-auto lg:translate-x-0 lg:shadow-none",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center justify-between px-3">
          <Link href="/" className="group flex items-center gap-3" onClick={onMobileClose}>
            <span className="app-brand-mark grid h-10 w-10 place-items-center rounded-xl shadow-sm transition-transform group-hover:-rotate-6">
              <Atom className="h-5 w-5" aria-hidden="true" />
            </span>
            <span>
              <span className="app-brand-name block text-sm font-bold tracking-[0.2em]">
                MATHIOS
              </span>
              <span className="app-brand-caption block text-[0.68rem] uppercase tracking-[0.18em]">
                Science workspace
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
              const sectionNavigation = visibleNavigation.filter(
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

        <div className="app-sidebar-footer mt-auto rounded-2xl border p-4">
          <div className="app-sidebar-footer-title flex items-center gap-2 text-xs font-semibold">
            <Activity className="h-3.5 w-3.5" aria-hidden="true" />
            {authMode === "neon-auth" ? "Neon Auth identity" : "Local-first identity"}
          </div>
          <p className="app-sidebar-footer-copy mt-2 text-xs leading-relaxed">
            {authMode === "neon-auth"
              ? "Secure accounts, Google sign-in, permissions, settings, and onboarding are connected to Neon."
              : "Profiles, permissions, settings, and onboarding stay available on this device."}
          </p>
          <p className="app-sidebar-footer-meta mt-3 text-[0.68rem] font-semibold uppercase tracking-[0.16em]">
            Phase 19 - Quality audit
          </p>
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
