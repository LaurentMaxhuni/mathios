"use client";

import Link from "next/link";
import { BookOpen, Home, MoreHorizontal, BarChart3, BrainCircuit } from "lucide-react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const items = [
  ["/dashboard", "Today", Home],
  ["/learn", "Learn", BookOpen],
  ["/practice", "Practice", BrainCircuit],
  ["/progress", "Progress", BarChart3],
  ["/more", "More", MoreHorizontal],
] as const;

export function MobileBottomNav() {
  const pathname = usePathname();
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-5 border-t bg-background/95 px-2 pt-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] shadow-lg backdrop-blur lg:hidden"
      aria-label="Mobile navigation"
    >
      {items.map(([href, label, Icon]) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href as never}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex min-w-0 flex-col items-center gap-1 rounded-lg px-1 py-1.5 text-[0.65rem] font-medium transition",
              active
                ? "bg-accent/15 text-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
            <span className="truncate">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
