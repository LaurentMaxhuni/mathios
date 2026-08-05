import { notFound, redirect } from "next/navigation";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { LessonReader } from "@/features/courses/components/lesson-reader";
import { canAuthorCourses } from "@/features/courses/service";
import { getCurrentSession } from "@/infrastructure/auth/local-auth-provider";
import { getCourseRepository } from "@/infrastructure/database/repositories/course-repository";

export default async function LessonReaderPage({
  params,
}: {
  params: Promise<{ lessonId: string }>;
}) {
  const { lessonId } = await params;
  const session = await getCurrentSession().catch(() => null);
  if (!session) redirect("/profiles");
  const repository = getCourseRepository();
  const reader = await repository.getLessonReader(lessonId, session.principal.profileId);
  if (!reader) {
    if (canAuthorCourses(session.principal)) redirect(`/lessons/${lessonId}/edit`);
    notFound();
  }
  return (
    <div className="mx-auto w-full max-w-[1280px] px-4 py-7 sm:px-6 lg:px-10 lg:py-10">
      <Breadcrumbs current={reader.lesson.title} />
      <div className="mt-7">
        <LessonReader data={reader} />
      </div>
    </div>
  );
}
