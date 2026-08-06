import Link from "next/link";
import { ArrowRight, ClipboardCheck, Plus, Timer } from "lucide-react";
import { redirect } from "next/navigation";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { canAuthorAssessments } from "@/features/assessments/service";
import { getCurrentSession } from "@/infrastructure/auth/local-auth-provider";
import { getAssessmentRepository } from "@/infrastructure/database/repositories/assessment-repository";

export const dynamic = "force-dynamic";

export default async function AssessmentsPage() {
  const session = await getCurrentSession().catch(() => null);
  if (!session) redirect("/profiles");
  const assessments = await getAssessmentRepository().listAssessments();
  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 py-7 sm:px-6 lg:px-10 lg:py-10">
      <Breadcrumbs current="Assessments" />
      <div className="mt-6 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="eyebrow">Formal practice · Phase 6</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            Assessments that make readiness visible.
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground sm:text-base">
            Take quizzes, exams, diagnostics, and placement checks with explainable results and safe
            resume behavior.
          </p>
        </div>
        {canAuthorAssessments(session.principal) ? (
          <Link
            href={"/assessments/manage" as never}
            className={buttonVariants({ variant: "outline" })}
          >
            <Plus className="h-4 w-4" aria-hidden="true" /> Assessment studio
          </Link>
        ) : null}
      </div>
      <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {assessments.map((assessment) => (
          <Card
            key={assessment.id}
            className="group flex flex-col transition hover:-translate-y-0.5 hover:border-accent/50"
          >
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <Badge variant={assessment.type.includes("exam") ? "warning" : "success"}>
                  {assessment.type.replaceAll("-", " ")}
                </Badge>
                {assessment.timeLimitSeconds ? (
                  <Timer className="h-4 w-4 text-accent" aria-hidden="true" />
                ) : (
                  <ClipboardCheck className="h-4 w-4 text-accent" aria-hidden="true" />
                )}
              </div>
              <CardTitle className="mt-3">{assessment.title}</CardTitle>
              <CardDescription className="leading-6">{assessment.description}</CardDescription>
            </CardHeader>
            <CardContent className="mt-auto">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  {assessment.timeLimitSeconds
                    ? `${Math.ceil(assessment.timeLimitSeconds / 60)} min`
                    : "Untimed"}
                </span>
                <span>Pass at {Math.round(assessment.passingThreshold * 100)}%</span>
              </div>
              <Link
                href={`/assessments/${assessment.id}` as never}
                className={buttonVariants({ className: "mt-4 w-full" })}
                aria-label={`Open assessment: ${assessment.title}`}
              >
                <ClipboardCheck className="h-4 w-4" aria-hidden="true" /> Open assessment{" "}
                <ArrowRight className="ml-auto h-4 w-4" aria-hidden="true" />
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
      {!assessments.length ? (
        <Card className="mt-6">
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No published assessments are available yet.
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
