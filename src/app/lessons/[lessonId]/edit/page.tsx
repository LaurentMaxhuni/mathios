import Link from "next/link";
import { ArrowLeft, FileEdit } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LessonEditor } from "@/features/courses/components/lesson-editor";
import { LessonStatusControls } from "@/features/courses/components/lesson-status-controls";
import { LessonForm } from "@/features/courses/components/course-forms";
import { canAuthorCourses } from "@/features/courses/service";
import { getCurrentSession } from "@/infrastructure/auth/local-auth-provider";
import { getCourseRepository } from "@/infrastructure/database/repositories/course-repository";

export default async function LessonEditPage({
  params,
}: {
  params: Promise<{ lessonId: string }>;
}) {
  const { lessonId } = await params;
  const session = await getCurrentSession().catch(() => null);
  if (!session) redirect("/profiles");
  if (!canAuthorCourses(session.principal)) redirect(`/lessons/${lessonId}`);
  const data = await getCourseRepository().getLessonEditor(lessonId);
  if (!data) notFound();
  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 py-7 sm:px-6 lg:px-10 lg:py-10">
      <Breadcrumbs current={`Edit ${data.lesson.title}`} />
      <div className="mt-6">
        <Link
          href={`/courses/${data.course.id}/modules/${data.module.id}`}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> {data.module.title}
        </Link>
        <div className="mt-5 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="warning">
                <FileEdit className="mr-1 h-3.5 w-3.5" aria-hidden="true" /> Lesson editor
              </Badge>
              <Badge variant={data.lesson.status === "published" ? "success" : "warning"}>
                {data.lesson.status}
              </Badge>
            </div>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-5xl">
              {data.lesson.title}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
              Author structured sections and blocks, preview the current draft, then publish a
              versioned snapshot for learners.
            </p>
          </div>
          <LessonStatusControls lessonId={lessonId} status={data.lesson.status} />
        </div>
      </div>
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Lesson details</CardTitle>
          <CardDescription>
            Titles and summaries are versioned alongside the block structure.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LessonForm lesson={data.lesson} moduleId={data.module.id} />
        </CardContent>
      </Card>
      <div className="mt-8">
        <LessonEditor data={data} />
      </div>
    </div>
  );
}
