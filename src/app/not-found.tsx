import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[60vh] w-full max-w-2xl flex-col items-center justify-center px-4 text-center sm:px-6">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-accent">404</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">That path is still uncharted.</h1>
      <p className="mt-3 max-w-md text-muted-foreground">
        The requested page does not exist in the current foundation phase.
      </p>
      <Link href="/" className={`${buttonVariants()} mt-7`}>
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Return to overview
      </Link>
    </div>
  );
}
