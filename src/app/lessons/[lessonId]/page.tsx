import dynamic from "next/dynamic";
import { notFound, redirect } from "next/navigation";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { RouteLoading } from "@/components/shared/route-loading";
import { canAuthorCourses } from "@/features/courses/service";
import { getCurrentSession } from "@/infrastructure/auth/local-auth-provider";
import { getCourseRepository } from "@/infrastructure/database/repositories/course-repository";
import { getSimulationRepository } from "@/infrastructure/database/repositories/simulation-repository";
import { getAnalyticsRepository } from "@/infrastructure/database/repositories/analytics-repository";
import { trackActivityEvent } from "@/features/analytics/service";
import { randomUUID } from "node:crypto";

const LessonReader = dynamic(
  () => import("@/features/courses/components/lesson-reader").then((module) => module.LessonReader),
  { loading: () => <RouteLoading label="Loading lesson" /> },
);

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
  return (
    <div className="mx-auto w-full max-w-[1280px] px-4 py-7 sm:px-6 lg:px-10 lg:py-10">
      <Breadcrumbs current={reader.lesson.title} />
      <div className="mt-7">
        <LessonReader
          data={{
            ...reader,
            simulationLinks: (await getSimulationRepository().listLessonSimulations(lessonId)).map(
              (link) => ({
                simulationId: link.simulationId ?? "",
                simulationTitle: link.simulationTitle ?? link.lessonTitle,
                instructions: link.instructions,
              }),
            ),
          }}
        />
      </div>
    </div>
  );
}
