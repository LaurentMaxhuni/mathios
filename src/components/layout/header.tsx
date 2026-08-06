"use client";

import Link from "next/link";
import { Menu, Search, WifiOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { ProfileAvatar } from "@/components/shared/profile-avatar";
import { signOutAction } from "@/features/auth/actions";
import type { AuthenticatedPrincipal } from "@/infrastructure/auth/auth-provider";

interface HeaderProps {
  onMobileMenuOpen: () => void;
  principal: AuthenticatedPrincipal | null;
}

export function Header({ onMobileMenuOpen, principal }: HeaderProps) {
  return (
    <header className="flex min-h-16 items-center justify-between border-b bg-background/80 px-4 backdrop-blur sm:px-6 lg:px-10">
      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="lg:hidden"
          aria-label="Open navigation"
          onClick={onMobileMenuOpen}
        >
          <Menu className="h-5 w-5" aria-hidden="true" />
        </Button>
        <div className="hidden h-8 w-px bg-border lg:block" aria-hidden="true" />
        <Link
          href={"/search" as never}
          className="inline-flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <Search className="h-4 w-4" aria-hidden="true" />
          <span>Search workspace</span>
          <kbd className="hidden rounded border bg-muted px-1.5 py-0.5 text-[0.65rem] font-normal sm:inline">
            Ctrl K
          </kbd>
        </Link>
      </div>
      <div className="flex items-center gap-2">
        <Badge variant="success" className="hidden gap-1.5 sm:inline-flex">
          <WifiOff className="h-3 w-3" aria-hidden="true" />
          Local mode
        </Badge>
        {principal ? (
          <div className="hidden items-center gap-2 md:flex">
            <ProfileAvatar avatar={principal.avatar ?? "orbit"} size="sm" />
            <span className="max-w-32 truncate text-sm font-medium">{principal.displayName}</span>
            <form action={signOutAction}>
              <Button type="submit" variant="ghost" size="sm">
                Switch profile
              </Button>
            </form>
          </div>
        ) : null}
        <ThemeToggle />
      </div>
    </header>
  );
}
