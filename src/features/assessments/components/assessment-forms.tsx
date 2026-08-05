"use client";

import * as React from "react";
import { Plus, Save, Send } from "lucide-react";
import { ActionFeedback } from "@/components/shared/action-feedback";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ActionState } from "@/lib/action-state";
import { initialActionState } from "@/lib/action-state";
import {
  saveAssessmentAction,
  saveAssessmentPoolAction,
  saveAssessmentQuestionAction,
  saveAssessmentSectionAction,
  setAssessmentStatusAction,
} from "@/features/assessments/actions";
import {
  ASSESSMENT_FEEDBACK_VISIBILITIES,
  ASSESSMENT_QUESTION_ORDERINGS,
  ASSESSMENT_RETAKE_RULES,
  ASSESSMENT_REVIEW_MODES,
  ASSESSMENT_TYPES,
  type AssessmentDetail,
  type AssessmentPoolRecord,
  type AssessmentRecord,
  type AssessmentSectionRecord,
} from "@/domain/assessment/types";
import type { QuestionListEntry } from "@/domain/exercise/types";

type FormAction = (state: ActionState, formData: FormData) => Promise<ActionState>;

function useFeatureForm(action: FormAction) {
  return React.useActionState(action, initialActionState);
}

function Textarea({
  id,
  name,
  defaultValue,
  rows = 4,
  placeholder,
}: {
  id: string;
  name: string;
  defaultValue?: string;
  rows?: number;
  placeholder?: string;
}) {
  return (
    <textarea
      id={id}
      name={name}
      defaultValue={defaultValue}
      rows={rows}
      placeholder={placeholder}
      className="flex min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    />
  );
}

function Select({
  id,
  name,
  defaultValue,
  children,
}: {
  id: string;
  name: string;
  defaultValue?: string;
  children: React.ReactNode;
}) {
  return (
    <select id={id} name={name} defaultValue={defaultValue} className="field-select">
      {children}
    </select>
  );
}

export function AssessmentForm({
  assessment,
  subjects,
  grades,
}: {
  assessment?: AssessmentRecord | null;
  subjects: readonly { id: string; name: string }[];
  grades: readonly { id: string; name: string }[];
}) {
  const [state, formAction, pending] = useFeatureForm(saveAssessmentAction);
  return (
    <form action={formAction} className="space-y-5">
      {assessment ? <input type="hidden" name="id" value={assessment.id} /> : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="assessment-title">Title</Label>
          <Input id="assessment-title" name="title" defaultValue={assessment?.title} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="assessment-slug">Slug</Label>
          <Input id="assessment-slug" name="slug" defaultValue={assessment?.slug} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="assessment-type">Assessment type</Label>
          <Select id="assessment-type" name="type" defaultValue={assessment?.type ?? "module-quiz"}>
            {ASSESSMENT_TYPES.map((type) => (
              <option key={type} value={type}>
                {type.replaceAll("-", " ")}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="assessment-status">Status</Label>
          <Select id="assessment-status" name="status" defaultValue={assessment?.status ?? "draft"}>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="assessment-subject">Subject</Label>
          <Select
            id="assessment-subject"
            name="subjectId"
            defaultValue={assessment?.subjectId ?? ""}
          >
            <option value="">Any subject</option>
            {subjects.map((subject) => (
              <option key={subject.id} value={subject.id}>
                {subject.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="assessment-grade">Grade</Label>
          <Select id="assessment-grade" name="gradeId" defaultValue={assessment?.gradeId ?? ""}>
            <option value="">Any grade</option>
            {grades.map((grade) => (
              <option key={grade.id} value={grade.id}>
                {grade.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="assessment-time">Time limit (seconds)</Label>
          <Input
            id="assessment-time"
            name="timeLimitSeconds"
            type="number"
            min={1}
            defaultValue={assessment?.timeLimitSeconds ?? ""}
            placeholder="Blank for untimed"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="assessment-attempts">Attempt limit</Label>
          <Input
            id="assessment-attempts"
            name="attemptLimit"
            type="number"
            min={1}
            defaultValue={assessment?.attemptLimit ?? ""}
            placeholder="Blank for unlimited"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="assessment-pass">Passing threshold (0–1)</Label>
          <Input
            id="assessment-pass"
            name="passingThreshold"
            type="number"
            min={0}
            max={1}
            step={0.05}
            defaultValue={assessment?.passingThreshold ?? 0.6}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="assessment-feedback">Feedback visibility</Label>
          <Select
            id="assessment-feedback"
            name="feedbackVisibility"
            defaultValue={assessment?.feedbackVisibility ?? "after-submit"}
          >
            {ASSESSMENT_FEEDBACK_VISIBILITIES.map((value) => (
              <option key={value} value={value}>
                {value.replaceAll("-", " ")}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="assessment-review">Review mode</Label>
          <Select
            id="assessment-review"
            name="reviewMode"
            defaultValue={assessment?.reviewMode ?? "full"}
          >
            {ASSESSMENT_REVIEW_MODES.map((value) => (
              <option key={value} value={value}>
                {value.replaceAll("-", " ")}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="assessment-retake">Retake rule</Label>
          <Select
            id="assessment-retake"
            name="retakeRule"
            defaultValue={assessment?.retakeRule ?? "after-failure"}
          >
            {ASSESSMENT_RETAKE_RULES.map((value) => (
              <option key={value} value={value}>
                {value.replaceAll("-", " ")}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="assessment-order">Question ordering</Label>
          <Select
            id="assessment-order"
            name="questionOrdering"
            defaultValue={assessment?.questionOrdering ?? "fixed"}
          >
            {ASSESSMENT_QUESTION_ORDERINGS.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </Select>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="assessment-description">Description</Label>
        <Textarea
          id="assessment-description"
          name="description"
          defaultValue={assessment?.description}
          rows={3}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="assessment-config">Diagnostic/placement configuration JSON</Label>
        <Textarea
          id="assessment-config"
          name="configuration"
          defaultValue={JSON.stringify(
            assessment?.configuration ?? {
              gradeBands: [
                {
                  gradeId: grades[0]?.id ?? "",
                  label: grades[0]?.name ?? "Starting level",
                  minPercentage: 0.6,
                },
              ],
            },
            null,
            2,
          )}
          rows={6}
          placeholder={
            '{"gradeBands":[{"gradeId":"grade-8","label":"Grade 8","minPercentage":0.6}]}'
          }
        />
        <p className="text-xs text-muted-foreground">
          Use gradeBands for explainable diagnostic and placement thresholds.
        </p>
      </div>
      <div className="flex flex-wrap gap-5 text-sm">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            name="partialCredit"
            defaultChecked={assessment?.partialCredit ?? true}
          />{" "}
          Allow partial credit
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            name="autoSubmit"
            defaultChecked={assessment?.autoSubmit ?? false}
          />{" "}
          Auto-submit at time limit
        </label>
      </div>
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          <Save className="h-4 w-4" aria-hidden="true" />{" "}
          {pending ? "Saving…" : assessment ? "Save assessment" : "Create assessment"}
        </Button>
        <ActionFeedback state={state} />
      </div>
    </form>
  );
}

export function AssessmentStatusForm({ assessment }: { assessment: AssessmentRecord }) {
  const [state, formAction, pending] = useFeatureForm(setAssessmentStatusAction);
  const next = assessment.status === "published" ? "archived" : "published";
  return (
    <form action={formAction} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="id" value={assessment.id} />
      <input type="hidden" name="status" value={next} />
      <Badge variant={assessment.status === "published" ? "success" : "warning"}>
        {assessment.status}
      </Badge>
      <Button type="submit" variant="outline" size="sm" disabled={pending}>
        {next === "published" ? (
          <>
            <Send className="h-3.5 w-3.5" aria-hidden="true" /> Publish
          </>
        ) : (
          "Archive"
        )}
      </Button>
      <ActionFeedback state={state} />
    </form>
  );
}

export function AssessmentSectionForm({
  assessmentId,
  section,
}: {
  assessmentId: string;
  section?: AssessmentSectionRecord;
}) {
  const [state, formAction, pending] = useFeatureForm(saveAssessmentSectionAction);
  return (
    <form action={formAction} className="space-y-3 rounded-lg border p-4">
      <input type="hidden" name="assessmentId" value={assessmentId} />
      {section ? <input type="hidden" name="id" value={section.id} /> : null}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor={`section-title-${section?.id ?? "new"}`}>Section title</Label>
          <Input
            id={`section-title-${section?.id ?? "new"}`}
            name="title"
            defaultValue={section?.title}
            required
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`section-order-${section?.id ?? "new"}`}>Order</Label>
          <Input
            id={`section-order-${section?.id ?? "new"}`}
            name="sortOrder"
            type="number"
            defaultValue={section?.sortOrder ?? 0}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`section-points-${section?.id ?? "new"}`}>Points</Label>
          <Input
            id={`section-points-${section?.id ?? "new"}`}
            name="points"
            type="number"
            min={1}
            step={0.5}
            defaultValue={section?.points ?? 1}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`section-time-${section?.id ?? "new"}`}>Time limit (seconds)</Label>
          <Input
            id={`section-time-${section?.id ?? "new"}`}
            name="timeLimitSeconds"
            type="number"
            min={1}
            defaultValue={section?.timeLimitSeconds ?? ""}
          />
        </div>
      </div>
      <div className="space-y-1">
        <Label htmlFor={`section-description-${section?.id ?? "new"}`}>Description</Label>
        <Textarea
          id={`section-description-${section?.id ?? "new"}`}
          name="description"
          defaultValue={section?.description}
          rows={2}
        />
      </div>
      <input type="hidden" name="questionOrdering" value={section?.questionOrdering ?? "fixed"} />
      <div className="flex items-center gap-3">
        <Button type="submit" size="sm" disabled={pending}>
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
          {section ? "Save section" : "Add section"}
        </Button>
        <ActionFeedback state={state} />
      </div>
    </form>
  );
}

export function AssessmentPoolForm({
  assessmentId,
  sectionId,
  pool,
}: {
  assessmentId: string;
  sectionId: string;
  pool?: AssessmentPoolRecord;
}) {
  const [state, formAction, pending] = useFeatureForm(saveAssessmentPoolAction);
  return (
    <form action={formAction} className="space-y-3 rounded-lg border border-dashed p-4">
      <input type="hidden" name="assessmentId" value={assessmentId} />
      <input type="hidden" name="sectionId" value={sectionId} />
      {pool ? <input type="hidden" name="id" value={pool.id} /> : null}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor={`pool-title-${pool?.id ?? sectionId}`}>Pool title</Label>
          <Input
            id={`pool-title-${pool?.id ?? sectionId}`}
            name="title"
            defaultValue={pool?.title}
            required
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`pool-count-${pool?.id ?? sectionId}`}>Questions to select</Label>
          <Input
            id={`pool-count-${pool?.id ?? sectionId}`}
            name="selectionCount"
            type="number"
            min={1}
            defaultValue={pool?.selectionCount ?? 1}
          />
        </div>
      </div>
      <div className="space-y-1">
        <Label htmlFor={`pool-difficulty-${pool?.id ?? sectionId}`}>
          Difficulty distribution JSON
        </Label>
        <Textarea
          id={`pool-difficulty-${pool?.id ?? sectionId}`}
          name="difficultyDistribution"
          defaultValue={JSON.stringify(pool?.difficultyDistribution ?? {}, null, 2)}
          rows={2}
          placeholder={'{"gentle":1,"challenging":1}'}
        />
      </div>
      <input type="hidden" name="conceptIds" value={JSON.stringify(pool?.conceptIds ?? [])} />
      <input type="hidden" name="questionOrdering" value={pool?.questionOrdering ?? "randomized"} />
      <div className="flex items-center gap-3">
        <Button type="submit" size="sm" variant="outline" disabled={pending}>
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
          {pool ? "Save pool" : "Add pool"}
        </Button>
        <ActionFeedback state={state} />
      </div>
    </form>
  );
}

export function AssessmentQuestionForm({
  detail,
  questions,
}: {
  detail: AssessmentDetail;
  questions: readonly QuestionListEntry[];
}) {
  const [state, formAction, pending] = useFeatureForm(saveAssessmentQuestionAction);
  const firstSection = detail.sections[0]?.section.id ?? "";
  return (
    <form action={formAction} className="space-y-3 rounded-lg border p-4">
      <input type="hidden" name="assessmentId" value={detail.assessment.id} />
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1 sm:col-span-2">
          <Label htmlFor="assessment-question-question">Question</Label>
          <select
            id="assessment-question-question"
            name="questionId"
            className="field-select"
            required
          >
            {questions
              .filter((question) => question.status !== "archived")
              .map((question) => (
                <option key={question.id} value={question.id}>
                  {question.title} · {question.type}
                </option>
              ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="assessment-question-section">Section</Label>
          <select
            id="assessment-question-section"
            name="sectionId"
            className="field-select"
            defaultValue={firstSection}
            required
          >
            {detail.sections.map(({ section }) => (
              <option key={section.id} value={section.id}>
                {section.title}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="assessment-question-pool">Pool (optional)</Label>
          <select
            id="assessment-question-pool"
            name="poolId"
            className="field-select"
            defaultValue=""
          >
            <option value="">Fixed question</option>
            {detail.sections
              .flatMap(({ pools }) => pools)
              .map((pool) => (
                <option key={pool.id} value={pool.id}>
                  {pool.title}
                </option>
              ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="assessment-question-points">Points</Label>
          <Input
            id="assessment-question-points"
            name="points"
            type="number"
            min={0.1}
            step={0.1}
            defaultValue={1}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="assessment-question-order">Order</Label>
          <Input
            id="assessment-question-order"
            name="sortOrder"
            type="number"
            min={0}
            defaultValue={0}
          />
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="isRequired" defaultChecked /> Required question
      </label>
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          <Plus className="h-4 w-4" aria-hidden="true" /> Add question
        </Button>
        <ActionFeedback state={state} />
      </div>
    </form>
  );
}

export function AssessmentOverview({ detail }: { detail: AssessmentDetail }) {
  return (
    <div className="space-y-4">
      {detail.sections.map(({ section, pools, questions }) => (
        <Card key={section.id}>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle>{section.title}</CardTitle>
                <CardDescription>{section.description || "Section content"}</CardDescription>
              </div>
              <Badge variant="outline">{questions.length} configured</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {pools.map((pool) => (
              <div key={pool.id} className="rounded-lg border border-dashed p-3">
                <p className="font-medium">{pool.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Select {pool.selectionCount} · {JSON.stringify(pool.difficultyDistribution)}
                </p>
              </div>
            ))}
            {questions.map((question) => (
              <div
                key={question.id}
                className="flex items-center justify-between gap-3 rounded-lg border p-3 text-sm"
              >
                <div>
                  <p className="font-medium">{question.question.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {question.question.type.replaceAll("-", " ")} · {question.points} points
                    {question.poolId ? " · pooled" : " · fixed"}
                  </p>
                </div>
                <Badge variant="outline">{question.question.difficulty}</Badge>
              </div>
            ))}
            {!questions.length ? (
              <p className="text-sm text-muted-foreground">No questions configured yet.</p>
            ) : null}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
