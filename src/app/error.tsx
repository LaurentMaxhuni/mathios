"use client";

import { useEffect } from "react";
import { ErrorState } from "@/components/shared/error-state";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Application route error", { message: error.message, digest: error.digest });
  }, [error]);

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-16 sm:px-6">
      <ErrorState
        description="The page could not be rendered. Try again, or return to the overview."
        onRetry={reset}
      />
    </div>
  );
}
