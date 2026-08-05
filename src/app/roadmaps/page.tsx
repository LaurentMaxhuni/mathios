import Link from "next/link";
import { ArrowRight, GitBranch, Layers3, Plus, Route } from "lucide-react";
import type { ComponentProps } from "react";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { buttonVariants } from "@/components/ui/button";
import { getCurrentSession } from "@/infrastructure/auth/local-auth-provider";
import { getRoadmapRepository } from "@/infrastructure/database/repositories/roadmap-repository";
import { canAuthorRoadmaps, listRoadmaps } from "@/features/roadmaps/service";

export default async function RoadmapsPage() {
  const session = await getCurrentSession().catch(() => null);
  if (!session) redirect("/profiles");
  const repository = getRoadmapRepository();
  const author = canAuthorRoadmaps(session.principal);
  const [roadmaps, enrollments] = await Promise.all([
    listRoadmaps(repository, { includeDraft: author }),
    repository.listUserRoadmaps(session.principal.profileId),
  ]);
  const details = await Promise.all(
    enrollments.map((enrollment) =>
      repository.getUserRoadmap(session.principal.profileId, enrollment.roadmapId),
    ),
  );
  const activeByRoadmap = new Map(
    details.filter((detail) => detail !== null).map((detail) => [detail!.roadmap.id, detail!]),
  );
  return (
    <div className="mx-auto w-full max-w-[1500px] px-4 py-7 sm:px-6 lg:px-10 lg:py-10">
      <Breadcrumbs current="Roadmaps" />
      <div className="mt-6 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="eyebrow">Interdisciplinary learning Â· Phase 8</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            Interdisciplinary roadmaps
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground sm:text-base">
            Follow reusable paths that connect subjects, grades, and prerequisites. Each roadmap
            explains what unlocks next and adapts around the concepts you already know.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <RoadmapLink
            href="/personalized-paths"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            <Route className="h-4 w-4" aria-hidden="true" /> My personalized paths
          </RoadmapLink>
          {author ? (
            <RoadmapLink href="/roadmaps/manage" className={buttonVariants({ size: "sm" })}>
              <Plus className="h-4 w-4" aria-hidden="true" /> Roadmap studio
            </RoadmapLink>
          ) : null}
        </div>
      </div>
      <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {roadmaps.map((roadmap) => {
          const active = activeByRoadmap.get(roadmap.id);
          return (
            <RoadmapLink key={roadmap.id} href={`/roadmaps/${roadmap.id}`} className="group">
              <Card className="h-full overflow-hidden transition duration-200 group-hover:-translate-y-1 group-hover:border-accent/50 group-hover:shadow-soft">
                <div className="h-1 bg-accent" />
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <span className="grid h-11 w-11 place-items-center rounded-xl bg-accent/10 text-accent">
                      <GitBranch className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <Badge variant={roadmap.status === "published" ? "success" : "warning"}>
                      {roadmap.status}
                    </Badge>
                  </div>
                  <CardTitle className="mt-5 text-xl">{roadmap.title}</CardTitle>
                  <CardDescription className="mt-2 leading-6">
                    {roadmap.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    {roadmap.subjectNames.map((subject) => (
                      <span key={subject} className="rounded-full bg-muted px-2.5 py-1">
                        {subject}
                      </span>
                    ))}
                  </div>
                  <div className="mt-5 flex items-center justify-between border-t pt-4 text-sm">
                    <span className="text-muted-foreground">
                      <Layers3 className="mr-1 inline h-4 w-4" aria-hidden="true" />
                      {roadmap.nodeCount} nodes Â· {roadmap.estimatedDurationMinutes} min
                    </span>
                    <ArrowRight
                      className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-accent"
                      aria-hidden="true"
                    />
                  </div>
                  {active ? (
                    <div className="mt-3 rounded-lg bg-accent/10 px-3 py-2 text-xs text-accent">
                      {active.summary.percentage}% complete Â·{" "}
                      {active.summary.nextNodeId ? "Next step ready" : "Path complete"}
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            </RoadmapLink>
          );
        })}
      </div>
      {!roadmaps.length ? (
        <Card className="mt-8">
          <CardContent className="py-14 text-center">
            <p className="font-semibold">No published roadmaps yet.</p>
            <p className="mt-2 text-sm text-muted-foreground">
              A content editor can publish the first interdisciplinary path.
            </p>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function RoadmapLink(props: Omit<ComponentProps<typeof Link>, "href"> & { href: string }) {
  const { href, ...rest } = props;
  return <Link {...rest} href={href as never} />;
}
