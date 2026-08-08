import { notFound, redirect } from "next/navigation";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { ClassroomDashboardWorkspace } from "@/features/classrooms/components/classroom-dashboard";
import { getClassroomDashboard } from "@/features/classrooms/service";
import { getCurrentSession } from "@/infrastructure/auth/local-auth-provider";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

export default async function ClassroomsPage() {
  const session = await getCurrentSession().catch(() => null);
  if (!session) redirect("/profiles");
  if (
    !env.COLLABORATION_ENABLED &&
    !session.principal.permissions.includes("manage_application_settings")
  ) {
    notFound();
  }
  const dashboard = await getClassroomDashboard(session.principal);
  const canCreateClass =
    session.principal.roles.includes("administrator") ||
    session.principal.roles.includes("teacher");
  return (
    <div className="mx-auto w-full max-w-[1500px] px-4 py-7 sm:px-6 lg:px-10 lg:py-10">
      <Breadcrumbs current="Classrooms" />
      <div className="mt-7">
        <ClassroomDashboardWorkspace initialDashboard={dashboard} canCreateClass={canCreateClass} />
      </div>
    </div>
  );
}
