import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Check,
  Clock3,
  Layers3,
  PlayCircle,
  Route,
  Sparkles,
} from "lucide-react";
import { redirect } from "next/navigation";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { getCurrentSession } from "@/infrastructure/auth/local-auth-provider";
import { getCourseRepository } from "@/infrastructure/database/repositories/course-repository";
import { getTodayDashboard } from "@/features/today/service";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function LearnPage({
  searchParams,
}: {
  searchParams: Promise<{ subject?: string; page?: string }>;
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
  const repository = getCourseRepository();
  const courses = subject
    ? await repository.listCourses({ status: "published", subjectId: subject.id })
    : [];
  const pageSize = 10;
  const requestedPage = Number.parseInt(params.page ?? "1", 10);
  const featuredCourse = courses[0] ?? null;
  const catalogCourses = featuredCourse
    ? courses.filter((course) => course.id !== featuredCourse.id)
    : courses;
  const totalPages = Math.max(1, Math.ceil(catalogCourses.length / pageSize));
  const currentPage = Math.min(
    totalPages,
    Math.max(1, Number.isFinite(requestedPage) ? requestedPage : 1),
  );
  const visibleCourses = catalogCourses.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const coursesToHydrate = featuredCourse ? [featuredCourse, ...visibleCourses] : visibleCourses;
  const courseCards = await Promise.all(
    coursesToHydrate.map(async (course) => {
      const detail = await repository.getCourseDetail(course.id);
      const lessons =
        detail?.modules.flatMap((module) =>
          module.lessons.filter((lesson) => lesson.status === "published"),
        ) ?? [];
      const progress = await Promise.all(
        lessons.map((lesson) =>
          repository.getLessonProgress(session.principal.profileId, lesson.id),
        ),
      );
      const completedCount = progress.filter((item) => item?.completionPercentage === 100).length;
      const progressPercent = lessons.length
        ? Math.round((completedCount / lessons.length) * 100)
        : 0;
      const nextLessonIndex = progress.findIndex((item) => item?.completionPercentage !== 100);
      const nextLesson = lessons[nextLessonIndex >= 0 ? nextLessonIndex : 0] ?? null;
      return { course, completedCount, progressPercent, nextLesson };
    }),
  );
  const featured = featuredCourse
    ? (courseCards.find((item) => item.course.id === featuredCourse.id) ?? null)
    : null;
  const remainingCourses = courseCards.filter((item) => item.course.id !== featuredCourse?.id);
  const pageHref = (page: number) =>
    `/learn?subject=${encodeURIComponent(subject?.id ?? "")}&page=${page}`;

  return (
    <div className="mx-auto w-full max-w-[1280px] px-4 py-5 sm:px-6 sm:py-7 lg:px-10 lg:py-10">
      <Breadcrumbs current="Learning library" />

      <header className="mt-6 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
        <div>
          <p className="eyebrow">Learning library</p>
          <h1 className="mt-2 max-w-3xl text-balance text-4xl font-semibold tracking-[-0.05em] sm:text-6xl">
            Pick a path. Keep your momentum.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">
            Every course is a trail of short missions. Start anywhere, see what comes next, and
            return without losing your place.
          </p>
        </div>
        <Link href="/onboarding" className={buttonVariants({ variant: "outline" })}>
          Tune my learning focus
        </Link>
      </header>

      <nav className="mt-8" aria-label="Filter library by subject">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {dashboard.subjects.map((item) => {
            const active = item.id === subject?.id;
            return (
              <Link
                key={item.id}
                href={`/learn?subject=${encodeURIComponent(item.id)}`}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex shrink-0 items-center gap-2 rounded-xl border px-3.5 py-2.5 text-sm font-semibold transition hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]",
                  active
                    ? "border-primary bg-primary text-primary-foreground shadow-sm"
                    : "bg-card text-muted-foreground hover:border-accent/45 hover:text-foreground",
                )}
              >
                {active ? (
                  <Check className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
                ) : (
                  <span className="h-1.5 w-1.5 rounded-full bg-accent/55" aria-hidden="true" />
                )}
                {item.name}
              </Link>
            );
          })}
        </div>
      </nav>

      {featured ? (
        <section
          className="library-feature mt-7 overflow-hidden rounded-[2rem] border p-5 sm:p-8"
          aria-labelledby="featured-path-heading"
        >
          <div className="relative z-10 grid gap-7 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-end">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.16em] text-accent">
                  <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                  {featured.progressPercent ? "Continue your path" : "Recommended first path"}
                </span>
                <Badge className="border-primary-foreground/15 bg-primary-foreground/[0.07] text-primary-foreground/75">
                  {featured.course.difficulty}
                </Badge>
              </div>
              <h2
                id="featured-path-heading"
                className="mt-4 max-w-3xl text-balance text-3xl font-semibold tracking-[-0.04em] sm:text-5xl"
              >
                {featured.course.title}
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-primary-foreground/70 sm:text-base">
                {featured.course.description || "A guided route through the subject's core ideas."}
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Link
                  href={
                    featured.nextLesson
                      ? `/lessons/${featured.nextLesson.id}`
                      : `/courses/${featured.course.id}`
                  }
                  className={buttonVariants({
                    className: "group gap-2 bg-accent text-accent-foreground hover:bg-accent/90",
                  })}
                >
                  {featured.progressPercent ? "Continue mission" : "Start this path"}
                  <PlayCircle
                    className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                </Link>
                <Link
                  href={`/courses/${featured.course.id}`}
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary-foreground/70 transition hover:text-primary-foreground"
                >
                  See the full path <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>
            </div>

            <div className="rounded-3xl border border-primary-foreground/12 bg-primary-foreground/[0.055] p-5 backdrop-blur">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-semibold text-primary-foreground/60">
                  Path progress
                </span>
                <span className="font-mono text-xl font-semibold tabular-nums text-accent">
                  {featured.progressPercent}%
                </span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-primary-foreground/10">
                <div
                  className="h-full rounded-full bg-accent transition-[width] duration-500"
                  style={{ width: `${featured.progressPercent}%` }}
                />
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3 border-t border-primary-foreground/10 pt-4 text-sm">
                <span className="inline-flex items-center gap-1.5 text-primary-foreground/65">
                  <Layers3 className="h-4 w-4 text-accent" aria-hidden="true" />
                  {featured.course.lessonCount} missions
                </span>
                <span className="inline-flex items-center gap-1.5 text-primary-foreground/65">
                  <Clock3 className="h-4 w-4 text-accent" aria-hidden="true" />
                  {featured.course.estimatedDurationMinutes} min
                </span>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      <section className="mt-10" aria-labelledby="all-paths-heading">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="eyebrow">{subject?.name ?? "Subject"}</p>
            <h2
              id="all-paths-heading"
              className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl"
            >
              {remainingCourses.length
                ? "More paths to explore"
                : featured
                  ? "Your selected path"
                  : "Paths coming soon"}
            </h2>
          </div>
          <span className="hidden text-sm text-muted-foreground sm:inline">
            {courses.length} {courses.length === 1 ? "path" : "paths"}
          </span>
        </div>

        {remainingCourses.length ? (
          <>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {remainingCourses.map(({ course, completedCount, progressPercent, nextLesson }) => (
                <article
                  key={course.id}
                  className="group flex min-h-64 flex-col rounded-3xl border bg-card p-5 transition duration-200 hover:-translate-y-1 hover:border-accent/45 hover:shadow-soft sm:p-6"
                >
                  <div className="flex items-start justify-between gap-4">
                    <span className="grid h-11 w-11 place-items-center rounded-2xl bg-accent/10 text-accent transition-transform group-hover:-rotate-3 group-hover:scale-105">
                      <Route className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <Badge variant="outline">{course.difficulty}</Badge>
                  </div>
                  <h3 className="mt-5 text-balance text-xl font-semibold tracking-tight sm:text-2xl">
                    {course.title}
                  </h3>
                  <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">
                    {course.description || "A clear route through the subject."}
                  </p>
                  <div className="mt-auto pt-6">
                    <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                      <span>
                        {completedCount}/{course.lessonCount} missions
                      </span>
                      <span className="font-mono tabular-nums">{progressPercent}%</span>
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-accent transition-[width] duration-500"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                    <div className="mt-4 flex items-center justify-between gap-3 border-t pt-4">
                      <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
                        {course.estimatedDurationMinutes} min
                      </span>
                      <Link
                        href={nextLesson ? `/lessons/${nextLesson.id}` : `/courses/${course.id}`}
                        className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent hover:underline"
                      >
                        {progressPercent ? "Continue" : "Start path"}
                        <ArrowRight
                          className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                          aria-hidden="true"
                        />
                      </Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>
            {totalPages > 1 ? (
              <nav
                className="mt-7 flex items-center justify-between gap-4 rounded-2xl border bg-card p-3"
                aria-label="Library pages"
              >
                {currentPage > 1 ? (
                  <Link
                    href={pageHref(currentPage - 1) as never}
                    className={buttonVariants({ variant: "outline", size: "sm" })}
                  >
                    <ArrowRight className="h-4 w-4 rotate-180" aria-hidden="true" /> Previous
                  </Link>
                ) : (
                  <span />
                )}
                <span className="text-sm text-muted-foreground">
                  Page{" "}
                  <span className="font-mono font-semibold text-foreground">{currentPage}</span> of{" "}
                  <span className="font-mono font-semibold text-foreground">{totalPages}</span>
                </span>
                {currentPage < totalPages ? (
                  <Link
                    href={pageHref(currentPage + 1) as never}
                    className={buttonVariants({ variant: "outline", size: "sm" })}
                  >
                    Next <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                ) : (
                  <span />
                )}
              </nav>
            ) : null}
          </>
        ) : !featured ? (
          <div className="mt-5 rounded-3xl border border-dashed bg-muted/20 p-8 text-center sm:p-12">
            <BookOpen className="mx-auto h-7 w-7 text-accent" aria-hidden="true" />
            <h3 className="mt-3 text-lg font-semibold">No published path here yet</h3>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
              Try another subject while this part of the library is being prepared.
            </p>
          </div>
        ) : null}
      </section>
    </div>
  );
}
