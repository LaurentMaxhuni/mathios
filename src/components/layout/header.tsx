"use client";

import { Menu, WifiOff } from "lucide-react";
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
        <p className="text-sm font-medium text-muted-foreground">Foundation workspace</p>
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
