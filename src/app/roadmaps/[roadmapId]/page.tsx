import Link from "next/link";
import { ArrowLeft, ArrowRight, CircleAlert, LockKeyhole, Sparkles } from "lucide-react";
import type { ComponentProps } from "react";
import { redirect, notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { getCurrentSession } from "@/infrastructure/auth/local-auth-provider";
import { getRoadmapRepository } from "@/infrastructure/database/repositories/roadmap-repository";
import {
  canAuthorRoadmaps,
  getRoadmap,
  getLatestPersonalizedPath,
  getUserRoadmap,
} from "@/features/roadmaps/service";
import {
  EnrollRoadmapForm,
  GeneratePathForm,
  ProgressForm,
} from "@/features/roadmaps/components/roadmap-forms";

function resourceHref(type: string, id: string | null): string | null {
  if (!id) return null;
  if (type === "concept") return `/concepts/${id}`;
  if (type === "lesson") return `/lessons/${id}`;
  if (type === "course") return `/courses/${id}`;
  if (type === "module") return `/courses/${id}`;
  if (type === "assessment") return `/assessments/${id}`;
  return null;
}

export default async function RoadmapDetailPage({
  params,
}: {
  params: Promise<{ roadmapId: string }>;
}) {
  const session = await getCurrentSession().catch(() => null);
  if (!session) redirect("/profiles");
  const { roadmapId } = await params;
  const repository = getRoadmapRepository();
  const detail = await getRoadmap(roadmapId, repository).catch(() => null);
  if (!detail) notFound();
  const author = canAuthorRoadmaps(session.principal);
  const enrollment = await getUserRoadmap(session.principal.profileId, roadmapId, repository).catch(
    () => null,
  );
  const path = await getLatestPersonalizedPath(session.principal.profileId, roadmapId, repository);
  const progressByNode = new Map(
    enrollment?.progress.map((item) => [item.roadmapNodeId, item]) ?? [],
  );
  return (
    <div className="mx-auto w-full max-w-[1500px] px-4 py-7 sm:px-6 lg:px-10 lg:py-10">
      <Breadcrumbs current={detail.roadmap.title} />
      <div className="mt-6 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
        <div>
          <RoadmapLink
            href="/roadmaps"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Roadmap catalog
          </RoadmapLink>
          <p className="eyebrow mt-5">
            {detail.subjects.map((subject) => subject.subjectName).join(" Â· ") ||
              "Cross-subject path"}
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            {detail.roadmap.title}
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground sm:text-base">
            {detail.roadmap.description}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="success">{detail.roadmap.status}</Badge>
          <Badge variant="outline">
            {detail.nodes.length} nodes Â· {detail.roadmap.estimatedDurationMinutes} min
          </Badge>
          {author ? (
            <RoadmapLink
              href={`/roadmaps/${roadmapId}/edit`}
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              Edit roadmap
            </RoadmapLink>
          ) : null}
        </div>
      </div>
      <div className="mt-8 grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
        <Card>
          <CardHeader>
            <CardTitle>Learning route</CardTitle>
            <CardDescription>
              {detail.roadmap.goal || "A connected route through reusable learning resources."}{" "}
              Required nodes unlock in order; optional branches remain visible as enrichment.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {detail.nodes.map((node, index) => {
              const progress = progressByNode.get(node.id);
              const locked = progress?.status === "locked";
              const href = resourceHref(node.type, node.referenceId);
              return (
                <div
                  key={node.id}
                  className="relative flex gap-4 rounded-xl border p-4"
                  data-node-key={node.nodeKey}
                  draggable
                >
                  <div className="flex flex-col items-center">
                    <span
                      className={`grid h-9 w-9 place-items-center rounded-full ${progress?.status === "completed" ? "bg-accent/15 text-accent" : locked ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary"}`}
                    >
                      <span className="text-sm font-semibold">{index + 1}</span>
                    </span>
                    {index < detail.nodes.length - 1 ? (
                      <span className="mt-2 h-full w-px bg-border" />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold">{node.title}</p>
                      <Badge variant={node.isRequired ? "default" : "outline"}>
                        {node.isRequired ? "required" : "optional"}
                      </Badge>
                      {node.isCheckpoint ? <Badge variant="success">checkpoint</Badge> : null}
                      {locked ? (
                        <LockKeyhole
                          className="h-4 w-4 text-muted-foreground"
                          aria-label="Locked"
                        />
                      ) : null}
                    </div>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                      {node.description ||
                        `${node.type.replaceAll("-", " ")} Â· ${node.estimatedDurationMinutes} minutes`}
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      {node.subjectName ? <span>{node.subjectName}</span> : null}
                      {node.referenceTitle ? <span>{node.referenceTitle}</span> : null}
                      {progress ? (
                        <span>
                          {progress.status} Â· {progress.completionPercentage}%
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {href && !locked ? (
                        <RoadmapLink
                          href={href}
                          className={buttonVariants({ variant: "outline", size: "sm" })}
                        >
                          Open resource <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                        </RoadmapLink>
                      ) : null}
                      {enrollment && !locked ? (
                        <ProgressForm roadmapId={roadmapId} node={node} progress={progress} />
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
        <div className="space-y-6">
          {!enrollment ? (
            <Card>
              <CardHeader>
                <CardTitle>Make this your route</CardTitle>
                <CardDescription>
                  Start with a versioned roadmap enrollment. Your progress stays separate from the
                  reusable content.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <EnrollRoadmapForm roadmapId={roadmapId} />
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Your progress</CardTitle>
                <CardDescription>
                  {enrollment.summary.nextNodeId
                    ? "One clear next step is ready."
                    : "You have completed every required node."}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  <Metric
                    label="Required complete"
                    value={`${enrollment.summary.completedRequiredNodes}/${enrollment.summary.requiredNodes}`}
                  />
                  <Metric label="Progress" value={`${enrollment.summary.percentage}%`} />
                </div>
                <div className="mt-5">
                  <GeneratePathForm roadmapId={roadmapId} />
                </div>
              </CardContent>
            </Card>
          )}
          <Card>
            <CardHeader>
              <CardTitle>
                <Sparkles className="mr-2 inline h-5 w-5 text-accent" aria-hidden="true" />
                Personalized ordering
              </CardTitle>
              <CardDescription>
                Mastery, diagnostic signals, and available time explain what to skip and what to
                place first.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {path ? (
                <div className="space-y-3">
                  <div className="rounded-lg bg-accent/10 p-3 text-sm">
                    <strong>{path.estimatedDurationMinutes} minutes</strong>
                    {path.estimatedWeeks
                      ? ` Â· about ${path.estimatedWeeks} week${path.estimatedWeeks === 1 ? "" : "s"}`
                      : ""}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {path.skippedMasteredTopics.length
                      ? `Skipped: ${path.skippedMasteredTopics.join(", ")}.`
                      : "No mastered topics were skipped yet."}
                  </p>
                  <RoadmapLink
                    href="/personalized-paths"
                    className={buttonVariants({ variant: "outline", size: "sm" })}
                  >
                    Open full path
                  </RoadmapLink>
                </div>
              ) : (
                <div className="space-y-3 text-sm text-muted-foreground">
                  <CircleAlert className="h-5 w-5 text-accent" aria-hidden="true" />
                  <p>
                    Generate a path after starting the roadmap to see reasons for every ordering
                    decision.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
          {detail.integrity.warnings.length ? (
            <Card>
              <CardHeader>
                <CardTitle>Author notes</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                {detail.integrity.warnings.length} isolated node
                {detail.integrity.warnings.length === 1 ? "" : "s"} are visible for author review.
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-muted/40 p-3 text-center">
      <p className="text-xl font-semibold">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function RoadmapLink(props: Omit<ComponentProps<typeof Link>, "href"> & { href: string }) {
  const { href, ...rest } = props;
  return <Link {...rest} href={href as never} />;
}
