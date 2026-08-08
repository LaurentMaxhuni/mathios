import Link from "next/link";
import { ArrowRight, BookOpen, Check } from "lucide-react";
import { redirect } from "next/navigation";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { getCurrentSession } from "@/infrastructure/auth/local-auth-provider";
import { getCourseRepository } from "@/infrastructure/database/repositories/course-repository";
import { getTodayDashboard } from "@/features/today/service";
import { SubjectChooser } from "@/features/today/components/subject-chooser";

export const dynamic = "force-dynamic";

export default async function LearnPage({
  searchParams,
}: {
  searchParams: Promise<{ subject?: string }>;
}) {
  const session = await getCurrentSession().catch(() => null);
  if (!session) redirect("/profiles");
  const params = await searchParams;
  const dashboard = await getTodayDashboard(session.principal.profileId);
  const subjectId =
    params.subject && dashboard.subjects.some((subject) => subject.id === params.subject)
      ? params.subject
      : dashboard.activeSubject?.id;
  const subject = dashboard.subjects.find((item) => item.id === subjectId) ?? dashboard.subjects[0];
  const courses = subject
    ? await getCourseRepository().listCourses({ status: "published", subjectId: subject.id })
    : [];
  return (
    <div className="mx-auto w-full max-w-[1280px] px-4 py-7 sm:px-6 lg:px-10 lg:py-10">
      <Breadcrumbs current="Learn" />
      <header className="mt-6 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="eyebrow">Learn</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            Choose what to learn.
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
            All five subjects stay open. Use level and curriculum as helpful filters, not gates.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <SubjectChooser
            subjects={dashboard.subjects}
            activeSubjectId={dashboard.activeSubject?.id}
          />
          <Link href="/onboarding" className={buttonVariants({ variant: "outline", size: "sm" })}>
            Tune your focus
          </Link>
        </div>
      </header>

      <section className="mt-8" aria-labelledby="subjects-heading">
        <div className="flex items-center justify-between gap-3">
          <h2 id="subjects-heading" className="text-xl font-semibold">
            Subjects
          </h2>
          <span className="text-sm text-muted-foreground">
            {dashboard.subjects.length} available
          </span>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {dashboard.subjects.map((item) => (
            <Link
              key={item.id}
              href={`/learn?subject=${encodeURIComponent(item.id)}`}
              className="group"
            >
              <Card
                className={
                  item.id === subject?.id
                    ? "h-full border-accent/50 bg-accent/[0.05]"
                    : "h-full transition hover:border-accent/50"
                }
              >
                <CardContent className="flex items-center gap-3 pt-5">
                  <span className="grid h-9 w-9 place-items-center rounded-lg bg-accent/10 text-accent">
                    <BookOpen className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold">{item.name}</span>
                    {item.id === subject?.id ? (
                      <span className="mt-1 flex items-center gap-1 text-xs text-accent">
                        <Check className="h-3 w-3" aria-hidden="true" /> Active
                      </span>
                    ) : null}
                  </span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-9" aria-labelledby="courses-heading">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="eyebrow">{subject?.name ?? "Subject"}</p>
            <h2 id="courses-heading" className="mt-2 text-2xl font-semibold">
              Published courses
            </h2>
          </div>
          <Link href={"/dashboard" as never} className="text-sm font-medium text-accent hover:underline">
            Back to Today
          </Link>
        </div>
        {courses.length ? (
          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {courses.map((course) => (
              <Link key={course.id} href={`/courses/${course.id}`} className="group">
                <Card className="h-full transition hover:-translate-y-0.5 hover:border-accent/50">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-3">
                      <CardTitle className="text-xl">{course.title}</CardTitle>
                      <Badge variant="outline">{course.estimatedDurationMinutes} min</Badge>
                    </div>
                    <CardDescription className="leading-6">
                      {course.description || "A clear path through the subject."}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>
                      {course.lessonCount} lessons · {course.moduleCount} modules
                    </span>
                    <ArrowRight
                      className="h-4 w-4 transition group-hover:translate-x-1 group-hover:text-accent"
                      aria-hidden="true"
                    />
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <Card className="mt-4 border-dashed">
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              No published courses are available for this subject yet. Try another subject.
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  );
}
