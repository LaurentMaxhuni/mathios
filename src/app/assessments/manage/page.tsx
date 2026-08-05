import Link from "next/link";
import { ArrowRight, ClipboardList } from "lucide-react";
import { redirect } from "next/navigation";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { ErrorState } from "@/components/shared/error-state";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AssessmentForm,
  AssessmentStatusForm,
} from "@/features/assessments/components/assessment-forms";
import { canAuthorAssessments } from "@/features/assessments/service";
import { getCurrentSession } from "@/infrastructure/auth/local-auth-provider";
import { getAssessmentRepository } from "@/infrastructure/database/repositories/assessment-repository";
import { getCurriculumRepository } from "@/infrastructure/database/repositories/curriculum-repository";

export const dynamic = "force-dynamic";

export default async function AssessmentManagementPage() {
  const session = await getCurrentSession().catch(() => null);
  if (!session) redirect("/profiles");
  if (!canAuthorAssessments(session.principal))
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-10">
        <Breadcrumbs current="Assessment studio" />
        <div className="mt-6">
          <ErrorState
            title="Content author permission required"
            description="Teachers, content creators, and administrators can manage assessments."
          />
        </div>
      </div>
    );
  const repository = getAssessmentRepository();
  const structure = getCurriculumRepository();
  const [assessments, subjects, grades] = await Promise.all([
    repository.listAssessments({ includeDraft: true, includeArchived: true }),
    structure.listSubjects(),
    structure.listGrades(),
  ]);
  return (
    <div className="mx-auto w-full max-w-[1500px] px-4 py-7 sm:px-6 lg:px-10 lg:py-10">
      <Breadcrumbs current="Assessment studio" />
      <div className="mt-6 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="eyebrow">Content governance · Phase 6</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            Assessment studio.
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground sm:text-base">
            Configure sections, fixed questions, randomized pools, timing, retakes, passing rules,
            and explainable diagnostic output.
          </p>
        </div>
        <Link href={"/assessments" as never} className={buttonVariants({ variant: "outline" })}>
          <ClipboardList className="h-4 w-4" aria-hidden="true" /> Learner catalog
        </Link>
      </div>
      <div className="mt-8 grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <Card>
          <CardHeader>
            <CardTitle>Create an assessment</CardTitle>
            <CardDescription>
              Start with policy and scoring settings, then add sections and question pools.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AssessmentForm subjects={subjects} grades={grades} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Existing assessments</CardTitle>
            <CardDescription>
              {assessments.length} assessment records across drafts and published workflows.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {assessments.map((assessment) => (
              <div
                key={assessment.id}
                className="flex items-center justify-between gap-4 rounded-xl border p-4"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{assessment.title}</p>
                    <Badge
                      variant={
                        assessment.status === "published"
                          ? "success"
                          : assessment.status === "archived"
                            ? "outline"
                            : "warning"
                      }
                    >
                      {assessment.status}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {assessment.type.replaceAll("-", " ")} · pass at{" "}
                    {Math.round(assessment.passingThreshold * 100)}%
                  </p>
                  <div className="mt-3">
                    <AssessmentStatusForm assessment={assessment} />
                  </div>
                </div>
                <Link
                  href={`/assessments/${assessment.id}/edit` as never}
                  className="inline-flex items-center gap-2 text-sm font-medium text-accent hover:underline"
                >
                  Configure <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>
            ))}
            {!assessments.length ? (
              <p className="text-sm text-muted-foreground">Create the first assessment.</p>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
