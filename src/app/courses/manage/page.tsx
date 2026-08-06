import Link from "next/link";
import { ArrowLeft, Edit3, LibraryBig, Sparkles } from "lucide-react";
import { redirect } from "next/navigation";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { ErrorState } from "@/components/shared/error-state";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CourseForm } from "@/features/courses/components/course-forms";
import { canAuthorCourses } from "@/features/courses/service";
import { getCurrentSession } from "@/infrastructure/auth/local-auth-provider";
import { getCourseRepository } from "@/infrastructure/database/repositories/course-repository";
import { getCurriculumRepository } from "@/infrastructure/database/repositories/curriculum-repository";

export default async function CourseManagementPage() {
  const session = await getCurrentSession().catch(() => null);
  if (!session) redirect("/profiles");
  if (!canAuthorCourses(session.principal))
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-7 sm:px-6 lg:px-10 lg:py-10">
        <Breadcrumbs current="Course management" />
        <div className="mt-6">
          <ErrorState
            title="Content author permission required"
            description="Teachers, content creators, and administrators can author courses."
          />
        </div>
      </div>
    );
  const repository = getCourseRepository();
  const structure = getCurriculumRepository();
  const [courses, subjects, grades] = await Promise.all([
    repository.listCourses({ includeArchived: true }),
    structure.listSubjects(),
    structure.listGrades(),
  ]);
  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 py-7 sm:px-6 lg:px-10 lg:py-10">
      <Breadcrumbs current="Course management" />
      <div className="mt-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <Link
            href="/courses"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Catalog
          </Link>
          <p className="eyebrow mt-5">Content governance</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Course studio</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
            Build the hierarchy and hand learners a deliberate sequence of modules and versioned
            lessons.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href={"/content-studio" as never}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            <Sparkles className="h-4 w-4" aria-hidden="true" /> AI content studio
          </Link>
          <Badge variant="success">
            <LibraryBig className="mr-1 h-3.5 w-3.5" aria-hidden="true" /> Authoring enabled
          </Badge>
        </div>
      </div>
      <div className="mt-8 grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <Card>
          <CardHeader>
            <CardTitle>Create a course</CardTitle>
            <CardDescription>
              Start with the subject and grade range; compatibility mappings can be expanded from
              the editor.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CourseForm subjects={subjects} grades={grades} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Existing courses</CardTitle>
            <CardDescription>
              Draft, published, and archived content remains inspectable to authors.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {courses.map((course) => (
              <Link
                key={course.id}
                href={`/courses/${course.id}/edit`}
                className="group flex items-center justify-between gap-4 rounded-xl border p-4 transition hover:border-accent/50 hover:bg-accent/5"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{course.title}</p>
                    <Badge variant={course.status === "published" ? "success" : "warning"}>
                      {course.status}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {course.subjectName} · {course.moduleCount} modules · {course.lessonCount}{" "}
                    lessons
                  </p>
                </div>
                <Edit3
                  className="h-4 w-4 text-muted-foreground transition group-hover:text-accent"
                  aria-hidden="true"
                />
              </Link>
            ))}
            {!courses.length ? (
              <p className="text-sm text-muted-foreground">No courses yet.</p>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
