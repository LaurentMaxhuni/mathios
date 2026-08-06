import { DashboardSkeleton } from "@/components/shared/route-skeletons";

export function RouteLoading({ label = "Loading workspace" }: { label?: string }) {
  return <DashboardSkeleton label={label} />;
}
