import Link from "next/link";
import {
  ArrowLeft,
  BookOpen,
  ChevronRight,
  Edit3,
  GitBranch,
  Lightbulb,
  Network,
  ShieldAlert,
} from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import {
  ApplicationForm,
  ArchiveConceptForm,
  LessonLinkForm,
  LessonUnlinkForm,
  MisconceptionForm,
  ObjectiveLinkForm,
} from "@/features/concepts/components/concept-forms";
import { canAuthorConcepts } from "@/features/concepts/service";
import { getCurrentSession } from "@/infrastructure/auth/local-auth-provider";
import { getConceptRepository } from "@/infrastructure/database/repositories/concept-repository";
import { getCurriculumRepository } from "@/infrastructure/database/repositories/curriculum-repository";
import type { ConceptDetail, ConceptRelationshipView } from "@/domain/concept/types";

export default async function ConceptDetailPage({
  params,
}: {
  params: Promise<{ conceptId: string }>;
}) {
  const { conceptId } = await params;
  const session = await getCurrentSession().catch(() => null);
  if (!session) redirect("/profiles");
  const author = canAuthorConcepts(session.principal);
  const conceptRepository = getConceptRepository();
  const structureRepository = getCurriculumRepository();
  const [detail, lessons, objectives] = await Promise.all([
    conceptRepository.getConceptDetail(conceptId, { includeDraftLessons: author }),
    author ? conceptRepository.listLessonCandidates() : Promise.resolve([]),
    author ? structureRepository.listLearningObjectives() : Promise.resolve([]),
  ]);
  if (!detail || (detail.concept.isArchived && !author)) notFound();
  const objectiveById = new Map(objectives.map((objective) => [objective.id, objective]));
  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 py-7 sm:px-6 lg:px-10 lg:py-10">
      <Breadcrumbs current={detail.concept.name} />
      <div className="mt-6 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
        <div>
          <Link
            href="/concepts"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Concept explorer
          </Link>
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <Badge variant="outline">{detail.subjectName}</Badge>
            {detail.domainName ? <Badge variant="outline">{detail.domainName}</Badge> : null}
            <Badge variant="outline">{detail.concept.difficulty}</Badge>
            <Badge variant={detail.concept.isArchived ? "warning" : "success"}>
              {detail.concept.isArchived ? "archived" : detail.masteryState}
            </Badge>
          </div>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-5xl">
            {detail.concept.name}
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-muted-foreground">
            {detail.concept.description ||
              "A reusable concept that can be learned through several connected explanations."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/knowledge-graph?conceptId=${detail.concept.id}`}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            <Network className="h-4 w-4" aria-hidden="true" /> Open in graph
          </Link>
          {author ? (
            <Link
              href={`/concepts/manage?edit=${detail.concept.id}`}
              className={buttonVariants({ size: "sm" })}
            >
              <Edit3 className="h-4 w-4" aria-hidden="true" /> Edit concept
            </Link>
          ) : null}
        </div>
      </div>

      <section
        className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
        aria-label="Concept summary"
      >
        <SummaryCard
          label="Grade placement"
          value={`${detail.grades[0]?.shortName ?? "Any"} → ${detail.grades.at(-1)?.shortName ?? "Any"}`}
        />
        <SummaryCard
          label="Prerequisites"
          value={String(detail.prerequisites.length)}
          icon={<GitBranch className="h-5 w-5 text-accent" aria-hidden="true" />}
        />
        <SummaryCard
          label="Teaching lessons"
          value={String(detail.lessons.length)}
          icon={<BookOpen className="h-5 w-5 text-accent" aria-hidden="true" />}
        />
        <SummaryCard
          label="Mastery threshold"
          value={`${detail.concept.masteryThreshold}%`}
          icon={<Lightbulb className="h-5 w-5 text-accent" aria-hidden="true" />}
        />
      </section>

      <div className="mt-8 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <ConceptConnections detail={detail} />
          <Card>
            <CardHeader>
              <CardTitle>Lessons teaching this concept</CardTitle>
              <CardDescription>
                Concepts stay reusable while lessons provide the authored explanations.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {detail.lessons.map((lesson) => (
                <div
                  key={lesson.lessonId}
                  className="flex items-center justify-between gap-4 rounded-xl border p-4"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={
                          lesson.lessonStatus === "published"
                            ? `/lessons/${lesson.lessonId}`
                            : `/lessons/${lesson.lessonId}/edit`
                        }
                        className="font-medium hover:text-accent hover:underline"
                      >
                        {lesson.lessonTitle}
                      </Link>
                      <Badge variant={lesson.lessonStatus === "published" ? "success" : "warning"}>
                        {lesson.lessonStatus}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {lesson.courseTitle} · {lesson.moduleTitle}
                    </p>
                  </div>
                  {author ? (
                    <LessonUnlinkForm conceptId={detail.concept.id} lessonId={lesson.lessonId} />
                  ) : null}
                </div>
              ))}
              {!detail.lessons.length ? (
                <p className="text-sm text-muted-foreground">
                  No published lessons teach this concept yet.
                </p>
              ) : null}
            </CardContent>
          </Card>
          <div className="grid gap-6 lg:grid-cols-2">
            <InfoList
              title="Real-world applications"
              icon={<Lightbulb className="h-4 w-4 text-accent" aria-hidden="true" />}
              items={detail.applications.map((application) => ({
                title: application.title,
                description: application.description,
              }))}
              empty="No applications have been written yet."
            />
            <InfoList
              title="Common misconceptions"
              icon={<ShieldAlert className="h-4 w-4 text-amber-600" aria-hidden="true" />}
              items={detail.misconceptions.map((item) => ({
                title: item.misconception,
                description: item.correction,
              }))}
              empty="No misconceptions have been recorded yet."
            />
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Curriculum and course linkage</CardTitle>
              <CardDescription>
                Objectives and teaching lessons connect this concept back to the existing curriculum
                and course hierarchy.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div>
                <p className="font-medium">Curricula</p>
                <p className="mt-1 text-muted-foreground">
                  {detail.curriculumIds.length
                    ? detail.curriculumIds.join(" · ")
                    : "No curriculum objective is linked yet."}
                </p>
              </div>
              <div>
                <p className="font-medium">Courses</p>
                <p className="mt-1 text-muted-foreground">
                  {detail.courseIds.length
                    ? detail.courseIds.join(" · ")
                    : "No course is linked through a teaching lesson yet."}
                </p>
              </div>
              <div>
                <p className="font-medium">Learning objectives</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {detail.objectives.map((objective) => (
                    <Badge key={objective.objectiveId} variant="outline">
                      {objectiveById.get(objective.objectiveId)?.code ?? objective.objectiveId}
                    </Badge>
                  ))}
                  {!detail.objectives.length ? (
                    <span className="text-muted-foreground">No objectives linked yet.</span>
                  ) : null}
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Exercises and simulations</CardTitle>
              <CardDescription>
                Phase 4 keeps these as explicit extension points; their reusable engines arrive in
                their own phases.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <EmptyExtension title="Exercises" count={detail.exerciseReferences.length} />
              <EmptyExtension title="Simulations" count={detail.simulationReferences.length} />
            </CardContent>
          </Card>
        </div>

        {author ? (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Authoring links</CardTitle>
                <CardDescription>
                  Connect the concept to the content already in the workspace.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <LessonLinkForm conceptId={detail.concept.id} lessons={lessons} />
                <div className="border-t pt-6">
                  <ObjectiveLinkForm conceptId={detail.concept.id} objectives={objectives} />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Add an application</CardTitle>
                <CardDescription>Keep the reason to learn visible.</CardDescription>
              </CardHeader>
              <CardContent>
                <ApplicationForm conceptId={detail.concept.id} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Add a misconception</CardTitle>
                <CardDescription>
                  Record a likely wrong mental model and its correction.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <MisconceptionForm conceptId={detail.concept.id} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Concept status</CardTitle>
                <CardDescription>
                  Archiving removes this concept from learner-facing explorers without deleting
                  history.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ArchiveConceptForm concept={detail.concept} />
              </CardContent>
            </Card>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-5">
        {icon ?? <GitBranch className="h-5 w-5 text-accent" aria-hidden="true" />}
        <div>
          <p className="text-2xl font-semibold">{value}</p>
          <p className="text-sm text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function ConceptConnections({ detail }: { detail: ConceptDetail }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Prerequisites and unlocked concepts</CardTitle>
        <CardDescription>
          Required edges explain the path; other edges add context without blocking progress.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <ConnectionGroup
          title="Requires"
          items={detail.prerequisites}
          empty="No required prerequisites."
        />
        <ConnectionGroup
          title="Unlocks or extends"
          items={detail.unlocks}
          empty="Nothing is explicitly unlocked from this concept yet."
        />
        <div>
          <p className="text-sm font-semibold">Related concepts</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {[
              ...new Map(
                detail.relationships.map((relationship) => [relationship.id, relationship]),
              ).values(),
            ].map((relationship) => {
              const other =
                relationship.sourceConceptId === detail.concept.id
                  ? relationship.targetConcept
                  : relationship.sourceConcept;
              return (
                <Link
                  key={relationship.id}
                  href={`/concepts/${other.id}`}
                  className="inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs hover:border-accent/50 hover:text-accent"
                >
                  {other.name}
                  <ChevronRight className="h-3 w-3" aria-hidden="true" />
                </Link>
              );
            })}
            {!detail.relationships.length ? (
              <span className="text-sm text-muted-foreground">No other relationships yet.</span>
            ) : null}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ConnectionGroup({
  title,
  items,
  empty,
}: {
  title: string;
  items: readonly ConceptRelationshipView[];
  empty: string;
}) {
  return (
    <div>
      <p className="text-sm font-semibold">{title}</p>
      <div className="mt-2 space-y-2">
        {items.map((relationship) => {
          const other =
            relationship.sourceConceptId === relationship.targetConcept.id
              ? relationship.sourceConcept
              : relationship.targetConcept;
          return (
            <Link
              key={relationship.id}
              href={`/concepts/${other.id}`}
              className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm hover:border-accent/50 hover:text-accent"
            >
              <span>{other.name}</span>
              <Badge variant="outline">{relationship.type}</Badge>
            </Link>
          );
        })}
        {!items.length ? <p className="text-sm text-muted-foreground">{empty}</p> : null}
      </div>
    </div>
  );
}

function InfoList({
  title,
  icon,
  items,
  empty,
}: {
  title: string;
  icon: React.ReactNode;
  items: readonly { title: string; description: string }[];
  empty: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((item) => (
          <div key={`${item.title}-${item.description}`} className="rounded-lg border p-3">
            <p className="text-sm font-medium">{item.title}</p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">{item.description}</p>
          </div>
        ))}
        {!items.length ? <p className="text-sm text-muted-foreground">{empty}</p> : null}
      </CardContent>
    </Card>
  );
}

function EmptyExtension({ title, count }: { title: string; count: number }) {
  return (
    <div className="rounded-xl border border-dashed p-4">
      <p className="text-sm font-medium">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">
        {count ? `${count} linked` : "No linked items yet."}
      </p>
    </div>
  );
}
