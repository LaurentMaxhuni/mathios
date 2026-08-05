import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { getCurrentSession } from "@/infrastructure/auth/local-auth-provider";
import { getMasteryRepository } from "@/infrastructure/database/repositories/mastery-repository";
import { getMasteryDashboard } from "@/features/mastery/service";
import {
  MasteryBar,
  MasteryConceptCard,
  SummaryStat,
  percentage,
} from "@/features/mastery/components/mastery-ui";

export const dynamic = "force-dynamic";

export default async function GradeMasteryPage({
  params,
}: {
  params: Promise<{ gradeId: string }>;
}) {
  const session = await getCurrentSession().catch(() => null);
  if (!session) redirect("/profiles");
  const { gradeId } = await params;
  const dashboard = await getMasteryDashboard(session.principal.profileId, getMasteryRepository());
  const summary = dashboard.grades.find((item) => item.gradeId === gradeId);
  if (!summary) notFound();
  const concepts = dashboard.concepts.filter(
    (concept) => concept.gradeMinId === gradeId || concept.gradeMaxId === gradeId,
  );
  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 py-7 sm:px-6 lg:px-10 lg:py-10">
      <Breadcrumbs current={`${summary.gradeName} mastery`} />
      <Link
        href={"/mastery/grades" as never}
        className="mt-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Grade mastery view
      </Link>
      <div className="mt-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="eyebrow">Grade progression</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            {summary.gradeName}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
            The concepts placed at this progression point, with mastery evidence and requirements
            visible together.
          </p>
        </div>
        <div className="w-full max-w-xs">
          <MasteryBar value={summary.averageScore} label="Grade average" />
        </div>
      </div>
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <SummaryStat
          label="Concepts"
          value={String(summary.conceptCount)}
          detail={`${summary.assessedCount} assessed`}
        />
        <SummaryStat
          label="Mastered"
          value={String(summary.masteredCount)}
          detail={`${percentage(summary.conceptCount ? summary.masteredCount / summary.conceptCount : 0)} of range`}
        />
        <SummaryStat
          label="Requirements"
          value={`${summary.requirementMasteredCount}/${summary.requirementCount}`}
          detail="Grade-start concepts"
        />
      </div>
      <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {concepts.map((view) => (
          <MasteryConceptCard key={view.id} view={view} />
        ))}
      </div>
    </div>
  );
}
