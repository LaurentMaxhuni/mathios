import Link from "next/link";
import { ArrowRight, BookOpenCheck, Plus, Settings2, Upload } from "lucide-react";
import { redirect } from "next/navigation";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { ErrorState } from "@/components/shared/error-state";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AddQuestionToSetForm,
  ExerciseSetForm,
} from "@/features/exercises/components/question-forms";
import { canAuthorExercises } from "@/features/exercises/service";
import { getCurrentSession } from "@/infrastructure/auth/local-auth-provider";
import { getExerciseRepository } from "@/infrastructure/database/repositories/exercise-repository";
import { getCurriculumRepository } from "@/infrastructure/database/repositories/curriculum-repository";

export const dynamic = "force-dynamic";

export default async function ExerciseManagementPage() {
  const session = await getCurrentSession().catch(() => null);
  if (!session) redirect("/profiles");
  if (!canAuthorExercises(session.principal))
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-10">
        <Breadcrumbs current="Exercise studio" />
        <div className="mt-6">
          <ErrorState
            title="Content author permission required"
            description="Teachers, content creators, and administrators can manage questions and exercise sets."
          />
        </div>
      </div>
    );
  const repository = getExerciseRepository();
  const [questions, sets, subjects] = await Promise.all([
    repository.listQuestions({ includeArchived: true }),
    repository.listExerciseSets({ includeArchived: true }),
    getCurriculumRepository().listSubjects(),
  ]);
  const selectedSet = sets[0];
  return (
    <div className="mx-auto w-full max-w-[1500px] px-4 py-7 sm:px-6 lg:px-10 lg:py-10">
      <Breadcrumbs current="Exercise studio" />
      <div className="mt-6 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="eyebrow">Content governance · Phase 5</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            Question and exercise studio.
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground sm:text-base">
            Author reusable questions, connect them to practice sets, preview validation, and
            publish only when the answer contract is ready.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={"/exercises/questions/import" as never}
            className={buttonVariants({ variant: "outline" })}
          >
            <Upload className="h-4 w-4" aria-hidden="true" /> Bulk import
          </Link>
          <Link href={"/exercises/questions/new" as never} className={buttonVariants()}>
            <Plus className="h-4 w-4" aria-hidden="true" /> New question
          </Link>
        </div>
      </div>
      <div className="mt-8 grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Create an exercise set</CardTitle>
              <CardDescription>
                Sets can be reused from lessons, modules, concepts, grades, or custom practice.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ExerciseSetForm subjects={subjects} />
            </CardContent>
          </Card>
          {selectedSet ? (
            <Card>
              <CardHeader>
                <CardTitle>Populate {selectedSet.title}</CardTitle>
                <CardDescription>
                  Only published questions are visible to learners after the set is published.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AddQuestionToSetForm
                  setId={selectedSet.id}
                  questions={questions.filter((question) => question.status !== "archived")}
                />
              </CardContent>
            </Card>
          ) : null}
        </div>
        <div className="space-y-6">
          <Card>
            <CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
              <div>
                <CardTitle>Question bank</CardTitle>
                <CardDescription>
                  {questions.length} reusable question records with versioned answer contracts.
                </CardDescription>
              </div>
              <BookOpenCheck className="h-5 w-5 text-accent" aria-hidden="true" />
            </CardHeader>
            <CardContent className="space-y-3">
              {questions.slice(0, 8).map((question) => (
                <Link
                  key={question.id}
                  href={("/exercises/questions/" + question.id + "/edit") as never}
                  className="flex items-center justify-between gap-4 rounded-lg border p-3 text-sm transition hover:border-accent/50 hover:bg-accent/5"
                >
                  <div>
                    <p className="font-medium">{question.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {question.type.replaceAll("-", " ")} · {question.status}
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                </Link>
              ))}
              <Link
                href={"/exercises/questions" as never}
                className="inline-flex items-center gap-2 text-sm font-medium text-accent hover:underline"
              >
                Open full question catalog <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Exercise sets</CardTitle>
              <CardDescription>Published and draft practice collections.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {sets.map((set) => (
                <Link
                  key={set.id}
                  href={("/exercise-sets/" + set.id + "/edit") as never}
                  className="flex items-center justify-between gap-4 rounded-lg border p-3 text-sm transition hover:border-accent/50 hover:bg-accent/5"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{set.title}</p>
                      <Badge variant={set.status === "published" ? "success" : "outline"}>
                        {set.status}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {set.kind} · {set.difficulty}
                    </p>
                  </div>
                  <Settings2 className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                </Link>
              ))}
              {!sets.length ? (
                <p className="text-sm text-muted-foreground">
                  Create a set to organize reusable practice.
                </p>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
