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

export default async function SubjectMasteryPage({
  params,
}: {
  params: Promise<{ subjectId: string }>;
}) {
  const session = await getCurrentSession().catch(() => null);
  if (!session) redirect("/profiles");
  const { subjectId } = await params;
  const dashboard = await getMasteryDashboard(session.principal.profileId, getMasteryRepository());
  const summary = dashboard.subjects.find((item) => item.subjectId === subjectId);
  if (!summary) notFound();
  const concepts = dashboard.concepts.filter((concept) => concept.subjectId === subjectId);
  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 py-7 sm:px-6 lg:px-10 lg:py-10">
      <Breadcrumbs current={`${summary.subjectName} mastery`} />
      <Link
        href={"/mastery/subjects" as never}
        className="mt-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Subject mastery map
      </Link>
      <div className="mt-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="eyebrow">Subject mastery</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            {summary.subjectName}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
            A concept-level view of where evidence is strong, developing, or ready for review.
          </p>
        </div>
        <div className="w-full max-w-xs">
          <MasteryBar value={summary.averageScore} label="Subject average" />
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
          detail={`${percentage(summary.conceptCount ? summary.masteredCount / summary.conceptCount : 0)} of subject`}
        />
        <SummaryStat label="Review" value={String(summary.reviewCount)} detail="Needs attention" />
      </div>
      <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {concepts.map((view) => (
          <MasteryConceptCard key={view.id} view={view} />
        ))}
      </div>
    </div>
  );
}
