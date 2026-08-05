import Link from "next/link";
import { ArrowRight, BrainCircuit, Plus, Sparkles } from "lucide-react";
import { redirect } from "next/navigation";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { canAuthorExercises } from "@/features/exercises/service";
import { getCurrentSession } from "@/infrastructure/auth/local-auth-provider";
import { getExerciseRepository } from "@/infrastructure/database/repositories/exercise-repository";

export const dynamic = "force-dynamic";

export default async function ExercisesPage() {
  const session = await getCurrentSession().catch(() => null);
  if (!session) redirect("/profiles");
  const repository = getExerciseRepository();
  const sets = await repository.listExerciseSets();
  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 py-7 sm:px-6 lg:px-10 lg:py-10">
      <Breadcrumbs current="Exercises" />
      <div className="mt-6 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="eyebrow">Practice engine · Phase 5</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            Practice that explains itself.
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
            Answer reusable questions, see precise feedback, and keep each attempt connected to the
            concepts it practices.
          </p>
        </div>
        {canAuthorExercises(session.principal) ? (
          <Link
            href={"/exercises/manage" as never}
            className={buttonVariants({ variant: "outline" })}
          >
            <Plus className="h-4 w-4" aria-hidden="true" /> Exercise studio
          </Link>
        ) : null}
      </div>
      <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {sets.map((set) => (
          <Card
            key={set.id}
            className="group flex flex-col transition hover:-translate-y-0.5 hover:border-accent/50"
          >
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <Badge variant="success">{set.kind}</Badge>
                <Sparkles className="h-4 w-4 text-accent" aria-hidden="true" />
              </div>
              <CardTitle className="mt-3">{set.title}</CardTitle>
              <CardDescription className="leading-6">{set.description}</CardDescription>
            </CardHeader>
            <CardContent className="mt-auto">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{Math.ceil(set.estimatedTimeSeconds / 60)} min</span>
                <span className="capitalize">{set.difficulty}</span>
              </div>
              <Link
                href={("/exercise-sets/" + set.id) as never}
                className={buttonVariants({ className: "mt-4 w-full" })}
              >
                <BrainCircuit className="h-4 w-4" aria-hidden="true" /> Start practice{" "}
                <ArrowRight className="ml-auto h-4 w-4" aria-hidden="true" />
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
      {!sets.length ? (
        <Card className="mt-6">
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No published exercise sets are available yet.
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
