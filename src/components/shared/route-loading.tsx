import { LoadingSkeleton } from "@/components/shared/loading-skeleton";

export function RouteLoading({ label = "Loading workspace" }: { label?: string }) {
  return (
    <div className="space-y-4" role="status" aria-live="polite">
      <span className="sr-only">{label}</span>
      <LoadingSkeleton className="h-32 w-full rounded-2xl" />
      <div className="grid gap-4 md:grid-cols-2">
        <LoadingSkeleton className="h-40" />
        <LoadingSkeleton className="h-40" />
      </div>
    </div>
  );
}
