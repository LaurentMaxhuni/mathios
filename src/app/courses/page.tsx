import Link from "next/link";
import { ArrowRight, BookOpen, Layers3, Plus } from "lucide-react";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { buttonVariants } from "@/components/ui/button";
import { getCurrentSession } from "@/infrastructure/auth/local-auth-provider";
import { getCourseRepository } from "@/infrastructure/database/repositories/course-repository";
import { canAuthorCourses } from "@/features/courses/service";

export default async function CoursesPage() {
  const session = await getCurrentSession().catch(() => null);
  if (!session) redirect("/profiles");
  const author = canAuthorCourses(session.principal);
  if (!author) redirect("/learn");
  const courses = await getCourseRepository().listCourses({
    status: author ? undefined : "published",
  });
  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 py-7 sm:px-6 lg:px-10 lg:py-10">
      <Breadcrumbs current="Course catalog" />
      <div className="mt-6 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="eyebrow">Learning studio · Phase 3</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            A course is a path, not a pile.
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
            Browse reusable courses across curricula, grades, and subjects. Published lessons are
            ready for learning; drafts stay visible only to authorized authors.
          </p>
        </div>
        {author ? (
          <Link href="/courses/manage" className={buttonVariants({ size: "sm" })}>
            <Plus className="h-4 w-4" aria-hidden="true" /> Manage courses
          </Link>
        ) : null}
      </div>
      <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {courses.map((course) => (
          <Link key={course.id} href={`/courses/${course.id}`} className="group">
            <Card className="h-full overflow-hidden transition duration-200 group-hover:-translate-y-1 group-hover:border-accent/50 group-hover:shadow-soft">
              <div className="h-1 bg-accent" />
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <span className="grid h-11 w-11 place-items-center rounded-xl bg-accent/10 text-accent">
                    <BookOpen className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <Badge variant={course.status === "published" ? "success" : "warning"}>
                    {course.status}
                  </Badge>
                </div>
                <CardTitle className="mt-5 text-xl">{course.title}</CardTitle>
                <CardDescription className="mt-2 leading-6">
                  {course.description || "A reusable course path."}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span className="rounded-full bg-muted px-2.5 py-1">{course.subjectName}</span>
                  <span className="rounded-full bg-muted px-2.5 py-1">{course.difficulty}</span>
                  <span className="rounded-full bg-muted px-2.5 py-1">
                    {course.estimatedDurationMinutes} min
                  </span>
                </div>
                <div className="mt-5 flex items-center justify-between border-t pt-4 text-sm">
                  <span className="text-muted-foreground">
                    <Layers3 className="mr-1 inline h-4 w-4" aria-hidden="true" />
                    {course.moduleCount} modules · {course.lessonCount} lessons
                  </span>
                  <ArrowRight
                    className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-accent"
                    aria-hidden="true"
                  />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
      {!courses.length ? (
        <Card className="mt-8">
          <CardContent className="py-14 text-center">
            <p className="font-semibold">
              {author ? "This content database is empty." : "No published courses yet."}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              {author
                ? "Run npm.cmd run db:setup for the provided reference library, or create a reviewable starter with the content studio."
                : "A teacher, content creator, or administrator can author the first path."}
            </p>
            {author ? (
              <div className="mt-5 flex flex-wrap justify-center gap-3">
                <Link href={"/content-studio" as never} className={buttonVariants({ size: "sm" })}>
                  Open content studio
                </Link>
                <Link
                  href="/courses/manage"
                  className={buttonVariants({ variant: "outline", size: "sm" })}
                >
                  Open course editor
                </Link>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
