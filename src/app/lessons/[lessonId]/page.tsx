import { notFound, redirect } from "next/navigation";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { canAuthorCourses } from "@/features/courses/service";
import { getCurrentSession } from "@/infrastructure/auth/local-auth-provider";
import { getCourseRepository } from "@/infrastructure/database/repositories/course-repository";
import { getSimulationRepository } from "@/infrastructure/database/repositories/simulation-repository";
import { getAnalyticsRepository } from "@/infrastructure/database/repositories/analytics-repository";
import { LessonReader } from "@/features/courses/components/lesson-reader";
import { trackActivityEvent } from "@/features/analytics/service";
import { randomUUID } from "node:crypto";

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
  await trackActivityEvent(
    {
      id: `activity-lesson-view-${randomUUID()}`,
      profileId: session.principal.profileId,
      eventType: "lesson-view",
      resourceType: "lesson",
      resourceId: lessonId,
      dedupeKey: null,
    },
    getAnalyticsRepository(),
  );
  const [simulationLinks, courseDetail] = await Promise.all([
    getSimulationRepository().listLessonSimulations(lessonId),
    repository.getCourseDetail(reader.course.id),
  ]);
  const pathLessons =
    courseDetail?.modules.flatMap((module) =>
      module.lessons.filter((lesson) => lesson.status !== "archived"),
    ) ?? [];
  const pathIndex = pathLessons.findIndex((lesson) => lesson.id === lessonId);
  return (
    <div className="mx-auto w-full max-w-[1280px] px-4 py-5 sm:px-6 sm:py-7 lg:px-10 lg:py-10">
      <Breadcrumbs current={reader.lesson.title} />
      <div className="mt-5">
        <LessonReader
          data={{
            ...reader,
            coursePath:
              pathIndex >= 0
                ? {
                    position: pathIndex + 1,
                    total: pathLessons.length,
                    previousLesson:
                      pathIndex > 0
                        ? {
                            id: pathLessons[pathIndex - 1].id,
                            title: pathLessons[pathIndex - 1].title,
                          }
                        : null,
                    nextLesson:
                      pathIndex < pathLessons.length - 1
                        ? {
                            id: pathLessons[pathIndex + 1].id,
                            title: pathLessons[pathIndex + 1].title,
                          }
                        : null,
                  }
                : undefined,
            simulationLinks: simulationLinks.map((link) => ({
              simulationId: link.simulationId ?? "",
              simulationTitle: link.simulationTitle ?? link.lessonTitle,
              instructions: link.instructions,
            })),
          }}
        />
      </div>
    </div>
  );
}
