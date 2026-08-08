import Link from "next/link";
import { ArrowRight, BrainCircuit } from "lucide-react";
import { redirect } from "next/navigation";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentSession } from "@/infrastructure/auth/local-auth-provider";
import { getExerciseRepository } from "@/infrastructure/database/repositories/exercise-repository";

export const dynamic = "force-dynamic";

export default async function PracticePage() {
  const session = await getCurrentSession().catch(() => null);
  if (!session) redirect("/profiles");
  const sets = await getExerciseRepository().listExerciseSets({ status: "published" });
  return (
    <div className="mx-auto w-full max-w-[1280px] px-4 py-7 sm:px-6 lg:px-10 lg:py-10">
      <Breadcrumbs current="Practice" />
      <header className="mt-6">
        <p className="eyebrow">Practice</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
          Make the idea yours.
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
          Short, reusable practice with feedback that helps you see the next move.
        </p>
      </header>
      {sets.length ? (
        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {sets.map((set) => (
            <Link key={set.id} href={`/exercise-sets/${set.id}`} className="group">
              <Card className="h-full transition hover:-translate-y-0.5 hover:border-accent/50">
                <CardHeader>
                  <div className="flex items-center justify-between gap-3">
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-accent/10 text-accent">
                      <BrainCircuit className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <Badge variant="outline">{Math.ceil(set.estimatedTimeSeconds / 60)} min</Badge>
                  </div>
                  <CardTitle className="mt-3">{set.title}</CardTitle>
                  <CardDescription className="leading-6">{set.description}</CardDescription>
                </CardHeader>
                <CardContent className="flex items-center justify-between text-sm text-muted-foreground">
                  <span className="capitalize">{set.difficulty} practice</span>
                  <ArrowRight
                    className="h-4 w-4 transition group-hover:translate-x-1 group-hover:text-accent"
                    aria-hidden="true"
                  />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <Card className="mt-8 border-dashed">
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No published practice sets are available yet.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
