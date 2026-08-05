"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  Atom,
  BrainCircuit,
  BookOpen,
  BookMarked,
  FlaskConical,
  GraduationCap,
  Home,
  IdCard,
  Network,
  Route,
  Settings2,
  ShieldCheck,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navigation: Array<{ href: string; label: string; icon: typeof Home }> = [
  { href: "/" as const, label: "Overview", icon: Home },
  { href: "/profiles" as const, label: "Profiles", icon: IdCard },
  { href: "/onboarding" as const, label: "Onboarding", icon: Route },
  { href: "/curricula" as const, label: "Curricula", icon: BookOpen },
  { href: "/courses" as const, label: "Courses", icon: BookMarked },
  { href: "/concepts" as const, label: "Concepts", icon: Network },
  { href: "/exercises" as const, label: "Exercises", icon: BrainCircuit },
  { href: "/grades" as const, label: "Grades", icon: GraduationCap },
  { href: "/subjects" as const, label: "Subjects", icon: FlaskConical },
  { href: "/settings" as const, label: "Settings", icon: Settings2 },
  { href: "/settings/roles" as const, label: "Roles", icon: ShieldCheck },
];

interface SidebarProps {
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export function Sidebar({ mobileOpen, onMobileClose }: SidebarProps) {
  const pathname = usePathname();

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
            className="rounded-md p-2 hover:bg-muted lg:hidden"
            onClick={onMobileClose}
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="mt-10 px-3 text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
          Workspace
        </div>
        <nav aria-label="Primary navigation" className="mt-3 space-y-1">
          {navigation.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
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
            Phase 5 - Exercises and answer validation
          </p>
        </div>
      </aside>
    </>
  );
}
