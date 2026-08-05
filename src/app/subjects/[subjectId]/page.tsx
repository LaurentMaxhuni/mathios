import Link from "next/link";
import { ArrowLeft, ArrowRight, BookOpen, Layers3, Target } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { getCurrentSession } from "@/infrastructure/auth/local-auth-provider";
import { getCurriculumRepository } from "@/infrastructure/database/repositories/curriculum-repository";

export default async function SubjectDashboardPage({
  params,
  searchParams,
}: {
  params: Promise<{ subjectId: string }>;
  searchParams: Promise<{ curriculumId?: string }>;
}) {
  const { subjectId } = await params;
  const query = await searchParams;
  const repository = getCurriculumRepository();
  const session = await getCurrentSession().catch(() => null);
  if (!session) redirect("/profiles");
  const curricula = await repository.listCurricula();
  const curriculumId = query.curriculumId ?? curricula[0]?.id;
  const explorer = await repository.getSubjectExplorer(subjectId, curriculumId);
  if (!explorer) notFound();
  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 py-7 sm:px-6 lg:px-10 lg:py-10">
      <Breadcrumbs current={explorer.subject.name} />
      <div className="mt-6">
        <Link
          href="/subjects"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> All subjects
        </Link>
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <Badge variant="success">Subject dashboard</Badge>
          {curriculumId ? (
            <Badge variant="outline">
              {curricula.find((item) => item.id === curriculumId)?.name ?? "Selected curriculum"}
            </Badge>
          ) : null}
        </div>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
          {explorer.subject.name}
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
          {explorer.subject.description ||
            "A reusable science subject with configurable domains and grade depth."}
        </p>
      </div>
      <section className="mt-8 grid gap-4 sm:grid-cols-3" aria-label="Subject summary">
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <Layers3 className="h-5 w-5 text-accent" aria-hidden="true" />
            <div>
              <p className="text-2xl font-semibold">{explorer.domains.length}</p>
              <p className="text-sm text-muted-foreground">subject domains</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <BookOpen className="h-5 w-5 text-accent" aria-hidden="true" />
            <div>
              <p className="text-2xl font-semibold">{explorer.grades.length}</p>
              <p className="text-sm text-muted-foreground">grade placements</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <Target className="h-5 w-5 text-accent" aria-hidden="true" />
            <div>
              <p className="text-2xl font-semibold">{explorer.objectives.length}</p>
              <p className="text-sm text-muted-foreground">objectives in view</p>
            </div>
          </CardContent>
        </Card>
      </section>
      <div className="mt-8 grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Domain spine</CardTitle>
            <CardDescription>
              Domains are reusable; grade mappings control depth and required status.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {explorer.domains.map((placement) => (
              <div key={placement.domainId} className="rounded-xl border p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium">{placement.domain.name}</p>
                  <Badge variant="outline">#{placement.sortOrder + 1}</Badge>
                </div>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {placement.domain.description || "A configurable subject domain."}
                </p>
              </div>
            ))}
            {!explorer.domains.length ? (
              <p className="text-sm text-muted-foreground">No active domains yet.</p>
            ) : null}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Progression by grade</CardTitle>
            <CardDescription>
              {curriculumId
                ? "The selected curriculum's grade placements."
                : "All active grade placements."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {explorer.grades.map((placement) => (
              <Link
                key={`${placement.curriculumId}-${placement.gradeId}`}
                href={`/grades/${placement.gradeId}?curriculumId=${placement.curriculumId}`}
                className="group block rounded-xl border p-4 transition hover:border-accent/50 hover:bg-accent/5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{placement.grade.name}</p>
                      <Badge variant={placement.isRequired ? "success" : "outline"}>
                        {placement.isRequired ? "Required" : "Optional"}
                      </Badge>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {placement.domains.map((domain) => (
                        <span
                          key={domain.domainId}
                          className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground"
                        >
                          {domain.domain.name} · depth {domain.depth}
                        </span>
                      ))}
                    </div>
                  </div>
                  <ArrowRight
                    className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-accent"
                    aria-hidden="true"
                  />
                </div>
              </Link>
            ))}
            {!explorer.grades.length ? (
              <p className="text-sm text-muted-foreground">
                This subject has not been placed in the selected curriculum yet.
              </p>
            ) : null}
          </CardContent>
        </Card>
      </div>
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Learning objectives</CardTitle>
          <CardDescription>
            These objectives belong to the curriculum and subject, with optional domain context.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {explorer.objectives.map((objective) => (
            <div key={objective.id} className="rounded-xl border px-4 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">{objective.code}</Badge>
                <p className="font-medium">{objective.title}</p>
                <Badge variant="outline">{objective.difficulty}</Badge>
              </div>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {objective.description}
              </p>
            </div>
          ))}
          {!explorer.objectives.length ? (
            <p className="text-sm text-muted-foreground">
              No objectives in this curriculum/subject view yet.
            </p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
