import Link from "next/link";
import { ArrowLeft, ArrowRight, BookOpen, Check, CircleDot, Target } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { buttonVariants } from "@/components/ui/button";
import { getCurrentSession } from "@/infrastructure/auth/local-auth-provider";
import { getCurriculumRepository } from "@/infrastructure/database/repositories/curriculum-repository";
import { canManageStructure } from "@/features/curricula/service";

export default async function CurriculumExplorerPage({
  params,
}: {
  params: Promise<{ curriculumId: string }>;
}) {
  const { curriculumId } = await params;
  const session = await getCurrentSession().catch(() => null);
  if (!session) redirect("/profiles");
  const explorer = await getCurriculumRepository().getCurriculumExplorer(curriculumId);
  if (!explorer) notFound();
  const { curriculum, grades, subjects } = explorer;
  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 py-7 sm:px-6 lg:px-10 lg:py-10">
      <Breadcrumbs current={curriculum.name} />
      <div className="mt-6 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
        <div className="max-w-3xl">
          <Link
            href="/curricula"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> All curricula
          </Link>
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <Badge variant="success">{curriculum.kind} curriculum</Badge>
            {curriculum.authority ? <Badge variant="outline">{curriculum.authority}</Badge> : null}
            {curriculum.isArchived ? <Badge variant="warning">Archived</Badge> : null}
          </div>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
            {curriculum.name}
          </h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base">
            {curriculum.description || "A configurable curriculum structure for science learning."}
          </p>
        </div>
        {canManageStructure(session.principal) ? (
          <Link
            href="/curricula/manage"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            Manage curriculum <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        ) : null}
      </div>
      <section className="mt-8 grid gap-4 sm:grid-cols-3" aria-label="Curriculum summary">
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-accent/10 text-accent">
              <BookOpen className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-2xl font-semibold">{grades.length}</p>
              <p className="text-sm text-muted-foreground">available grades</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-subject-mathematics/10 text-subject-mathematics">
              <CircleDot className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-2xl font-semibold">{subjects.length}</p>
              <p className="text-sm text-muted-foreground">reusable subjects</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary">
              <Target className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-2xl font-semibold">{explorer.objectiveCount}</p>
              <p className="text-sm text-muted-foreground">learning objectives</p>
            </div>
          </CardContent>
        </Card>
      </section>
      <div className="mt-8 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle>Grade progression</CardTitle>
            <CardDescription>
              Move from foundations to deeper subject work while keeping grade definitions
              configurable.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2">
              {grades.map((placement) => (
                <Link
                  key={placement.gradeId}
                  href={`/grades/${placement.gradeId}?curriculumId=${curriculum.id}`}
                  className="group rounded-xl border p-4 transition hover:border-accent/50 hover:bg-accent/5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">
                        {placement.grade.shortName}
                      </p>
                      <p className="mt-1 font-semibold">{placement.grade.name}</p>
                    </div>
                    <ArrowRight
                      className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-accent"
                      aria-hidden="true"
                    />
                  </div>
                  <p className="mt-2 text-sm leading-5 text-muted-foreground">
                    {placement.grade.description ||
                      "Explore subjects and their grade-specific domains."}
                  </p>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Subject constellation</CardTitle>
            <CardDescription>
              Subjects remain reusable across grades and can be required or optional here.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {subjects.map((placement) => (
              <Link
                key={placement.subjectId}
                href={`/subjects/${placement.subjectId}?curriculumId=${curriculum.id}`}
                className="group flex items-center justify-between gap-4 rounded-xl border px-4 py-3 transition hover:border-accent/50 hover:bg-accent/5"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{placement.subject.name}</p>
                    <Badge variant={placement.isRequired ? "success" : "outline"}>
                      {placement.isRequired ? "Required" : "Optional"}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {placement.gradeCount} grade placements ·{" "}
                    {placement.subject.recommendedStudyHours} recommended hours
                  </p>
                </div>
                <ArrowRight
                  className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-accent"
                  aria-hidden="true"
                />
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Structure contract</CardTitle>
          <CardDescription>
            This view is the boundary for later course and lesson content. Phase 2 keeps it focused
            on the reusable hierarchy.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 text-sm text-muted-foreground sm:grid-cols-3">
            <p className="flex gap-2">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
              Subjects can appear in many grades.
            </p>
            <p className="flex gap-2">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
              Domains carry depth by grade.
            </p>
            <p className="flex gap-2">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
              Objectives are curriculum-specific.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
