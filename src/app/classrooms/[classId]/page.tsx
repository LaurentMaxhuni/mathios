import { notFound, redirect } from "next/navigation";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { ClassroomDetailWorkspace } from "@/features/classrooms/components/classroom-detail";
import { getClassroomDashboard, getClassroomDetail } from "@/features/classrooms/service";
import { getCurrentSession } from "@/infrastructure/auth/local-auth-provider";

export const dynamic = "force-dynamic";

export default async function ClassroomPage({ params }: { params: Promise<{ classId: string }> }) {
  const session = await getCurrentSession().catch(() => null);
  if (!session) redirect("/profiles");
  const { classId } = await params;
  let detail;
  try {
    detail = await getClassroomDetail(classId, session.principal);
  } catch (error) {
    if (
      error instanceof Error &&
      "status" in error &&
      (error as { status?: number }).status === 404
    )
      notFound();
    throw error;
  }
  const dashboard = await getClassroomDashboard(session.principal);
  return (
    <div className="mx-auto w-full max-w-[1500px] px-4 py-7 sm:px-6 lg:px-10 lg:py-10">
      <Breadcrumbs current={detail.classroom.name} />
      <div className="mt-7">
        <ClassroomDetailWorkspace
          classId={classId}
          initialDetail={detail}
          resources={dashboard.resources}
        />
      </div>
    </div>
  );
}
