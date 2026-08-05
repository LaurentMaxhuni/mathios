import { Inbox } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center px-6 py-12 text-center">
        <span className="grid h-11 w-11 place-items-center rounded-full bg-muted text-muted-foreground">
          <Inbox className="h-5 w-5" aria-hidden="true" />
        </span>
        <h2 className="mt-4 text-sm font-semibold">{title}</h2>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}
