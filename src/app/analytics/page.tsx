import dynamicImport from "next/dynamic";
import { redirect } from "next/navigation";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { RouteLoading } from "@/components/shared/route-loading";
import { analyticsRangeSchema } from "@/features/analytics/schemas";
import { getLearnerAnalytics } from "@/features/analytics/service";
import { getCurrentSession } from "@/infrastructure/auth/local-auth-provider";

const LearnerAnalyticsWorkspace = dynamicImport(
  () =>
    import("@/features/analytics/components/analytics-ui").then(
      (module) => module.LearnerAnalyticsWorkspace,
    ),
  { loading: () => <RouteLoading label="Loading learning analytics" /> },
);

export const dynamic = "force-dynamic";

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getCurrentSession().catch(() => null);
  if (!session) redirect("/profiles");
  const values = await searchParams;
  const parsed = analyticsRangeSchema.safeParse({
    from: typeof values.from === "string" ? values.from : undefined,
    to: typeof values.to === "string" ? values.to : undefined,
  });
  const data = await getLearnerAnalytics(
    session.principal.profileId,
    parsed.success ? parsed.data : undefined,
  );
  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 py-7 sm:px-6 lg:px-10 lg:py-10">
      <Breadcrumbs current="Learning analytics" />
      <div className="mt-7">
        <LearnerAnalyticsWorkspace data={data} />
      </div>
    </div>
  );
}
