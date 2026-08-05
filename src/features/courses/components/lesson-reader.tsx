"use client";

/* The reader supports creator-authored asset URLs; next/image remote allowlists are intentionally not required for local-first content. */
/* eslint-disable @next/next/no-img-element */

import * as React from "react";
import Link from "next/link";
import { CheckCircle2, Clock3, ExternalLink, PlayCircle } from "lucide-react";
import { FormulaDisplay } from "@/features/courses/formula";
import { ActionFeedback } from "@/components/shared/action-feedback";
import { Button } from "@/components/ui/button";
import { initialActionState } from "@/lib/action-state";
import type { LessonBlockRecord, LessonReaderData } from "@/domain/course/types";
import { saveLessonProgressAction } from "@/features/courses/actions";

function text(payload: Record<string, unknown>, key: string, fallback = "") {
  return typeof payload[key] === "string" ? (payload[key] as string) : fallback;
}

function Block({ block }: { block: LessonBlockRecord }) {
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
    return (
      <div className="my-4 overflow-x-auto rounded-xl border">
        <pre className="min-w-full p-4 text-sm leading-6">{JSON.stringify(payload, null, 2)}</pre>
      </div>
    );
  if (["video", "audio", "file", "exercise-reference", "simulation-reference"].includes(block.type))
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

function ProgressControls({ data }: { data: LessonReaderData }) {
  const [state, formAction, pending] = React.useActionState(
    saveLessonProgressAction,
    initialActionState,
  );
  const completed = data.progress?.completionPercentage === 100;
  return (
    <aside className="rounded-xl border bg-card p-4" aria-label="Lesson progress">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Clock3 className="h-4 w-4 text-accent" aria-hidden="true" />
          <span className="text-sm font-medium">
            {data.lesson.estimatedDurationMinutes} min lesson
          </span>
        </div>
        <span className="text-sm text-muted-foreground">
          {data.progress?.completionPercentage ?? 0}% complete
        </span>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-accent transition-all"
          style={{ width: `${data.progress?.completionPercentage ?? 0}%` }}
        />
      </div>
      <form action={formAction} className="mt-4 flex flex-wrap items-center gap-3">
        <input type="hidden" name="lessonId" value={data.lesson.id} />
        <input
          type="hidden"
          name="timeSpentSeconds"
          value={data.lesson.estimatedDurationMinutes * 60}
        />
        <input type="hidden" name="completionPercentage" value="100" />
        <input type="hidden" name="completed" value="true" />
        <input type="hidden" name="lastViewedBlockId" value="" />
        <Button type="submit" disabled={pending || completed}>
          {completed ? (
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
          ) : (
            <PlayCircle className="h-4 w-4" aria-hidden="true" />
          )}
          {pending ? "Saving…" : completed ? "Lesson completed" : "Mark lesson complete"}
        </Button>
        <ActionFeedback state={state} />
      </form>
    </aside>
  );
}

export function LessonReader({ data }: { data: LessonReaderData }) {
  return (
    <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_18rem]">
      <article className="min-w-0">
        <div className="mb-8 border-b pb-6">
          <p className="eyebrow">
            {data.subjectName} · {data.course.title}
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-5xl">
            {data.lesson.title}
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
            {data.lesson.summary}
          </p>
        </div>
        {data.version.snapshot.sections.map(({ section, blocks }) => (
          <section
            key={section.id}
            className="mb-10"
            aria-labelledby={`reader-section-${section.id}`}
          >
            <div className="mb-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">
                {section.kind.replaceAll("-", " ")}
              </p>
              <h2 id={`reader-section-${section.id}`} className="mt-1 text-2xl font-semibold">
                {section.title}
              </h2>
              {section.description ? (
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {section.description}
                </p>
              ) : null}
            </div>
            {blocks.map((block) => (
              <Block key={block.id} block={block} />
            ))}
          </section>
        ))}
        {data.simulationLinks?.length ? (
          <section className="mb-10" aria-labelledby="lesson-simulations">
            <h2 id="lesson-simulations" className="text-2xl font-semibold tracking-tight">
              Explore with a simulation
            </h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {data.simulationLinks.map((simulation) => (
                <Link
                  key={simulation.simulationId}
                  href={`/simulations/${simulation.simulationId}` as never}
                  className="rounded-xl border p-4 transition-colors hover:border-accent"
                >
                  <p className="font-semibold">{simulation.simulationTitle}</p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    {simulation.instructions ||
                      "Open the interactive model and record what you observe."}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        ) : null}
        <div className="mt-10 border-t pt-5 text-sm text-muted-foreground">
          <Link
            href={`/courses/${data.course.id}/modules/${data.module.id}`}
            className="text-accent hover:underline"
          >
            Back to {data.module.title}
          </Link>
        </div>
      </article>
      <div className="space-y-4 xl:sticky xl:top-6 xl:self-start">
        <ProgressControls data={data} />
        <aside className="rounded-xl border bg-muted/30 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Published version
          </p>
          <p className="mt-2 font-medium">Version {data.version.versionNumber}</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {data.version.changeSummary || "Creator-approved lesson"}
          </p>
        </aside>
      </div>
    </div>
  );
}
