import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { ErrorState } from "@/components/shared/error-state";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AssessmentForm,
  AssessmentOverview,
  AssessmentPoolForm,
  AssessmentQuestionForm,
  AssessmentSectionForm,
} from "@/features/assessments/components/assessment-forms";
import { canAuthorAssessments } from "@/features/assessments/service";
import { getCurrentSession } from "@/infrastructure/auth/local-auth-provider";
import { getAssessmentRepository } from "@/infrastructure/database/repositories/assessment-repository";
import { getCurriculumRepository } from "@/infrastructure/database/repositories/curriculum-repository";
import { getExerciseRepository } from "@/infrastructure/database/repositories/exercise-repository";

export const dynamic = "force-dynamic";

export default async function AssessmentEditPage({
  params,
}: {
  params: Promise<{ assessmentId: string }>;
}) {
  const session = await getCurrentSession().catch(() => null);
  if (!session) redirect("/profiles");
  if (!canAuthorAssessments(session.principal))
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-10">
        <Breadcrumbs current="Assessment editor" />
        <div className="mt-6">
          <ErrorState
            title="Content author permission required"
            description="Only content authors can configure assessment workflows."
          />
        </div>
      </div>
    );
  const { assessmentId } = await params;
  const repository = getAssessmentRepository();
  const [detail, subjects, grades, questions] = await Promise.all([
    repository.getAssessment(assessmentId, { includeDraft: true }),
    getCurriculumRepository().listSubjects(),
    getCurriculumRepository().listGrades(),
    getExerciseRepository().listQuestions({ includeArchived: true }),
  ]);
  if (!detail) notFound();
  return (
    <div className="mx-auto w-full max-w-[1500px] px-4 py-7 sm:px-6 lg:px-10 lg:py-10">
      <Breadcrumbs current={detail.assessment.title} />
      <div className="mt-5">
        <Link
          href={"/assessments/manage" as never}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Assessment studio
        </Link>
      </div>
      <div className="mt-5">
        <h1 className="text-3xl font-semibold tracking-tight">
          Configure {detail.assessment.title}
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
          Policy, sections, fixed questions, and deterministic pools all stay in one versioned
          assessment contract.
        </p>
      </div>
      <div className="mt-8 grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Assessment policy</CardTitle>
              <CardDescription>
                Scoring, timing, retakes, feedback, and diagnostic thresholds.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AssessmentForm assessment={detail.assessment} subjects={subjects} grades={grades} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Add a section</CardTitle>
              <CardDescription>
                Sections create the result rollups and can hold fixed questions or randomized pools.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AssessmentSectionForm assessmentId={detail.assessment.id} />
            </CardContent>
          </Card>
          {detail.sections.map(({ section, pools }) => (
            <Card key={section.id}>
              <CardHeader>
                <CardTitle>{section.title}</CardTitle>
                <CardDescription>
                  {pools.length} pools · {section.points} section points
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <AssessmentPoolForm assessmentId={detail.assessment.id} sectionId={section.id} />
                {pools.map((pool) => (
                  <AssessmentPoolForm
                    key={pool.id}
                    assessmentId={detail.assessment.id}
                    sectionId={section.id}
                    pool={pool}
                  />
                ))}
              </CardContent>
            </Card>
          ))}
          <Card>
            <CardHeader>
              <CardTitle>Attach a question</CardTitle>
              <CardDescription>Choose fixed placement or a configured pool.</CardDescription>
            </CardHeader>
            <CardContent>
              <AssessmentQuestionForm detail={detail} questions={questions} />
            </CardContent>
          </Card>
        </div>
        <div>
          <AssessmentOverview detail={detail} />
        </div>
      </div>
    </div>
  );
}
