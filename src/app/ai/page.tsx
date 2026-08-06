import { redirect } from "next/navigation";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { AiWorkspace } from "@/features/ai/components/ai-workspace";
import { getAiDashboard } from "@/features/ai/service";
import { getCurrentSession } from "@/infrastructure/auth/local-auth-provider";

export const dynamic = "force-dynamic";

export default async function AiPage() {
  const session = await getCurrentSession().catch(() => null);
  if (!session) redirect("/profiles");
  const dashboard = await getAiDashboard(session.principal.profileId);
  return (
    <div className="mx-auto w-full max-w-[1600px] px-4 py-7 sm:px-6 lg:px-10 lg:py-10">
      <Breadcrumbs current="AI studio" />
      <div className="mt-7">
        <AiWorkspace
          initialSettings={dashboard.settings}
          initialGenerations={dashboard.generations}
          canManageSettings={session.principal.permissions.includes("manage_application_settings")}
          canReview={session.principal.permissions.includes("edit_content")}
        />
      </div>
    </div>
  );
}
