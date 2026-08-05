"use client";

import * as React from "react";
import { CheckCircle2, Link2, Save, Sparkles, Trash2 } from "lucide-react";
import { ActionFeedback } from "@/components/shared/action-feedback";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { GradeRecord, SubjectRecord } from "@/domain/curriculum/types";
import type {
  RoadmapDetail,
  RoadmapEdgeRecord,
  RoadmapNodeRecord,
  RoadmapRecord,
  RoadmapVersionRecord,
  UserRoadmapProgressRecord,
} from "@/domain/roadmap/types";
import type { ActionState } from "@/lib/action-state";
import { initialActionState } from "@/lib/action-state";
import {
  deleteRoadmapEdgeAction,
  deleteRoadmapNodeAction,
  deleteRoadmapPrerequisiteAction,
  deleteRoadmapSubjectAction,
  enrollRoadmapAction,
  generatePersonalizedPathAction,
  saveRoadmapAction,
  saveRoadmapEdgeAction,
  saveRoadmapNodeAction,
  saveRoadmapPrerequisiteAction,
  saveRoadmapProgressAction,
  saveRoadmapSubjectAction,
  setRoadmapStatusAction,
} from "@/features/roadmaps/actions";

type FormAction = (state: ActionState, formData: FormData) => Promise<ActionState>;

function useFormAction(action: FormAction) {
  return React.useActionState(action, initialActionState);
}

function Submit({
  pending,
  label,
  icon = <Save className="h-4 w-4" aria-hidden="true" />,
}: {
  pending: boolean;
  label: string;
  icon?: React.ReactNode;
}) {
  return (
    <Button type="submit" disabled={pending}>
      {icon}
      {pending ? "Savingâ€¦" : label}
    </Button>
  );
}

function Textarea({
  id,
  name,
  defaultValue,
  rows = 4,
  required = false,
}: {
  id: string;
  name: string;
  defaultValue?: string | null;
  rows?: number;
  required?: boolean;
}) {
  return (
    <textarea
      id={id}
      name={name}
      defaultValue={defaultValue ?? ""}
      rows={rows}
      required={required}
      className="flex min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    />
  );
}

export function RoadmapForm({
  roadmap,
  grades,
}: {
  roadmap?: RoadmapRecord;
  grades: readonly GradeRecord[];
}) {
  const [state, formAction, pending] = useFormAction(saveRoadmapAction);
  return (
    <form action={formAction} className="space-y-5">
      {roadmap ? <input type="hidden" name="id" value={roadmap.id} /> : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="roadmap-title">Title</Label>
          <Input id="roadmap-title" name="title" defaultValue={roadmap?.title} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="roadmap-slug">Slug</Label>
          <Input id="roadmap-slug" name="slug" defaultValue={roadmap?.slug} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="roadmap-grade">Target grade</Label>
          <select
            id="roadmap-grade"
            name="targetGradeId"
            defaultValue={roadmap?.targetGradeId ?? ""}
            className="field-select"
          >
            <option value="">Flexible target</option>
            {grades.map((grade) => (
              <option key={grade.id} value={grade.id}>
                {grade.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="roadmap-difficulty">Target difficulty</Label>
          <select
            id="roadmap-difficulty"
            name="targetDifficulty"
            defaultValue={roadmap?.targetDifficulty ?? "balanced"}
            className="field-select"
          >
            <option value="gentle">Gentle</option>
            <option value="balanced">Balanced</option>
            <option value="challenging">Challenging</option>
          </select>
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="roadmap-cover-image">Cover image URL</Label>
          <Input
            id="roadmap-cover-image"
            name="coverImage"
            type="url"
            defaultValue={roadmap?.coverImage ?? ""}
            placeholder="https://example.org/roadmap-cover.jpg"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="roadmap-duration">Estimated minutes</Label>
          <Input
            id="roadmap-duration"
            name="estimatedDurationMinutes"
            type="number"
            min={0}
            defaultValue={roadmap?.estimatedDurationMinutes ?? 60}
            required
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="roadmap-goal">Goal</Label>
          <Textarea id="roadmap-goal" name="goal" defaultValue={roadmap?.goal} rows={2} />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="roadmap-description">Description</Label>
          <Textarea
            id="roadmap-description"
            name="description"
            defaultValue={roadmap?.description}
          />
        </div>
        <input type="hidden" name="status" value={roadmap?.status ?? "draft"} />
      </div>
      <ActionFeedback state={state} />
      <Submit pending={pending} label={roadmap ? "Save roadmap" : "Create roadmap"} />
    </form>
  );
}

export function RoadmapStatusForm({
  roadmap,
  versionStatus,
  label,
}: {
  roadmap: RoadmapRecord;
  versionStatus?: RoadmapRecord["status"];
  label?: string;
}) {
  const [state, formAction, pending] = useFormAction(setRoadmapStatusAction);
  const currentStatus = versionStatus ?? roadmap.status;
  const next = currentStatus === "published" ? "draft" : "published";
  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="id" value={roadmap.id} />
      <input type="hidden" name="status" value={next} />
      <Button
        type="submit"
        variant={next === "published" ? "default" : "outline"}
        size="sm"
        disabled={pending}
      >
        {pending
          ? "Updatingâ€¦"
          : (label ?? (next === "published" ? "Publish roadmap" : "Create draft version"))}
      </Button>
      <ActionFeedback state={state} />
    </form>
  );
}

export function EnrollRoadmapForm({ roadmapId }: { roadmapId: string }) {
  const [state, formAction, pending] = useFormAction(enrollRoadmapAction);
  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="roadmapId" value={roadmapId} />
      <div className="space-y-2">
        <Label htmlFor={`goal-${roadmapId}`}>Personal goal (optional)</Label>
        <Input
          id={`goal-${roadmapId}`}
          name="selectedGoal"
          placeholder="What do you want this path to unlock?"
        />
      </div>
      <ActionFeedback state={state} />
      <Submit
        pending={pending}
        label="Start this roadmap"
        icon={<Link2 className="h-4 w-4" aria-hidden="true" />}
      />
    </form>
  );
}

export function GeneratePathForm({ roadmapId }: { roadmapId: string }) {
  const [state, formAction, pending] = useFormAction(generatePersonalizedPathAction);
  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="roadmapId" value={roadmapId} />
      <ActionFeedback state={state} />
      <Button type="submit" variant="outline" disabled={pending}>
        <Sparkles className="h-4 w-4" aria-hidden="true" />
        {pending ? "Building pathâ€¦" : "Generate personalized path"}
      </Button>
    </form>
  );
}

export function ProgressForm({
  roadmapId,
  node,
  progress,
}: {
  roadmapId: string;
  node: RoadmapNodeRecord;
  progress?: UserRoadmapProgressRecord;
}) {
  const [state, formAction, pending] = useFormAction(saveRoadmapProgressAction);
  const nextStatus = progress?.status === "completed" ? "in-progress" : "completed";
  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="roadmapId" value={roadmapId} />
      <input type="hidden" name="roadmapNodeId" value={node.id} />
      <input type="hidden" name="status" value={nextStatus} />
      <input
        type="hidden"
        name="completionPercentage"
        value={nextStatus === "completed" ? 100 : 0}
      />
      <Button
        type="submit"
        size="sm"
        variant={nextStatus === "completed" ? "default" : "outline"}
        disabled={pending || progress?.status === "locked"}
      >
        {pending ? "Savingâ€¦" : nextStatus === "completed" ? "Mark complete" : "Reopen node"}
        <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
      </Button>
      <ActionFeedback state={state} />
    </form>
  );
}

export function RoadmapNodeForm({
  roadmap,
  version,
  node,
  subjects,
}: {
  roadmap: RoadmapRecord;
  version: RoadmapVersionRecord;
  node?: RoadmapNodeRecord;
  subjects: readonly SubjectRecord[];
}) {
  const [state, formAction, pending] = useFormAction(saveRoadmapNodeAction);
  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="id" value={node?.id ?? ""} />
      <input type="hidden" name="roadmapId" value={roadmap.id} />
      <input type="hidden" name="roadmapVersionId" value={version.id} />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor={`node-key-${node?.id ?? "new"}`}>Stable key</Label>
          <Input
            id={`node-key-${node?.id ?? "new"}`}
            name="nodeKey"
            defaultValue={node?.nodeKey}
            placeholder="algebra-foundation"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`node-title-${node?.id ?? "new"}`}>Title</Label>
          <Input
            id={`node-title-${node?.id ?? "new"}`}
            name="title"
            defaultValue={node?.title}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`node-type-${node?.id ?? "new"}`}>Node type</Label>
          <select
            id={`node-type-${node?.id ?? "new"}`}
            name="type"
            defaultValue={node?.type ?? "concept"}
            className="field-select"
          >
            <option value="concept">Concept</option>
            <option value="lesson">Lesson</option>
            <option value="course">Course</option>
            <option value="module">Module</option>
            <option value="assessment">Assessment</option>
            <option value="simulation">Simulation</option>
            <option value="laboratory-activity">Laboratory activity</option>
            <option value="milestone">Milestone</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor={`node-subject-${node?.id ?? "new"}`}>Subject</Label>
          <select
            id={`node-subject-${node?.id ?? "new"}`}
            name="subjectId"
            defaultValue={node?.subjectId ?? ""}
            className="field-select"
          >
            <option value="">Cross-subject</option>
            {subjects.map((subject) => (
              <option key={subject.id} value={subject.id}>
                {subject.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor={`node-reference-${node?.id ?? "new"}`}>Reusable resource ID</Label>
          <Input
            id={`node-reference-${node?.id ?? "new"}`}
            name="referenceId"
            defaultValue={node?.referenceId ?? ""}
            placeholder="concept-linear-equations"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`node-reference-title-${node?.id ?? "new"}`}>Resource label</Label>
          <Input
            id={`node-reference-title-${node?.id ?? "new"}`}
            name="referenceTitle"
            defaultValue={node?.referenceTitle ?? ""}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`node-order-${node?.id ?? "new"}`}>Order</Label>
          <Input
            id={`node-order-${node?.id ?? "new"}`}
            name="sortOrder"
            type="number"
            min={0}
            defaultValue={node?.sortOrder ?? 0}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`node-duration-${node?.id ?? "new"}`}>Minutes</Label>
          <Input
            id={`node-duration-${node?.id ?? "new"}`}
            name="estimatedDurationMinutes"
            type="number"
            min={0}
            defaultValue={node?.estimatedDurationMinutes ?? 20}
            required
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor={`node-description-${node?.id ?? "new"}`}>Description</Label>
          <Textarea
            id={`node-description-${node?.id ?? "new"}`}
            name="description"
            defaultValue={node?.description}
            rows={2}
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor={`node-metadata-${node?.id ?? "new"}`}>Metadata JSON</Label>
          <Textarea
            id={`node-metadata-${node?.id ?? "new"}`}
            name="metadata"
            defaultValue={JSON.stringify(node?.metadata ?? {}, null, 2)}
            rows={3}
          />
        </div>
      </div>
      <div className="flex flex-wrap gap-4 text-sm">
        <label className="flex items-center gap-2">
          <input type="checkbox" name="isRequired" defaultChecked={node?.isRequired ?? true} />{" "}
          Required node
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" name="isCheckpoint" defaultChecked={node?.isCheckpoint ?? false} />{" "}
          Checkpoint
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            name="isOptionalBranch"
            defaultChecked={node?.isOptionalBranch ?? false}
          />{" "}
          Optional branch
        </label>
      </div>
      <ActionFeedback state={state} />
      <Submit pending={pending} label={node ? "Save node" : "Add node"} />
    </form>
  );
}

export function RoadmapEdgeForm({
  detail,
  edge,
}: {
  detail: RoadmapDetail;
  edge?: RoadmapEdgeRecord;
}) {
  const [state, formAction, pending] = useFormAction(saveRoadmapEdgeAction);
  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="id" value={edge?.id ?? ""} />
      <input type="hidden" name="roadmapId" value={detail.roadmap.id} />
      <input type="hidden" name="roadmapVersionId" value={detail.version.id} />
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor={`edge-source-${edge?.id ?? "new"}`}>From</Label>
          <select
            id={`edge-source-${edge?.id ?? "new"}`}
            name="sourceNodeId"
            defaultValue={edge?.sourceNodeId ?? detail.nodes[0]?.id}
            className="field-select"
            required
          >
            {detail.nodes.map((node) => (
              <option key={node.id} value={node.id}>
                {node.title}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor={`edge-type-${edge?.id ?? "new"}`}>Connection</Label>
          <select
            id={`edge-type-${edge?.id ?? "new"}`}
            name="type"
            defaultValue={edge?.type ?? "requires"}
            className="field-select"
          >
            <option value="requires">Requires / unlocks</option>
            <option value="recommended">Recommended before</option>
            <option value="optional">Optional branch</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor={`edge-target-${edge?.id ?? "new"}`}>To</Label>
          <select
            id={`edge-target-${edge?.id ?? "new"}`}
            name="targetNodeId"
            defaultValue={edge?.targetNodeId ?? detail.nodes[1]?.id ?? detail.nodes[0]?.id}
            className="field-select"
            required
          >
            {detail.nodes.map((node) => (
              <option key={node.id} value={node.id}>
                {node.title}
              </option>
            ))}
          </select>
        </div>
      </div>
      <ActionFeedback state={state} />
      <Submit
        pending={pending}
        label={edge ? "Save connection" : "Connect nodes"}
        icon={<Link2 className="h-4 w-4" aria-hidden="true" />}
      />
    </form>
  );
}

export function DeleteRoadmapNodeForm({
  roadmapId,
  nodeId,
}: {
  roadmapId: string;
  nodeId: string;
}) {
  const [state, formAction, pending] = useFormAction(deleteRoadmapNodeAction);
  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="id" value={nodeId} />
      <input type="hidden" name="roadmapId" value={roadmapId} />
      <Button type="submit" variant="ghost" size="sm" disabled={pending}>
        <Trash2 className="h-4 w-4" aria-hidden="true" />
        {pending ? "Removingâ€¦" : "Remove"}
      </Button>
      <ActionFeedback state={state} />
    </form>
  );
}

export function DeleteRoadmapEdgeForm({
  roadmapId,
  edgeId,
}: {
  roadmapId: string;
  edgeId: string;
}) {
  const [state, formAction, pending] = useFormAction(deleteRoadmapEdgeAction);
  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="id" value={edgeId} />
      <input type="hidden" name="roadmapId" value={roadmapId} />
      <Button type="submit" variant="ghost" size="sm" disabled={pending}>
        <Trash2 className="h-4 w-4" aria-hidden="true" />
        {pending ? "Removingâ€¦" : "Remove"}
      </Button>
      <ActionFeedback state={state} />
    </form>
  );
}

export function RoadmapSubjectForm({
  roadmapId,
  subjects,
}: {
  roadmapId: string;
  subjects: readonly SubjectRecord[];
}) {
  const [state, formAction, pending] = useFormAction(saveRoadmapSubjectAction);
  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <input type="hidden" name="roadmapId" value={roadmapId} />
      <div className="min-w-48 flex-1 space-y-2">
        <Label htmlFor={`subject-${roadmapId}`}>Subject</Label>
        <select id={`subject-${roadmapId}`} name="subjectId" className="field-select" required>
          {subjects.map((subject) => (
            <option key={subject.id} value={subject.id}>
              {subject.name}
            </option>
          ))}
        </select>
      </div>
      <div className="w-24 space-y-2">
        <Label htmlFor={`subject-order-${roadmapId}`}>Order</Label>
        <Input
          id={`subject-order-${roadmapId}`}
          name="sortOrder"
          type="number"
          min={0}
          defaultValue={0}
        />
      </div>
      <Submit pending={pending} label="Add subject" />
      <ActionFeedback state={state} />
    </form>
  );
}

export function DeleteRoadmapSubjectForm({
  roadmapId,
  subjectId,
}: {
  roadmapId: string;
  subjectId: string;
}) {
  const [state, formAction, pending] = useFormAction(deleteRoadmapSubjectAction);
  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="roadmapId" value={roadmapId} />
      <input type="hidden" name="subjectId" value={subjectId} />
      <Button type="submit" variant="ghost" size="sm" disabled={pending}>
        {pending ? "Removingâ€¦" : "Remove"}
      </Button>
      <ActionFeedback state={state} />
    </form>
  );
}

export function RoadmapPrerequisiteForm({
  roadmapId,
  roadmaps,
}: {
  roadmapId: string;
  roadmaps: readonly RoadmapRecord[];
}) {
  const [state, formAction, pending] = useFormAction(saveRoadmapPrerequisiteAction);
  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <input type="hidden" name="roadmapId" value={roadmapId} />
      <div className="min-w-56 flex-1 space-y-2">
        <Label htmlFor={`prerequisite-${roadmapId}`}>Prerequisite roadmap</Label>
        <select
          id={`prerequisite-${roadmapId}`}
          name="prerequisiteRoadmapId"
          className="field-select"
          required
        >
          {roadmaps
            .filter((roadmap) => roadmap.id !== roadmapId)
            .map((roadmap) => (
              <option key={roadmap.id} value={roadmap.id}>
                {roadmap.title}
              </option>
            ))}
        </select>
      </div>
      <label className="flex items-center gap-2 pb-2 text-sm">
        <input type="checkbox" name="isRequired" defaultChecked /> Required
      </label>
      <Submit pending={pending} label="Add prerequisite" />
      <ActionFeedback state={state} />
    </form>
  );
}

export function DeleteRoadmapPrerequisiteForm({
  roadmapId,
  prerequisiteRoadmapId,
}: {
  roadmapId: string;
  prerequisiteRoadmapId: string;
}) {
  const [state, formAction, pending] = useFormAction(deleteRoadmapPrerequisiteAction);
  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="roadmapId" value={roadmapId} />
      <input type="hidden" name="prerequisiteRoadmapId" value={prerequisiteRoadmapId} />
      <Button type="submit" variant="ghost" size="sm" disabled={pending}>
        {pending ? "Removingâ€¦" : "Remove"}
      </Button>
      <ActionFeedback state={state} />
    </form>
  );
}
