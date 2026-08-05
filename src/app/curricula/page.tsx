import Link from "next/link";
import { ArrowRight, BookOpen, Layers3, Plus, Shapes } from "lucide-react";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { buttonVariants } from "@/components/ui/button";
import { getCurrentSession } from "@/infrastructure/auth/local-auth-provider";
import { getCurriculumRepository } from "@/infrastructure/database/repositories/curriculum-repository";
import { canManageStructure } from "@/features/curricula/service";

function kindLabel(kind: string) {
  return kind === "kosovo" ? "Kosovo" : kind === "international" ? "International" : "Custom";
}

export default async function CurriculaPage() {
  const repository = getCurriculumRepository();
  const session = await getCurrentSession().catch(() => null);
  if (!session) redirect("/profiles");
  const curricula = await repository.listCurricula();
  const explorers = await Promise.all(
    curricula.map((curriculum) => repository.getCurriculumExplorer(curriculum.id)),
  );
  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 py-7 sm:px-6 lg:px-10 lg:py-10">
      <Breadcrumbs current="Curriculum explorer" />
      <div className="mt-6 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="eyebrow">Learning map · Phase 2</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            Choose the lens for your learning.
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
            Curricula keep the same reusable subjects and domains in different educational contexts.
            Open one to see its grade progression, required subjects, and objectives.
          </p>
        </div>
        {canManageStructure(session.principal) ? (
          <Link href="/curricula/manage" className={buttonVariants({ size: "sm" })}>
            <Plus className="h-4 w-4" aria-hidden="true" /> Manage structures
          </Link>
        ) : null}
      </div>
      <div className="mt-8 grid gap-5 lg:grid-cols-3">
        {curricula.map((curriculum, index) => {
          const explorer = explorers[index];
          return (
            <Link key={curriculum.id} href={`/curricula/${curriculum.id}`} className="group block">
              <Card className="h-full overflow-hidden transition duration-200 group-hover:-translate-y-1 group-hover:border-accent/50 group-hover:shadow-soft">
                <div className="h-1 bg-accent" />
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div className="grid h-11 w-11 place-items-center rounded-xl bg-accent/10 text-accent">
                      {curriculum.kind === "custom" ? (
                        <Shapes className="h-5 w-5" aria-hidden="true" />
                      ) : (
                        <Layers3 className="h-5 w-5" aria-hidden="true" />
                      )}
                    </div>
                    <Badge variant="outline">{kindLabel(curriculum.kind)}</Badge>
                  </div>
                  <CardTitle className="mt-5 text-xl">{curriculum.name}</CardTitle>
                  <CardDescription className="mt-2 leading-6">
                    {curriculum.description || "A configurable learning structure."}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-2 border-y py-4 text-center">
                    <div>
                      <p className="text-xl font-semibold">{explorer?.grades.length ?? 0}</p>
                      <p className="mt-1 text-[0.68rem] uppercase tracking-[0.14em] text-muted-foreground">
                        Grades
                      </p>
                    </div>
                    <div>
                      <p className="text-xl font-semibold">{explorer?.subjects.length ?? 0}</p>
                      <p className="mt-1 text-[0.68rem] uppercase tracking-[0.14em] text-muted-foreground">
                        Subjects
                      </p>
                    </div>
                    <div>
                      <p className="text-xl font-semibold">{explorer?.objectiveCount ?? 0}</p>
                      <p className="mt-1 text-[0.68rem] uppercase tracking-[0.14em] text-muted-foreground">
                        Objectives
                      </p>
                    </div>
                  </div>
                  <p className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-accent">
                    Open curriculum{" "}
                    <ArrowRight
                      className="h-4 w-4 transition-transform group-hover:translate-x-1"
                      aria-hidden="true"
                    />
                  </p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
      {!curricula.length ? (
        <Card className="mt-8">
          <CardContent className="flex flex-col items-center py-14 text-center">
            <BookOpen className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
            <p className="mt-4 font-semibold">No active curricula yet.</p>
            <p className="mt-2 text-sm text-muted-foreground">
              An administrator or content creator can add the first learning structure.
            </p>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
