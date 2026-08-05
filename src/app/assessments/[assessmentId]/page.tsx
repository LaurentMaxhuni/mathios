import Link from "next/link";
import { Edit3 } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { AssessmentPlayer } from "@/features/assessments/components/assessment-player";
import { canAuthorAssessments } from "@/features/assessments/service";
import { getCurrentSession } from "@/infrastructure/auth/local-auth-provider";
import { getAssessmentRepository } from "@/infrastructure/database/repositories/assessment-repository";

export const dynamic = "force-dynamic";

export default async function AssessmentPage({
  params,
}: {
  params: Promise<{ assessmentId: string }>;
}) {
  const session = await getCurrentSession().catch(() => null);
  if (!session) redirect("/profiles");
  const { assessmentId } = await params;
  const detail = await getAssessmentRepository().getAssessment(assessmentId, {
    includeDraft: canAuthorAssessments(session.principal),
  });
  if (!detail) notFound();
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-7 sm:px-6 lg:px-10 lg:py-10">
      <Breadcrumbs current={detail.assessment.title} />
      <div className="mt-6 flex items-center justify-between gap-4">
        <div>
          <p className="eyebrow">{detail.assessment.type.replaceAll("-", " ")}</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">{detail.assessment.title}</h1>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={detail.assessment.status === "published" ? "success" : "warning"}>
            {detail.assessment.status}
          </Badge>
          {canAuthorAssessments(session.principal) ? (
            <Link
              href={`/assessments/${detail.assessment.id}/edit` as never}
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              <Edit3 className="h-4 w-4" aria-hidden="true" /> Configure
            </Link>
          ) : null}
        </div>
      </div>
      <div className="mt-8">
        <AssessmentPlayer detail={detail} />
      </div>
    </div>
  );
}
