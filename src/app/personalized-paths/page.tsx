import Link from "next/link";
import { ArrowRight, CheckCircle2, Clock3, Route, Sparkles } from "lucide-react";
import type { ComponentProps } from "react";
import { redirect } from "next/navigation";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { getCurrentSession } from "@/infrastructure/auth/local-auth-provider";
import { getRoadmapRepository } from "@/infrastructure/database/repositories/roadmap-repository";
import { GeneratePathForm } from "@/features/roadmaps/components/roadmap-forms";

export default async function PersonalizedPathsPage() {
  const session = await getCurrentSession().catch(() => null);
  if (!session) redirect("/profiles");
  const repository = getRoadmapRepository();
  const enrollments = await repository.listUserRoadmaps(session.principal.profileId);
  const entries = await Promise.all(
    enrollments.map(async (enrollment) => ({
      enrollment,
      detail: await repository.getUserRoadmap(session.principal.profileId, enrollment.roadmapId),
      path: await repository.getLatestPersonalizedPath(
        session.principal.profileId,
        enrollment.roadmapId,
      ),
    })),
  );
  return (
    <div className="mx-auto w-full max-w-[1500px] px-4 py-7 sm:px-6 lg:px-10 lg:py-10">
      <Breadcrumbs current="Personalized paths" />
      <div className="mt-6 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="eyebrow">Adaptive sequencing Â· Phase 8</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            Personalized learning paths
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground sm:text-base">
            Every generated path shows the topics included, the concepts skipped because they are
            mastered, and the prerequisite reason behind the ordering.
          </p>
        </div>
        <RoadmapLink
          href="/roadmaps"
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          <Route className="h-4 w-4" aria-hidden="true" /> Browse roadmaps
        </RoadmapLink>
      </div>
      <div className="mt-8 space-y-6">
        {entries.map(({ enrollment, detail, path }) => (
          <Card key={enrollment.id}>
            <CardHeader>
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                <div>
                  <CardTitle>
                    <RoadmapLink
                      href={`/roadmaps/${enrollment.roadmapId}`}
                      className="hover:text-accent"
                    >
                      {detail?.roadmap.title ?? enrollment.roadmapId}
                    </RoadmapLink>
                  </CardTitle>
                  <CardDescription className="mt-2">
                    {enrollment.selectedGoal ||
                      detail?.roadmap.goal ||
                      "A learner-selected interdisciplinary route."}
                  </CardDescription>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant={enrollment.status === "completed" ? "success" : "default"}>
                    {enrollment.status}
                  </Badge>
                  <Badge variant="outline">
                    {detail?.summary.percentage ?? 0}% roadmap progress
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {path ? (
                <div className="grid gap-6 lg:grid-cols-[0.7fr_1.3fr]">
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <Metric
                        label="Estimated time"
                        value={`${path.estimatedDurationMinutes} min`}
                      />
                      <Metric
                        label="Included topics"
                        value={path.includedTopics.length.toString()}
                      />
                    </div>
                    <div className="rounded-xl bg-accent/10 p-4 text-sm">
                      <p className="font-semibold text-accent">
                        <Sparkles className="mr-1 inline h-4 w-4" aria-hidden="true" /> Why this
                        order?
                      </p>
                      <p className="mt-2 leading-6">
                        The route uses your current mastery, diagnostic signals, target grade, and
                        available study time.{" "}
                        {path.skippedMasteredTopics.length
                          ? `${path.skippedMasteredTopics.length} mastered topic${path.skippedMasteredTopics.length === 1 ? " is" : "s are"} skipped.`
                          : "No topics were skipped yet."}
                      </p>
                    </div>
                    <GeneratePathForm roadmapId={enrollment.roadmapId} />
                  </div>
                  <div className="space-y-3">
                    {path.pathNodes.map((item) => (
                      <div key={item.nodeId} className="flex gap-3 rounded-lg border p-3">
                        <div className="mt-0.5">
                          {item.state === "skipped-mastered" || item.state === "completed" ? (
                            <CheckCircle2 className="h-4 w-4 text-accent" aria-hidden="true" />
                          ) : (
                            <span className="grid h-4 w-4 place-items-center rounded-full border text-[0.6rem]">
                              {item.order + 1}
                            </span>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-medium">{item.title}</p>
                            <Badge
                              variant={
                                item.state === "skipped-mastered"
                                  ? "success"
                                  : item.state === "missing-prerequisite"
                                    ? "warning"
                                    : "outline"
                              }
                            >
                              {item.state.replaceAll("-", " ")}
                            </Badge>
                          </div>
                          <p className="mt-1 text-sm leading-6 text-muted-foreground">
                            {item.reason}
                          </p>
                          <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />{" "}
                            {item.estimatedDurationMinutes} minutes
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col justify-between gap-4 rounded-xl border border-dashed p-5 sm:flex-row sm:items-center">
                  <div>
                    <p className="font-semibold">No personalized path yet.</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Generate one to account for your mastery and diagnostic evidence.
                    </p>
                  </div>
                  <GeneratePathForm roadmapId={enrollment.roadmapId} />
                </div>
              )}
            </CardContent>
          </Card>
        ))}
        {!entries.length ? (
          <Card>
            <CardContent className="py-16 text-center">
              <Route className="mx-auto h-8 w-8 text-accent" aria-hidden="true" />
              <p className="mt-3 font-semibold">Start a roadmap to see your path.</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Your active interdisciplinary routes will appear here.
              </p>
              <RoadmapLink href="/roadmaps" className={buttonVariants({ size: "sm" }) + " mt-5"}>
                Explore roadmaps <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </RoadmapLink>
            </CardContent>
          </Card>
        ) : null}
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
