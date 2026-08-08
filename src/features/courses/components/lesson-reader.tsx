"use client";

/* The reader supports creator-authored asset URLs; next/image remote allowlists are intentionally not required for local-first content. */
/* eslint-disable @next/next/no-img-element */

import * as React from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Circle,
  Clock3,
  ExternalLink,
  Flag,
  PlayCircle,
  Sparkles,
  Trophy,
  Zap,
} from "lucide-react";
import { FormulaDisplay } from "@/features/courses/formula";
import { ActionFeedback } from "@/components/shared/action-feedback";
import { Button } from "@/components/ui/button";
import { initialActionState } from "@/lib/action-state";
import type { LessonBlockRecord, LessonReaderData } from "@/domain/course/types";
import { saveLessonProgressAction } from "@/features/courses/actions";

function text(payload: Record<string, unknown>, key: string, fallback = "") {
  return typeof payload[key] === "string" ? (payload[key] as string) : fallback;
}

function cellText(value: unknown): string {
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean")
    return String(value);
  return value == null ? "" : JSON.stringify(value);
}

function StructuredTable({ payload, title }: { payload: Record<string, unknown>; title: string }) {
  const headers = Array.isArray(payload.headers)
    ? payload.headers.filter((header): header is string => typeof header === "string")
    : [];
  const rows = Array.isArray(payload.rows)
    ? payload.rows.map((row) => (Array.isArray(row) ? row : [row]))
    : [];
  if (!headers.length || !rows.length) {
    return (
      <div className="my-4 overflow-x-auto rounded-xl border">
        <pre className="min-w-full p-4 text-sm leading-6">{JSON.stringify(payload, null, 2)}</pre>
      </div>
    );
  }
  return (
    <div className="my-4 overflow-x-auto rounded-xl border">
      <table className="w-full min-w-[32rem] text-left text-sm">
        <caption className="sr-only">{title || "Lesson table"}</caption>
        <thead className="bg-muted/40">
          <tr>
            {headers.map((header, index) => (
              <th key={`${header}-${index}`} scope="col" className="px-3 py-2 font-semibold">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex} className="border-t">
              {headers.map((_, columnIndex) => (
                <td key={columnIndex} className="px-3 py-2 align-top">
                  {cellText(row[columnIndex])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function QuickCheck({
  payload,
  title,
  onCorrect,
}: {
  payload: Record<string, unknown>;
  title: string | null;
  onCorrect?: () => void;
}) {
  const [selectedIndex, setSelectedIndex] = React.useState<number | null>(null);
  const headingId = React.useId();
  const choices = Array.isArray(payload.choices)
    ? payload.choices.filter(
        (choice): choice is string => typeof choice === "string" && !!choice.trim(),
      )
    : [];
  const correctIndex = typeof payload.correctIndex === "number" ? payload.correctIndex : -1;
  const isUsable = choices.length >= 2 && correctIndex >= 0 && correctIndex < choices.length;

  if (!isUsable) {
    return (
      <aside className="my-5 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
        <p className="text-sm font-semibold">Quick check needs attention</p>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          This check is missing its choices. Continue with the lesson while the content is updated.
        </p>
      </aside>
    );
  }

  const answered = selectedIndex !== null;
  const correct = selectedIndex === correctIndex;
  const feedback = text(payload, "feedback", "Keep the idea in your own words, then move on.");

  return (
    <aside
      className={`mission-quick-check my-6 overflow-hidden rounded-3xl border p-4 sm:p-6 ${
        correct
          ? "is-correct border-accent/45 bg-accent/[0.09]"
          : "border-accent/25 bg-accent/[0.055]"
      }`}
      aria-labelledby={headingId}
    >
      <div className="flex items-center gap-2 text-accent">
        <Sparkles className="h-4 w-4" aria-hidden="true" />
        <p className="text-xs font-semibold uppercase tracking-[0.14em]">Quick check</p>
      </div>
      <h3 id={headingId} className="mt-3 text-lg font-semibold tracking-tight">
        {title ?? "Test the idea"}
      </h3>
      <p className="mt-2 max-w-2xl text-sm leading-6">{text(payload, "prompt")}</p>
      <div className="mt-4 grid gap-2" role="group" aria-label={text(payload, "prompt")}>
        {choices.map((choice, index) => {
          const isSelected = selectedIndex === index;
          const answerState = answered
            ? index === correctIndex
              ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-950 dark:text-emerald-100"
              : isSelected
                ? "border-rose-500/50 bg-rose-500/10 text-rose-950 dark:text-rose-100"
                : "border-border bg-background/70"
            : "border-border bg-background/70 hover:border-accent/55 hover:bg-background";
          return (
            <button
              key={choice}
              type="button"
              onClick={() => {
                setSelectedIndex(index);
                if (index === correctIndex) onCorrect?.();
              }}
              aria-pressed={isSelected}
              disabled={correct}
              className={`flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${answerState}`}
            >
              {answered && index === correctIndex ? (
                <CheckCircle2
                  className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-300"
                  aria-hidden="true"
                />
              ) : (
                <Circle className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              )}
              <span>{choice}</span>
            </button>
          );
        })}
      </div>
      {answered ? (
        <p
          className={`mt-4 rounded-xl px-3 py-2 text-sm leading-6 ${
            correct
              ? "bg-emerald-500/10 text-emerald-950 dark:text-emerald-100"
              : "bg-amber-500/10 text-amber-950 dark:text-amber-100"
          }`}
          role="status"
        >
          {correct ? "Correct — mission check passed. " : "Try another answer. "}
          {feedback}
        </p>
      ) : null}
    </aside>
  );
}

function Block({
  block,
  onQuickCheckCorrect,
}: {
  block: LessonBlockRecord;
  onQuickCheckCorrect?: () => void;
}) {
  const payload = block.payload;
  const title = block.title;
  if (block.type === "heading")
    return (
      <h3 className="mt-7 text-xl font-semibold tracking-tight">
        {text(payload, "text", title ?? "Heading")}
      </h3>
    );
  if (block.type === "formula")
    return (
      <FormulaDisplay
        latex={text(payload, "latex")}
        accessibleLabel={text(payload, "accessibleLabel", "Mathematical formula")}
      />
    );
  if (block.type === "definition")
    return (
      <aside className="my-4 rounded-xl border-l-4 border-accent bg-accent/10 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">Definition</p>
        <p className="mt-2 font-semibold">{text(payload, "term", title ?? "Term")}</p>
        <p className="mt-1 text-sm leading-6">{text(payload, "definition")}</p>
      </aside>
    );
  if (block.type === "example")
    return (
      <div className="my-4 rounded-xl border bg-muted/40 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">Example</p>
        <p className="mt-2 font-medium">{text(payload, "prompt", title ?? "Worked example")}</p>
        {Array.isArray(payload.steps) ? (
          <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm leading-6">
            {payload.steps.map((step, index) => (
              <li key={index}>{typeof step === "string" ? step : JSON.stringify(step)}</li>
            ))}
          </ol>
        ) : null}
      </div>
    );
  if (block.type === "callout" || block.type === "warning" || block.type === "common-mistake")
    return (
      <aside className="my-4 rounded-xl border bg-amber-500/10 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-700 dark:text-amber-300">
          {block.type.replaceAll("-", " ")}
        </p>
        <p className="mt-2 text-sm leading-6">
          {text(payload, "text", text(payload, "correction", text(payload, "mistake")))}
        </p>
      </aside>
    );
  if (block.type === "markdown")
    return (
      <div className="my-4 whitespace-pre-wrap text-sm leading-7">{text(payload, "markdown")}</div>
    );
  if (block.type === "paragraph")
    return <p className="my-4 whitespace-pre-wrap text-base leading-8">{text(payload, "text")}</p>;
  if (block.type === "image" || block.type === "diagram")
    return (
      <figure className="my-5">
        <img
          src={text(payload, "sourceUrl", text(payload, "url"))}
          alt={text(payload, "altText", "Educational illustration")}
          loading="lazy"
          decoding="async"
          className="max-h-[30rem] w-full rounded-xl border object-contain"
        />
        <figcaption className="mt-2 text-center text-xs text-muted-foreground">
          {text(payload, "caption")}
        </figcaption>
      </figure>
    );
  if (block.type === "code")
    return (
      <pre className="my-4 overflow-x-auto rounded-xl bg-primary p-4 text-sm text-primary-foreground">
        <code>{text(payload, "code", text(payload, "text"))}</code>
      </pre>
    );
  if (block.type === "table" || block.type === "comparison")
    return <StructuredTable payload={payload} title={title ?? "Lesson table"} />;
  if (block.type === "quick-check")
    return <QuickCheck payload={payload} title={title} onCorrect={onQuickCheckCorrect} />;
  if (block.type === "file") {
    const sourceUrl = text(payload, "sourceUrl", text(payload, "url"));
    const sourcePageUrl = text(payload, "sourcePageUrl");
    return (
      <div className="my-4 flex flex-col gap-4 rounded-xl border bg-muted/30 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-medium">{title ?? "Open resource"}</p>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            {text(payload, "description", "Open the source resource in a new tab.")}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-3 text-sm">
          {sourcePageUrl ? (
            <a
              href={sourcePageUrl}
              target="_blank"
              rel="noreferrer"
              className="text-accent hover:underline"
            >
              {text(payload, "sourceLabel", "Source page")}
            </a>
          ) : null}
          {sourceUrl ? (
            <a
              href={sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-accent px-3 py-2 font-medium text-accent-foreground hover:bg-accent/90"
            >
              {text(payload, "label", "Open file")}
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
            </a>
          ) : null}
        </div>
      </div>
    );
  }
  if (["video", "audio", "exercise-reference", "simulation-reference"].includes(block.type))
    return (
      <div className="my-4 flex items-center justify-between gap-3 rounded-xl border p-4">
        <div>
          <p className="font-medium">{title ?? block.type.replaceAll("-", " ")}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            This Phase 3 reference is ready for a later media or exercise adapter.
          </p>
        </div>
        <ExternalLink className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
      </div>
    );
  return (
    <div className="my-4 rounded-xl border p-4 text-sm leading-6">
      {text(payload, "text", JSON.stringify(payload))}
    </div>
  );
}

function ProgressControls({
  data,
  canComplete,
  requiresQuickCheck,
}: {
  data: LessonReaderData;
  canComplete: boolean;
  requiresQuickCheck: boolean;
}) {
  const [state, formAction, pending] = React.useActionState(
    saveLessonProgressAction,
    initialActionState,
  );
  const completed = data.progress?.completionPercentage === 100;
  const completionPercentage = data.progress?.completionPercentage ?? 0;
  const isSourceMission = data.course.id.startsWith("course-open-science-");
  const showCompletion = completed || state.ok;
  const nextLesson = data.coursePath?.nextLesson;
  return (
    <aside
      className="overflow-hidden rounded-3xl border border-accent/25 bg-card shadow-soft"
      aria-label="Mission completion"
    >
      <div className="border-b bg-accent/[0.065] px-5 py-4">
        <div className="flex items-center gap-2 text-accent">
          {showCompletion ? (
            <Trophy className="h-4 w-4" aria-hidden="true" />
          ) : (
            <Flag className="h-4 w-4" aria-hidden="true" />
          )}
          <p className="text-xs font-bold uppercase tracking-[0.15em]">
            {showCompletion ? "Mission cleared" : "Mission goal"}
          </p>
        </div>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {showCompletion
            ? "Your progress is saved and the next stop is ready."
            : requiresQuickCheck
              ? "Pass the quick check, then finish the mission."
              : "Reach the end and save this stop on your path."}
        </p>
      </div>
      <div className="p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Clock3 className="h-4 w-4 text-accent" aria-hidden="true" />
            <span className="text-sm font-medium">
              {data.lesson.estimatedDurationMinutes} min {isSourceMission ? "mission" : "lesson"}
            </span>
          </div>
          <span className="text-sm text-muted-foreground">
            {showCompletion ? 100 : completionPercentage}% complete
          </span>
        </div>
        <div
          className="mt-3 h-2 overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-label="Lesson completion"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={showCompletion ? 100 : completionPercentage}
        >
          <div
            className="h-full rounded-full bg-accent transition-[width] duration-500"
            style={{ width: `${showCompletion ? 100 : completionPercentage}%` }}
          />
        </div>
        <form action={formAction} className="mt-5">
          <input type="hidden" name="lessonId" value={data.lesson.id} />
          <input
            type="hidden"
            name="timeSpentSeconds"
            value={data.lesson.estimatedDurationMinutes * 60}
          />
          <input type="hidden" name="completionPercentage" value="100" />
          <input type="hidden" name="completed" value="true" />
          <input type="hidden" name="lastViewedBlockId" value="" />
          <Button
            type="submit"
            size="lg"
            className="w-full justify-center gap-2"
            disabled={pending || completed || !canComplete}
          >
            {showCompletion ? (
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            ) : (
              <PlayCircle className="h-4 w-4" aria-hidden="true" />
            )}
            {pending
              ? "Saving..."
              : showCompletion
                ? isSourceMission
                  ? "Mission completed"
                  : "Lesson completed"
                : isSourceMission
                  ? "Finish mission"
                  : "Mark lesson complete"}
          </Button>
          <div className="mt-3">
            <ActionFeedback state={state} />
          </div>
        </form>
        {requiresQuickCheck && !completed && !canComplete ? (
          <p
            className="mt-3 rounded-xl bg-muted px-3 py-2 text-xs leading-5 text-muted-foreground"
            role="status"
          >
            Answer the quick check correctly to unlock finishing this mission.
          </p>
        ) : null}
        {showCompletion ? (
          nextLesson ? (
            <Link
              href={`/lessons/${nextLesson.id}`}
              className="group mt-4 flex items-center justify-between gap-3 rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
            >
              <span className="min-w-0">
                <span className="block text-[0.68rem] uppercase tracking-[0.14em] text-primary-foreground/55">
                  Next mission
                </span>
                <span className="mt-0.5 block truncate">{nextLesson.title}</span>
              </span>
              <ArrowRight
                className="h-4 w-4 shrink-0 text-accent transition-transform group-hover:translate-x-1"
                aria-hidden="true"
              />
            </Link>
          ) : (
            <Link
              href={`/courses/${data.course.id}`}
              className="mt-4 flex items-center justify-between gap-3 rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
            >
              View completed path <Trophy className="h-4 w-4 text-accent" aria-hidden="true" />
            </Link>
          )
        ) : null}
      </div>
    </aside>
  );
}

export function LessonReader({ data }: { data: LessonReaderData }) {
  const isSourceMission = data.course.id.startsWith("course-open-science-");
  const hasQuickCheck = data.version.snapshot.sections.some(({ blocks }) =>
    blocks.some((block) => block.type === "quick-check"),
  );
  const [hasPassedQuickCheck, setHasPassedQuickCheck] = React.useState(
    data.progress?.completionPercentage === 100 || !isSourceMission || !hasQuickCheck,
  );
  const canComplete = !isSourceMission || !hasQuickCheck || hasPassedQuickCheck;
  const completionPercentage = data.progress?.completionPercentage ?? 0;
  const pathPosition = data.coursePath?.position ?? 1;
  const pathTotal = data.coursePath?.total ?? 1;
  const pathProgress = Math.round(
    ((pathPosition - 1 + completionPercentage / 100) / Math.max(pathTotal, 1)) * 100,
  );

  return (
    <div>
      <div className="lesson-mission-bar">
        <Link
          href={`/courses/${data.course.id}`}
          className="inline-flex min-w-0 items-center gap-2 text-sm font-semibold text-muted-foreground transition hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="hidden truncate sm:inline">Exit to path</span>
          <span className="sm:hidden">Exit</span>
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3 text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            <span>
              Mission {pathPosition} of {pathTotal}
            </span>
            <span className="font-mono tabular-nums">{pathProgress}% path</span>
          </div>
          <div
            className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-label="Course path progress"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={pathProgress}
          >
            <div
              className="h-full rounded-full bg-accent transition-[width] duration-500"
              style={{ width: `${pathProgress}%` }}
            />
          </div>
        </div>
        <span className="hidden shrink-0 items-center gap-1.5 rounded-xl bg-accent/10 px-3 py-2 text-xs font-semibold text-accent sm:inline-flex">
          <Zap className="h-3.5 w-3.5" aria-hidden="true" />
          +20 XP
        </span>
      </div>

      <header className="lesson-hero mt-4 overflow-hidden rounded-[2rem] border p-5 sm:p-8 lg:p-10">
        <div className="relative z-10 max-w-4xl">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-accent">
            {data.subjectName} · {data.course.title}
          </p>
          <h1 className="mt-4 text-balance text-4xl font-semibold tracking-[-0.055em] sm:text-6xl">
            {data.lesson.title}
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-primary-foreground/70">
            {data.lesson.summary}
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-4 text-sm text-primary-foreground/60">
            <span className="inline-flex items-center gap-1.5">
              <Clock3 className="h-4 w-4 text-accent" aria-hidden="true" />
              {data.lesson.estimatedDurationMinutes} minutes
            </span>
            <span className="inline-flex items-center gap-1.5">
              <BookOpen className="h-4 w-4 text-accent" aria-hidden="true" />
              {data.version.snapshot.sections.length} focused steps
            </span>
          </div>
        </div>
      </header>

      <div className="mt-8 grid gap-8 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <article className="min-w-0">
          {data.version.snapshot.sections.map(({ section, blocks }, sectionIndex) => (
            <section
              key={section.id}
              className="lesson-section-card content-visibility-auto mb-6"
              aria-labelledby={`reader-section-${section.id}`}
            >
              <div className="mb-5 flex items-start gap-4 border-b pb-5">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-accent/10 font-mono text-sm font-semibold text-accent">
                  {String(sectionIndex + 1).padStart(2, "0")}
                </span>
                <div>
                  <p className="text-[0.68rem] font-bold uppercase tracking-[0.16em] text-accent">
                    {section.kind.replaceAll("-", " ")}
                  </p>
                  <h2
                    id={`reader-section-${section.id}`}
                    className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl"
                  >
                    {section.title}
                  </h2>
                  {section.description ? (
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      {section.description}
                    </p>
                  ) : null}
                </div>
              </div>
              <div className="lesson-prose">
                {blocks.map((block) => (
                  <Block
                    key={block.id}
                    block={block}
                    onQuickCheckCorrect={
                      isSourceMission ? () => setHasPassedQuickCheck(true) : undefined
                    }
                  />
                ))}
              </div>
            </section>
          ))}

          {data.simulationLinks?.length ? (
            <section className="lesson-section-card mb-6" aria-labelledby="lesson-simulations">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-2xl bg-accent/10 text-accent">
                  <Sparkles className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-[0.68rem] font-bold uppercase tracking-[0.16em] text-accent">
                    Explore
                  </p>
                  <h2
                    id="lesson-simulations"
                    className="mt-1 text-2xl font-semibold tracking-tight"
                  >
                    Test the idea in a simulation
                  </h2>
                </div>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {data.simulationLinks.map((simulation) => (
                  <Link
                    key={simulation.simulationId}
                    href={`/simulations/${simulation.simulationId}` as never}
                    className="group rounded-2xl border bg-background/70 p-4 transition hover:-translate-y-0.5 hover:border-accent/45 hover:shadow-sm"
                  >
                    <p className="font-semibold">{simulation.simulationTitle}</p>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                      {simulation.instructions ||
                        "Open the interactive model and record what you observe."}
                    </p>
                    <span className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-accent">
                      Open simulation
                      <ArrowRight
                        className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
                        aria-hidden="true"
                      />
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          ) : null}

          <nav
            className="mt-8 grid gap-3 border-t pt-6 sm:grid-cols-2"
            aria-label="Lesson path navigation"
          >
            {data.coursePath?.previousLesson ? (
              <Link
                href={`/lessons/${data.coursePath.previousLesson.id}`}
                className="group rounded-2xl border bg-card p-4 transition hover:border-accent/45 hover:shadow-sm"
              >
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                  <ArrowLeft
                    className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5"
                    aria-hidden="true"
                  />
                  Previous mission
                </span>
                <span className="mt-2 block font-semibold">
                  {data.coursePath.previousLesson.title}
                </span>
              </Link>
            ) : (
              <Link
                href={`/courses/${data.course.id}`}
                className="rounded-2xl border bg-card p-4 transition hover:border-accent/45 hover:shadow-sm"
              >
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                  <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" /> Course path
                </span>
                <span className="mt-2 block font-semibold">{data.course.title}</span>
              </Link>
            )}
            {data.coursePath?.nextLesson ? (
              <Link
                href={`/lessons/${data.coursePath.nextLesson.id}`}
                className="group rounded-2xl border bg-card p-4 text-right transition hover:border-accent/45 hover:shadow-sm"
              >
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                  Next mission
                  <ArrowRight
                    className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                </span>
                <span className="mt-2 block font-semibold">{data.coursePath.nextLesson.title}</span>
              </Link>
            ) : (
              <Link
                href="/dashboard"
                className="rounded-2xl border bg-card p-4 text-right transition hover:border-accent/45 hover:shadow-sm"
              >
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                  Finish line <Flag className="h-3.5 w-3.5" aria-hidden="true" />
                </span>
                <span className="mt-2 block font-semibold">Return to your daily path</span>
              </Link>
            )}
          </nav>
        </article>

        <div className="space-y-4 xl:sticky xl:top-24 xl:self-start">
          <ProgressControls
            data={data}
            canComplete={canComplete}
            requiresQuickCheck={isSourceMission && hasQuickCheck}
          />
          <aside className="rounded-3xl border bg-muted/30 p-5">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-accent">
              Mission rhythm
            </p>
            <ol className="mt-4 space-y-3 text-sm leading-6 text-muted-foreground">
              {[
                "Build the idea one small step at a time.",
                "Use the quick check to test your model.",
                "Finish to earn XP and reveal the next stop.",
              ].map((item, index) => (
                <li key={item} className="flex gap-3">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-background font-mono text-xs font-semibold text-accent shadow-sm">
                    {index + 1}
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ol>
          </aside>
          <details className="rounded-2xl border bg-card px-4 py-3 text-sm">
            <summary className="cursor-pointer font-medium text-muted-foreground">
              Lesson details
            </summary>
            <p className="mt-3 text-xs leading-5 text-muted-foreground">
              Version {data.version.versionNumber} ·{" "}
              {data.version.changeSummary || "Creator-approved lesson"}
            </p>
          </details>
        </div>
      </div>
    </div>
  );
}
