import { notFound, redirect } from "next/navigation";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { ExercisePlayer } from "@/features/exercises/components/exercise-player";
import { getLearnerExerciseSet, getLearnerQuestion } from "@/features/exercises/service";
import { getCurrentSession } from "@/infrastructure/auth/local-auth-provider";
import { getExerciseRepository } from "@/infrastructure/database/repositories/exercise-repository";

export const dynamic = "force-dynamic";

export default async function ExerciseSetPage({ params }: { params: Promise<{ setId: string }> }) {
  const session = await getCurrentSession().catch(() => null);
  if (!session) redirect("/profiles");
  const { setId } = await params;
  const repository = getExerciseRepository();
  const detail = await getLearnerExerciseSet(setId, repository).catch(() => null);
  if (!detail) notFound();
  const questions = (
    await Promise.all(
      detail.questions.map((item) =>
        getLearnerQuestion(item.questionId, repository).catch(() => null),
      ),
    )
  ).filter((question): question is NonNullable<typeof question> => Boolean(question));
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-7 sm:px-6 lg:px-10 lg:py-10">
      <Breadcrumbs current={detail.exerciseSet.title} />
      <div className="mt-6">
        <ExercisePlayer detail={detail} questions={questions} />
      </div>
    </div>
  );
}
