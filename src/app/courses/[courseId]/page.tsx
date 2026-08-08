import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock3,
  Edit3,
  Flag,
  PlayCircle,
  Sparkles,
} from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { buttonVariants } from "@/components/ui/button";
import { CourseLearningPath } from "@/features/courses/components/course-learning-path";
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

  const repository = getCourseRepository();
  const author = canAuthorCourses(session.principal);
  const detail = await repository.getCourseDetail(courseId);
  if (!detail || (!author && detail.course.status !== "published")) notFound();

  const isSourceCourse = detail.course.id.startsWith("course-open-science-");
  const modules = detail.modules.map((module) => ({
    ...module,
    lessons: author
      ? module.lessons
      : module.lessons.filter((lesson) => lesson.status === "published"),
  }));
  const publishedLessons = modules.flatMap((module) => module.lessons);
  const lessonProgress = new Map(
    await Promise.all(
      publishedLessons.map(
        async (lesson) =>
          [
            lesson.id,
            await repository.getLessonProgress(session.principal.profileId, lesson.id),
          ] as const,
      ),
    ),
  );
  const completedLessonCount = publishedLessons.filter(
    (lesson) => lessonProgress.get(lesson.id)?.completionPercentage === 100,
  ).length;
  const courseProgress = publishedLessons.length
    ? Math.round((completedLessonCount / publishedLessons.length) * 100)
    : 0;
  const currentLesson =
    publishedLessons.find(
      (lesson) => lessonProgress.get(lesson.id)?.completionPercentage !== 100,
    ) ?? publishedLessons[0];
  const pathModules = modules.map((module, moduleIndex) => ({
    id: module.id,
    title: module.title,
    description: module.description,
    sortOrder: module.sortOrder,
    estimatedStudyTimeMinutes: module.estimatedStudyTimeMinutes,
    optional: isSourceCourse && moduleIndex > 0,
    lessons: module.lessons.map((lesson) => ({
      ...lesson,
      completed: lessonProgress.get(lesson.id)?.completionPercentage === 100,
    })),
  }));

  return (
    <div className="mx-auto w-full max-w-[1180px] px-4 py-5 sm:px-6 sm:py-7 lg:px-10 lg:py-10">
      <Breadcrumbs current={detail.course.title} />

      <header className="course-hero mt-5 overflow-hidden rounded-[2rem] border px-5 py-6 sm:px-8 sm:py-8 lg:px-10 lg:py-10">
        <div className="relative z-10">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <Link
              href="/learn"
              className="inline-flex items-center gap-2 text-sm font-medium text-primary-foreground/65 transition hover:text-primary-foreground"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Learning library
            </Link>
            {author ? (
              <Link
                href={`/courses/${detail.course.id}/edit`}
                className={buttonVariants({
                  variant: "outline",
                  size: "sm",
                  className:
                    "border-primary-foreground/20 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground",
                })}
              >
                <Edit3 className="h-4 w-4" aria-hidden="true" /> Edit course
              </Link>
            ) : null}
          </div>

          <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_17rem] lg:items-end">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="border-accent/25 bg-accent/10 text-accent">
                  {detail.subjectName}
                </Badge>
                <span className="text-xs font-semibold capitalize text-primary-foreground/60">
                  {detail.course.difficulty} path
                </span>
                {detail.course.status !== "published" ? (
                  <Badge variant="warning">{detail.course.status}</Badge>
                ) : null}
              </div>
              <h1 className="mt-5 max-w-4xl text-balance text-4xl font-semibold tracking-[-0.055em] sm:text-6xl">
                {detail.course.title}
              </h1>
              <p className="mt-4 max-w-3xl text-base leading-7 text-primary-foreground/70">
                {detail.course.description}
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-3">
                {currentLesson ? (
                  <Link
                    href={`/lessons/${currentLesson.id}`}
                    className={buttonVariants({
                      className: "group gap-2 bg-accent text-accent-foreground hover:bg-accent/90",
                    })}
                  >
                    {courseProgress === 100
                      ? "Review path"
                      : courseProgress
                        ? "Continue path"
                        : "Start path"}
                    <PlayCircle
                      className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                      aria-hidden="true"
                    />
                  </Link>
                ) : null}
                <span className="inline-flex items-center gap-1.5 text-sm text-primary-foreground/60">
                  <Clock3 className="h-4 w-4" aria-hidden="true" />
                  About {detail.course.estimatedDurationMinutes} minutes
                </span>
              </div>
            </div>

            <div className="rounded-3xl border border-primary-foreground/12 bg-primary-foreground/[0.055] p-5 backdrop-blur">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-semibold uppercase tracking-[0.15em] text-primary-foreground/55">
                  Path progress
                </span>
                <span className="font-mono text-xl font-semibold tabular-nums text-accent">
                  {courseProgress}%
                </span>
              </div>
              <div
                className="mt-4 h-2 overflow-hidden rounded-full bg-primary-foreground/10"
                role="progressbar"
                aria-label="Course progress"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={courseProgress}
              >
                <div
                  className="h-full rounded-full bg-accent transition-[width] duration-500"
                  style={{ width: `${courseProgress}%` }}
                />
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3 border-t border-primary-foreground/10 pt-4">
                <div>
                  <p className="font-mono text-lg font-semibold tabular-nums">
                    {completedLessonCount}/{publishedLessons.length}
                  </p>
                  <p className="mt-0.5 text-xs text-primary-foreground/55">missions</p>
                </div>
                <div>
                  <p className="font-mono text-lg font-semibold tabular-nums">{modules.length}</p>
                  <p className="mt-0.5 text-xs text-primary-foreground/55">chapters</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <section className="mt-10" aria-labelledby="course-modules-heading">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="eyebrow">Your learning trail</p>
            <h2
              id="course-modules-heading"
              className="mt-2 text-3xl font-semibold tracking-[-0.035em] sm:text-4xl"
            >
              One mission unlocks the next idea.
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
              Follow the highlighted mission, revisit completed stops, or preview what is coming.
              Your progress stays visible all the way to the finish.
            </p>
          </div>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            {courseProgress === 100 ? (
              <CheckCircle2 className="h-5 w-5 text-accent" aria-hidden="true" />
            ) : (
              <Sparkles className="h-5 w-5 text-accent" aria-hidden="true" />
            )}
            <span>
              {courseProgress === 100
                ? "Every mission completed"
                : `${publishedLessons.length - completedLessonCount} missions ahead`}
            </span>
          </div>
        </div>

        <div className="mt-8">
          <CourseLearningPath courseId={detail.course.id} modules={pathModules} />
        </div>
      </section>

      <footer className="mt-10 flex flex-col gap-4 border-t py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <span className="inline-flex items-center gap-2">
          <Flag className="h-4 w-4 text-accent" aria-hidden="true" />
          Progress saves after each completed mission.
        </span>
        <Link
          href="/learn"
          className="inline-flex items-center gap-1.5 font-semibold text-accent hover:underline"
        >
          Explore another path <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </footer>
    </div>
  );
}
