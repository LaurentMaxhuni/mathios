import { redirect } from "next/navigation";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { getCurrentSession } from "@/infrastructure/auth/local-auth-provider";
import { getMasteryRepository } from "@/infrastructure/database/repositories/mastery-repository";
import { getMasteryDashboard } from "@/features/mastery/service";
import { SubjectSummaryCard } from "@/features/mastery/components/mastery-ui";

export const dynamic = "force-dynamic";

export default async function MasterySubjectsPage() {
  const session = await getCurrentSession().catch(() => null);
  if (!session) redirect("/profiles");
  const dashboard = await getMasteryDashboard(session.principal.profileId, getMasteryRepository());
  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 py-7 sm:px-6 lg:px-10 lg:py-10">
      <Breadcrumbs current="Subject mastery map" />
      <div className="mt-6">
        <p className="eyebrow">Mastery dashboard</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
          Subject mastery map
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
          Compare evidence, confidence, mastered concepts, and review load across the five science
          subjects.
        </p>
      </div>
      <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {dashboard.subjects.map((summary) => (
          <SubjectSummaryCard key={summary.subjectId} summary={summary} />
        ))}
      </div>
    </div>
  );
}
