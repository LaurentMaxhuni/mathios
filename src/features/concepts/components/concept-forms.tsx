"use client";

import * as React from "react";
import { Archive, ArchiveRestore, CheckCircle2, Save, Upload } from "lucide-react";
import { ActionFeedback } from "@/components/shared/action-feedback";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type {
  SubjectRecord,
  DomainRecord,
  GradeRecord,
  LearningObjectiveRecord,
} from "@/domain/curriculum/types";
import type {
  ConceptListEntry,
  ConceptRecord,
  ConceptLessonCandidate,
} from "@/domain/concept/types";
import { CONCEPT_RELATIONSHIP_TYPES } from "@/domain/concept/types";
import type { ActionState } from "@/lib/action-state";
import { initialActionState } from "@/lib/action-state";
import {
  archiveConceptAction,
  bulkImportRelationshipsAction,
  deleteConceptRelationshipAction,
  deleteLessonConceptAction,
  saveConceptAction,
  saveConceptApplicationAction,
  saveConceptMisconceptionAction,
  saveConceptObjectiveAction,
  saveConceptRelationshipAction,
  saveLessonConceptAction,
  validateConceptGraphAction,
} from "@/features/concepts/actions";

type FormAction = (state: ActionState, formData: FormData) => Promise<ActionState>;

function useConceptForm(action: FormAction) {
  return React.useActionState(action, initialActionState);
}

function Textarea({
  id,
  name,
  defaultValue,
  required = false,
  rows = 4,
  placeholder,
}: {
  id: string;
  name: string;
  defaultValue?: string;
  required?: boolean;
  rows?: number;
  placeholder?: string;
}) {
  return (
    <textarea
      id={id}
      name={name}
      defaultValue={defaultValue}
      required={required}
      rows={rows}
      placeholder={placeholder}
      className="flex min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    />
  );
}

function Submit({ pending, label }: { pending: boolean; label: string }) {
  return (
    <Button type="submit" disabled={pending}>
      <Save className="h-4 w-4" aria-hidden="true" />
      {pending ? "Saving…" : label}
    </Button>
  );
}

export function ConceptForm({
  concept,
  subjects,
  domains,
  grades,
}: {
  concept?: ConceptRecord;
  subjects: readonly SubjectRecord[];
  domains: readonly DomainRecord[];
  grades: readonly GradeRecord[];
}) {
  const [state, formAction, pending] = useConceptForm(saveConceptAction);
  return (
    <form action={formAction} className="space-y-5">
      {concept ? <input type="hidden" name="id" value={concept.id} /> : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="concept-name">Name</Label>
          <Input id="concept-name" name="name" defaultValue={concept?.name} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="concept-slug">Slug</Label>
          <Input id="concept-slug" name="slug" defaultValue={concept?.slug} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="concept-subject">Subject</Label>
          <select
            id="concept-subject"
            name="subjectId"
            defaultValue={concept?.subjectId ?? subjects[0]?.id}
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
          <Label htmlFor="concept-domain">Domain</Label>
          <select
            id="concept-domain"
            name="domainId"
            defaultValue={concept?.domainId ?? ""}
            className="field-select"
          >
            <option value="">Subject-wide concept</option>
            {domains.map((domain) => (
              <option key={domain.id} value={domain.id}>
                {domain.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="concept-grade-min">First grade</Label>
          <select
            id="concept-grade-min"
            name="gradeMinId"
            defaultValue={concept?.gradeMinId ?? ""}
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
          <Label htmlFor="concept-grade-max">Last grade</Label>
          <select
            id="concept-grade-max"
            name="gradeMaxId"
            defaultValue={concept?.gradeMaxId ?? ""}
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
          <Label htmlFor="concept-difficulty">Difficulty</Label>
          <select
            id="concept-difficulty"
            name="difficulty"
            defaultValue={concept?.difficulty ?? "balanced"}
            className="field-select"
          >
            <option value="gentle">Gentle</option>
            <option value="balanced">Balanced</option>
            <option value="challenging">Challenging</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="concept-threshold">Mastery threshold (%)</Label>
          <Input
            id="concept-threshold"
            name="masteryThreshold"
            type="number"
            min={0}
            max={100}
            defaultValue={concept?.masteryThreshold ?? 70}
            required
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="concept-description">Description</Label>
          <Textarea
            id="concept-description"
            name="description"
            defaultValue={concept?.description}
            placeholder="Explain the idea in a way that can stand independently of one lesson."
          />
        </div>
      </div>
      <ActionFeedback state={state} />
      <Submit pending={pending} label={concept ? "Save concept" : "Create concept"} />
    </form>
  );
}

export function RelationshipForm({
  concepts,
  sourceConceptId,
}: {
  concepts: readonly ConceptListEntry[];
  sourceConceptId?: string;
}) {
  const [state, formAction, pending] = useConceptForm(saveConceptRelationshipAction);
  return (
    <form action={formAction} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="relationship-source">Source concept</Label>
          <select
            id="relationship-source"
            name="sourceConceptId"
            defaultValue={sourceConceptId ?? concepts[0]?.id}
            className="field-select"
            required
          >
            {concepts.map((concept) => (
              <option key={concept.id} value={concept.id}>
                {concept.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="relationship-type">Relationship</Label>
          <select
            id="relationship-type"
            name="type"
            defaultValue="requires"
            className="field-select"
          >
            {CONCEPT_RELATIONSHIP_TYPES.map((type) => (
              <option key={type} value={type}>
                {type.replaceAll("-", " ")}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="relationship-target">Target concept</Label>
          <select
            id="relationship-target"
            name="targetConceptId"
            defaultValue={concepts[1]?.id ?? concepts[0]?.id}
            className="field-select"
            required
          >
            {concepts.map((concept) => (
              <option key={concept.id} value={concept.id}>
                {concept.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      <p className="text-xs leading-5 text-muted-foreground">
        A <strong>requires</strong> edge reads as “source requires target.” Required cycles are
        rejected before they reach the database.
      </p>
      <ActionFeedback state={state} />
      <Submit pending={pending} label="Add relationship" />
    </form>
  );
}

export function RelationshipDeleteForm({ relationshipId }: { relationshipId: string }) {
  const [state, formAction, pending] = useConceptForm(deleteConceptRelationshipAction);
  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="id" value={relationshipId} />
      <Button type="submit" variant="ghost" size="sm" disabled={pending}>
        {pending ? "Removing…" : "Remove"}
      </Button>
      <ActionFeedback state={state} />
    </form>
  );
}

export function LessonLinkForm({
  conceptId,
  lessons,
}: {
  conceptId: string;
  lessons: readonly ConceptLessonCandidate[];
}) {
  const [state, formAction, pending] = useConceptForm(saveLessonConceptAction);
  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="conceptId" value={conceptId} />
      <div className="space-y-2">
        <Label htmlFor="concept-lesson">Lesson</Label>
        <select id="concept-lesson" name="lessonId" className="field-select" required>
          {lessons.map((lesson) => (
            <option key={lesson.lessonId} value={lesson.lessonId}>
              {lesson.courseTitle} · {lesson.moduleTitle} · {lesson.lessonTitle} (
              {lesson.lessonStatus})
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="concept-lesson-order">Display order</Label>
        <Input id="concept-lesson-order" name="sortOrder" type="number" min={0} defaultValue={0} />
      </div>
      <ActionFeedback state={state} />
      <Submit pending={pending} label="Link lesson" />
    </form>
  );
}

export function LessonUnlinkForm({ conceptId, lessonId }: { conceptId: string; lessonId: string }) {
  const [state, formAction, pending] = useConceptForm(deleteLessonConceptAction);
  return (
    <form action={formAction} className="shrink-0">
      <input type="hidden" name="conceptId" value={conceptId} />
      <input type="hidden" name="lessonId" value={lessonId} />
      <Button type="submit" variant="ghost" size="sm" disabled={pending}>
        {pending ? "Removing…" : "Unlink"}
      </Button>
      <ActionFeedback state={state} />
    </form>
  );
}

export function ObjectiveLinkForm({
  conceptId,
  objectives,
}: {
  conceptId: string;
  objectives: readonly LearningObjectiveRecord[];
}) {
  const [state, formAction, pending] = useConceptForm(saveConceptObjectiveAction);
  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="conceptId" value={conceptId} />
      <div className="space-y-2">
        <Label htmlFor="concept-objective">Learning objective</Label>
        <select id="concept-objective" name="objectiveId" className="field-select" required>
          {objectives.map((objective) => (
            <option key={objective.id} value={objective.id}>
              {objective.code} · {objective.title}
            </option>
          ))}
        </select>
      </div>
      <Input name="sortOrder" type="hidden" value="0" readOnly />
      <ActionFeedback state={state} />
      <Submit pending={pending} label="Link objective" />
    </form>
  );
}

export function ApplicationForm({ conceptId }: { conceptId: string }) {
  const [state, formAction, pending] = useConceptForm(saveConceptApplicationAction);
  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="conceptId" value={conceptId} />
      <div className="space-y-2">
        <Label htmlFor="application-title">Application title</Label>
        <Input id="application-title" name="title" placeholder="Projectile motion" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="application-description">What does it explain?</Label>
        <Textarea id="application-description" name="description" rows={3} required />
      </div>
      <Input name="sortOrder" type="hidden" value="0" readOnly />
      <ActionFeedback state={state} />
      <Submit pending={pending} label="Add application" />
    </form>
  );
}

export function MisconceptionForm({ conceptId }: { conceptId: string }) {
  const [state, formAction, pending] = useConceptForm(saveConceptMisconceptionAction);
  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="conceptId" value={conceptId} />
      <div className="space-y-2">
        <Label htmlFor="misconception-text">Common misconception</Label>
        <Textarea id="misconception-text" name="misconception" rows={3} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="misconception-correction">Correction</Label>
        <Textarea id="misconception-correction" name="correction" rows={3} required />
      </div>
      <Input name="sortOrder" type="hidden" value="0" readOnly />
      <ActionFeedback state={state} />
      <Submit pending={pending} label="Add misconception" />
    </form>
  );
}

export function BulkRelationshipForm() {
  const [state, formAction, pending] = useConceptForm(bulkImportRelationshipsAction);
  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="bulk-relationships">CSV relationships</Label>
        <Textarea
          id="bulk-relationships"
          name="rows"
          rows={6}
          placeholder="velocity, requires, position\nacceleration, requires, velocity"
          required
        />
        <p className="text-xs leading-5 text-muted-foreground">
          Use concept slugs or IDs: <code>source, relationship-type, target</code>. Duplicate rows
          are skipped; invalid required cycles are rejected.
        </p>
      </div>
      <ActionFeedback state={state} />
      <Button type="submit" disabled={pending}>
        <Upload className="h-4 w-4" aria-hidden="true" />
        {pending ? "Importing…" : "Import relationships"}
      </Button>
    </form>
  );
}

export function ValidateGraphForm() {
  const [state, formAction, pending] = useConceptForm(validateConceptGraphAction);
  return (
    <form action={formAction} className="space-y-3">
      <Button type="submit" variant="outline" disabled={pending}>
        <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
        {pending ? "Checking…" : "Validate graph"}
      </Button>
      <ActionFeedback state={state} />
    </form>
  );
}

export function ArchiveConceptForm({ concept }: { concept: ConceptRecord }) {
  const [state, formAction, pending] = useConceptForm(archiveConceptAction);
  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="id" value={concept.id} />
      <input type="hidden" name="isArchived" value={String(!concept.isArchived)} />
      <Button type="submit" variant="ghost" size="sm" disabled={pending}>
        {concept.isArchived ? (
          <ArchiveRestore className="h-4 w-4" aria-hidden="true" />
        ) : (
          <Archive className="h-4 w-4" aria-hidden="true" />
        )}
        {concept.isArchived ? "Restore" : "Archive"}
      </Button>
      <ActionFeedback state={state} />
    </form>
  );
}
