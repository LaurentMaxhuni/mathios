import Link from "next/link";
import { ArrowRight, Check, Circle, Clock3, Flag, Play, RotateCcw, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import type { LessonRecord, ModuleRecord } from "@/domain/course/types";
import { cn } from "@/lib/utils";

type PathLesson = LessonRecord & {
  completed: boolean;
};

export type CoursePathModule = Pick<
  ModuleRecord,
  "id" | "title" | "description" | "sortOrder" | "estimatedStudyTimeMinutes"
> & {
  optional: boolean;
  lessons: readonly PathLesson[];
};

export function CourseLearningPath({
  courseId,
  modules,
}: {
  courseId: string;
  modules: readonly CoursePathModule[];
}) {
  const lessons = modules.flatMap((module) => module.lessons);
  const currentLesson = lessons.find((lesson) => !lesson.completed) ?? null;
  const missionOffsets = modules.map((_, moduleIndex) =>
    modules
      .slice(0, moduleIndex)
      .reduce((total, previousModule) => total + previousModule.lessons.length, 0),
  );

  if (!lessons.length) {
    return (
      <div className="rounded-[2rem] border border-dashed bg-muted/25 p-8 text-center">
        <Flag className="mx-auto h-7 w-7 text-accent" aria-hidden="true" />
        <h3 className="mt-3 text-lg font-semibold">This path is being prepared</h3>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
          Published missions will appear here in the order learners should take them.
        </p>
      </div>
    );
  }

  return (
    <div className="course-path" aria-label="Course learning path">
      {modules.map((module, moduleIndex) => {
        const completedInModule = module.lessons.filter((lesson) => lesson.completed).length;
        return (
          <section
            key={module.id}
            className="course-path-chapter"
            aria-labelledby={`path-module-${module.id}`}
          >
            <div className={cn("course-path-chapter-header", module.optional && "is-optional")}>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[0.68rem] font-bold uppercase tracking-[0.18em] text-accent">
                    {module.optional ? "Bonus chapter" : `Chapter ${moduleIndex + 1}`}
                  </span>
                  {module.optional ? <Badge variant="outline">Optional</Badge> : null}
                </div>
                <h3
                  id={`path-module-${module.id}`}
                  className="mt-2 text-xl font-semibold tracking-tight sm:text-2xl"
                >
                  {module.title}
                </h3>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-primary-foreground/65">
                  {module.description}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-4 text-xs text-primary-foreground/65">
                <span className="inline-flex items-center gap-1.5">
                  <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
                  {module.estimatedStudyTimeMinutes} min
                </span>
                <span className="font-mono tabular-nums">
                  {completedInModule}/{module.lessons.length}
                </span>
              </div>
            </div>

            <ol className="course-path-track">
              {module.lessons.map((lesson, lessonIndex) => {
                const missionNumber = missionOffsets[moduleIndex] + lessonIndex + 1;
                const isCurrent = lesson.id === currentLesson?.id;
                const state = lesson.completed ? "completed" : isCurrent ? "current" : "upcoming";
                const href =
                  lesson.status === "published"
                    ? `/lessons/${lesson.id}`
                    : `/lessons/${lesson.id}/edit`;
                const alignRight = missionNumber % 2 === 0;
                return (
                  <li
                    key={lesson.id}
                    className={cn("course-path-step", `is-${state}`, alignRight && "is-right")}
                  >
                    <span className="course-path-rail" aria-hidden="true" />
                    <Link
                      href={href as never}
                      className="course-path-node"
                      aria-label={`${lesson.title}, ${
                        state === "completed"
                          ? "completed"
                          : state === "current"
                            ? "current mission"
                            : "upcoming mission"
                      }`}
                    >
                      {state === "completed" ? (
                        <Check className="h-6 w-6" aria-hidden="true" />
                      ) : state === "current" ? (
                        <Play className="ml-0.5 h-6 w-6 fill-current" aria-hidden="true" />
                      ) : (
                        <Circle className="h-5 w-5" aria-hidden="true" />
                      )}
                    </Link>

                    <article className="course-path-card">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[0.68rem] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                          Mission {missionNumber}
                        </span>
                        {state === "completed" ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-accent">
                            <Check className="h-3 w-3" aria-hidden="true" /> Complete
                          </span>
                        ) : state === "current" ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-accent">
                            <Sparkles className="h-3 w-3" aria-hidden="true" /> Up next
                          </span>
                        ) : (
                          <span className="text-xs font-medium text-muted-foreground">Later</span>
                        )}
                      </div>
                      <h4 className="mt-1.5 text-base font-semibold tracking-tight sm:text-lg">
                        {lesson.title}
                      </h4>
                      <p className="mt-1.5 line-clamp-2 text-sm leading-6 text-muted-foreground">
                        {lesson.summary || "A focused step that builds on the mission before it."}
                      </p>
                      <div className="mt-3 flex flex-wrap items-center gap-3">
                        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
                          {lesson.estimatedDurationMinutes} min
                        </span>
                        {state === "current" ? (
                          <Link
                            href={href as never}
                            className={buttonVariants({ size: "sm", className: "gap-2" })}
                          >
                            Start mission <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                          </Link>
                        ) : state === "completed" ? (
                          <Link
                            href={href as never}
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent hover:underline"
                          >
                            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" /> Review
                          </Link>
                        ) : (
                          <Link
                            href={href as never}
                            className="text-xs font-semibold text-muted-foreground transition hover:text-foreground hover:underline"
                          >
                            Preview mission
                          </Link>
                        )}
                      </div>
                    </article>
                  </li>
                );
              })}
            </ol>
          </section>
        );
      })}

      <div className="course-path-finish">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-accent text-accent-foreground shadow-soft">
          <Flag className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <p className="font-semibold">Path complete</p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Finish every mission to make this course part of your mastered library.
          </p>
        </div>
        <Link
          href={`/courses/${courseId}`}
          className="ml-auto hidden text-xs font-semibold text-muted-foreground hover:text-foreground sm:inline"
        >
          Back to the top
        </Link>
      </div>
    </div>
  );
}
