"use client";

import * as React from "react";
import { Check, Eye, Save, Send, Sparkles, Upload } from "lucide-react";
import { ActionFeedback } from "@/components/shared/action-feedback";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ActionState } from "@/lib/action-state";
import { initialActionState } from "@/lib/action-state";
import type {
  ExerciseSetRecord,
  GeneratedQuestionInstance,
  QuestionDetail,
  QuestionListEntry,
  QuestionTemplateRecord,
} from "@/domain/exercise/types";
import { QUESTION_DIFFICULTIES, QUESTION_TYPES } from "@/domain/exercise/types";
import {
  saveExerciseSetAction,
  saveExerciseSetQuestionAction,
  saveQuestionAction,
  bulkImportQuestionsAction,
  setExerciseSetStatusAction,
  setQuestionStatusAction,
  validationPreviewAction,
} from "@/features/exercises/actions";

type FormAction = (state: ActionState, formData: FormData) => Promise<ActionState>;

function useFeatureForm(action: FormAction) {
  return React.useActionState(action, initialActionState);
}

function Textarea({
  id,
  name,
  defaultValue,
  rows = 5,
  required = false,
  placeholder,
}: {
  id: string;
  name: string;
  defaultValue?: string;
  rows?: number;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <textarea
      id={id}
      name={name}
      defaultValue={defaultValue}
      rows={rows}
      required={required}
      placeholder={placeholder}
      className="flex min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    />
  );
}

function Submit({ pending, label }: { pending: boolean; label: string }) {
  return (
    <Button type="submit" disabled={pending}>
      <Save className="h-4 w-4" aria-hidden="true" /> {pending ? "Saving…" : label}
    </Button>
  );
}

const defaultAnswerSpec: Record<string, unknown> = { expected: "" };

const defaultTemplate = {
  slug: "force-template",
  name: "Force from random mass and acceleration",
  questionType: "numeric-unit",
  promptTemplate: "What force results from {{mass}} kg at {{acceleration}} m/s^2?",
  variables: [
    { name: "mass", label: "Mass", min: 2, max: 10, step: 1 },
    { name: "acceleration", label: "Acceleration", min: 1, max: 5, step: 1 },
  ],
  answerExpression: "mass * acceleration",
  validationSpec: { unit: "N", tolerance: 0 },
  seed: 42,
  isActive: true,
};

export function QuestionForm({
  question,
  subjects,
  grades = [],
}: {
  question?: QuestionDetail | null;
  subjects: readonly { id: string; name: string }[];
  grades?: readonly { id: string; name: string }[];
}) {
  const [state, formAction, pending] = useFeatureForm(saveQuestionAction);
  const version = question?.version;
  return (
    <form action={formAction} className="space-y-5">
      {question ? <input type="hidden" name="id" value={question.question.id} /> : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="question-title">Title</Label>
          <Input
            id="question-title"
            name="title"
            defaultValue={question?.question.title}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="question-slug">Slug</Label>
          <Input id="question-slug" name="slug" defaultValue={question?.question.slug} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="question-subject">Subject</Label>
          <select
            id="question-subject"
            name="subjectId"
            defaultValue={question?.question.subjectId ?? subjects[0]?.id}
            className="field-select"
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
          <Label htmlFor="question-type">Question type</Label>
          <select
            id="question-type"
            name="type"
            defaultValue={question?.question.type ?? "short-answer"}
            className="field-select"
            required
          >
            {QUESTION_TYPES.map((type) => (
              <option key={type} value={type}>
                {type.replaceAll("-", " ")}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="question-difficulty">Difficulty</Label>
          <select
            id="question-difficulty"
            name="difficulty"
            defaultValue={question?.question.difficulty ?? "balanced"}
            className="field-select"
          >
            {QUESTION_DIFFICULTIES.map((difficulty) => (
              <option key={difficulty} value={difficulty}>
                {difficulty}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="question-time">Estimated time (seconds)</Label>
          <Input
            id="question-time"
            name="estimatedTimeSeconds"
            type="number"
            min={0}
            defaultValue={question?.question.estimatedTimeSeconds ?? 120}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="question-grade-min">Minimum grade</Label>
          <select
            id="question-grade-min"
            name="gradeMinId"
            defaultValue={question?.question.gradeMinId ?? ""}
            className="field-select"
          >
            <option value="">Any grade</option>
            {grades.map((grade) => (
              <option key={grade.id} value={grade.id}>
                {grade.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="question-grade-max">Maximum grade</Label>
          <select
            id="question-grade-max"
            name="gradeMaxId"
            defaultValue={question?.question.gradeMaxId ?? ""}
            className="field-select"
          >
            <option value="">Any grade</option>
            {grades.map((grade) => (
              <option key={grade.id} value={grade.id}>
                {grade.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="question-source">Source / attribution</Label>
          <Input
            id="question-source"
            name="source"
            defaultValue={question?.question.source}
            placeholder="Creator, textbook, or local source"
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="question-prompt">Prompt</Label>
          <Textarea
            id="question-prompt"
            name="prompt"
            defaultValue={version?.prompt}
            rows={7}
            required
            placeholder="Write the learner-facing question."
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="question-answer-spec">Answer specification JSON</Label>
          <Textarea
            id="question-answer-spec"
            name="answerSpec"
            defaultValue={JSON.stringify(version?.answerSpec ?? defaultAnswerSpec, null, 2)}
            rows={8}
            required
          />
          <p className="text-xs leading-5 text-muted-foreground">
            Examples: {'{ "expected": 9.8, "tolerance": 0.1 }'} · {'{ "correctOptionKeys": ["b"] }'}{" "}
            · {'{ "acceptedAnswers": ["2*x+2"], "variables": ["x"] }'}.
          </p>
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="question-options">Options JSON</Label>
          <Textarea
            id="question-options"
            name="options"
            defaultValue={JSON.stringify(
              question?.options.map((option) => ({
                id: option.id,
                key: option.key,
                label: option.label,
                sortOrder: option.sortOrder,
                isCorrect: option.isCorrect ?? false,
              })) ?? [],
              null,
              2,
            )}
            rows={6}
            placeholder='[{"key":"a","label":"First","sortOrder":0,"isCorrect":false}]'
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="question-hints">Hints JSON</Label>
          <Textarea
            id="question-hints"
            name="hints"
            defaultValue={JSON.stringify(question?.hints ?? [], null, 2)}
            rows={5}
            placeholder='[{"level":1,"content":"Start with the definition.","sortOrder":0}]'
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="question-solutions">Solutions JSON</Label>
          <Textarea
            id="question-solutions"
            name="solutions"
            defaultValue={JSON.stringify(question?.solutions ?? [], null, 2)}
            rows={5}
            placeholder='[{"title":"Step 1","content":"Show the calculation.","sortOrder":0}]'
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="question-template">Randomized template JSON (optional)</Label>
          <Textarea
            id="question-template"
            name="template"
            defaultValue={JSON.stringify(
              question?.template
                ? {
                    id: question.template.id,
                    slug: question.template.slug,
                    name: question.template.name,
                    questionType: question.template.questionType,
                    promptTemplate: question.template.promptTemplate,
                    variables: question.template.variables,
                    answerExpression: question.template.answerExpression,
                    validationSpec: question.template.validationSpec,
                    seed: question.template.seed,
                    isActive: question.template.isActive,
                  }
                : null,
              null,
              2,
            )}
            rows={10}
            placeholder={JSON.stringify(defaultTemplate, null, 2)}
          />
          <p className="text-xs leading-5 text-muted-foreground">
            Use {"{{variable}}"} in the prompt and a safe math expression for the generated answer.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="question-tags">Tags JSON</Label>
          <Input
            id="question-tags"
            name="tags"
            defaultValue={JSON.stringify(question?.question.tags ?? [])}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="question-status">Publication status</Label>
          <select
            id="question-status"
            name="status"
            defaultValue={question?.question.status ?? "draft"}
            className="field-select"
          >
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </select>
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="question-explanation">Explanation</Label>
          <Textarea
            id="question-explanation"
            name="explanation"
            defaultValue={version?.explanation}
            rows={4}
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="question-full-solution">Full solution</Label>
          <Textarea
            id="question-full-solution"
            name="fullSolution"
            defaultValue={version?.fullSolution}
            rows={6}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="question-common-wrong">Common wrong answers JSON</Label>
          <Textarea
            id="question-common-wrong"
            name="commonWrongAnswers"
            defaultValue={JSON.stringify(version?.commonWrongAnswers ?? [], null, 2)}
            rows={4}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="question-partial-credit">Partial-credit rules JSON</Label>
          <Textarea
            id="question-partial-credit"
            name="partialCreditRules"
            defaultValue={JSON.stringify(version?.partialCreditRules ?? null, null, 2)}
            rows={4}
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="question-error-feedback">Error-specific feedback JSON</Label>
          <Textarea
            id="question-error-feedback"
            name="errorFeedback"
            defaultValue={JSON.stringify(version?.errorFeedback ?? {}, null, 2)}
            rows={4}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="question-concepts">Concept IDs JSON</Label>
          <Textarea
            id="question-concepts"
            name="conceptIds"
            defaultValue={JSON.stringify(question?.conceptIds ?? [], null, 2)}
            rows={3}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="question-objectives">Learning objective IDs JSON</Label>
          <Textarea
            id="question-objectives"
            name="learningObjectiveIds"
            defaultValue={JSON.stringify(question?.learningObjectiveIds ?? [], null, 2)}
            rows={3}
          />
        </div>
      </div>
      <input type="hidden" name="changeSummary" value="Saved from the question editor" />
      <ActionFeedback state={state} />
      <Submit pending={pending} label={question ? "Save question" : "Create question"} />
    </form>
  );
}

export function QuestionStatusForm({ question }: { question: QuestionDetail }) {
  const [state, formAction, pending] = useFeatureForm(setQuestionStatusAction);
  const next = question.question.status === "published" ? "draft" : "published";
  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="id" value={question.question.id} />
      <input type="hidden" name="status" value={next} />
      <Button type="submit" variant="outline" disabled={pending}>
        {next === "published" ? (
          <Send className="h-4 w-4" aria-hidden="true" />
        ) : (
          <Check className="h-4 w-4" aria-hidden="true" />
        )}
        {pending ? "Updating…" : next === "published" ? "Publish question" : "Return to draft"}
      </Button>
      <ActionFeedback state={state} />
    </form>
  );
}

export function ValidationPreviewForm({ question }: { question: QuestionDetail }) {
  const [state, formAction, pending] = useFeatureForm(validationPreviewAction);
  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="type" value={question.question.type} />
      <input type="hidden" name="answerSpec" value={JSON.stringify(question.version.answerSpec)} />
      <div className="space-y-2">
        <Label htmlFor="validation-response">Try a response</Label>
        <Input
          id="validation-response"
          name="response"
          placeholder="Enter a response to test the validator"
        />
      </div>
      <Button type="submit" variant="outline" disabled={pending}>
        <Eye className="h-4 w-4" aria-hidden="true" />{" "}
        {pending ? "Checking…" : "Preview validation"}
      </Button>
      <ActionFeedback state={state} />
    </form>
  );
}

export function TemplatePreviewForm({ template }: { template: QuestionTemplateRecord }) {
  const [instances, setInstances] = React.useState<readonly GeneratedQuestionInstance[]>([]);
  const [busy, setBusy] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);

  async function preview() {
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch("/api/exercises/templates/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId: template.id }),
      });
      const body = await response.json();
      if (!response.ok) {
        setMessage(body.message ?? "The template preview could not be generated.");
      } else {
        setInstances(body.instances ?? []);
      }
    } catch {
      setMessage("The template preview could not be generated.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <Button type="button" variant="outline" onClick={preview} disabled={busy}>
        <Eye className="h-4 w-4" aria-hidden="true" />
        {busy ? "Generating…" : "Preview three seeded instances"}
      </Button>
      {message ? <p className="text-sm text-destructive">{message}</p> : null}
      {instances.length ? (
        <div className="space-y-2">
          {instances.map((instance) => (
            <div key={instance.seed} className="rounded-lg border bg-muted/30 p-3 text-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Seed {instance.seed}
              </p>
              <p className="mt-1">{instance.prompt}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                Expected answer: {String(instance.expectedAnswer)}
              </p>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function BulkQuestionImportForm() {
  const [state, formAction, pending] = useFeatureForm(bulkImportQuestionsAction);
  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="bulk-questions">Question records JSON</Label>
        <Textarea
          id="bulk-questions"
          name="questions"
          rows={24}
          required
          placeholder={'[{"slug":"velocity-check","title":"...","type":"short-answer",...}]'}
        />
        <p className="text-xs leading-5 text-muted-foreground">
          Paste an array using the same fields as the question editor. IDs and author profile IDs
          are generated automatically.
        </p>
      </div>
      <ActionFeedback state={state} />
      <Button type="submit" disabled={pending}>
        <Upload className="h-4 w-4" aria-hidden="true" />
        {pending ? "Importing…" : "Import questions"}
      </Button>
    </form>
  );
}

export function ExerciseSetForm({
  subjects,
  set,
}: {
  subjects: readonly { id: string; name: string }[];
  set?: ExerciseSetRecord;
}) {
  const [state, formAction, pending] = useFeatureForm(saveExerciseSetAction);
  return (
    <form action={formAction} className="space-y-4">
      {set ? <input type="hidden" name="id" value={set.id} /> : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="set-title">Title</Label>
          <Input id="set-title" name="title" defaultValue={set?.title} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="set-slug">Slug</Label>
          <Input id="set-slug" name="slug" defaultValue={set?.slug} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="set-kind">Set kind</Label>
          <select
            id="set-kind"
            name="kind"
            defaultValue={set?.kind ?? "custom"}
            className="field-select"
          >
            <option value="lesson">Lesson exercises</option>
            <option value="module">Module practice</option>
            <option value="concept">Concept practice</option>
            <option value="grade">Grade practice</option>
            <option value="custom">Custom practice</option>
            <option value="randomized">Randomized practice</option>
            <option value="adaptive">Difficulty-adaptive practice</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="set-subject">Subject</Label>
          <select
            id="set-subject"
            name="subjectId"
            defaultValue={set?.subjectId ?? subjects[0]?.id}
            className="field-select"
          >
            <option value="">Any subject</option>
            {subjects.map((subject) => (
              <option key={subject.id} value={subject.id}>
                {subject.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="set-difficulty">Difficulty</Label>
          <select
            id="set-difficulty"
            name="difficulty"
            defaultValue={set?.difficulty ?? "balanced"}
            className="field-select"
          >
            <option value="gentle">Gentle</option>
            <option value="balanced">Balanced</option>
            <option value="challenging">Challenging</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="set-time">Estimated time (seconds)</Label>
          <Input
            id="set-time"
            name="estimatedTimeSeconds"
            type="number"
            min={0}
            defaultValue={set?.estimatedTimeSeconds ?? 600}
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="set-description">Description</Label>
          <Textarea
            id="set-description"
            name="description"
            defaultValue={set?.description}
            rows={3}
          />
        </div>
      </div>
      <input type="hidden" name="gradeId" value={set?.gradeId ?? ""} />
      <input type="hidden" name="status" value={set?.status ?? "draft"} />
      <ActionFeedback state={state} />
      <Submit pending={pending} label={set ? "Save exercise set" : "Create exercise set"} />
    </form>
  );
}

export function AddQuestionToSetForm({
  setId,
  questions,
}: {
  setId: string;
  questions: readonly QuestionListEntry[];
}) {
  const [state, formAction, pending] = useFeatureForm(saveExerciseSetQuestionAction);
  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="exerciseSetId" value={setId} />
      <div className="space-y-2">
        <Label htmlFor="set-question">Question</Label>
        <select id="set-question" name="questionId" className="field-select" required>
          {questions.map((question) => (
            <option key={question.id} value={question.id}>
              {question.title} ({question.type})
            </option>
          ))}
        </select>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="set-question-order">Order</Label>
          <Input id="set-question-order" name="sortOrder" type="number" min={0} defaultValue={0} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="set-question-points">Points</Label>
          <Input
            id="set-question-points"
            name="points"
            type="number"
            min={0.1}
            step={0.1}
            defaultValue={1}
          />
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="isRequired" defaultChecked /> Required question
      </label>
      <ActionFeedback state={state} />
      <Button type="submit" disabled={pending}>
        <Sparkles className="h-4 w-4" aria-hidden="true" /> {pending ? "Adding…" : "Add question"}
      </Button>
    </form>
  );
}

export function ExerciseSetStatusForm({ set }: { set: ExerciseSetRecord }) {
  const [state, formAction, pending] = useFeatureForm(setExerciseSetStatusAction);
  const next = set.status === "published" ? "draft" : "published";
  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="id" value={set.id} />
      <input type="hidden" name="status" value={next} />
      <Button type="submit" variant="outline" disabled={pending}>
        {pending ? "Updating…" : next === "published" ? "Publish set" : "Return to draft"}
      </Button>
      <ActionFeedback state={state} />
    </form>
  );
}
