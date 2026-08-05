import Link from "next/link";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { redirect } from "next/navigation";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { buttonVariants } from "@/components/ui/button";
import { getCurrentSession } from "@/infrastructure/auth/local-auth-provider";
import { getMasteryRepository } from "@/infrastructure/database/repositories/mastery-repository";
import { listRecommendations } from "@/features/mastery/service";
import { RecommendationFeed } from "@/features/mastery/components/mastery-ui";

export const dynamic = "force-dynamic";

export default async function RecommendationsPage() {
  const session = await getCurrentSession().catch(() => null);
  if (!session) redirect("/profiles");
  const recommendations = await listRecommendations(
    session.principal.profileId,
    getMasteryRepository(),
  );
  return (
    <div className="mx-auto w-full max-w-[1280px] px-4 py-7 sm:px-6 lg:px-10 lg:py-10">
      <Breadcrumbs current="Recommendation feed" />
      <div className="mt-6 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <Link
            href={"/mastery" as never}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Mastery dashboard
          </Link>
          <p className="eyebrow mt-5">Rule-based learning guidance</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            Recommendation feed
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
            Every suggestion names the signal that created it. Dismissing a recommendation is
            profile-scoped and never changes mastery history.
          </p>
        </div>
        <Link
          href={"/mastery" as never}
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          <RefreshCw className="h-4 w-4" aria-hidden="true" /> Refresh from mastery
        </Link>
      </div>
      <div className="mt-8">
        <RecommendationFeed recommendations={recommendations} />
      </div>
    </div>
  );
}
