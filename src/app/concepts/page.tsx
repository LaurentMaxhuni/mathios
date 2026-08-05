import Link from "next/link";
import { ArrowRight, Network, Plus, Shapes } from "lucide-react";
import { redirect } from "next/navigation";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { getCurrentSession } from "@/infrastructure/auth/local-auth-provider";
import { getConceptRepository } from "@/infrastructure/database/repositories/concept-repository";
import { getCurriculumRepository } from "@/infrastructure/database/repositories/curriculum-repository";
import { canAuthorConcepts } from "@/features/concepts/service";

export default async function ConceptsPage() {
  const session = await getCurrentSession().catch(() => null);
  if (!session) redirect("/profiles");
  const author = canAuthorConcepts(session.principal);
  const [concepts, subjects, domains, grades] = await Promise.all([
    getConceptRepository().listConcepts({ includeArchived: author }),
    getCurriculumRepository().listSubjects(),
    getCurriculumRepository().listDomains(),
    getCurriculumRepository().listGrades(),
  ]);
  const subjectById = new Map(subjects.map((subject) => [subject.id, subject]));
  const domainById = new Map(domains.map((domain) => [domain.id, domain]));
  const gradeById = new Map(grades.map((grade) => [grade.id, grade]));
  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 py-7 sm:px-6 lg:px-10 lg:py-10">
      <Breadcrumbs current="Concept explorer" />
      <div className="mt-6 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="eyebrow">Knowledge map · Phase 4</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            Concepts that connect the curriculum.
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
            Explore reusable ideas across subjects, grades, domains, and lessons. Prerequisites
            explain the sequence; applications and misconceptions explain why the idea matters.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/knowledge-graph"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            <Network className="h-4 w-4" aria-hidden="true" /> Open graph
          </Link>
          {author ? (
            <Link href="/concepts/manage" className={buttonVariants({ size: "sm" })}>
              <Plus className="h-4 w-4" aria-hidden="true" /> Manage concepts
            </Link>
          ) : null}
        </div>
      </div>
      <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {concepts.map((concept) => {
          const subject = subjectById.get(concept.subjectId);
          const domain = concept.domainId ? domainById.get(concept.domainId) : null;
          return (
            <Link key={concept.id} href={`/concepts/${concept.id}`} className="group">
              <Card className="h-full overflow-hidden transition duration-200 group-hover:-translate-y-1 group-hover:border-accent/50 group-hover:shadow-soft">
                <div
                  className="h-1"
                  style={{ background: `hsl(var(--subject-${subject?.slug ?? "astronomy"}))` }}
                />
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <span className="grid h-11 w-11 place-items-center rounded-xl bg-accent/10 text-accent">
                      <Shapes className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <Badge variant={concept.masteryState === "unassessed" ? "outline" : "success"}>
                      {concept.masteryState}
                    </Badge>
                  </div>
                  <CardTitle className="mt-5 text-xl">{concept.name}</CardTitle>
                  <CardDescription className="mt-2 leading-6">
                    {concept.description || "A reusable idea in the knowledge graph."}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span className="rounded-full bg-muted px-2.5 py-1">
                      {subject?.name ?? "Subject"}
                    </span>
                    <span className="rounded-full bg-muted px-2.5 py-1">
                      {domain?.name ?? "Subject-wide"}
                    </span>
                    <span className="rounded-full bg-muted px-2.5 py-1">{concept.difficulty}</span>
                  </div>
                  <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t pt-4 text-sm">
                    <span className="text-muted-foreground">
                      {concept.prerequisiteCount} prerequisite
                      {concept.prerequisiteCount === 1 ? "" : "s"} · {concept.lessonCount} lesson
                      {concept.lessonCount === 1 ? "" : "s"}
                    </span>
                    <span className="inline-flex items-center gap-1 font-medium text-accent">
                      Open{" "}
                      <ArrowRight
                        className="h-4 w-4 transition group-hover:translate-x-1"
                        aria-hidden="true"
                      />
                    </span>
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground">
                    {concept.gradeMinId ? gradeById.get(concept.gradeMinId)?.shortName : "Any"} →{" "}
                    {concept.gradeMaxId ? gradeById.get(concept.gradeMaxId)?.shortName : "Any"} ·
                    threshold {concept.masteryThreshold}%
                  </p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
      {!concepts.length ? (
        <Card className="mt-8">
          <CardContent className="py-14 text-center">
            <p className="font-semibold">No concepts are available yet.</p>
            <p className="mt-2 text-sm text-muted-foreground">
              A content creator can add reusable concepts and connect them to published lessons.
            </p>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
