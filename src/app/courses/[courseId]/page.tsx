import Link from "next/link";
import { ArrowLeft, ArrowRight, Edit3, GraduationCap, Layers3 } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { buttonVariants } from "@/components/ui/button";
import { getCurrentSession } from "@/infrastructure/auth/local-auth-provider";
import { getCourseRepository } from "@/infrastructure/database/repositories/course-repository";
import { canAuthorCourses } from "@/features/courses/service";

export default async function CourseDetailPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  const session = await getCurrentSession().catch(() => null);
  if (!session) redirect("/profiles");
  const author = canAuthorCourses(session.principal);
  const detail = await getCourseRepository().getCourseDetail(courseId);
  if (!detail || (!author && detail.course.status !== "published")) notFound();
  return (
    <div className="mx-auto w-full max-w-[1280px] px-4 py-7 sm:px-6 lg:px-10 lg:py-10">
      <Breadcrumbs current={detail.course.title} />
      <div className="mt-6 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
        <div>
          <Link
            href="/courses"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Course catalog
          </Link>
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <Badge variant="outline">{detail.subjectName}</Badge>
            <Badge variant={detail.course.status === "published" ? "success" : "warning"}>
              {detail.course.status}
            </Badge>
            <Badge variant="outline">{detail.course.difficulty}</Badge>
          </div>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-5xl">
            {detail.course.title}
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-muted-foreground">
            {detail.course.description}
          </p>
        </div>
        {author ? (
          <Link
            href={`/courses/${detail.course.id}/edit`}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            <Edit3 className="h-4 w-4" aria-hidden="true" /> Edit course
          </Link>
        ) : null}
      </div>
      <section className="mt-8 grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 p-5">
            <Layers3 className="h-5 w-5 text-accent" aria-hidden="true" />
            <div>
              <p className="text-2xl font-semibold">{detail.modules.length}</p>
              <p className="text-sm text-muted-foreground">modules</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-5">
            <GraduationCap className="h-5 w-5 text-accent" aria-hidden="true" />
            <div>
              <p className="text-2xl font-semibold">{detail.grades.length}</p>
              <p className="text-sm text-muted-foreground">grade placements</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-2xl font-semibold">{detail.course.estimatedDurationMinutes} min</p>
            <p className="text-sm text-muted-foreground">estimated study time</p>
          </CardContent>
        </Card>
      </section>
      <section className="mt-8 space-y-5" aria-labelledby="course-modules-heading">
        <div>
          <h2 id="course-modules-heading" className="text-xl font-semibold">
            Course modules
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Follow the order or open a module to see its lesson spine.
          </p>
        </div>
        {detail.modules.map((module) => {
          const lessons = author
            ? module.lessons
            : module.lessons.filter((lesson) => lesson.status === "published");
          return (
            <Card key={module.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <CardTitle>
                      {module.sortOrder + 1}. {module.title}
                    </CardTitle>
                    <CardDescription className="mt-2 leading-6">
                      {module.description}
                    </CardDescription>
                  </div>
                  <Badge variant="outline">{module.estimatedStudyTimeMinutes} min</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {lessons.map((lesson) => (
                    <Link
                      key={lesson.id}
                      href={
                        lesson.status === "published"
                          ? `/lessons/${lesson.id}`
                          : `/lessons/${lesson.id}/edit`
                      }
                      className="group flex items-center justify-between gap-4 rounded-lg border px-4 py-3 transition hover:border-accent/50 hover:bg-accent/5"
                    >
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium">
                            {lesson.sortOrder + 1}. {lesson.title}
                          </span>
                          <Badge variant={lesson.status === "published" ? "success" : "warning"}>
                            {lesson.status}
                          </Badge>
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {lesson.summary || "Structured lesson"}
                        </p>
                      </div>
                      <ArrowRight
                        className="h-4 w-4 shrink-0 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-accent"
                        aria-hidden="true"
                      />
                    </Link>
                  ))}
                  {!lessons.length ? (
                    <p className="text-sm text-muted-foreground">
                      No published lessons in this module yet.
                    </p>
                  ) : null}
                </div>
                <Link
                  href={`/courses/${detail.course.id}/modules/${module.id}`}
                  className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-accent hover:underline"
                >
                  Open module <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </CardContent>
            </Card>
          );
        })}
      </section>
    </div>
  );
}
