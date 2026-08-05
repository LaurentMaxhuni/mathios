"use client";

import * as React from "react";
import { Archive, ArchiveRestore, Save } from "lucide-react";
import { ActionFeedback } from "@/components/shared/action-feedback";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type {
  CurriculumRecord,
  DomainRecord,
  GradeRecord,
  LearningObjectiveRecord,
  SubjectRecord,
} from "@/domain/curriculum/types";
import type { ActionState } from "@/lib/action-state";
import { initialActionState } from "@/lib/action-state";
import {
  archiveStructureAction,
  saveCurriculumAction,
  saveCurriculumGradeAction,
  saveCurriculumSubjectAction,
  saveDomainAction,
  saveGradeAction,
  saveGradeLearningObjectiveAction,
  saveGradeSubjectAction,
  saveGradeSubjectDomainAction,
  saveLearningObjectiveAction,
  saveSubjectAction,
  saveSubjectDomainAction,
} from "@/features/curricula/actions";

type StructureAction = (state: ActionState, formData: FormData) => Promise<ActionState>;

function useStructureForm(action: StructureAction) {
  return React.useActionState(action, initialActionState);
}

function Textarea({
  id,
  name,
  defaultValue,
  required = false,
}: {
  id: string;
  name: string;
  defaultValue?: string;
  required?: boolean;
}) {
  return (
    <textarea
      id={id}
      name={name}
      defaultValue={defaultValue}
      required={required}
      rows={3}
      className="flex min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    />
  );
}

function FormActions({ pending, label = "Save structure" }: { pending: boolean; label?: string }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button type="submit" disabled={pending}>
        <Save className="h-4 w-4" aria-hidden="true" />
        {pending ? "Saving…" : label}
      </Button>
    </div>
  );
}

export function CurriculumForm({ curriculum }: { curriculum?: CurriculumRecord }) {
  const [state, formAction, pending] = useStructureForm(saveCurriculumAction);
  return (
    <form action={formAction} className="space-y-5">
      {curriculum ? <input type="hidden" name="id" value={curriculum.id} /> : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="curriculum-name">Name</Label>
          <Input id="curriculum-name" name="name" defaultValue={curriculum?.name} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="curriculum-slug">Slug</Label>
          <Input id="curriculum-slug" name="slug" defaultValue={curriculum?.slug} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="curriculum-kind">Type</Label>
          <select
            id="curriculum-kind"
            name="kind"
            defaultValue={curriculum?.kind ?? "custom"}
            className="field-select"
          >
            <option value="custom">Custom curriculum</option>
            <option value="kosovo">Kosovo curriculum</option>
            <option value="international">International curriculum</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="curriculum-authority">Authority or source</Label>
          <Input
            id="curriculum-authority"
            name="authority"
            defaultValue={curriculum?.authority ?? ""}
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="curriculum-description">Description</Label>
          <Textarea
            id="curriculum-description"
            name="description"
            defaultValue={curriculum?.description}
          />
        </div>
      </div>
      <ActionFeedback state={state} />
      <FormActions pending={pending} label={curriculum ? "Save curriculum" : "Create curriculum"} />
    </form>
  );
}

export function GradeForm({ grade }: { grade?: GradeRecord }) {
  const [state, formAction, pending] = useStructureForm(saveGradeAction);
  return (
    <form action={formAction} className="space-y-5">
      {grade ? <input type="hidden" name="id" value={grade.id} /> : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="grade-name">Name</Label>
          <Input id="grade-name" name="name" defaultValue={grade?.name} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="grade-short-name">Short name</Label>
          <Input id="grade-short-name" name="shortName" defaultValue={grade?.shortName} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="grade-slug">Slug</Label>
          <Input id="grade-slug" name="slug" defaultValue={grade?.slug} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="grade-order">Display order</Label>
          <Input
            id="grade-order"
            name="sortOrder"
            type="number"
            min={0}
            defaultValue={grade?.sortOrder ?? 0}
            required
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="grade-description">Description</Label>
          <Textarea id="grade-description" name="description" defaultValue={grade?.description} />
        </div>
      </div>
      <ActionFeedback state={state} />
      <FormActions pending={pending} label={grade ? "Save grade" : "Create grade"} />
    </form>
  );
}

export function SubjectForm({ subject }: { subject?: SubjectRecord }) {
  const [state, formAction, pending] = useStructureForm(saveSubjectAction);
  return (
    <form action={formAction} className="space-y-5">
      {subject ? <input type="hidden" name="id" value={subject.id} /> : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="subject-name">Name</Label>
          <Input id="subject-name" name="name" defaultValue={subject?.name} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="subject-slug">Slug</Label>
          <Input id="subject-slug" name="slug" defaultValue={subject?.slug} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="subject-icon">Icon token</Label>
          <Input
            id="subject-icon"
            name="icon"
            defaultValue={subject?.icon ?? "book-open"}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="subject-accent">Accent token</Label>
          <Input
            id="subject-accent"
            name="accent"
            defaultValue={subject?.accent ?? "accent"}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="subject-hours">Recommended study hours</Label>
          <Input
            id="subject-hours"
            name="recommendedStudyHours"
            type="number"
            min={0}
            defaultValue={subject?.recommendedStudyHours ?? 0}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="subject-order">Display order</Label>
          <Input
            id="subject-order"
            name="sortOrder"
            type="number"
            min={0}
            defaultValue={subject?.sortOrder ?? 0}
            required
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="subject-description">Description</Label>
          <Textarea
            id="subject-description"
            name="description"
            defaultValue={subject?.description}
          />
        </div>
      </div>
      <ActionFeedback state={state} />
      <FormActions pending={pending} label={subject ? "Save subject" : "Create subject"} />
    </form>
  );
}

export function DomainForm({ domain }: { domain?: DomainRecord }) {
  const [state, formAction, pending] = useStructureForm(saveDomainAction);
  return (
    <form action={formAction} className="space-y-5">
      {domain ? <input type="hidden" name="id" value={domain.id} /> : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="domain-name">Name</Label>
          <Input id="domain-name" name="name" defaultValue={domain?.name} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="domain-slug">Slug</Label>
          <Input id="domain-slug" name="slug" defaultValue={domain?.slug} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="domain-order">Display order</Label>
          <Input
            id="domain-order"
            name="sortOrder"
            type="number"
            min={0}
            defaultValue={domain?.sortOrder ?? 0}
            required
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="domain-description">Description</Label>
          <Textarea id="domain-description" name="description" defaultValue={domain?.description} />
        </div>
      </div>
      <ActionFeedback state={state} />
      <FormActions pending={pending} label={domain ? "Save domain" : "Create domain"} />
    </form>
  );
}

export function LearningObjectiveForm({
  objective,
  curriculumId,
  subjects,
  domains,
}: {
  objective?: LearningObjectiveRecord;
  curriculumId: string;
  subjects: readonly SubjectRecord[];
  domains: readonly DomainRecord[];
}) {
  const [state, formAction, pending] = useStructureForm(saveLearningObjectiveAction);
  return (
    <form action={formAction} className="space-y-5">
      {objective ? <input type="hidden" name="id" value={objective.id} /> : null}
      <input type="hidden" name="curriculumId" value={curriculumId} />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="objective-code">Code</Label>
          <Input
            id="objective-code"
            name="code"
            defaultValue={objective?.code}
            placeholder="MATH-06-01"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="objective-title">Title</Label>
          <Input id="objective-title" name="title" defaultValue={objective?.title} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="objective-subject">Subject</Label>
          <select
            id="objective-subject"
            name="subjectId"
            defaultValue={objective?.subjectId ?? subjects[0]?.id}
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
          <Label htmlFor="objective-domain">Domain</Label>
          <select
            id="objective-domain"
            name="domainId"
            defaultValue={objective?.domainId ?? ""}
            className="field-select"
          >
            <option value="">Subject-wide objective</option>
            {domains.map((domain) => (
              <option key={domain.id} value={domain.id}>
                {domain.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="objective-difficulty">Difficulty</Label>
          <select
            id="objective-difficulty"
            name="difficulty"
            defaultValue={objective?.difficulty ?? "balanced"}
            className="field-select"
          >
            <option value="gentle">Gentle</option>
            <option value="balanced">Balanced</option>
            <option value="challenging">Challenging</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="objective-order">Display order</Label>
          <Input
            id="objective-order"
            name="sortOrder"
            type="number"
            min={0}
            defaultValue={objective?.sortOrder ?? 0}
            required
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="objective-description">Description</Label>
          <Textarea
            id="objective-description"
            name="description"
            defaultValue={objective?.description}
            required
          />
        </div>
      </div>
      <label className="flex items-center gap-3 text-sm">
        <input
          type="checkbox"
          name="isRequired"
          defaultChecked={objective?.isRequired ?? false}
          className="h-4 w-4 rounded border-input"
        />
        Required objective for this curriculum
      </label>
      <ActionFeedback state={state} />
      <FormActions pending={pending} label={objective ? "Save objective" : "Create objective"} />
    </form>
  );
}

export function StructureMappingForm({
  kind,
  curriculumId,
  gradeId,
  subjectId,
  domainId,
  objectiveId,
  curricula,
  grades,
  subjects,
  domains,
  objectives,
}: {
  kind:
    | "curriculum-grade"
    | "curriculum-subject"
    | "grade-subject"
    | "subject-domain"
    | "grade-domain"
    | "grade-objective";
  curriculumId?: string;
  gradeId?: string;
  subjectId?: string;
  domainId?: string;
  objectiveId?: string;
  curricula: readonly CurriculumRecord[];
  grades: readonly GradeRecord[];
  subjects: readonly SubjectRecord[];
  domains: readonly DomainRecord[];
  objectives: readonly LearningObjectiveRecord[];
}) {
  const action: StructureAction =
    kind === "curriculum-grade"
      ? saveCurriculumGradeAction
      : kind === "curriculum-subject"
        ? saveCurriculumSubjectAction
        : kind === "grade-subject"
          ? saveGradeSubjectAction
          : kind === "subject-domain"
            ? saveSubjectDomainAction
            : kind === "grade-domain"
              ? saveGradeSubjectDomainAction
              : saveGradeLearningObjectiveAction;
  const [state, formAction, pending] = useStructureForm(action);
  const title =
    kind === "curriculum-grade"
      ? "Curriculum grade"
      : kind === "curriculum-subject"
        ? "Curriculum subject"
        : kind === "grade-subject"
          ? "Grade subject"
          : kind === "subject-domain"
            ? "Subject domain"
            : kind === "grade-domain"
              ? "Grade domain depth"
              : "Grade objective";
  return (
    <form action={formAction} className="space-y-4">
      <p className="text-sm font-semibold">{title}</p>
      {kind !== "subject-domain" ? (
        <div className="space-y-2">
          <Label htmlFor={`${kind}-curriculum`}>Curriculum</Label>
          <select
            id={`${kind}-curriculum`}
            name="curriculumId"
            defaultValue={curriculumId ?? curricula[0]?.id}
            className="field-select"
            required
          >
            {curricula.map((curriculum) => (
              <option key={curriculum.id} value={curriculum.id}>
                {curriculum.name}
              </option>
            ))}
          </select>
        </div>
      ) : null}
      {kind === "curriculum-grade" ||
      kind === "grade-subject" ||
      kind === "grade-domain" ||
      kind === "grade-objective" ? (
        <div className="space-y-2">
          <Label htmlFor={`${kind}-grade`}>Grade</Label>
          <select
            id={`${kind}-grade`}
            name="gradeId"
            defaultValue={gradeId ?? grades[0]?.id}
            className="field-select"
            required
          >
            {grades.map((grade) => (
              <option key={grade.id} value={grade.id}>
                {grade.name}
              </option>
            ))}
          </select>
        </div>
      ) : null}
      {kind === "curriculum-subject" ||
      kind === "grade-subject" ||
      kind === "grade-domain" ||
      kind === "grade-objective" ||
      kind === "subject-domain" ? (
        <div className="space-y-2">
          <Label htmlFor={`${kind}-subject`}>Subject</Label>
          <select
            id={`${kind}-subject`}
            name="subjectId"
            defaultValue={subjectId ?? subjects[0]?.id}
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
      ) : null}
      {kind === "subject-domain" || kind === "grade-domain" ? (
        <div className="space-y-2">
          <Label htmlFor={`${kind}-domain`}>Domain</Label>
          <select
            id={`${kind}-domain`}
            name="domainId"
            defaultValue={domainId ?? domains[0]?.id}
            className="field-select"
            required
          >
            {domains.map((domain) => (
              <option key={domain.id} value={domain.id}>
                {domain.name}
              </option>
            ))}
          </select>
        </div>
      ) : null}
      {kind === "grade-objective" ? (
        <div className="space-y-2">
          <Label htmlFor="grade-objective-objective">Objective</Label>
          <select
            id="grade-objective-objective"
            name="objectiveId"
            defaultValue={objectiveId ?? objectives[0]?.id}
            className="field-select"
            required
          >
            {objectives.map((objective) => (
              <option key={objective.id} value={objective.id}>
                {objective.code} · {objective.title}
              </option>
            ))}
          </select>
        </div>
      ) : null}
      <div className="space-y-2">
        <Label htmlFor={`${kind}-order`}>Display order</Label>
        <Input
          id={`${kind}-order`}
          name="sortOrder"
          type="number"
          min={0}
          defaultValue={0}
          required
        />
      </div>
      {kind === "grade-domain" ? (
        <div className="space-y-2">
          <Label htmlFor="grade-domain-depth">Depth (1–5)</Label>
          <Input
            id="grade-domain-depth"
            name="depth"
            type="number"
            min={1}
            max={5}
            defaultValue={1}
            required
          />
        </div>
      ) : null}
      {kind === "curriculum-subject" ||
      kind === "grade-subject" ||
      kind === "grade-domain" ||
      kind === "grade-objective" ? (
        <label className="flex items-center gap-3 text-sm">
          <input type="checkbox" name="isRequired" className="h-4 w-4 rounded border-input" />
          Required
        </label>
      ) : null}
      {kind !== "subject-domain" && kind !== "grade-objective" ? (
        <label className="flex items-center gap-3 text-sm">
          <input
            type="checkbox"
            name="isAvailable"
            defaultChecked
            className="h-4 w-4 rounded border-input"
          />
          Available to learners
        </label>
      ) : null}
      <ActionFeedback state={state} />
      <FormActions pending={pending} label="Save mapping" />
    </form>
  );
}

export function ArchiveButton({
  entity,
  id,
  isArchived,
}: {
  entity: "curriculum" | "grade" | "subject" | "domain" | "objective";
  id: string;
  isArchived: boolean;
}) {
  const [state, formAction, pending] = useStructureForm(archiveStructureAction);
  return (
    <form action={formAction} className="flex flex-col items-end gap-2">
      <input type="hidden" name="entity" value={entity} />
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="isArchived" value={String(!isArchived)} />
      <Button
        type="submit"
        variant="ghost"
        size="sm"
        title={isArchived ? "Restore" : "Archive"}
        disabled={pending}
      >
        {isArchived ? (
          <ArchiveRestore className="h-4 w-4" aria-hidden="true" />
        ) : (
          <Archive className="h-4 w-4" aria-hidden="true" />
        )}
        <span className="sr-only">{isArchived ? "Restore" : "Archive"}</span>
      </Button>
      <ActionFeedback state={state} />
    </form>
  );
}
