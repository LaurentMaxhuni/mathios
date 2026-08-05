import { LoadingSkeleton } from "@/components/shared/loading-skeleton";

export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-[1440px] space-y-6 px-4 py-10 sm:px-6 lg:px-10">
      <LoadingSkeleton className="h-4 w-32" />
      <LoadingSkeleton className="h-56 w-full rounded-2xl" />
      <div className="grid gap-4 md:grid-cols-2">
        <LoadingSkeleton className="h-40" />
        <LoadingSkeleton className="h-40" />
      </div>
    </div>
  );
}
