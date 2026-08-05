import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { getCurrentSession } from "@/infrastructure/auth/local-auth-provider";
import { getCourseRepository } from "@/infrastructure/database/repositories/course-repository";
import { canAuthorCourses } from "@/features/courses/service";

export default async function ModulePage({
  params,
}: {
  params: Promise<{ courseId: string; moduleId: string }>;
}) {
  const { courseId, moduleId } = await params;
  const session = await getCurrentSession().catch(() => null);
  if (!session) redirect("/profiles");
  const detail = await getCourseRepository().getCourseDetail(courseId);
  const author = canAuthorCourses(session.principal);
  const courseModule = detail?.modules.find((item) => item.id === moduleId);
  if (!detail || !courseModule || (!author && detail.course.status !== "published")) notFound();
  const lessons = author
    ? courseModule.lessons
    : courseModule.lessons.filter((lesson) => lesson.status === "published");
  return (
    <div className="mx-auto w-full max-w-[1100px] px-4 py-7 sm:px-6 lg:px-10 lg:py-10">
      <Breadcrumbs current={courseModule.title} />
      <div className="mt-6">
        <Link
          href={`/courses/${courseId}`}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> {detail.course.title}
        </Link>
        <p className="eyebrow mt-6">
          Module {courseModule.sortOrder + 1} · {courseModule.estimatedStudyTimeMinutes} minutes
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
          {courseModule.title}
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
          {courseModule.description}
        </p>
      </div>
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Lesson sequence</CardTitle>
          <CardDescription>
            Each lesson is a versioned, structured reading experience.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {lessons.map((lesson) => (
            <Link
              key={lesson.id}
              href={
                lesson.status === "published"
                  ? `/lessons/${lesson.id}`
                  : `/lessons/${lesson.id}/edit`
              }
              className="group flex items-center justify-between gap-4 rounded-xl border p-4 transition hover:border-accent/50 hover:bg-accent/5"
            >
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{lesson.sortOrder + 1}</Badge>
                  <p className="font-medium">{lesson.title}</p>
                  <Badge variant={lesson.status === "published" ? "success" : "warning"}>
                    {lesson.status}
                  </Badge>
                </div>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{lesson.summary}</p>
              </div>
              <ArrowRight
                className="h-4 w-4 shrink-0 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-accent"
                aria-hidden="true"
              />
            </Link>
          ))}
          {!lessons.length ? (
            <p className="text-sm text-muted-foreground">No lessons are available here yet.</p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
