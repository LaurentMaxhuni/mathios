"use client";

import { useState } from "react";
import { Bot, CheckCircle2, CircleAlert, RefreshCw, Save, Sparkles, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  AI_MODES,
  AI_TASKS,
  type AiGenerationRecord,
  type AiProviderHealth,
  type AiProviderMode,
  type AiSettingsView,
  type AiTask,
} from "@/domain/ai/types";
import { taskLabel } from "@/domain/ai/rules";

interface Props {
  initialSettings: AiSettingsView;
  initialGenerations: readonly AiGenerationRecord[];
  canManageSettings: boolean;
  canReview: boolean;
}

const defaultInstruction: Record<AiTask, string> = {
  "alternative-explanation": "Explain this idea using a different mental model.",
  "simpler-explanation": "Explain this in a way that is easy to remember.",
  "advanced-explanation": "Connect this idea to a more advanced extension.",
  "socratic-tutoring": "Help me reason through this without giving away the answer.",
  "contextual-hint": "Give me the next useful hint.",
  "lesson-summary": "Summarize the lesson into key ideas and a recall checklist.",
  "note-summary": "Summarize these notes into durable takeaways.",
  "practice-question-generation": "Create three practice questions with answers.",
  "question-variation": "Create a fresh variation of the question.",
  "written-answer-feedback": "Give specific feedback on my written answer.",
  "misconception-analysis": "What misconception might explain this mistake?",
  "natural-language-search": "Find the most relevant concepts for this request.",
  "study-plan-suggestion": "Suggest a realistic study sequence for this topic.",
  "lesson-draft":
    "Create a structured lesson draft as JSON for an author to review. Do not publish it.",
};

async function responseMessage(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { message?: string };
    return body.message ?? "Request failed (" + response.status + ").";
  } catch {
    return "Request failed (" + response.status + ").";
  }
}

function statusVariant(status: AiGenerationRecord["status"]): "success" | "outline" | "warning" {
  if (status === "approved") return "success";
  if (status === "rejected") return "warning";
  return "outline";
}

export function AiWorkspace({
  initialSettings,
  initialGenerations,
  canManageSettings,
  canReview,
}: Props) {
  const [settings, setSettings] = useState(initialSettings);
  const [generations, setGenerations] = useState([...initialGenerations]);
  const [remoteApiKey, setRemoteApiKey] = useState("");
  const [clearRemoteApiKey, setClearRemoteApiKey] = useState(false);
  const [task, setTask] = useState<AiTask>("simpler-explanation");
  const [instruction, setInstruction] = useState(defaultInstruction["simpler-explanation"]);
  const [lessonId, setLessonId] = useState("");
  const [conceptId, setConceptId] = useState("");
  const [gradeId, setGradeId] = useState("");
  const [learnerContext, setLearnerContext] = useState("");
  const [health, setHealth] = useState<AiProviderHealth | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function saveSettings(): Promise<void> {
    setBusy("settings");
    setNotice(null);
    try {
      const response = await fetch("/api/ai/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: settings.mode,
          localBaseUrl: settings.localBaseUrl,
          localModel: settings.localModel,
          remoteBaseUrl: settings.remoteBaseUrl,
          remoteModel: settings.remoteModel,
          remoteApiKey: clearRemoteApiKey ? null : remoteApiKey || undefined,
          maxTokens: settings.maxTokens,
          temperature: settings.temperature,
        }),
      });
      if (!response.ok) throw new Error(await responseMessage(response));
      setSettings((await response.json()) as AiSettingsView);
      setRemoteApiKey("");
      setClearRemoteApiKey(false);
      setNotice("AI configuration saved securely on the server.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "AI configuration could not be saved.");
    } finally {
      setBusy(null);
    }
  }

  async function checkHealth(): Promise<void> {
    setBusy("health");
    setNotice(null);
    try {
      const response = await fetch("/api/ai/health", { cache: "no-store" });
      if (!response.ok) throw new Error(await responseMessage(response));
      setHealth((await response.json()) as AiProviderHealth);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Provider health check failed.");
    } finally {
      setBusy(null);
    }
  }

  async function generate(): Promise<void> {
    setBusy("generate");
    setNotice(null);
    try {
      const response = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          task,
          instruction,
          lessonId: lessonId || undefined,
          conceptId: conceptId || undefined,
          gradeId: gradeId || undefined,
          learnerContext: learnerContext || undefined,
        }),
      });
      if (!response.ok) throw new Error(await responseMessage(response));
      const generation = (await response.json()) as AiGenerationRecord;
      setGenerations((current) => [generation, ...current]);
      setNotice("AI-generated content is ready for review.");
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "AI generation failed; core learning features remain available.",
      );
    } finally {
      setBusy(null);
    }
  }

  async function review(generationId: string, status: "approved" | "rejected"): Promise<void> {
    setBusy("review-" + generationId);
    try {
      const response = await fetch("/api/ai/generations/" + generationId, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) throw new Error(await responseMessage(response));
      const updated = (await response.json()) as AiGenerationRecord;
      setGenerations((current) =>
        current.map((generation) => (generation.id === updated.id ? updated : generation)),
      );
      setNotice("Generation " + status + ". Official content was not changed.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Review could not be saved.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-7">
      <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="eyebrow">Optional, grounded, reviewable</p>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight">AI studio</h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Use local or remote models for explanations, hints, summaries, practice, and planning.
            AI stays off by default and never overwrites official or creator-authored content.
          </p>
        </div>
        <Badge variant={settings.mode === "disabled" ? "outline" : "success"}>
          {settings.mode === "disabled" ? "AI disabled" : settings.mode + " AI enabled"}
        </Badge>
      </section>

      {notice ? (
        <div className="rounded-lg border border-accent/30 bg-accent/10 p-3 text-sm" role="status">
          {notice}
        </div>
      ) : null}

      <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-accent" aria-hidden="true" />
              Configure providers
            </CardTitle>
            <CardDescription>
              API keys are encrypted with the installation secret and are never returned to the
              browser.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <label className="block space-y-2 text-sm font-medium">
              AI mode
              <select
                aria-label="AI mode"
                value={settings.mode}
                disabled={!canManageSettings}
                onChange={(event) =>
                  setSettings({ ...settings, mode: event.target.value as AiProviderMode })
                }
                className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {AI_MODES.map((mode) => (
                  <option key={mode} value={mode}>
                    {mode}
                  </option>
                ))}
              </select>
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-2 text-sm font-medium">
                Local base URL
                <Input
                  value={settings.localBaseUrl}
                  disabled={!canManageSettings}
                  onChange={(event) =>
                    setSettings({ ...settings, localBaseUrl: event.target.value })
                  }
                />
              </label>
              <label className="space-y-2 text-sm font-medium">
                Local model
                <Input
                  value={settings.localModel}
                  disabled={!canManageSettings}
                  onChange={(event) => setSettings({ ...settings, localModel: event.target.value })}
                />
              </label>
              <label className="space-y-2 text-sm font-medium">
                Remote base URL
                <Input
                  value={settings.remoteBaseUrl}
                  disabled={!canManageSettings}
                  onChange={(event) =>
                    setSettings({ ...settings, remoteBaseUrl: event.target.value })
                  }
                />
              </label>
              <label className="space-y-2 text-sm font-medium">
                Remote model
                <Input
                  value={settings.remoteModel}
                  disabled={!canManageSettings}
                  onChange={(event) =>
                    setSettings({ ...settings, remoteModel: event.target.value })
                  }
                />
              </label>
              <label className="space-y-2 text-sm font-medium">
                Remote API key
                <Input
                  type="password"
                  value={remoteApiKey}
                  disabled={!canManageSettings}
                  placeholder={settings.hasRemoteApiKey ? "Stored securely" : "Not configured"}
                  onChange={(event) => setRemoteApiKey(event.target.value)}
                />
                <span className="block text-xs font-normal text-muted-foreground">
                  Leave blank to keep the stored key.
                </span>
              </label>
              <label className="flex items-center gap-2 self-end pb-2 text-sm font-medium">
                <input
                  type="checkbox"
                  checked={clearRemoteApiKey}
                  disabled={!canManageSettings}
                  onChange={(event) => setClearRemoteApiKey(event.target.checked)}
                />
                Clear stored key
              </label>
              <label className="space-y-2 text-sm font-medium">
                Maximum output tokens
                <Input
                  type="number"
                  min={128}
                  max={4096}
                  value={settings.maxTokens}
                  disabled={!canManageSettings}
                  onChange={(event) =>
                    setSettings({ ...settings, maxTokens: Number(event.target.value) })
                  }
                />
              </label>
              <label className="space-y-2 text-sm font-medium">
                Temperature
                <Input
                  type="number"
                  min={0}
                  max={2}
                  step={0.1}
                  value={settings.temperature}
                  disabled={!canManageSettings}
                  onChange={(event) =>
                    setSettings({ ...settings, temperature: Number(event.target.value) })
                  }
                />
              </label>
            </div>
            <div className="flex flex-wrap gap-2">
              {canManageSettings ? (
                <Button type="button" onClick={() => void saveSettings()} disabled={busy !== null}>
                  <Save className="h-4 w-4" aria-hidden="true" />
                  {busy === "settings" ? "Saving…" : "Save AI configuration"}
                </Button>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Application-settings permission is required to change providers.
                </p>
              )}
              <Button
                type="button"
                variant="outline"
                onClick={() => void checkHealth()}
                disabled={busy !== null}
              >
                <RefreshCw className="h-4 w-4" aria-hidden="true" />
                {busy === "health" ? "Checking…" : "Check provider"}
              </Button>
            </div>
            {health ? (
              <div className="rounded-lg border bg-muted/30 p-3 text-sm">
                <div className="flex items-center gap-2 font-medium">
                  {health.available ? (
                    <CheckCircle2 className="h-4 w-4 text-accent" aria-hidden="true" />
                  ) : (
                    <CircleAlert className="h-4 w-4 text-destructive" aria-hidden="true" />
                  )}
                  {health.message}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {health.provider} · {health.model}
                </p>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-accent" aria-hidden="true" />
              Grounded request
            </CardTitle>
            <CardDescription>
              Published lesson and concept identifiers add approved source material. Learner context
              is always marked as untrusted.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <label className="block space-y-2 text-sm font-medium">
              AI task
              <select
                aria-label="AI task"
                value={task}
                onChange={(event) => {
                  const nextTask = event.target.value as AiTask;
                  setTask(nextTask);
                  setInstruction(defaultInstruction[nextTask]);
                }}
                className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {AI_TASKS.map((value) => (
                  <option key={value} value={value}>
                    {taskLabel(value)}
                  </option>
                ))}
              </select>
            </label>
            <label className="block space-y-2 text-sm font-medium">
              Request
              <textarea
                aria-label="AI request"
                rows={4}
                value={instruction}
                onChange={(event) => setInstruction(event.target.value)}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </label>
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="space-y-2 text-sm font-medium">
                Lesson ID
                <Input value={lessonId} onChange={(event) => setLessonId(event.target.value)} />
              </label>
              <label className="space-y-2 text-sm font-medium">
                Concept ID
                <Input value={conceptId} onChange={(event) => setConceptId(event.target.value)} />
              </label>
              <label className="space-y-2 text-sm font-medium">
                Grade ID
                <Input value={gradeId} onChange={(event) => setGradeId(event.target.value)} />
              </label>
            </div>
            <label className="block space-y-2 text-sm font-medium">
              Learner context
              <textarea
                aria-label="Learner context"
                rows={3}
                value={learnerContext}
                onChange={(event) => setLearnerContext(event.target.value)}
                placeholder="Your question, notes, or an answer you want feedback on…"
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </label>
            <Button
              type="button"
              onClick={() => void generate()}
              disabled={busy !== null || settings.mode === "disabled"}
            >
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              {busy === "generate" ? "Generating…" : "Generate labeled content"}
            </Button>
            {settings.mode === "disabled" ? (
              <p className="text-xs text-muted-foreground">
                AI is disabled. Core lessons, practice, search, planning, and analytics continue to
                work without a provider.
              </p>
            ) : null}
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Generated content review</CardTitle>
          <CardDescription>
            Every response is labeled AI-generated and retains the grounding sources used for it.
            Approval is a review record, not an automatic publication.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {generations.length ? (
            <div className="space-y-5">
              {generations.map((generation) => (
                <article key={generation.id} className="rounded-xl border p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold">{taskLabel(generation.task)}</h3>
                        <Badge variant="success">AI-generated</Badge>
                        <Badge variant={statusVariant(generation.status)}>
                          {generation.status}
                        </Badge>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {generation.provider} · {generation.model} ·{" "}
                        {new Date(generation.createdAt).toLocaleString()}
                      </p>
                    </div>
                    {canReview && generation.status === "generated" ? (
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => void review(generation.id, "approved")}
                          disabled={busy !== null}
                        >
                          <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> Approve
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => void review(generation.id, "rejected")}
                          disabled={busy !== null}
                        >
                          <XCircle className="h-4 w-4" aria-hidden="true" /> Reject
                        </Button>
                      </div>
                    ) : null}
                  </div>
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-6">{generation.output}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {generation.grounding.map((source) => (
                      <Badge key={generation.id + "-" + source.label} variant="outline">
                        {source.type}: {source.label}
                      </Badge>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No generated content yet. Configure a provider or keep using Mathios with AI disabled.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
