import { redirect } from "next/navigation";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { ErrorState } from "@/components/shared/error-state";
import { ContentStudioWorkspace } from "@/features/content-studio/components/content-studio-workspace";
import { canAuthorCourses } from "@/features/courses/service";
import { getAiSettingsView } from "@/features/ai/service";
import { getCurrentSession } from "@/infrastructure/auth/local-auth-provider";
import { getCourseRepository } from "@/infrastructure/database/repositories/course-repository";
import { getCurriculumRepository } from "@/infrastructure/database/repositories/curriculum-repository";

export const dynamic = "force-dynamic";

export default async function ContentStudioPage() {
  const session = await getCurrentSession().catch(() => null);
  if (!session) redirect("/profiles");
  if (!canAuthorCourses(session.principal))
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-7 sm:px-6 lg:px-10 lg:py-10">
        <Breadcrumbs current="Content studio" />
        <div className="mt-6">
          <ErrorState
            title="Content author permission required"
            description="Teachers, content creators, and administrators can create reviewable course drafts."
          />
        </div>
      </div>
    );

  const coursesRepository = getCourseRepository();
  const curriculumRepository = getCurriculumRepository();
  const [courses, subjects, grades, aiSettings] = await Promise.all([
    coursesRepository.listCourses({ includeArchived: false }),
    curriculumRepository.listSubjects(),
    curriculumRepository.listGrades(),
    getAiSettingsView(),
  ]);

  return (
    <div className="mx-auto w-full max-w-[1600px] px-4 py-7 sm:px-6 lg:px-10 lg:py-10">
      <Breadcrumbs current="Content studio" />
      <div className="mt-7">
        <ContentStudioWorkspace
          subjects={subjects}
          grades={grades}
          courses={courses}
          aiEnabled={aiSettings.mode !== "disabled"}
        />
      </div>
    </div>
  );
}
