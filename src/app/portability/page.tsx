import { redirect } from "next/navigation";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { PortabilityWorkspace } from "@/features/portability/components/portability-workspace";
import { getPortabilityDashboard } from "@/features/portability/service";
import { getCurrentSession } from "@/infrastructure/auth/local-auth-provider";

export const dynamic = "force-dynamic";

export default async function PortabilityPage() {
  const session = await getCurrentSession().catch(() => null);
  if (!session) redirect("/profiles");
  const dashboard = await getPortabilityDashboard(
    session.principal.profileId,
    undefined,
    session.principal.permissions.includes("run_backups"),
  );
  return (
    <div className="mx-auto w-full max-w-[1500px] px-4 py-7 sm:px-6 lg:px-10 lg:py-10">
      <Breadcrumbs current="Import, export & backup" />
      <div className="mt-7">
        <PortabilityWorkspace
          settings={dashboard.settings}
          backups={dashboard.backups}
          canRunBackups={session.principal.permissions.includes("run_backups")}
          canRestore={session.principal.permissions.includes("restore_backups")}
          canManageSettings={session.principal.permissions.includes("manage_application_settings")}
        />
      </div>
    </div>
  );
}
