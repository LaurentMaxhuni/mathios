import Link from "next/link";
import { ArrowRight, GitBranch, Plus, ShieldCheck } from "lucide-react";
import type { ComponentProps } from "react";
import { redirect } from "next/navigation";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { ErrorState } from "@/components/shared/error-state";
import { RoadmapForm } from "@/features/roadmaps/components/roadmap-forms";
import { canAuthorRoadmaps } from "@/features/roadmaps/service";
import { getCurrentSession } from "@/infrastructure/auth/local-auth-provider";
import { getRoadmapRepository } from "@/infrastructure/database/repositories/roadmap-repository";
import { getCurriculumRepository } from "@/infrastructure/database/repositories/curriculum-repository";

export default async function RoadmapManagementPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  const session = await getCurrentSession().catch(() => null);
  if (!session) redirect("/profiles");
  if (!canAuthorRoadmaps(session.principal))
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-7 sm:px-6 lg:px-10 lg:py-10">
        <Breadcrumbs current="Roadmap management" />
        <div className="mt-6">
          <ErrorState
            title="Content author permission required"
            description="Teachers, content creators, and administrators can manage reusable interdisciplinary roadmaps."
          />
        </div>
      </div>
    );
  const { edit } = await searchParams;
  const repository = getRoadmapRepository();
  const curriculum = getCurriculumRepository();
  const [roadmaps, grades, selected] = await Promise.all([
    repository.listRoadmaps({ includeDraft: true, includeArchived: true }),
    curriculum.listGrades(),
    edit ? repository.getRoadmap(edit, { includeDraft: true }) : Promise.resolve(null),
  ]);
  return (
    <div className="mx-auto w-full max-w-[1500px] px-4 py-7 sm:px-6 lg:px-10 lg:py-10">
      <Breadcrumbs current="Roadmap management" />
      <div className="mt-6 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <RoadmapLink
            href="/roadmaps"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowRight className="h-4 w-4 rotate-180" aria-hidden="true" /> Roadmap catalog
          </RoadmapLink>
          <p className="eyebrow mt-5">Content governance Â· Phase 8</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Roadmap studio</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground sm:text-base">
            Compose reusable cross-subject paths, validate dependencies, and preview the learner
            route before publishing a version.
          </p>
        </div>
        <Badge variant="success">
          <ShieldCheck className="mr-1 h-3.5 w-3.5" aria-hidden="true" /> Authoring enabled
        </Badge>
      </div>
      <div className="mt-8 grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <Card>
          <CardHeader>
            <CardTitle>
              {selected ? `Edit ${selected.roadmap.title}` : "Create a roadmap"}
            </CardTitle>
            <CardDescription>
              Keep the roadmap identity stable; nodes and edges are versioned separately.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RoadmapForm roadmap={selected?.roadmap} grades={grades} />
            {selected ? (
              <RoadmapLink
                href={`/roadmaps/${selected.roadmap.id}/edit`}
                className={buttonVariants({ variant: "outline", size: "sm" }) + " mt-4"}
              >
                Open node editor
              </RoadmapLink>
            ) : null}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Existing roadmaps</CardTitle>
            <CardDescription>
              Drafts stay private until a valid dependency graph is published.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {roadmaps.map((roadmap) => (
              <RoadmapLink
                key={roadmap.id}
                href={`/roadmaps/${roadmap.id}/edit`}
                className="group flex items-center justify-between gap-4 rounded-xl border p-4 transition hover:border-accent/50 hover:bg-accent/5"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <GitBranch className="h-4 w-4 text-accent" aria-hidden="true" />
                    <p className="font-medium">{roadmap.title}</p>
                    <Badge variant={roadmap.status === "published" ? "success" : "warning"}>
                      {roadmap.status}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {roadmap.nodeCount} nodes Â· {roadmap.requiredNodeCount} required Â·{" "}
                    {roadmap.checkpointCount} checkpoints
                  </p>
                </div>
                <ArrowRight
                  className="h-4 w-4 shrink-0 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-accent"
                  aria-hidden="true"
                />
              </RoadmapLink>
            ))}
            {!roadmaps.length ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                <Plus className="mx-auto h-5 w-5" aria-hidden="true" />
                Create the first roadmap.
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function RoadmapLink(props: Omit<ComponentProps<typeof Link>, "href"> & { href: string }) {
  const { href, ...rest } = props;
  return <Link {...rest} href={href as never} />;
}
