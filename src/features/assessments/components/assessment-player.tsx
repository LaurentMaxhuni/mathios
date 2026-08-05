"use client";

import * as React from "react";
import { CheckCircle2, Clock3, Flag, Play, Send, TimerReset } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type {
  AssessmentAttemptRecord,
  AssessmentDetail,
  AssessmentQuestionInstance,
  AssessmentResultDetail,
} from "@/domain/assessment/types";

function formatTime(seconds: number): string {
  const minutes = Math.floor(Math.max(0, seconds) / 60);
  const remainder = Math.max(0, seconds) % 60;
  return `${minutes}:${remainder.toString().padStart(2, "0")}`;
}

function questionValue(instance: AssessmentQuestionInstance, response: unknown): unknown {
  if (instance.type === "multiple-selection") return Array.isArray(response) ? response : [];
  return typeof response === "string" ? response : "";
}

export function AssessmentPlayer({ detail }: { detail: AssessmentDetail }) {
  const [attempt, setAttempt] = React.useState<AssessmentAttemptRecord | null>(null);
  const [result, setResult] = React.useState<AssessmentResultDetail | null>(null);
  const [index, setIndex] = React.useState(0);
  const [response, setResponse] = React.useState<unknown>("");
  const [feedback, setFeedback] = React.useState<string | null>(null);
  const [remaining, setRemaining] = React.useState<number | null>(null);
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const completionPending = React.useRef(false);

  const current = attempt?.questionInstances[index] ?? null;

  const complete = React.useCallback(async () => {
    if (!attempt || completionPending.current) return;
    completionPending.current = true;
    setPending(true);
    try {
      const serverResponse = await fetch(`/api/assessments/attempts/${attempt.id}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const body = await serverResponse.json();
      if (!serverResponse.ok) throw new Error(body.message ?? "Assessment submission failed.");
      setResult(body.result as AssessmentResultDetail);
      setAttempt(body.result.attempt as AssessmentAttemptRecord);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Assessment submission failed.");
    } finally {
      completionPending.current = false;
      setPending(false);
    }
  }, [attempt]);

  React.useEffect(() => {
    if (!attempt?.expiresAt || result) return;
    const update = () => {
      const seconds = Math.max(
        0,
        Math.ceil((Date.parse(attempt.expiresAt as string) - Date.now()) / 1000),
      );
      setRemaining(seconds);
      if (seconds === 0) void complete();
    };
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [attempt, complete, result]);

  async function start() {
    setPending(true);
    setError(null);
    try {
      const serverResponse = await fetch(`/api/assessments/${detail.assessment.id}/attempts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const body = await serverResponse.json();
      if (!serverResponse.ok) throw new Error(body.message ?? "Assessment could not be started.");
      setAttempt(body.attempt as AssessmentAttemptRecord);
      setIndex(0);
      setResponse("");
      setFeedback(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Assessment could not be started.");
    } finally {
      setPending(false);
    }
  }

  async function submit() {
    if (!attempt || !current || pending) return;
    setPending(true);
    setError(null);
    try {
      const serverResponse = await fetch(`/api/assessments/attempts/${attempt.id}/answers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId: current.questionId, response }),
      });
      const body = await serverResponse.json();
      if (!serverResponse.ok) throw new Error(body.message ?? "Answer could not be saved.");
      setFeedback(body.result?.feedback ?? "Answer saved.");
      if (index < attempt.questionInstances.length - 1) {
        window.setTimeout(() => {
          setIndex((value) => value + 1);
          setResponse("");
          setFeedback(null);
        }, 450);
      } else {
        await complete();
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Answer could not be saved.");
    } finally {
      setPending(false);
    }
  }

  if (result) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-6 w-6 text-emerald-500" aria-hidden="true" />
            <div>
              <CardTitle>Assessment submitted</CardTitle>
              <CardDescription>{result.assessment.title}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border p-4">
              <p className="text-xs text-muted-foreground">Score</p>
              <p className="mt-1 text-2xl font-semibold">
                {Math.round(result.attempt.percentage * 100)}%
              </p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-xs text-muted-foreground">Result</p>
              <p className="mt-1 text-2xl font-semibold">
                {result.attempt.passed ? "Passed" : "Review"}
              </p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-xs text-muted-foreground">Time spent</p>
              <p className="mt-1 text-2xl font-semibold">{formatTime(result.timeSpentSeconds)}</p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-xs text-muted-foreground">Avg. response</p>
              <p className="mt-1 text-2xl font-semibold">
                {result.averageResponseTimeSeconds === null
                  ? "-"
                  : `${Math.round(result.averageResponseTimeSeconds)}s`}
              </p>
            </div>
          </div>
          {result.previousAttempt ? (
            <p className="text-sm text-muted-foreground">
              Previous attempt: {Math.round(result.previousAttempt.percentage * 100)}% (
              {result.previousAttempt.passed ? "passed" : "review"}).
            </p>
          ) : null}
          {result.diagnostic ? (
            <div className="rounded-lg border border-accent/30 bg-accent/5 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
                Diagnostic recommendation
              </p>
              <p className="mt-2 font-semibold">{result.diagnostic.readinessLabel}</p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                {result.diagnostic.explanation}
              </p>
            </div>
          ) : null}
          {result.placement ? (
            <div className="rounded-lg border border-accent/30 bg-accent/5 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
                Placement recommendation
              </p>
              <p className="mt-2 font-semibold">{result.placement.startingLevel}</p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                {result.placement.explanation}
              </p>
            </div>
          ) : null}
          <div className="grid gap-3 md:grid-cols-2">
            {result.sections.map((section) => (
              <div key={section.id} className="rounded-lg border p-4">
                <p className="font-medium">
                  {detail.sections.find((item) => item.section.id === section.sectionId)?.section
                    .title ?? section.sectionId}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {Math.round(section.percentage * 100)}% · {section.correctCount}/
                  {section.questionCount} correct
                </p>
              </div>
            ))}
          </div>
          {result.mistakeCategories.length ? (
            <div className="rounded-lg border p-4">
              <p className="font-medium">Mistakes to review</p>
              <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                {result.mistakeCategories.map((category) => (
                  <li key={category.category}>
                    {category.category.replaceAll("-", " ")} ({category.count})
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </CardContent>
      </Card>
    );
  }

  if (!attempt) {
    return (
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="success">{detail.assessment.type.replaceAll("-", " ")}</Badge>
            {detail.assessment.timeLimitSeconds ? (
              <Badge variant="outline">
                <Clock3 className="mr-1 h-3.5 w-3.5" aria-hidden="true" />{" "}
                {Math.ceil(detail.assessment.timeLimitSeconds / 60)} min
              </Badge>
            ) : (
              <Badge variant="outline">Untimed</Badge>
            )}
          </div>
          <CardTitle className="mt-3">{detail.assessment.title}</CardTitle>
          <CardDescription className="leading-6">{detail.assessment.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 text-sm text-muted-foreground sm:grid-cols-3">
            <span>{detail.sections.length} sections</span>
            <span>{detail.questions.length} configured questions</span>
            <span>Pass at {Math.round(detail.assessment.passingThreshold * 100)}%</span>
          </div>
          {error ? (
            <p className="mt-4 text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          <Button className="mt-6" onClick={() => void start()} disabled={pending}>
            <Play className="h-4 w-4" aria-hidden="true" />{" "}
            {pending ? "Starting…" : "Start assessment"}
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!current)
    return (
      <Card>
        <CardContent className="py-10 text-sm text-muted-foreground">
          This attempt has no remaining questions.
        </CardContent>
      </Card>
    );
  const selected = Array.isArray(response) ? response.map(String) : [];
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="eyebrow">
              Question {index + 1} of {attempt.questionInstances.length}
            </p>
            <CardTitle className="mt-2">{current.title}</CardTitle>
          </div>
          {remaining !== null ? (
            <Badge variant={remaining < 30 ? "warning" : "outline"}>
              <TimerReset className="mr-1 h-3.5 w-3.5" aria-hidden="true" /> {formatTime(remaining)}
            </Badge>
          ) : (
            <Badge variant="outline">
              <Flag className="mr-1 h-3.5 w-3.5" aria-hidden="true" /> Untimed
            </Badge>
          )}
        </div>
        <CardDescription className="whitespace-pre-wrap pt-2 text-base leading-7 text-foreground">
          {current.prompt}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {current.options.length && ["multiple-choice", "true-false"].includes(current.type)
            ? current.options.map((option) => (
                <label
                  key={option.key}
                  className="flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition has-[:checked]:border-accent has-[:checked]:bg-accent/5"
                >
                  <input
                    type="radio"
                    name="assessment-answer"
                    value={option.key}
                    checked={response === option.key}
                    onChange={(event) => setResponse(event.target.value)}
                  />
                  <span>{option.label}</span>
                </label>
              ))
            : null}
          {current.options.length && current.type === "multiple-selection"
            ? current.options.map((option) => (
                <label
                  key={option.key}
                  className="flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition has-[:checked]:border-accent has-[:checked]:bg-accent/5"
                >
                  <input
                    type="checkbox"
                    value={option.key}
                    checked={selected.includes(option.key)}
                    onChange={(event) =>
                      setResponse(
                        event.target.checked
                          ? [...selected, option.key]
                          : selected.filter((key) => key !== option.key),
                      )
                    }
                  />
                  <span>{option.label}</span>
                </label>
              ))
            : null}
          {!current.options.length ||
          !["multiple-choice", "true-false", "multiple-selection"].includes(current.type) ? (
            <textarea
              aria-label="Your answer"
              rows={5}
              value={String(questionValue(current, response))}
              onChange={(event) => setResponse(event.target.value)}
              placeholder="Type your answer…"
              className="flex min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          ) : null}
        </div>
        {feedback ? (
          <p className="mt-4 text-sm text-muted-foreground" role="status">
            {feedback}
          </p>
        ) : null}
        {error ? (
          <p className="mt-4 text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            {current.points} point{current.points === 1 ? "" : "s"}
          </p>
          <Button onClick={() => void submit()} disabled={pending}>
            <Send className="h-4 w-4" aria-hidden="true" />{" "}
            {pending
              ? "Saving…"
              : index === attempt.questionInstances.length - 1
                ? "Submit assessment"
                : "Save answer"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
