"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BookOpen, FileText, LoaderCircle, Save, Upload } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CourseCatalogEntry } from "@/domain/course/types";
import type { GradeRecord, SubjectRecord } from "@/domain/curriculum/types";

interface ImportRecord {
  id: string;
  title: string;
  originalFilename: string;
  status: "queued" | "extracting" | "segmenting" | "ready" | "failed";
  pageCount: number | null;
  totalUnits: number;
  processedUnits: number;
  draftCount: number;
  savedCount: number;
  error: string | null;
  lessonSize: "small" | "standard" | "deep";
}

interface Props {
  subjects: readonly SubjectRecord[];
  grades: readonly GradeRecord[];
  courses: readonly CourseCatalogEntry[];
  aiEnabled: boolean;
}

export function SourceBookImportPanel({ subjects, grades, courses, aiEnabled }: Props) {
  const [imports, setImports] = useState<ImportRecord[]>([]);
  const [subjectId, setSubjectId] = useState(subjects[0]?.id ?? "");
  const [gradeId, setGradeId] = useState(grades[0]?.id ?? "");
  const [difficulty, setDifficulty] = useState("balanced");
  const [lessonSize, setLessonSize] = useState("standard");
  const [destinationCourseId, setDestinationCourseId] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    void refreshImports();
  }, []);

  async function refreshImports(): Promise<void> {
    const response = await fetch("/api/content-studio/imports", { cache: "no-store" });
    if (!response.ok) return;
    const body = (await response.json()) as { imports: ImportRecord[] };
    setImports(body.imports);
  }

  function replaceImport(record: ImportRecord): void {
    setImports((current) => [record, ...current.filter((item) => item.id !== record.id)]);
  }

  async function uploadBook(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    form.set("subjectId", subjectId);
    form.set("gradeId", gradeId);
    form.set("difficulty", difficulty);
    form.set("lessonSize", lessonSize);
    setBusy("upload");
    setNotice(null);
    try {
      const response = await fetch("/api/content-studio/imports", { method: "POST", body: form });
      if (!response.ok) throw new Error(await responseMessage(response));
      const record = (await response.json()) as ImportRecord;
      replaceImport(record);
      setNotice("PDF stored safely. Text extraction has started.");
      await processImport(record.id, aiEnabled ? 50 : 1);
      formElement.reset();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "The PDF could not be uploaded.");
    } finally {
      setBusy(null);
    }
  }

  async function processImport(jobId: string, maxSteps = 50): Promise<void> {
    setBusy(`process:${jobId}`);
    setNotice(null);
    try {
      for (let step = 0; step < maxSteps; step += 1) {
        const response = await fetch(`/api/content-studio/imports/${jobId}/process`, {
          method: "POST",
        });
        if (!response.ok) throw new Error(await responseMessage(response));
        const record = (await response.json()) as ImportRecord;
        replaceImport(record);
        if (record.status === "ready") {
          setNotice(`${record.draftCount} cited lesson drafts are ready for review.`);
          return;
        }
        if (record.status === "extracting") return;
        if (record.status === "segmenting" && !aiEnabled) {
          setNotice("Text extraction is complete. Enable AI to create level-aware lesson drafts.");
          return;
        }
      }
      setNotice("Progress saved. Continue generation to process the remaining sections.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Source processing could not continue.");
    } finally {
      setBusy(null);
    }
  }

  async function saveDrafts(record: ImportRecord): Promise<void> {
    setBusy(`save:${record.id}`);
    setNotice(null);
    let courseId = destinationCourseId || null;
    try {
      for (let step = record.savedCount; step < record.draftCount; step += 1) {
        const response = await fetch(`/api/content-studio/imports/${record.id}/save`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            courseId,
            courseTitle: courseId ? record.title : `${record.title} learning path`,
          }),
        });
        if (!response.ok) throw new Error(await responseMessage(response));
        const body = (await response.json()) as {
          done: boolean;
          courseId: string;
          record: ImportRecord;
        };
        courseId = body.courseId;
        replaceImport(body.record);
        if (body.done) break;
      }
      setDestinationCourseId(courseId ?? "");
      setNotice("Draft lessons saved with source page citations. Review them before publishing.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "The source drafts could not be saved.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-accent" aria-hidden="true" />
              Build lessons from a source book
            </CardTitle>
            <CardDescription className="mt-2 max-w-3xl">
              Upload a PDF, preserve its page references, and split it into small or deep lessons
              suited to the learner level. Generated material stays in draft until you save it.
            </CardDescription>
          </div>
          <Badge variant="outline">PDF to cited drafts</Badge>
        </div>
      </CardHeader>
      <CardContent className="grid gap-6 xl:grid-cols-[0.82fr_1.18fr]">
        <form
          className="space-y-4 rounded-xl border bg-muted/20 p-4"
          onSubmit={(event) => void uploadBook(event)}
        >
          <div className="space-y-2">
            <Label htmlFor="source-book-title">Book title</Label>
            <Input
              id="source-book-title"
              name="title"
              placeholder="Physics for secondary learners"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="source-book-file">PDF file</Label>
            <Input
              id="source-book-file"
              name="file"
              type="file"
              accept="application/pdf,.pdf"
              required
            />
            <p className="text-xs text-muted-foreground">
              Text PDFs up to 25 MB. Scanned books need OCR first.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField
              label="Subject"
              value={subjectId}
              onChange={setSubjectId}
              options={subjects.map((subject) => ({ value: subject.id, label: subject.name }))}
            />
            <SelectField
              label="Learner level"
              value={gradeId}
              onChange={setGradeId}
              options={grades.map((grade) => ({ value: grade.id, label: grade.name }))}
            />
            <SelectField
              label="Difficulty"
              value={difficulty}
              onChange={setDifficulty}
              options={[
                { value: "gentle", label: "Gentle" },
                { value: "balanced", label: "Balanced" },
                { value: "challenging", label: "Challenging" },
              ]}
            />
            <SelectField
              label="Lesson size"
              value={lessonSize}
              onChange={setLessonSize}
              options={[
                { value: "small", label: "Small, 5 to 10 min" },
                { value: "standard", label: "Standard, 12 to 20 min" },
                { value: "deep", label: "Deep, 25 to 40 min" },
              ]}
            />
          </div>
          <input type="hidden" name="rightsStatus" value="unknown" />
          <Button type="submit" disabled={busy !== null || !subjectId || !gradeId}>
            {busy === "upload" ? (
              <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Upload className="h-4 w-4" aria-hidden="true" />
            )}
            {busy === "upload" ? "Uploading and extracting..." : "Upload source book"}
          </Button>
          {!aiEnabled ? (
            <p className="text-xs leading-5 text-muted-foreground">
              PDF extraction works now. Lesson generation waits until a provider is enabled in{" "}
              <Link href="/ai" className="font-medium text-accent hover:underline">
                AI studio
              </Link>
              .
            </p>
          ) : null}
        </form>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="source-destination">Save completed drafts into</Label>
            <select
              id="source-destination"
              value={destinationCourseId}
              onChange={(event) => setDestinationCourseId(event.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">Create a draft course for the book</option>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  Add to {course.title} ({course.status})
                </option>
              ))}
            </select>
          </div>
          {notice ? (
            <div
              className="rounded-lg border border-accent/30 bg-accent/10 p-3 text-sm"
              role="status"
            >
              {notice}
            </div>
          ) : null}
          {imports.length ? (
            <div className="space-y-3">
              {imports.map((record) => {
                const progress = record.totalUnits
                  ? Math.round((record.processedUnits / record.totalUnits) * 100)
                  : 0;
                const isProcessing = busy === `process:${record.id}`;
                return (
                  <article key={record.id} className="rounded-xl border p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{record.title}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {record.originalFilename}
                          {record.pageCount ? ` · ${record.pageCount} pages` : ""} ·{" "}
                          {record.lessonSize} lessons
                        </p>
                      </div>
                      <StatusBadge status={record.status} />
                    </div>
                    <div
                      className="mt-4 h-1.5 overflow-hidden rounded-full bg-muted"
                      aria-label={`${progress}% processed`}
                    >
                      <div
                        className="h-full rounded-full bg-accent transition-[width]"
                        style={{ width: `${record.status === "ready" ? 100 : progress}%` }}
                      />
                    </div>
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
                      <span>
                        {record.processedUnits} of {record.totalUnits || "pending"} sections ·{" "}
                        {record.draftCount} drafts · {record.savedCount} saved
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {record.status === "queued" ||
                        record.status === "failed" ||
                        record.status === "segmenting" ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={
                              busy !== null || (record.status === "segmenting" && !aiEnabled)
                            }
                            onClick={() => void processImport(record.id)}
                          >
                            {isProcessing ? (
                              <LoaderCircle
                                className="h-3.5 w-3.5 animate-spin"
                                aria-hidden="true"
                              />
                            ) : (
                              <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                            )}
                            {isProcessing
                              ? "Processing..."
                              : record.status === "segmenting"
                                ? "Continue generation"
                                : "Process PDF"}
                          </Button>
                        ) : null}
                        {record.status === "ready" && record.savedCount < record.draftCount ? (
                          <Button
                            type="button"
                            size="sm"
                            disabled={busy !== null}
                            onClick={() => void saveDrafts(record)}
                          >
                            <Save className="h-3.5 w-3.5" aria-hidden="true" />
                            Save cited drafts
                          </Button>
                        ) : null}
                      </div>
                    </div>
                    {record.error ? (
                      <p className="mt-3 text-xs text-destructive" role="alert">
                        {record.error}
                      </p>
                    ) : null}
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="flex min-h-52 flex-col items-center justify-center rounded-xl border border-dashed px-6 text-center">
              <FileText className="h-7 w-7 text-muted-foreground" aria-hidden="true" />
              <p className="mt-3 font-medium">No source books imported yet.</p>
              <p className="mt-1 max-w-md text-sm text-muted-foreground">
                The first upload will appear here with extraction and lesson progress.
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly { value: string; label: string }[];
}) {
  const id = `source-${label.toLowerCase().replaceAll(" ", "-")}`;
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function StatusBadge({ status }: { status: ImportRecord["status"] }) {
  const label = {
    queued: "Queued",
    extracting: "Extracting text",
    segmenting: "Generating lessons",
    ready: "Drafts ready",
    failed: "Needs attention",
  }[status];
  return (
    <Badge variant={status === "ready" ? "success" : status === "failed" ? "warning" : "outline"}>
      {label}
    </Badge>
  );
}

async function responseMessage(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { message?: string };
    return body.message ?? `Request failed (${response.status}).`;
  } catch {
    return `Request failed (${response.status}).`;
  }
}
