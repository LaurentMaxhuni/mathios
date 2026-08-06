import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

export function LoadingSkeleton({ className }: { className?: string }) {
  return <Skeleton aria-hidden="true" className={cn("skeleton-shimmer", className)} />;
}
