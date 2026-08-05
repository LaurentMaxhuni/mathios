import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { LessonReader } from "@/features/courses/components/lesson-reader";
import { canAuthorCourses } from "@/features/courses/service";
import { getCurrentSession } from "@/infrastructure/auth/local-auth-provider";
import { getCourseRepository } from "@/infrastructure/database/repositories/course-repository";

export default async function LessonPreviewPage({
  params,
}: {
  params: Promise<{ lessonId: string }>;
}) {
  const { lessonId } = await params;
  const session = await getCurrentSession().catch(() => null);
  if (!session) redirect("/profiles");
  if (!canAuthorCourses(session.principal)) redirect(`/lessons/${lessonId}`);
  const repository = getCourseRepository();
  const editor = await repository.getLessonEditor(lessonId);
  if (!editor) notFound();
  const draft = editor.versions.find((version) => version.status === "draft");
  if (!draft) notFound();
  const reader = {
    lesson: editor.lesson,
    module: editor.module,
    course: editor.course,
    subjectName: "Preview",
    version: draft,
    progress: null,
  };
  return (
    <div className="mx-auto w-full max-w-[1280px] px-4 py-7 sm:px-6 lg:px-10 lg:py-10">
      <Breadcrumbs current={`Preview ${editor.lesson.title}`} />
      <div className="mt-6">
        <Link
          href={`/lessons/${lessonId}/edit`}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to editor
        </Link>
        <p className="eyebrow mt-6">Draft preview · version {draft.versionNumber}</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Learner reading view</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This preview uses the current draft snapshot and does not update learner progress.
        </p>
      </div>
      <div className="mt-8">
        <LessonReader data={reader} />
      </div>
    </div>
  );
}
