import { redirect } from "next/navigation";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { getCurrentSession } from "@/infrastructure/auth/local-auth-provider";
import { getMasteryRepository } from "@/infrastructure/database/repositories/mastery-repository";
import { getMasteryDashboard } from "@/features/mastery/service";
import { GradeSummaryCard } from "@/features/mastery/components/mastery-ui";

export const dynamic = "force-dynamic";

export default async function MasteryGradesPage() {
  const session = await getCurrentSession().catch(() => null);
  if (!session) redirect("/profiles");
  const dashboard = await getMasteryDashboard(session.principal.profileId, getMasteryRepository());
  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 py-7 sm:px-6 lg:px-10 lg:py-10">
      <Breadcrumbs current="Grade mastery view" />
      <div className="mt-6">
        <p className="eyebrow">Mastery dashboard</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
          Grade mastery view
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
          See the concept progression from lower-secondary foundations through advanced and olympiad
          extensions.
        </p>
      </div>
      <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {dashboard.grades.map((summary) => (
          <GradeSummaryCard key={summary.gradeId} summary={summary} />
        ))}
      </div>
    </div>
  );
}
