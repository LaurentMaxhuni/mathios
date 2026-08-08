import Link from "next/link";
import { ArrowRight, Atom, Dna, FlaskConical, Plus, Sigma } from "lucide-react";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { buttonVariants } from "@/components/ui/button";
import { getCurrentSession } from "@/infrastructure/auth/local-auth-provider";
import { getCurriculumRepository } from "@/infrastructure/database/repositories/curriculum-repository";
import { canManageStructure } from "@/features/curricula/service";

const subjectIcons = {
  mathematics: Sigma,
  physics: Atom,
  chemistry: FlaskConical,
  biology: Dna,
  astronomy: Atom,
} as const;

export default async function SubjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ curriculumId?: string }>;
}) {
  const repository = getCurriculumRepository();
  const session = await getCurrentSession().catch(() => null);
  if (!session) redirect("/profiles");
  if (!canManageStructure(session.principal)) redirect("/learn");
  const query = await searchParams;
  const [subjects, curricula] = await Promise.all([
    repository.listSubjects(),
    repository.listCurricula(),
  ]);
  const curriculum = curricula.find((item) => item.id === query.curriculumId) ?? curricula[0];
  const explorers = await Promise.all(
    subjects.map((subject) => repository.getSubjectExplorer(subject.id, curriculum?.id)),
  );
  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 py-7 sm:px-6 lg:px-10 lg:py-10">
      <Breadcrumbs current="Subject explorer" />
      <div className="mt-6 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="eyebrow">Learning map · subjects</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Five ways into science.</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
            Subjects are durable, reusable structures. Their domains can recur at different depths
            as a learner moves through grades and curricula.
          </p>
        </div>
        {canManageStructure(session.principal) ? (
          <Link href="/subjects/manage" className={buttonVariants({ size: "sm" })}>
            <Plus className="h-4 w-4" aria-hidden="true" /> Manage subjects
          </Link>
        ) : null}
      </div>
      <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {subjects.map((subject, index) => {
          const explorer = explorers[index];
          const Icon = subjectIcons[subject.slug as keyof typeof subjectIcons] ?? Atom;
          return (
            <Link
              key={subject.id}
              href={`/subjects/${subject.id}${curriculum ? `?curriculumId=${curriculum.id}` : ""}`}
              className="group"
            >
              <Card className="h-full overflow-hidden transition duration-200 group-hover:-translate-y-1 group-hover:border-accent/50">
                <div
                  className="h-1"
                  style={{ backgroundColor: `hsl(var(--subject-${subject.slug}))` }}
                />
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <span className="grid h-12 w-12 place-items-center rounded-xl bg-muted text-accent">
                      <Icon className="h-6 w-6" aria-hidden="true" />
                    </span>
                    <Badge variant="outline">{subject.recommendedStudyHours} h / year</Badge>
                  </div>
                  <CardTitle className="mt-5">{subject.name}</CardTitle>
                  <CardDescription className="mt-2 leading-6">
                    {subject.description || "A reusable subject structure."}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between border-t pt-4 text-sm">
                    <span className="text-muted-foreground">
                      {explorer?.domains.length ?? 0} domains · {explorer?.grades.length ?? 0} grade
                      placements
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
