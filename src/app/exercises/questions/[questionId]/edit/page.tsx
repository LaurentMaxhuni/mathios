import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  QuestionForm,
  QuestionStatusForm,
  TemplatePreviewForm,
  ValidationPreviewForm,
} from "@/features/exercises/components/question-forms";
import { canAuthorExercises } from "@/features/exercises/service";
import { getCurrentSession } from "@/infrastructure/auth/local-auth-provider";
import { getExerciseRepository } from "@/infrastructure/database/repositories/exercise-repository";
import { getCurriculumRepository } from "@/infrastructure/database/repositories/curriculum-repository";

export const dynamic = "force-dynamic";

export default async function QuestionEditorPage({
  params,
}: {
  params: Promise<{ questionId: string }>;
}) {
  const session = await getCurrentSession().catch(() => null);
  if (!session) redirect("/profiles");
  if (!canAuthorExercises(session.principal)) redirect("/exercises" as never);
  const { questionId } = await params;
  const repository = getCurriculumRepository();
  const [question, subjects, grades] = await Promise.all([
    getExerciseRepository().getQuestion(questionId, { includeDraft: true }),
    repository.listSubjects(),
    repository.listGrades(),
  ]);
  if (!question) notFound();
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-7 sm:px-6 lg:px-10 lg:py-10">
      <Breadcrumbs current={question.question.title} />
      <Link
        href={"/exercises/questions" as never}
        className="mt-5 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Question catalog
      </Link>
      <div className="mt-5 flex flex-wrap items-center gap-2">
        <Badge variant="outline">{question.question.type.replaceAll("-", " ")}</Badge>
        <Badge variant={question.question.status === "published" ? "success" : "warning"}>
          {question.question.status}
        </Badge>
        <span className="text-sm text-muted-foreground">
          Version {question.question.currentVersionNumber}
        </span>
      </div>
      <div className="mt-5 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader>
            <CardTitle>Edit {question.question.title}</CardTitle>
            <CardDescription>Draft edits become a new immutable question version.</CardDescription>
          </CardHeader>
          <CardContent>
            <QuestionForm question={question} subjects={subjects} grades={grades} />
          </CardContent>
        </Card>
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Publication</CardTitle>
              <CardDescription>Only published questions appear in learner sets.</CardDescription>
            </CardHeader>
            <CardContent>
              <QuestionStatusForm question={question} />
            </CardContent>
          </Card>
          {question.template ? (
            <Card>
              <CardHeader>
                <CardTitle>Template variable preview</CardTitle>
                <CardDescription>
                  Generate deterministic instances from the saved template seeds.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <TemplatePreviewForm template={question.template} />
              </CardContent>
            </Card>
          ) : null}
          <Card>
            <CardHeader>
              <CardTitle>Validation preview</CardTitle>
              <CardDescription>
                Try the same validator the learner attempt will use.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ValidationPreviewForm question={question} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Author notes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>Concept links: {question.conceptIds.length}</p>
              <p>Hints: {question.hints.length}</p>
              <p>Solutions: {question.solutions.length}</p>
              <p>Template: {question.template ? question.template.name : "None"}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
