import Link from "next/link";
import { ArrowLeft, BookOpen, History, ShieldCheck } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentSession } from "@/infrastructure/auth/local-auth-provider";
import { getMasteryRepository } from "@/infrastructure/database/repositories/mastery-repository";
import { getMasteryDetail } from "@/features/mastery/service";
import {
  EvidenceNote,
  MasteryBar,
  MasteryStateBadge,
  ReviewDue,
  percentage,
} from "@/features/mastery/components/mastery-ui";

export const dynamic = "force-dynamic";

export default async function ConceptMasteryPage({
  params,
}: {
  params: Promise<{ conceptId: string }>;
}) {
  const session = await getCurrentSession().catch(() => null);
  if (!session) redirect("/profiles");
  const { conceptId } = await params;
  const detail = await getMasteryDetail(
    session.principal.profileId,
    conceptId,
    getMasteryRepository(),
  ).catch(() => null);
  if (!detail) notFound();

  return (
    <div className="mx-auto w-full max-w-[1280px] px-4 py-7 sm:px-6 lg:px-10 lg:py-10">
      <Breadcrumbs current={`${detail.concept.name} mastery`} />
      <Link
        href={"/mastery" as never}
        className="mt-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Mastery dashboard
      </Link>
      <div className="mt-5 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
        <div>
          <p className="eyebrow">
            {detail.concept.subjectName} · {detail.concept.domainName ?? "Concept"}
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-5xl">
            {detail.concept.name}
          </h1>
          <p className="mt-3 max-w-3xl text-base leading-7 text-muted-foreground">
            A transparent mastery record: current score, confidence, evidence, prerequisites, and
            historical changes all stay visible.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <MasteryStateBadge state={detail.mastery.state} />
          <Badge variant="outline">{detail.mastery.confidenceLabel} confidence</Badge>
        </div>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardContent className="p-5">
            <p className="text-2xl font-semibold">{percentage(detail.mastery.score)}</p>
            <p className="text-sm text-muted-foreground">Current mastery</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-2xl font-semibold">{percentage(detail.mastery.confidence)}</p>
            <p className="text-sm text-muted-foreground">Confidence</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-2xl font-semibold">{detail.mastery.evidenceCount}</p>
            <p className="text-sm text-muted-foreground">Evidence items</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-2xl font-semibold">{detail.mastery.evidenceTypeCount}</p>
            <p className="text-sm text-muted-foreground">Evidence types</p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Explainable score</CardTitle>
              <CardDescription>
                Weights favor varied, recent evidence and prevent one easy question from creating
                mastery.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <MasteryBar
                value={detail.mastery.score}
                label={`Mastery score · threshold ${detail.concept.masteryThreshold}%`}
              />
              <EvidenceNote
                detail={
                  detail.mastery.evidenceSummary.join(" · ") ||
                  "No evidence has been recorded yet. Complete a linked lesson or practice set to begin."
                }
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border p-4">
                  <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                    Next review
                  </p>
                  <div className="mt-2">
                    <ReviewDue date={detail.mastery.nextReviewAt} />
                    {!detail.mastery.nextReviewAt ? (
                      <span className="text-sm text-muted-foreground">Not scheduled yet</span>
                    ) : null}
                  </div>
                </div>
                <div className="rounded-xl border p-4">
                  <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                    Recency factor
                  </p>
                  <p className="mt-2 text-lg font-semibold">
                    {Math.round(detail.mastery.breakdown.recencyFactor * 100)}%
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Historical evidence is discounted gradually.
                  </p>
                </div>
                <div className="rounded-xl border p-4">
                  <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                    Consistency factor
                  </p>
                  <p className="mt-2 text-lg font-semibold">
                    {Math.round(detail.mastery.breakdown.consistencyFactor * 100)}%
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Steady evidence builds confidence.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-4 w-4 text-accent" aria-hidden="true" /> Evidence history
              </CardTitle>
              <CardDescription>
                Every lesson, exercise, and assessment contribution is retained as an event.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {detail.events.map((event) => (
                <div
                  key={event.id}
                  className="flex flex-col justify-between gap-2 rounded-xl border p-4 sm:flex-row sm:items-center"
                >
                  <div>
                    <p className="font-medium">{event.eventType.replaceAll("-", " ")}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {new Date(event.occurredAt).toLocaleString()} · {event.difficulty} ·{" "}
                      {event.attempts} attempt{event.attempts === 1 ? "" : "s"}
                    </p>
                  </div>
                  <Badge variant="outline">{percentage(event.score)}</Badge>
                </div>
              ))}
              {!detail.events.length ? (
                <p className="text-sm text-muted-foreground">
                  No events yet. This is intentionally different from assuming a lesson was
                  mastered.
                </p>
              ) : null}
            </CardContent>
          </Card>
        </div>
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-accent" aria-hidden="true" /> Prerequisite
                health
              </CardTitle>
              <CardDescription>
                Weak required prerequisites are shown before the score can be treated as mastery.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {detail.prerequisites.map((item) => (
                <Link
                  key={item.id}
                  href={`/mastery/concepts/${item.id}` as never}
                  className="flex items-center justify-between rounded-lg border px-3 py-3 text-sm hover:border-accent/50"
                >
                  <span>{item.name}</span>
                  <MasteryStateBadge state={item.mastery.state} />
                </Link>
              ))}
              {!detail.prerequisites.length ? (
                <p className="text-sm text-muted-foreground">No required prerequisites.</p>
              ) : null}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-accent" aria-hidden="true" /> Concepts unlocked
              </CardTitle>
              <CardDescription>
                Mastery makes the next connected ideas easier to choose intentionally.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {detail.unlocks.map((item) => (
                <Link
                  key={item.id}
                  href={`/mastery/concepts/${item.id}` as never}
                  className="flex items-center justify-between rounded-lg border px-3 py-3 text-sm hover:border-accent/50"
                >
                  <span>{item.name}</span>
                  <MasteryStateBadge state={item.mastery.state} />
                </Link>
              ))}
              {!detail.unlocks.length ? (
                <p className="text-sm text-muted-foreground">No required descendants yet.</p>
              ) : null}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Historical snapshots</CardTitle>
              <CardDescription>
                Snapshots keep changes visible even as the current score evolves.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {detail.snapshots.slice(0, 8).map((snapshot) => (
                <div
                  key={snapshot.id}
                  className="flex items-center justify-between gap-3 rounded-lg border px-3 py-3 text-sm"
                >
                  <span className="text-muted-foreground">
                    {new Date(snapshot.createdAt).toLocaleDateString()}
                  </span>
                  <span className="font-medium">
                    {percentage(snapshot.score)} · {snapshot.state.replaceAll("-", " ")}
                  </span>
                </div>
              ))}
              {!detail.snapshots.length ? (
                <p className="text-sm text-muted-foreground">
                  Snapshots appear after the first evidence event.
                </p>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
