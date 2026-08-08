"use client";

import * as React from "react";
import Link from "next/link";
import { CircleCheck, Menu, Search } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

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
        <Tooltip>
          <TooltipTrigger asChild>
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
          </TooltipTrigger>
          <TooltipContent side="right">Open navigation</TooltipContent>
        </Tooltip>
        <div className="hidden h-8 w-px bg-border lg:block" aria-hidden="true" />
        <Link
          href={"/search" as never}
          className="group inline-flex items-center gap-2 rounded-xl border border-transparent bg-muted/55 px-3 py-2 text-sm font-medium text-muted-foreground transition hover:border-border hover:bg-card hover:text-foreground"
        >
          <Search
            className="h-4 w-4 transition-transform group-hover:scale-105"
            aria-hidden="true"
          />
          <span>Search</span>
          <kbd className="hidden rounded-md border border-border/70 bg-background/60 px-1.5 py-0.5 text-[0.65rem] font-normal sm:inline">
            ⌘ K
          </kbd>
        </Link>
      </div>
      <div className="flex items-center gap-2">
        <Badge
          variant="success"
          className="hidden items-center gap-1.5 border border-accent/20 bg-accent/10 sm:inline-flex"
        >
          <CircleCheck className="h-3 w-3" aria-hidden="true" />
          Ready to learn
        </Badge>
      </div>
    </motion.header>
  );
}
