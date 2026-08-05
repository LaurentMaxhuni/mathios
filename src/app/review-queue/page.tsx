import Link from "next/link";
import { ArrowLeft, CalendarClock } from "lucide-react";
import { redirect } from "next/navigation";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Card, CardContent } from "@/components/ui/card";
import { getCurrentSession } from "@/infrastructure/auth/local-auth-provider";
import { getMasteryRepository } from "@/infrastructure/database/repositories/mastery-repository";
import { listReviewQueue } from "@/features/mastery/service";
import { MasteryBar, MasteryStateBadge, ReviewDue } from "@/features/mastery/components/mastery-ui";

export const dynamic = "force-dynamic";

export default async function ReviewQueuePage() {
  const session = await getCurrentSession().catch(() => null);
  if (!session) redirect("/profiles");
  const queue = await listReviewQueue(session.principal.profileId, getMasteryRepository());
  return (
    <div className="mx-auto w-full max-w-[1000px] px-4 py-7 sm:px-6 lg:px-10 lg:py-10">
      <Breadcrumbs current="Review queue" />
      <Link
        href={"/mastery" as never}
        className="mt-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Mastery dashboard
      </Link>
      <div className="mt-5">
        <p className="eyebrow">Spaced review</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Review queue</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
          Concepts arrive here when recency or prerequisite signals say a short revisit is more
          useful than moving on.
        </p>
      </div>
      <div className="mt-8 space-y-3">
        {queue.map((view) => (
          <Card key={view.id}>
            <CardContent className="grid gap-4 p-5 sm:grid-cols-[1fr_12rem_auto] sm:items-center">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/mastery/concepts/${view.id}` as never}
                    className="font-semibold hover:text-accent hover:underline"
                  >
                    {view.name}
                  </Link>
                  <MasteryStateBadge state={view.mastery.state} />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {view.subjectName} · {view.mastery.evidenceCount} evidence items
                </p>
              </div>
              <MasteryBar value={view.mastery.score} />
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <CalendarClock className="h-4 w-4 text-accent" aria-hidden="true" />
                <ReviewDue date={view.mastery.nextReviewAt} />
              </div>
            </CardContent>
          </Card>
        ))}
        {!queue.length ? (
          <Card>
            <CardContent className="py-14 text-center">
              <CalendarClock className="mx-auto h-8 w-8 text-accent" aria-hidden="true" />
              <p className="mt-3 font-semibold">The review queue is clear.</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Complete more varied practice and the queue will update automatically.
              </p>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
