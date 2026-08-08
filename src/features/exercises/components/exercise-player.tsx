"use client";

import * as React from "react";
import Link from "next/link";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Play,
  Send,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type {
  AnswerValidationResult,
  ExerciseSetDetail,
  QuestionDetail,
} from "@/domain/exercise/types";

interface ExercisePlayerProps {
  detail: ExerciseSetDetail;
  questions: readonly QuestionDetail[];
}

interface QuestionInstanceView {
  prompt: string;
  templateId: string | null;
  instanceSeed: number | null;
}

function parseResponse(value: string): unknown {
  const trimmed = value.trim();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      return JSON.parse(trimmed);
    } catch {
      return value;
    }
  }
  return value;
}

function ResponseField({
  question,
  value,
  onChange,
}: {
  question: QuestionDetail;
  value: string;
  onChange: (value: string) => void;
}) {
  if (question.question.type === "multiple-choice") {
    return (
      <div className="space-y-2" role="radiogroup" aria-label="Answer choices">
        {question.options.map((option) => (
          <label
            key={option.key}
            className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm hover:border-accent"
          >
            <input
              type="radio"
              name={question.question.id}
              value={option.key}
              checked={value === option.key}
              onChange={(event) => onChange(event.target.value)}
              className="mt-1"
            />
            <span>
              <strong>{option.key}.</strong> {option.label}
            </span>
          </label>
        ))}
      </div>
    );
  }
  if (question.question.type === "multiple-selection") {
    const selected = value ? value.split(",").filter(Boolean) : [];
    return (
      <div className="space-y-2">
        {question.options.map((option) => (
          <label
            key={option.key}
            className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm hover:border-accent"
          >
            <input
              type="checkbox"
              value={option.key}
              checked={selected.includes(option.key)}
              onChange={(event) =>
                onChange(
                  event.target.checked
                    ? [...selected, option.key].join(",")
                    : selected.filter((key) => key !== option.key).join(","),
                )
              }
              className="mt-1"
            />
            <span>
              <strong>{option.key}.</strong> {option.label}
            </span>
          </label>
        ))}
      </div>
    );
  }
  if (question.question.type === "true-false") {
    return (
      <div className="flex flex-wrap gap-3" role="radiogroup" aria-label="True or false">
        {["true", "false"].map((answer) => (
          <label
            key={answer}
            className="flex cursor-pointer items-center gap-2 rounded-lg border px-4 py-3 text-sm"
          >
            <input
              type="radio"
              name={question.question.id}
              value={answer}
              checked={value === answer}
              onChange={(event) => onChange(event.target.value)}
            />
            {answer === "true" ? "True" : "False"}
          </label>
        ))}
      </div>
    );
  }
  const long =
    question.question.type === "long-answer" ||
    [
      "matching",
      "ordering",
      "diagram-labeling",
      "graph-interpretation",
      "table-interpretation",
      "multi-step",
    ].includes(question.question.type);
  if (long) {
    return (
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={question.question.type === "long-answer" ? 7 : 4}
        placeholder={
          question.question.type === "multi-step"
            ? "For multi-step answers, enter a JSON array such as [6, 2]."
            : "Write your response here."
        }
        className="flex min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      />
    );
  }
  return (
    <input
      value={value}
      onChange={(event) => onChange(event.target.value)}
      inputMode={
        ["numeric", "numeric-tolerance", "numeric-unit"].includes(question.question.type)
          ? "decimal"
          : "text"
      }
      placeholder={
        question.question.type === "numeric-unit" ? "Example: 12 N" : "Enter your answer"
      }
      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    />
  );
}

function Feedback({ result }: { result: AnswerValidationResult }) {
  return (
    <div
      role="status"
      className={
        result.status === "correct"
          ? "rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm"
          : "rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm"
      }
    >
      <div className="flex items-center gap-2 font-medium">
        {result.status === "correct" ? (
          <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
        ) : (
          <CircleHelp className="h-4 w-4" aria-hidden="true" />
        )}
        {result.status === "correct"
          ? "Correct"
          : result.status === "needs-review"
            ? "Saved for review"
            : result.status === "partial"
              ? "Partly correct"
              : "Keep working"}
      </div>
      <p className="mt-1 text-muted-foreground">{result.feedback}</p>
      {result.status !== "needs-review" ? (
        <p className="mt-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          {result.score} / {result.maxScore} points
        </p>
      ) : null}
    </div>
  );
}

export function ExercisePlayer({ detail, questions }: ExercisePlayerProps) {
  const [attemptId, setAttemptId] = React.useState<string | null>(null);
  const [orderedQuestions, setOrderedQuestions] = React.useState(questions);
  const [instances, setInstances] = React.useState<Record<string, QuestionInstanceView>>({});
  const [index, setIndex] = React.useState(0);
  const [responses, setResponses] = React.useState<Record<string, string>>({});
  const [results, setResults] = React.useState<Record<string, AnswerValidationResult>>({});
  const [busy, setBusy] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);
  const [completed, setCompleted] = React.useState(false);
  const question = orderedQuestions[index];

  async function start() {
    setBusy(true);
    setMessage(null);
    const response = await fetch("/api/exercises/sets/" + detail.exerciseSet.id + "/attempts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ seed: 42 }),
    });
    const body = await response.json();
    setBusy(false);
    if (!response.ok) {
      setMessage(body.message ?? "The attempt could not start.");
      return;
    }
    if (Array.isArray(body.questionIds)) {
      const byId = new Map(questions.map((item) => [item.question.id, item]));
      setOrderedQuestions(
        (body.questionIds as unknown[])
          .map((id) => byId.get(String(id)))
          .filter((item): item is QuestionDetail => Boolean(item)),
      );
    }
    if (Array.isArray(body.instances)) {
      const nextInstances: Record<string, QuestionInstanceView> = {};
      for (const instance of body.instances) {
        if (
          instance &&
          typeof instance.questionId === "string" &&
          typeof instance.prompt === "string"
        ) {
          nextInstances[instance.questionId] = {
            prompt: instance.prompt,
            templateId: typeof instance.templateId === "string" ? instance.templateId : null,
            instanceSeed: typeof instance.instanceSeed === "number" ? instance.instanceSeed : null,
          };
        }
      }
      setInstances(nextInstances);
    }
    setAttemptId(body.attempt.id);
  }

  async function submit() {
    if (!attemptId || !question) return;
    setBusy(true);
    setMessage(null);
    const response = await fetch("/api/exercises/attempts/" + attemptId + "/answers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        questionId: question.question.id,
        response: parseResponse(responses[question.question.id] ?? ""),
        templateId: instances[question.question.id]?.templateId,
        instanceSeed: instances[question.question.id]?.instanceSeed,
      }),
    });
    const body = await response.json();
    setBusy(false);
    if (!response.ok) {
      setMessage(body.message ?? "The answer could not be saved.");
      return;
    }
    setResults((current) => ({ ...current, [question.question.id]: body.result }));
  }

  async function complete() {
    if (!attemptId) return;
    setBusy(true);
    const response = await fetch("/api/exercises/attempts/" + attemptId + "/complete", {
      method: "POST",
    });
    const body = await response.json();
    setBusy(false);
    if (!response.ok) {
      setMessage(body.message ?? "The attempt could not be completed.");
      return;
    }
    setCompleted(true);
    setMessage("Exercise complete: " + body.attempt.score + " / " + body.attempt.maxScore + ".");
  }

  if (!attemptId) {
    return (
      <Card className="surface-grid overflow-hidden">
        <CardHeader>
          <Badge variant="success">Reusable practice</Badge>
          <CardTitle className="mt-3 text-2xl">{detail.exerciseSet.title}</CardTitle>
          <CardDescription className="max-w-2xl leading-6">
            {detail.exerciseSet.description}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <span>{orderedQuestions.length} questions</span>
            <span>{Math.ceil(detail.exerciseSet.estimatedTimeSeconds / 60)} minutes</span>
            <span className="capitalize">{detail.exerciseSet.difficulty}</span>
          </div>
          <Button className="mt-6" onClick={start} disabled={busy}>
            <Play className="h-4 w-4" aria-hidden="true" /> {busy ? "Starting…" : "Start practice"}
          </Button>
          {message ? (
            <p role="status" className="mt-3 text-sm text-destructive">
              {message}
            </p>
          ) : null}
        </CardContent>
      </Card>
    );
  }

  if (completed) {
    return (
      <Card>
        <CardHeader>
          <Badge variant="success">Finished</Badge>
          <CardTitle className="mt-3">Practice saved</CardTitle>
          <CardDescription>{message}</CardDescription>
        </CardHeader>
        <CardContent>
          <Link
            href={"/dashboard" as never}
            className="inline-flex items-center gap-2 text-sm font-medium text-accent hover:underline"
          >
            See your next Today activity
          </Link>
          <Button variant="outline" onClick={() => window.location.reload()}>
            Try again
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!question) return null;
  const result = results[question.question.id];
  const response = responses[question.question.id] ?? "";
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="eyebrow">
            Practice question {index + 1} of {orderedQuestions.length}
          </p>
          <div className="mt-2 h-2 w-48 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-accent transition-all"
              style={{ width: ((index + 1) / orderedQuestions.length) * 100 + "%" }}
            />
          </div>
        </div>
        <Badge variant="outline">{question.question.difficulty}</Badge>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-xl leading-8">{question.question.title}</CardTitle>
          <CardDescription className="whitespace-pre-wrap text-base leading-7 text-foreground">
            {instances[question.question.id]?.prompt ?? question.version.prompt}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <ResponseField
            question={question}
            value={response}
            onChange={(value) =>
              setResponses((current) => ({ ...current, [question.question.id]: value }))
            }
          />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Button
              variant="outline"
              onClick={() => setIndex((current) => Math.max(0, current - 1))}
              disabled={index === 0}
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" /> Previous
            </Button>
            <div className="flex flex-wrap gap-2">
              <Button onClick={submit} disabled={busy || Boolean(result)}>
                <Send className="h-4 w-4" aria-hidden="true" />{" "}
                {busy ? "Checking…" : result ? "Checked" : "Check answer"}
              </Button>
              {index < orderedQuestions.length - 1 ? (
                <Button variant="ghost" onClick={() => setIndex((current) => current + 1)}>
                  Next <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  onClick={complete}
                  disabled={busy || !Object.keys(results).length}
                >
                  Finish <Sparkles className="h-4 w-4" aria-hidden="true" />
                </Button>
              )}
            </div>
          </div>
          {result ? <Feedback result={result} /> : null}
          {message ? (
            <p role="status" className="text-sm text-destructive">
              {message}
            </p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
