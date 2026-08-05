import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AddQuestionToSetForm,
  ExerciseSetForm,
  ExerciseSetStatusForm,
} from "@/features/exercises/components/question-forms";
import { canAuthorExercises } from "@/features/exercises/service";
import { getCurrentSession } from "@/infrastructure/auth/local-auth-provider";
import { getExerciseRepository } from "@/infrastructure/database/repositories/exercise-repository";
import { getCurriculumRepository } from "@/infrastructure/database/repositories/curriculum-repository";

export const dynamic = "force-dynamic";

export default async function ExerciseSetEditorPage({
  params,
}: {
  params: Promise<{ setId: string }>;
}) {
  const session = await getCurrentSession().catch(() => null);
  if (!session) redirect("/profiles");
  if (!canAuthorExercises(session.principal)) redirect("/exercises" as never);
  const { setId } = await params;
  const repository = getExerciseRepository();
  const [detail, questions, subjects] = await Promise.all([
    repository.getExerciseSet(setId, { includeDraft: true }),
    repository.listQuestions({ includeArchived: true }),
    getCurriculumRepository().listSubjects(),
  ]);
  if (!detail) notFound();
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-7 sm:px-6 lg:px-10 lg:py-10">
      <Breadcrumbs current={detail.exerciseSet.title} />
      <Link
        href={"/exercises/manage" as never}
        className="mt-5 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Exercise studio
      </Link>
      <div className="mt-5 flex items-center gap-2">
        <Badge variant="outline">{detail.exerciseSet.kind}</Badge>
        <Badge variant={detail.exerciseSet.status === "published" ? "success" : "warning"}>
          {detail.exerciseSet.status}
        </Badge>
      </div>
      <div className="mt-5 grid gap-6 xl:grid-cols-[1fr_0.8fr]">
        <Card>
          <CardHeader>
            <CardTitle>Edit set metadata</CardTitle>
            <CardDescription>
              Set publication controls which questions learners can access.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ExerciseSetForm subjects={subjects} set={detail.exerciseSet} />
            <div className="mt-5 border-t pt-5">
              <ExerciseSetStatusForm set={detail.exerciseSet} />
            </div>
          </CardContent>
        </Card>
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Questions in this set</CardTitle>
              <CardDescription>{detail.questions.length} question references.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {detail.questions.map((item) => (
                <div key={item.questionId} className="rounded-lg border p-3 text-sm">
                  <p className="font-medium">{item.question.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {item.points} points · order {item.sortOrder}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Add another question</CardTitle>
            </CardHeader>
            <CardContent>
              <AddQuestionToSetForm
                setId={setId}
                questions={questions.filter((question) => question.status !== "archived")}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
