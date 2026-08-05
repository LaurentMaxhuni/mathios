import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export function ErrorState({
  title = "Something went wrong",
  description,
  onRetry,
}: {
  title?: string;
  description: string;
  onRetry?: () => void;
}) {
  return (
    <Card className="border-destructive/30">
      <CardContent className="flex flex-col items-center justify-center px-6 py-12 text-center">
        <span className="grid h-11 w-11 place-items-center rounded-full bg-destructive/10 text-destructive">
          <AlertTriangle className="h-5 w-5" aria-hidden="true" />
        </span>
        <h2 className="mt-4 text-sm font-semibold">{title}</h2>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
        {onRetry ? (
          <Button type="button" variant="outline" size="sm" className="mt-5" onClick={onRetry}>
            Try again
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
