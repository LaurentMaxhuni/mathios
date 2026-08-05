import { redirect } from "next/navigation";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { QuestionForm } from "@/features/exercises/components/question-forms";
import { canAuthorExercises } from "@/features/exercises/service";
import { getCurrentSession } from "@/infrastructure/auth/local-auth-provider";
import { getCurriculumRepository } from "@/infrastructure/database/repositories/curriculum-repository";

export const dynamic = "force-dynamic";

export default async function NewQuestionPage() {
  const session = await getCurrentSession().catch(() => null);
  if (!session) redirect("/profiles");
  if (!canAuthorExercises(session.principal)) redirect("/exercises" as never);
  const repository = getCurriculumRepository();
  const [subjects, grades] = await Promise.all([
    repository.listSubjects(),
    repository.listGrades(),
  ]);
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-7 sm:px-6 lg:px-10 lg:py-10">
      <Breadcrumbs current="New question" />
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Create a reusable question</CardTitle>
          <CardDescription>
            Start with the prompt and answer specification; preview it before publishing.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <QuestionForm subjects={subjects} grades={grades} />
        </CardContent>
      </Card>
    </div>
  );
}
