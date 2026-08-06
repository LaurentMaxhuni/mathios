"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, FilePlus2, Save, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CourseCatalogEntry } from "@/domain/course/types";
import type { GradeRecord, SubjectRecord } from "@/domain/curriculum/types";
import type { GeneratedLessonBlock, LessonDraft } from "@/features/content-studio/schemas";

interface Props {
  subjects: readonly SubjectRecord[];
  grades: readonly GradeRecord[];
  courses: readonly CourseCatalogEntry[];
  aiEnabled: boolean;
}

interface SavedDraftResponse {
  courseId: string;
  moduleId: string;
  lessonId: string;
  createdCourse: boolean;
}

async function responseMessage(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { message?: string };
    return body.message ?? `Request failed (${response.status}).`;
  } catch {
    return `Request failed (${response.status}).`;
  }
}

export function ContentStudioWorkspace({ subjects, grades, courses, aiEnabled }: Props) {
  const [courseTitle, setCourseTitle] = useState("");
  const [topic, setTopic] = useState("");
  const [subjectId, setSubjectId] = useState(subjects[0]?.id ?? "");
  const [gradeId, setGradeId] = useState(grades[0]?.id ?? "");
  const [difficulty, setDifficulty] = useState<"gentle" | "balanced" | "challenging">("balanced");
  const [learningObjectives, setLearningObjectives] = useState("");
  const [destinationCourseId, setDestinationCourseId] = useState("");
  const [generationId, setGenerationId] = useState<string | null>(null);
  const [draft, setDraft] = useState<LessonDraft | null>(null);
  const [saved, setSaved] = useState<SavedDraftResponse | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const canGenerate = Boolean(aiEnabled && topic.trim() && subjectId && gradeId);

  async function generate(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setBusy("generate");
    setNotice(null);
    setSaved(null);
    try {
      const response = await fetch("/api/content-studio/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseTitle: courseTitle || undefined,
          topic,
          subjectId,
          gradeId,
          difficulty,
          learningObjectives,
        }),
      });
      if (!response.ok) throw new Error(await responseMessage(response));
      const body = (await response.json()) as { generationId: string; draft: LessonDraft };
      setGenerationId(body.generationId);
      setDraft(body.draft);
      setNotice("Draft generated. Review it before saving it to the course library.");
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "The lesson draft could not be generated.",
      );
    } finally {
      setBusy(null);
    }
  }

  async function saveDraft(): Promise<void> {
    if (!draft || !generationId) return;
    setBusy("save");
    setNotice(null);
    try {
      const response = await fetch("/api/content-studio/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          generationId,
          courseId: destinationCourseId || null,
          courseTitle: courseTitle || undefined,
          subjectId,
          gradeId,
          difficulty,
          draft,
        }),
      });
      if (!response.ok) throw new Error(await responseMessage(response));
      setSaved((await response.json()) as SavedDraftResponse);
      setNotice("Draft saved. Review the course and lesson before publishing.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "The lesson draft could not be saved.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-7">
      <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="eyebrow">Authoring · human review required</p>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight">Content studio</h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Turn a topic into a structured lesson starter, then inspect it in the existing course
            editor. AI can draft the material; an author still decides what belongs in the library.
          </p>
        </div>
        <Badge variant={aiEnabled ? "success" : "outline"}>
          {aiEnabled ? "AI provider ready" : "AI disabled"}
        </Badge>
      </section>

      {notice ? (
        <div className="rounded-lg border border-accent/30 bg-accent/10 p-3 text-sm" role="status">
          {notice}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-accent" aria-hidden="true" />
              1. Describe the lesson
            </CardTitle>
            <CardDescription>
              Choose the destination context and give the model an author brief. The output is
              bounded to supported Mathios lesson blocks.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={(event) => void generate(event)}>
              <div className="space-y-2">
                <Label htmlFor="content-course-title">Course title</Label>
                <Input
                  id="content-course-title"
                  value={courseTitle}
                  onChange={(event) => setCourseTitle(event.target.value)}
                  placeholder="For a new course, e.g. Foundations of algebra"
                />
                <p className="text-xs text-muted-foreground">
                  Leave this as a working title when adding the lesson to an existing course.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="content-topic">Topic or author brief</Label>
                <textarea
                  id="content-topic"
                  value={topic}
                  onChange={(event) => setTopic(event.target.value)}
                  placeholder="Explain what the learner should understand, for example: how slope describes a constant rate of change."
                  required
                  rows={4}
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="content-subject">Subject</Label>
                  <select
                    id="content-subject"
                    value={subjectId}
                    onChange={(event) => setSubjectId(event.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    required
                  >
                    {subjects.map((subject) => (
                      <option key={subject.id} value={subject.id}>
                        {subject.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="content-grade">Grade or level</Label>
                  <select
                    id="content-grade"
                    value={gradeId}
                    onChange={(event) => setGradeId(event.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    required
                  >
                    {grades.map((grade) => (
                      <option key={grade.id} value={grade.id}>
                        {grade.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="content-difficulty">Difficulty</Label>
                <select
                  id="content-difficulty"
                  value={difficulty}
                  onChange={(event) =>
                    setDifficulty(event.target.value as "gentle" | "balanced" | "challenging")
                  }
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="gentle">Gentle</option>
                  <option value="balanced">Balanced</option>
                  <option value="challenging">Challenging</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="content-objectives">Learning objectives or author notes</Label>
                <textarea
                  id="content-objectives"
                  value={learningObjectives}
                  onChange={(event) => setLearningObjectives(event.target.value)}
                  placeholder="Optional: name the prerequisite, misconception, application, or assessment target."
                  rows={4}
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="content-destination">Save into</Label>
                <select
                  id="content-destination"
                  value={destinationCourseId}
                  onChange={(event) => setDestinationCourseId(event.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">Create a new draft course</option>
                  {courses.map((course) => (
                    <option key={course.id} value={course.id}>
                      Add to {course.title} ({course.status})
                    </option>
                  ))}
                </select>
              </div>

              <Button type="submit" disabled={!canGenerate || busy !== null}>
                <Sparkles className="h-4 w-4" aria-hidden="true" />
                {busy === "generate" ? "Generating…" : "Generate lesson draft"}
              </Button>
              {!aiEnabled ? (
                <p className="text-xs text-muted-foreground">
                  AI is disabled. Enable a local Ollama-compatible model or a remote provider in{" "}
                  <Link href={"/ai" as never} className="font-medium text-accent hover:underline">
                    AI studio
                  </Link>
                  .
                </p>
              ) : null}
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FilePlus2 className="h-5 w-5 text-accent" aria-hidden="true" />
              2. Review and save as draft
            </CardTitle>
            <CardDescription>
              Nothing is published automatically. Saving creates draft course records and keeps the
              AI generation labeled for later review.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {draft ? (
              <div className="space-y-5">
                <div className="rounded-xl border bg-muted/30 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="success">AI-generated draft</Badge>
                    <Badge variant="outline">{draft.estimatedDurationMinutes} min</Badge>
                  </div>
                  <h2 className="mt-3 text-2xl font-semibold">{draft.lessonTitle}</h2>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {draft.lessonSummary}
                  </p>
                </div>

                <div className="space-y-3">
                  {draft.sections.map((section, sectionIndex) => (
                    <article
                      key={`${section.title}-${sectionIndex}`}
                      className="rounded-xl border p-4"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline">{section.kind}</Badge>
                        <h3 className="font-semibold">{section.title}</h3>
                      </div>
                      {section.description ? (
                        <p className="mt-2 text-sm text-muted-foreground">{section.description}</p>
                      ) : null}
                      <div className="mt-3 space-y-2">
                        {section.blocks.map((block, blockIndex) => (
                          <div
                            key={`${block.type}-${blockIndex}`}
                            className="rounded-lg bg-muted/50 px-3 py-2 text-sm"
                          >
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">{block.type}</Badge>
                              {block.title ? (
                                <span className="font-medium">{block.title}</span>
                              ) : null}
                            </div>
                            <p className="mt-1 line-clamp-3 text-muted-foreground">
                              {blockSummary(block)}
                            </p>
                          </div>
                        ))}
                      </div>
                    </article>
                  ))}
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <Button type="button" onClick={() => void saveDraft()} disabled={busy !== null}>
                    <Save className="h-4 w-4" aria-hidden="true" />
                    {busy === "save" ? "Saving…" : "Save as draft"}
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    Review in the lesson editor before publishing.
                  </span>
                </div>

                {saved ? (
                  <div className="rounded-xl border border-accent/30 bg-accent/10 p-4 text-sm">
                    <p className="font-medium">Draft is in the library.</p>
                    <div className="mt-3 flex flex-wrap gap-3">
                      <Link
                        href={`/courses/${saved.courseId}/edit`}
                        className="inline-flex items-center gap-1 font-medium text-accent hover:underline"
                      >
                        Open course editor <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                      </Link>
                      <Link
                        href={`/lessons/${saved.lessonId}/edit`}
                        className="inline-flex items-center gap-1 font-medium text-accent hover:underline"
                      >
                        Open lesson editor <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                      </Link>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="flex min-h-80 flex-col items-center justify-center rounded-xl border border-dashed px-6 text-center">
                <Sparkles className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
                <p className="mt-4 font-medium">Your lesson draft will appear here.</p>
                <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                  Generate a starter, inspect the sections and blocks, then decide whether it earns
                  a place in the provided learning library.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function blockSummary(block: GeneratedLessonBlock): string {
  if (block.type === "formula") return block.latex ?? "Formula";
  if (block.type === "definition") return block.definition ?? "Definition";
  if (block.type === "example") return block.prompt ?? "Worked example";
  if (block.type === "common-mistake") return block.correction ?? "Correction";
  return block.text ?? block.markdown ?? "Content block";
}
