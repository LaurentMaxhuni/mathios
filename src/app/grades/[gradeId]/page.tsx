import Link from "next/link";
import { ArrowLeft, ArrowRight, BookOpen, Gauge, Target } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { getCurrentSession } from "@/infrastructure/auth/local-auth-provider";
import { getCurriculumRepository } from "@/infrastructure/database/repositories/curriculum-repository";

export default async function GradeDashboardPage({
  params,
  searchParams,
}: {
  params: Promise<{ gradeId: string }>;
  searchParams: Promise<{ curriculumId?: string }>;
}) {
  const { gradeId } = await params;
  const query = await searchParams;
  const repository = getCurriculumRepository();
  const session = await getCurrentSession().catch(() => null);
  if (!session) redirect("/profiles");
  const curricula = await repository.listCurricula();
  const curriculumId = query.curriculumId ?? curricula[0]?.id;
  if (!curriculumId) notFound();
  const explorer = await repository.getGradeExplorer(curriculumId, gradeId);
  if (!explorer) notFound();
  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 py-7 sm:px-6 lg:px-10 lg:py-10">
      <Breadcrumbs current={explorer.grade.name} />
      <div className="mt-6">
        <Link
          href={`/curricula/${explorer.curriculum.id}`}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> {explorer.curriculum.name}
        </Link>
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <Badge variant="success">Grade dashboard</Badge>
          <Badge variant="outline">{explorer.curriculum.name}</Badge>
        </div>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
          {explorer.grade.name}
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
          A curriculum-aware view of the subjects, domains, and objectives available at this level.
        </p>
      </div>
      <section className="mt-8 grid gap-4 sm:grid-cols-3" aria-label="Grade summary">
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <BookOpen className="h-5 w-5 text-accent" aria-hidden="true" />
            <div>
              <p className="text-2xl font-semibold">{explorer.subjects.length}</p>
              <p className="text-sm text-muted-foreground">active subjects</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <Gauge className="h-5 w-5 text-accent" aria-hidden="true" />
            <div>
              <p className="text-2xl font-semibold">
                {explorer.subjects.reduce((total, subject) => total + subject.domains.length, 0)}
              </p>
              <p className="text-sm text-muted-foreground">domain placements</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <Target className="h-5 w-5 text-accent" aria-hidden="true" />
            <div>
              <p className="text-2xl font-semibold">{explorer.objectives.length}</p>
              <p className="text-sm text-muted-foreground">grade objectives</p>
            </div>
          </CardContent>
        </Card>
      </section>
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Subjects at this grade</CardTitle>
          <CardDescription>
            Required and optional content remains explicit before course authoring begins.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            {explorer.subjects.map((placement) => (
              <Link
                key={placement.subjectId}
                href={`/subjects/${placement.subjectId}?curriculumId=${explorer.curriculum.id}`}
                className="group rounded-xl border p-5 transition hover:border-accent/50 hover:bg-accent/5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold">{placement.subject.name}</h3>
                      <Badge variant={placement.isRequired ? "success" : "outline"}>
                        {placement.isRequired ? "Required" : "Optional"}
                      </Badge>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      {placement.subject.description || "Reusable subject structure."}
                    </p>
                  </div>
                  <ArrowRight
                    className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-accent"
                    aria-hidden="true"
                  />
                </div>
                <div className="mt-5 flex flex-wrap gap-2">
                  {placement.domains.map((domain) => (
                    <span
                      key={domain.domainId}
                      className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground"
                    >
                      {domain.domain.name} · depth {domain.depth}
                    </span>
                  ))}
                  {!placement.domains.length ? (
                    <span className="text-xs text-muted-foreground">
                      No active domains assigned yet.
                    </span>
                  ) : null}
                </div>
                <p className="mt-4 text-xs text-muted-foreground">
                  {placement.objectiveCount} learning objectives
                </p>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Learning objectives</CardTitle>
          <CardDescription>
            Objectives are grade-specific, curriculum-specific, and ready to anchor later content.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {explorer.objectives.map((objective) => (
            <div key={objective.id} className="rounded-xl border px-4 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">{objective.code}</Badge>
                <p className="font-medium">{objective.title}</p>
                <Badge variant={objective.isRequired ? "success" : "outline"}>
                  {objective.isRequired ? "Required" : objective.difficulty}
                </Badge>
              </div>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {objective.description}
              </p>
            </div>
          ))}
          {!explorer.objectives.length ? (
            <p className="text-sm text-muted-foreground">
              No grade-specific objectives have been added yet.
            </p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
