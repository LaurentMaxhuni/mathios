import Link from "next/link";
import { ArrowLeft, BookOpen, Plus } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CourseForm, LessonForm, ModuleForm } from "@/features/courses/components/course-forms";
import { CourseStatusControls } from "@/features/courses/components/course-status-controls";
import { canAuthorCourses } from "@/features/courses/service";
import { getCurrentSession } from "@/infrastructure/auth/local-auth-provider";
import { getCourseRepository } from "@/infrastructure/database/repositories/course-repository";
import { getCurriculumRepository } from "@/infrastructure/database/repositories/curriculum-repository";

export default async function CourseEditPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  const session = await getCurrentSession().catch(() => null);
  if (!session) redirect("/profiles");
  if (!canAuthorCourses(session.principal)) redirect(`/courses/${courseId}`);
  const detail = await getCourseRepository().getCourseDetail(courseId);
  if (!detail) notFound();
  const structure = getCurriculumRepository();
  const [subjects, grades] = await Promise.all([structure.listSubjects(), structure.listGrades()]);
  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 py-7 sm:px-6 lg:px-10 lg:py-10">
      <Breadcrumbs current={`Edit ${detail.course.title}`} />
      <div className="mt-6">
        <Link
          href={`/courses/${courseId}`}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Course detail
        </Link>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Badge variant="warning">Course editor</Badge>
          <Badge variant="outline">{detail.course.status}</Badge>
        </div>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
          {detail.course.title}
        </h1>
        <div className="mt-5">
          <CourseStatusControls courseId={courseId} status={detail.course.status} />
        </div>
      </div>
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Course metadata</CardTitle>
          <CardDescription>
            Subject, grade range, difficulty, duration, and required status.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CourseForm course={detail.course} subjects={subjects} grades={grades} />
        </CardContent>
      </Card>
      <section className="mt-8" aria-labelledby="module-editor-heading">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 id="module-editor-heading" className="text-2xl font-semibold">
              Modules and lessons
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Use order values to tune the course spine; open a lesson to author blocks.
            </p>
          </div>
        </div>
        <div className="mt-5 grid gap-5 xl:grid-cols-2">
          {detail.modules.map((module) => (
            <Card key={module.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle>
                      {module.sortOrder + 1}. {module.title}
                    </CardTitle>
                    <CardDescription className="mt-2">{module.description}</CardDescription>
                  </div>
                  <Badge variant="outline">{module.lessons.length} lessons</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <ModuleForm module={module} courseId={courseId} />
                <div className="mt-6 border-t pt-5">
                  <p className="text-sm font-semibold">Lessons</p>
                  <div className="mt-3 space-y-4">
                    {module.lessons.map((lesson) => (
                      <div key={lesson.id} className="rounded-xl border p-4">
                        <div className="mb-3 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <BookOpen className="h-4 w-4 text-accent" aria-hidden="true" />
                            <span className="font-medium">{lesson.title}</span>
                            <Badge variant={lesson.status === "published" ? "success" : "warning"}>
                              {lesson.status}
                            </Badge>
                          </div>
                          <Link
                            href={`/lessons/${lesson.id}/edit`}
                            className="text-xs font-medium text-accent hover:underline"
                          >
                            Open editor
                          </Link>
                        </div>
                        <LessonForm lesson={lesson} moduleId={module.id} />
                      </div>
                    ))}
                    <details className="rounded-xl border border-dashed p-4">
                      <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-medium text-accent">
                        <Plus className="h-4 w-4" aria-hidden="true" /> Add lesson
                      </summary>
                      <div className="mt-4">
                        <LessonForm moduleId={module.id} />
                      </div>
                    </details>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          <Card className="border-dashed">
            <CardHeader>
              <CardTitle>Add a module</CardTitle>
              <CardDescription>
                Modules are the durable study units inside the course.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ModuleForm courseId={courseId} />
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
