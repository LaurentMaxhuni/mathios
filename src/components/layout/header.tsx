"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, Menu, Route, Search } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { Button } from "@/components/ui/button";

interface HeaderProps {
  mobileNavigationOpen: boolean;
  onMobileMenuOpen: () => void;
  mobileMenuButtonRef: React.RefObject<HTMLButtonElement | null>;
}

export function Header({
  mobileMenuButtonRef,
  mobileNavigationOpen,
  onMobileMenuOpen,
}: HeaderProps) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.header
      initial={reduceMotion ? false : { opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: reduceMotion ? 0 : 0.35,
        ease: [0.16, 1, 0.3, 1],
      }}
      className="app-header sticky top-0 z-20 flex min-h-16 items-center justify-between border-b px-4 backdrop-blur-xl sm:px-6 lg:px-10"
    >
      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="lg:hidden"
          aria-label="Open navigation"
          aria-controls="primary-navigation"
          aria-expanded={mobileNavigationOpen}
          ref={mobileMenuButtonRef}
          onClick={onMobileMenuOpen}
        >
          <Menu className="h-5 w-5" aria-hidden="true" />
        </Button>
        <div className="hidden h-8 w-px bg-border lg:block" aria-hidden="true" />
        <Link
          href={"/search" as never}
          className="group inline-flex items-center gap-2 rounded-xl border border-transparent bg-muted/55 px-3 py-2 text-sm font-medium text-muted-foreground transition hover:border-border hover:bg-card hover:text-foreground"
        >
          <Search
            className="h-4 w-4 transition-transform group-hover:scale-105"
            aria-hidden="true"
          />
          <span className="hidden sm:inline">Search learning</span>
          <span className="sm:hidden">Search</span>
        </Link>
      </div>
      <div className="flex items-center gap-2">
        <Link
          href="/dashboard"
          className="group inline-flex items-center gap-2 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground transition hover:-translate-y-0.5 hover:bg-primary/90 active:translate-y-0 active:scale-[0.98]"
        >
          <Route className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
          <span className="hidden sm:inline">Open your path</span>
          <ArrowRight
            className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 sm:hidden"
            aria-hidden="true"
          />
        </Link>
      </div>
    </motion.header>
  );
}
