import { redirect } from "next/navigation";
import { TodayDashboard } from "@/features/today/components/today-dashboard";
import { getTodayDashboard } from "@/features/today/service";
import { getCurrentSession } from "@/infrastructure/auth/local-auth-provider";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await getCurrentSession().catch(() => null);

  if (!session) redirect("/profiles");

  return <TodayDashboard data={await getTodayDashboard(session.principal.profileId)} />;
}
