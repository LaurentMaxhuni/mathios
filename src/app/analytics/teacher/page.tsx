import { redirect } from "next/navigation";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { TeacherAnalyticsWorkspace } from "@/features/analytics/components/analytics-ui";
import { analyticsRangeSchema } from "@/features/analytics/schemas";
import { getTeacherAnalytics } from "@/features/analytics/service";
import { getCurrentSession } from "@/infrastructure/auth/local-auth-provider";

export const dynamic = "force-dynamic";

export default async function TeacherAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getCurrentSession().catch(() => null);
  if (!session || !session.principal.permissions.includes("view_analytics")) redirect("/");
  const values = await searchParams;
  const parsed = analyticsRangeSchema.safeParse({
    from: typeof values.from === "string" ? values.from : undefined,
    to: typeof values.to === "string" ? values.to : undefined,
  });
  const data = await getTeacherAnalytics(parsed.success ? parsed.data : undefined);
  return (
    <div className="mx-auto w-full max-w-[1600px] px-4 py-7 sm:px-6 lg:px-10 lg:py-10">
      <Breadcrumbs current="Teacher analytics" />
      <div className="mt-7">
        <TeacherAnalyticsWorkspace data={data} />
      </div>
    </div>
  );
}
