import Link from "next/link";
import { ArrowRight, BarChart3, CalendarClock, Target } from "lucide-react";
import { redirect } from "next/navigation";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { getCurrentSession } from "@/infrastructure/auth/local-auth-provider";
import { getMasteryRepository } from "@/infrastructure/database/repositories/mastery-repository";
import { getMasteryDashboard, listRecommendations } from "@/features/mastery/service";
import {
  GradeSummaryCard,
  MasteryConceptCard,
  SubjectSummaryCard,
  SummaryStat,
  percentage,
} from "@/features/mastery/components/mastery-ui";

export const dynamic = "force-dynamic";

export default async function MasteryDashboardPage() {
  const session = await getCurrentSession().catch(() => null);
  if (!session) redirect("/profiles");
  const repository = getMasteryRepository();
  const [dashboard, recommendations] = await Promise.all([
    getMasteryDashboard(session.principal.profileId, repository),
    listRecommendations(session.principal.profileId, repository),
  ]);
  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 py-7 sm:px-6 lg:px-10 lg:py-10">
      <Breadcrumbs current="Mastery dashboard" />
      <div className="mt-6 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="eyebrow">Concept mastery · Phase 7</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            See what is sticking.
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
            Mastery combines lessons, varied practice, assessments, recency, and prerequisite health
            into a score you can inspect.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={"/recommendations" as never} className={buttonVariants({ size: "sm" })}>
            Open recommendations <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
          <Link
            href={"/review-queue" as never}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            Review queue
          </Link>
        </div>
      </div>

      <section
        className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
        aria-label="Mastery summary"
      >
        <SummaryStat
          label="Concepts assessed"
          value={`${dashboard.assessedConcepts}/${dashboard.totalConcepts}`}
          detail="Evidence-backed concepts"
          icon={<BarChart3 className="h-5 w-5" aria-hidden="true" />}
        />
        <SummaryStat
          label="Mastered"
          value={String(dashboard.masteredConcepts)}
          detail="Across the concept graph"
          icon={<Target className="h-5 w-5" aria-hidden="true" />}
        />
        <SummaryStat
          label="Average score"
          value={percentage(dashboard.averageScore)}
          detail="Includes unassessed concepts as zero"
        />
        <SummaryStat
          label="Due for review"
          value={String(dashboard.reviewConcepts)}
          detail="Spaced review signals"
          icon={<CalendarClock className="h-5 w-5" aria-hidden="true" />}
        />
      </section>

      <section className="mt-8" aria-labelledby="subjects-heading">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="eyebrow">Subject lens</p>
            <h2 id="subjects-heading" className="mt-2 text-2xl font-semibold">
              Mastery by subject
            </h2>
          </div>
          <Link
            href={"/mastery/subjects" as never}
            className="text-sm font-medium text-accent hover:underline"
          >
            View subject map
          </Link>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {dashboard.subjects.map((summary) => (
            <SubjectSummaryCard key={summary.subjectId} summary={summary} />
          ))}
        </div>
      </section>

      <section className="mt-8" aria-labelledby="grades-heading">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="eyebrow">Progression lens</p>
            <h2 id="grades-heading" className="mt-2 text-2xl font-semibold">
              Mastery by grade range
            </h2>
          </div>
          <Link
            href={"/mastery/grades" as never}
            className="text-sm font-medium text-accent hover:underline"
          >
            View grade map
          </Link>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {dashboard.grades.slice(0, 8).map((summary) => (
            <GradeSummaryCard key={summary.gradeId} summary={summary} />
          ))}
        </div>
      </section>

      <section
        className="mt-8 grid gap-6 xl:grid-cols-[1.15fr_0.85fr]"
        aria-labelledby="concepts-heading"
      >
        <div>
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="eyebrow">Knowledge graph lens</p>
              <h2 id="concepts-heading" className="mt-2 text-2xl font-semibold">
                Concept signals
              </h2>
            </div>
            <Link href="/concepts" className="text-sm font-medium text-accent hover:underline">
              Explore concepts
            </Link>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {dashboard.concepts.slice(0, 8).map((view) => (
              <MasteryConceptCard key={view.id} view={view} compact />
            ))}
          </div>
        </div>
        <div>
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="eyebrow">Next actions</p>
              <h2 className="mt-2 text-2xl font-semibold">Recommendations</h2>
            </div>
            <Link
              href={"/recommendations" as never}
              className="text-sm font-medium text-accent hover:underline"
            >
              All recommendations
            </Link>
          </div>
          <div className="mt-4 space-y-4">
            {recommendations.slice(0, 3).map((recommendation) => (
              <Card key={recommendation.id}>
                <CardHeader className="p-4">
                  <CardTitle className="text-base">{recommendation.title}</CardTitle>
                  <CardDescription className="mt-1 leading-6">
                    {recommendation.reason}
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <Link
                    href={
                      (recommendation.conceptId
                        ? `/mastery/concepts/${recommendation.conceptId}`
                        : "/recommendations") as never
                    }
                    className="text-sm font-medium text-accent hover:underline"
                  >
                    Open next step <ArrowRight className="inline h-4 w-4" aria-hidden="true" />
                  </Link>
                </CardContent>
              </Card>
            ))}
            {!recommendations.length ? (
              <Card>
                <CardContent className="py-10 text-center text-sm text-muted-foreground">
                  No active recommendations yet.
                </CardContent>
              </Card>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
}
