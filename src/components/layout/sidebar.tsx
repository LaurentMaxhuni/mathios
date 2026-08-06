"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  Archive,
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
  GraduationCap,
  Home,
  IdCard,
  Network,
  Route,
  Search,
  School,
  Settings2,
  ShieldCheck,
  Sparkles,
  Orbit,
  StickyNote,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getFocusableElements } from "@/lib/focus";
import type { AuthenticatedPrincipal } from "@/infrastructure/auth/auth-provider";

const navigation: Array<{
  href: string;
  label: string;
  icon: typeof Home;
  requiresAnalytics?: boolean;
  requiresSettings?: boolean;
}> = [
  { href: "/" as const, label: "Overview", icon: Home },
  { href: "/search" as const, label: "Global search", icon: Search },
  { href: "/profiles" as const, label: "Profiles", icon: IdCard },
  { href: "/onboarding" as const, label: "Onboarding", icon: Route },
  { href: "/curricula" as const, label: "Curricula", icon: BookOpen },
  { href: "/courses" as const, label: "Courses", icon: BookMarked },
  { href: "/concepts" as const, label: "Concepts", icon: Network },
  { href: "/exercises" as const, label: "Exercises", icon: BrainCircuit },
  { href: "/assessments" as const, label: "Assessments", icon: ClipboardCheck },
  { href: "/mastery" as const, label: "Mastery", icon: Gauge },
  { href: "/analytics" as const, label: "Learning analytics", icon: BarChart3 },
  {
    href: "/analytics/teacher" as const,
    label: "Teacher analytics",
    icon: BarChart3,
    requiresAnalytics: true,
  },
  { href: "/classrooms" as const, label: "Classrooms", icon: School },
  { href: "/recommendations" as const, label: "Recommendations", icon: Sparkles },
  { href: "/roadmaps" as const, label: "Roadmaps", icon: GitBranch },
  { href: "/personalized-paths" as const, label: "My paths", icon: Route },
  { href: "/simulations" as const, label: "Simulations", icon: Orbit },
  { href: "/laboratories" as const, label: "Laboratory", icon: FlaskConical },
  { href: "/planner" as const, label: "Study planner", icon: CalendarDays },
  { href: "/notes" as const, label: "Knowledge base", icon: StickyNote },
  { href: "/ai" as const, label: "AI studio", icon: Sparkles },
  { href: "/portability" as const, label: "Import & backup", icon: Archive },
  { href: "/grades" as const, label: "Grades", icon: GraduationCap },
  { href: "/subjects" as const, label: "Subjects", icon: FlaskConical },
  { href: "/settings" as const, label: "Settings", icon: Settings2 },
  { href: "/settings/roles" as const, label: "Roles", icon: ShieldCheck },
  {
    href: "/settings/system" as const,
    label: "System diagnostics",
    icon: Activity,
    requiresSettings: true,
  },
];

interface SidebarProps {
  mobileOpen: boolean;
  onMobileClose: () => void;
  mobileMenuButtonRef: React.RefObject<HTMLButtonElement | null>;
  principal: AuthenticatedPrincipal | null;
}

export function Sidebar({
  mobileOpen,
  mobileMenuButtonRef,
  onMobileClose,
  principal,
}: SidebarProps) {
  const pathname = usePathname();
  const sidebarRef = React.useRef<HTMLElement>(null);
  const closeButtonRef = React.useRef<HTMLButtonElement>(null);
  const restoreFocusRef = React.useRef<HTMLElement | null>(null);
  const visibleNavigation = navigation.filter(
    (item) =>
      (!item.requiresAnalytics || principal?.permissions.includes("view_analytics")) &&
      (!item.requiresSettings || principal?.permissions.includes("manage_application_settings")),
  );

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
          "fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r bg-card/95 px-4 py-5 backdrop-blur transition-transform lg:static lg:z-auto lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center justify-between px-3">
          <Link href="/" className="group flex items-center gap-3" onClick={onMobileClose}>
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm transition-transform group-hover:-rotate-6">
              <Atom className="h-5 w-5" aria-hidden="true" />
            </span>
            <span>
              <span className="block text-sm font-bold tracking-[0.2em]">MATHIOS</span>
              <span className="block text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">
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

        <div className="mt-10 px-3 text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
          Workspace
        </div>
        <nav
          aria-label="Primary navigation links"
          className="mt-3 min-h-0 flex-1 space-y-1 overflow-y-auto"
        >
          {visibleNavigation.map((item) => {
            const Icon = item.icon;
            const active =
              pathname === item.href || (item.href !== "/" && pathname.startsWith(`${item.href}/`));
            return (
              <Link
                key={item.href}
                href={item.href as never}
                onClick={onMobileClose}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
                aria-current={active ? "page" : undefined}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto rounded-xl border bg-muted/50 p-4">
          <div className="flex items-center gap-2 text-xs font-semibold">
            <Activity className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
            Local-first identity
          </div>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            Profiles, permissions, settings, and onboarding stay available on this device.
          </p>
          <p className="mt-3 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Phase 19 - Quality audit
          </p>
        </div>
      </aside>
    </>
  );
}
