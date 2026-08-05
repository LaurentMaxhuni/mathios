import { ChevronRight } from "lucide-react";

export function Breadcrumbs({ current }: { current: string }) {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-muted-foreground">
      <span>Mathios</span>
      <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
      <span className="font-medium text-foreground">{current}</span>
    </nav>
  );
}
