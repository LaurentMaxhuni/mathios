import { redirect } from "next/navigation";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { getCurrentSession } from "@/infrastructure/auth/local-auth-provider";
import { getStudyPlannerRepository } from "@/infrastructure/database/repositories/study-planner-repository";
import {
  getPlannerDashboard,
  getPlannerOptions,
  plannerWindowAround,
} from "@/features/planner/service";
import { PlannerWorkspace } from "@/features/planner/components/planner-workspace";

export const dynamic = "force-dynamic";

export default async function PlannerPage() {
  const session = await getCurrentSession().catch(() => null);
  if (!session) redirect("/profiles");
  const repository = getStudyPlannerRepository();
  const today = new Date().toISOString().slice(0, 10);
  const range = plannerWindowAround(today);
  const [dashboard, options] = await Promise.all([
    getPlannerDashboard(session.principal.profileId, repository, range),
    getPlannerOptions(repository),
  ]);
  return (
    <div className="mx-auto w-full max-w-[1600px] px-4 py-7 sm:px-6 lg:px-10 lg:py-10">
      <Breadcrumbs current="Study planner" />
      <PlannerWorkspace initialDashboard={dashboard} initialOptions={options} />
    </div>
  );
}
