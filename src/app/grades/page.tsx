import Link from "next/link";
import { ArrowRight, Layers3, Plus } from "lucide-react";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { buttonVariants } from "@/components/ui/button";
import { getCurrentSession } from "@/infrastructure/auth/local-auth-provider";
import { getCurriculumRepository } from "@/infrastructure/database/repositories/curriculum-repository";
import { canManageStructure } from "@/features/curricula/service";

export default async function GradesPage({
  searchParams,
}: {
  searchParams: Promise<{ curriculumId?: string }>;
}) {
  const repository = getCurriculumRepository();
  const session = await getCurrentSession().catch(() => null);
  if (!session) redirect("/profiles");
  const query = await searchParams;
  const [grades, curricula] = await Promise.all([
    repository.listGrades(),
    repository.listCurricula(),
  ]);
  const curriculum = curricula.find((item) => item.id === query.curriculumId) ?? curricula[0];
  const explorers = curriculum
    ? await Promise.all(grades.map((grade) => repository.getGradeExplorer(curriculum.id, grade.id)))
    : [];
  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 py-7 sm:px-6 lg:px-10 lg:py-10">
      <Breadcrumbs current="Grade explorer" />
      <div className="mt-6 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="eyebrow">Learning map · grades</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Find the right altitude.</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
            Grade definitions are shared across curricula; each curriculum decides what is
            available, required, and deep enough for the learner.
          </p>
        </div>
        {canManageStructure(session.principal) ? (
          <Link href="/grades/manage" className={buttonVariants({ size: "sm" })}>
            <Plus className="h-4 w-4" aria-hidden="true" /> Manage grades
          </Link>
        ) : null}
      </div>
      {curriculum ? (
        <p className="mt-6 text-sm text-muted-foreground">
          Showing the <span className="font-medium text-foreground">{curriculum.name}</span>{" "}
          structure.{" "}
          <Link href="/curricula" className="text-accent hover:underline">
            Switch from a curriculum explorer.
          </Link>
        </p>
      ) : null}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {grades.map((grade, index) => {
          const explorer = explorers[index];
          return (
            <Link
              key={grade.id}
              href={`/grades/${grade.id}${curriculum ? `?curriculumId=${curriculum.id}` : ""}`}
              className="group"
            >
              <Card className="h-full transition duration-200 group-hover:-translate-y-1 group-hover:border-accent/50">
                <CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
                  <div>
                    <Badge variant="outline">{grade.shortName}</Badge>
                    <CardTitle className="mt-3">{grade.name}</CardTitle>
                    <CardDescription className="mt-2 leading-6">
                      {grade.description || "A configurable progression point."}
                    </CardDescription>
                  </div>
                  <Layers3 className="h-5 w-5 text-accent" aria-hidden="true" />
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between border-t pt-4 text-sm">
                    <span className="text-muted-foreground">
                      {explorer?.subjects.length ?? 0} active subjects
                    </span>
                    <ArrowRight
                      className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-accent"
                      aria-hidden="true"
                    />
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
