import { redirect } from "next/navigation";
import { TodayDashboard } from "@/features/today/components/today-dashboard";
import { getTodayDashboard } from "@/features/today/service";
import { getCurrentSession } from "@/infrastructure/auth/local-auth-provider";
import { getIdentityRepository } from "@/infrastructure/database/repositories/identity-repository";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const repository = getIdentityRepository();
  const session = await getCurrentSession(repository).catch(() => null);

  if (!session) redirect("/profiles");

  return <TodayDashboard data={await getTodayDashboard(session.principal.profileId)} />;
}
