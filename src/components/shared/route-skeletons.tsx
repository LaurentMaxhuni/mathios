import type { ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { BrandMark } from "@/components/shared/brand-mark";

function Status({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div
      className="mx-auto w-full max-w-[1440px] px-4 py-8 sm:px-6 lg:px-10 lg:py-10"
      role="status"
      aria-live="polite"
    >
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}

function CardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-2xl border border-border/70 bg-card p-6 shadow-soft", className)}>
      <Skeleton className="h-10 w-10 rounded-xl" />
      <Skeleton className="mt-5 h-5 w-3/5" />
      <Skeleton className="mt-3 h-3 w-full" />
      <Skeleton className="mt-2 h-3 w-4/5" />
      <Skeleton className="mt-7 h-3 w-1/3" />
    </div>
  );
}

export function LandingSkeleton() {
  return (
    <div className="landing-page min-h-[100dvh]" role="status" aria-live="polite">
      <span className="sr-only">Loading Mathios</span>
      <div className="landing-container py-6 sm:py-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BrandMark className="h-9 w-9 rounded-xl" />
            <Skeleton className="h-4 w-24 rounded-xl" />
          </div>
          <Skeleton className="h-10 w-32 rounded-xl" />
        </div>
        <div className="grid gap-10 py-16 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:py-24">
          <div>
            <Skeleton className="h-3 w-44" />
            <Skeleton className="mt-6 h-14 w-full max-w-xl" />
            <Skeleton className="mt-4 h-4 w-full max-w-lg" />
            <Skeleton className="mt-2 h-4 w-4/5 max-w-lg" />
            <div className="mt-8 flex gap-3">
              <Skeleton className="h-11 w-36 rounded-xl" />
              <Skeleton className="h-11 w-32 rounded-xl" />
            </div>
          </div>
          <Skeleton className="aspect-[4/3] w-full rounded-3xl" />
        </div>
      </div>
    </div>
  );
}

export function DashboardSkeleton({ label = "Loading overview" }: { label?: string } = {}) {
  return (
    <Status label={label}>
      <Skeleton className="h-3 w-28" />
      <div className="mt-7 overflow-hidden rounded-3xl border border-border/70 bg-card p-6 shadow-soft sm:p-9">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="mt-6 h-10 w-[min(100%,28rem)]" />
        <Skeleton className="mt-4 h-4 w-[min(100%,36rem)]" />
        <Skeleton className="mt-2 h-4 w-[min(100%,30rem)]" />
        <div className="mt-8 flex flex-wrap gap-3">
          <Skeleton className="h-10 w-36 rounded-xl" />
          <Skeleton className="h-10 w-32 rounded-xl" />
        </div>
      </div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <CardSkeleton key={index} />
        ))}
      </div>
      <div className="mt-6 grid gap-4 xl:grid-cols-[1.4fr_0.6fr]">
        <div className="rounded-2xl border border-border/70 bg-card p-6 shadow-soft">
          <Skeleton className="h-5 w-44" />
          <Skeleton className="mt-3 h-3 w-72 max-w-full" />
          <Skeleton className="mt-8 h-48 w-full rounded-xl" />
        </div>
        <div className="rounded-2xl border border-border/70 bg-card p-6 shadow-soft">
          <Skeleton className="h-5 w-36" />
          <div className="mt-6 space-y-5">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index}>
                <div className="flex justify-between gap-3">
                  <Skeleton className="h-3 w-28" />
                  <Skeleton className="h-3 w-10" />
                </div>
                <Skeleton className="mt-2 h-2 w-full rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </Status>
  );
}

export function CourseCatalogSkeleton() {
  return (
    <Status label="Loading course catalog">
      <Skeleton className="h-3 w-40" />
      <div className="mt-7 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div className="w-full max-w-2xl">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="mt-4 h-9 w-4/5" />
          <Skeleton className="mt-3 h-4 w-full" />
          <Skeleton className="mt-2 h-4 w-3/4" />
        </div>
        <Skeleton className="h-9 w-36 rounded-xl" />
      </div>
      <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <CardSkeleton key={index} className="min-h-64" />
        ))}
      </div>
    </Status>
  );
}

export function AnalyticsSkeleton() {
  return (
    <Status label="Loading learning analytics">
      <Skeleton className="h-3 w-36" />
      <div className="mt-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div className="w-full max-w-xl">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="mt-4 h-9 w-64" />
          <Skeleton className="mt-3 h-4 w-full" />
        </div>
        <Skeleton className="h-9 w-28 rounded-xl" />
      </div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <CardSkeleton key={index} className="min-h-32" />
        ))}
      </div>
      <div className="mt-6 grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <CardSkeleton className="min-h-80" />
        <CardSkeleton className="min-h-80" />
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <CardSkeleton className="min-h-64" />
        <CardSkeleton className="min-h-64" />
      </div>
    </Status>
  );
}

export function WorkspaceSkeleton({ variant = "split" }: { variant?: "split" | "board" }) {
  return (
    <Status label="Loading workspace">
      <Skeleton className="h-3 w-40" />
      <div className="mt-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div className="w-full max-w-2xl">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="mt-4 h-9 w-72" />
          <Skeleton className="mt-3 h-4 w-full" />
        </div>
        <Skeleton className="h-9 w-28 rounded-xl" />
      </div>
      <div
        className={cn(
          "mt-7 grid gap-4",
          variant === "split" ? "lg:grid-cols-[0.38fr_0.62fr]" : "lg:grid-cols-3",
        )}
      >
        <div className="rounded-2xl border border-border/70 bg-card p-5 shadow-soft">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="mt-5 h-10 w-full rounded-xl" />
          <div className="mt-5 space-y-3">
            {Array.from({ length: 7 }).map((_, index) => (
              <Skeleton key={index} className="h-9 w-full rounded-xl" />
            ))}
          </div>
        </div>
        <div
          className={cn(
            "rounded-2xl border border-border/70 bg-card p-6 shadow-soft",
            variant === "board" && "lg:col-span-2",
          )}
        >
          <Skeleton className="h-5 w-48" />
          <Skeleton className="mt-3 h-3 w-72 max-w-full" />
          <Skeleton className="mt-7 h-64 w-full rounded-xl" />
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-16 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    </Status>
  );
}

export function SearchSkeleton() {
  return (
    <Status label="Loading search results">
      <Skeleton className="h-3 w-28" />
      <Skeleton className="mt-7 h-9 w-56" />
      <Skeleton className="mt-4 h-11 w-full rounded-xl" />
      <div className="mt-7 space-y-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="rounded-2xl border border-border/70 bg-card p-5 shadow-soft">
            <Skeleton className="h-4 w-2/5" />
            <Skeleton className="mt-3 h-3 w-4/5" />
            <Skeleton className="mt-2 h-3 w-1/2" />
          </div>
        ))}
      </div>
    </Status>
  );
}
