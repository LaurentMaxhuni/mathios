"use client";

import * as React from "react";
import { Copy, GripVertical, Plus, Save, Trash2 } from "lucide-react";
import { ActionFeedback } from "@/components/shared/action-feedback";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ActionState } from "@/lib/action-state";
import { initialActionState } from "@/lib/action-state";
import type {
  LessonAssetRecord,
  LessonBlockRecord,
  LessonEditorData,
  LessonSectionKind,
} from "@/domain/course/types";
import { LESSON_BLOCK_TYPES, LESSON_SECTION_KINDS } from "@/domain/course/types";
import {
  autosaveLessonAction,
  deleteAssetAction,
  deleteBlockAction,
  deleteSectionAction,
  duplicateBlockAction,
  saveAssetAction,
  saveBlockAction,
  saveSectionAction,
} from "@/features/courses/actions";

type FormAction = (state: ActionState, formData: FormData) => Promise<ActionState>;
function useFormAction(action: FormAction) {
  return React.useActionState(action, initialActionState);
}

const templatePayload: Record<string, Record<string, unknown>> = {
  paragraph: { text: "Write the explanation here." },
  markdown: { markdown: "Use Markdown for a richer explanation." },
  formula: {
    latex: "x = \\frac{a}{b}",
    accessibleLabel: "A fraction with numerator a and denominator b",
    display: "block",
  },
  definition: { term: "Term", definition: "Define the term in a sentence a learner can reuse." },
  example: {
    prompt: "State the problem.",
    steps: ["Identify the known values.", "Choose a relationship.", "Check the result."],
  },
  callout: { tone: "info", text: "A useful idea to remember." },
  warning: { text: "A common point of attention." },
  "common-mistake": {
    mistake: "Describe the tempting error.",
    correction: "Explain how to avoid it.",
  },
};

function payloadFor(type: string, block?: LessonBlockRecord) {
  return block?.payload ?? templatePayload[type] ?? { text: "Add content for this block." };
}

function BlockForm({
  lessonId,
  sectionId,
  block,
}: {
  lessonId: string;
  sectionId: string;
  block?: LessonBlockRecord;
}) {
  void lessonId;
  const [state, formAction, pending] = useFormAction(saveBlockAction);
  const [type, setType] = React.useState(block?.type ?? "paragraph");
  const [payload, setPayload] = React.useState(() =>
    JSON.stringify(payloadFor(type, block), null, 2),
  );
  function changeType(value: string) {
    const nextType = value as typeof type;
    setType(nextType);
    if (!block) setPayload(JSON.stringify(payloadFor(nextType), null, 2));
  }
  return (
    <form action={formAction} className="space-y-3 rounded-lg border bg-background p-3">
      {block ? <input type="hidden" name="id" value={block.id} /> : null}
      <input type="hidden" name="sectionId" value={sectionId} />
      <div className="grid gap-3 sm:grid-cols-[1fr_1.2fr_5rem]">
        <div className="space-y-1">
          <Label htmlFor={`block-type-${block?.id ?? "new"}`}>Block</Label>
          <select
            id={`block-type-${block?.id ?? "new"}`}
            name="type"
            value={type}
            onChange={(event) => changeType(event.target.value)}
            className="field-select"
          >
            {LESSON_BLOCK_TYPES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor={`block-title-${block?.id ?? "new"}`}>Label</Label>
          <Input
            id={`block-title-${block?.id ?? "new"}`}
            name="title"
            defaultValue={block?.title ?? ""}
            placeholder="Optional label"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`block-order-${block?.id ?? "new"}`}>Order</Label>
          <Input
            id={`block-order-${block?.id ?? "new"}`}
            name="sortOrder"
            type="number"
            min={0}
            defaultValue={block?.sortOrder ?? 0}
          />
        </div>
      </div>
      <div className="space-y-1">
        <Label htmlFor={`block-payload-${block?.id ?? "new"}`}>Payload JSON</Label>
        <textarea
          id={`block-payload-${block?.id ?? "new"}`}
          name="payload"
          value={payload}
          onChange={(event) => setPayload(event.target.value)}
          rows={5}
          className="w-full rounded-md border border-input bg-muted/30 px-3 py-2 font-mono text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-describedby={`block-help-${block?.id ?? "new"}`}
        />
        <p id={`block-help-${block?.id ?? "new"}`} className="text-xs text-muted-foreground">
          Formula blocks require <code>latex</code> and <code>accessibleLabel</code>; images and
          diagrams require <code>altText</code>.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          <Save className="h-3.5 w-3.5" aria-hidden="true" />
          {pending ? "Saving…" : block ? "Save block" : "Add block"}
        </Button>
        <ActionFeedback state={state} />
      </div>
    </form>
  );
}

function SectionForm({
  lessonId,
  kind,
  title,
  description,
  sortOrder,
  id,
}: {
  lessonId: string;
  kind?: LessonSectionKind;
  title?: string;
  description?: string;
  sortOrder?: number;
  id?: string;
}) {
  const [state, formAction, pending] = useFormAction(saveSectionAction);
  return (
    <form action={formAction} className="space-y-3 rounded-lg border bg-muted/20 p-3">
      <input type="hidden" name="lessonId" value={lessonId} />
      {id ? <input type="hidden" name="id" value={id} /> : null}
      <div className="grid gap-3 sm:grid-cols-[1.1fr_1.4fr_5rem]">
        <div className="space-y-1">
          <Label htmlFor={`section-kind-${id ?? "new"}`}>Section type</Label>
          <select
            id={`section-kind-${id ?? "new"}`}
            name="kind"
            defaultValue={kind ?? "introduction"}
            className="field-select"
          >
            {LESSON_SECTION_KINDS.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor={`section-title-${id ?? "new"}`}>Title</Label>
          <Input id={`section-title-${id ?? "new"}`} name="title" defaultValue={title} required />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`section-order-${id ?? "new"}`}>Order</Label>
          <Input
            id={`section-order-${id ?? "new"}`}
            name="sortOrder"
            type="number"
            min={0}
            defaultValue={sortOrder ?? 0}
          />
        </div>
      </div>
      <div className="space-y-1">
        <Label htmlFor={`section-description-${id ?? "new"}`}>Description</Label>
        <Input
          id={`section-description-${id ?? "new"}`}
          name="description"
          defaultValue={description}
        />
      </div>
      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" variant="outline" disabled={pending}>
          <Save className="h-3.5 w-3.5" aria-hidden="true" />
          {pending ? "Saving…" : id ? "Save section" : "Add section"}
        </Button>
        <ActionFeedback state={state} />
      </div>
    </form>
  );
}

function DeleteSectionButton({ id }: { id: string }) {
  const [state, formAction, pending] = useFormAction(deleteSectionAction);
  return (
    <form action={formAction}>
      <input type="hidden" name="id" value={id} />
      <Button
        type="submit"
        size="icon"
        variant="ghost"
        disabled={pending}
        aria-label="Delete section"
      >
        <Trash2 className="h-4 w-4 text-destructive" aria-hidden="true" />
      </Button>
      <span className="sr-only">
        <ActionFeedback state={state} />
      </span>
    </form>
  );
}
function DeleteBlockButton({ id }: { id: string }) {
  const [state, formAction, pending] = useFormAction(deleteBlockAction);
  return (
    <form action={formAction}>
      <input type="hidden" name="id" value={id} />
      <Button
        type="submit"
        size="icon"
        variant="ghost"
        disabled={pending}
        aria-label="Delete block"
      >
        <Trash2 className="h-4 w-4 text-destructive" aria-hidden="true" />
      </Button>
      <span className="sr-only">
        <ActionFeedback state={state} />
      </span>
    </form>
  );
}
function DuplicateBlockButton({ id }: { id: string }) {
  const [state, formAction, pending] = useFormAction(duplicateBlockAction);
  return (
    <form action={formAction}>
      <input type="hidden" name="id" value={id} />
      <Button
        type="submit"
        size="icon"
        variant="ghost"
        disabled={pending}
        aria-label="Duplicate block"
      >
        <Copy className="h-4 w-4" aria-hidden="true" />
      </Button>
      <span className="sr-only">
        <ActionFeedback state={state} />
      </span>
    </form>
  );
}

function DeleteAssetButton({ id }: { id: string }) {
  const [state, formAction, pending] = useFormAction(deleteAssetAction);
  return (
    <form action={formAction}>
      <input type="hidden" name="id" value={id} />
      <Button
        type="submit"
        size="icon"
        variant="ghost"
        disabled={pending}
        aria-label="Delete asset"
      >
        <Trash2 className="h-4 w-4 text-destructive" aria-hidden="true" />
      </Button>
      <span className="sr-only">
        <ActionFeedback state={state} />
      </span>
    </form>
  );
}

function AssetForm({ lessonId }: { lessonId: string }) {
  const [state, formAction, pending] = useFormAction(saveAssetAction);
  return (
    <form
      action={formAction}
      className="grid gap-3 rounded-lg border bg-background p-3 sm:grid-cols-2"
    >
      <input type="hidden" name="lessonId" value={lessonId} />
      <div className="space-y-1">
        <Label htmlFor="asset-kind">Kind</Label>
        <Input id="asset-kind" name="kind" placeholder="image, diagram, video" required />
      </div>
      <div className="space-y-1">
        <Label htmlFor="asset-name">Name</Label>
        <Input id="asset-name" name="name" placeholder="Motion diagram" required />
      </div>
      <div className="space-y-1 sm:col-span-2">
        <Label htmlFor="asset-source-url">Source URL</Label>
        <Input id="asset-source-url" name="sourceUrl" placeholder="/uploads/motion.svg" required />
      </div>
      <div className="space-y-1">
        <Label htmlFor="asset-mime-type">MIME type</Label>
        <Input id="asset-mime-type" name="mimeType" placeholder="image/svg+xml" />
      </div>
      <div className="space-y-1">
        <Label htmlFor="asset-alt-text">Alternative text</Label>
        <Input id="asset-alt-text" name="altText" required />
      </div>
      <div className="space-y-1 sm:col-span-2">
        <Label htmlFor="asset-metadata">Metadata JSON</Label>
        <Input
          id="asset-metadata"
          name="metadata"
          defaultValue="{}"
          className="font-mono text-xs"
        />
      </div>
      <div className="flex flex-wrap items-center gap-2 sm:col-span-2">
        <Button type="submit" size="sm" disabled={pending}>
          <Save className="h-3.5 w-3.5" aria-hidden="true" />
          {pending ? "Saving…" : "Save asset"}
        </Button>
        <ActionFeedback state={state} />
      </div>
    </form>
  );
}

function AssetRow({ asset }: { asset: LessonAssetRecord }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border bg-background p-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{asset.name}</p>
        <p className="truncate text-xs text-muted-foreground">
          {asset.kind} · {asset.sourceUrl}
        </p>
      </div>
      <DeleteAssetButton id={asset.id} />
    </div>
  );
}

export function LessonEditor({ data }: { data: LessonEditorData }) {
  const [autosaveState, autosaveAction, autosavePending] = useFormAction(autosaveLessonAction);
  const [lastSaved, setLastSaved] = React.useState<string | null>(null);
  const [changed, setChanged] = React.useState(false);
  React.useEffect(() => {
    if (!changed) return;
    const timer = window.setTimeout(() => {
      const form = new FormData();
      form.set("lessonId", data.lesson.id);
      form.set("changeSummary", "Autosaved editor changes");
      void autosaveLessonAction(initialActionState, form).then((state) => {
        if (state.ok) {
          setLastSaved(new Date().toLocaleTimeString());
          setChanged(false);
        }
      });
    }, 1200);
    return () => window.clearTimeout(timer);
  }, [changed, data.lesson.id]);
  return (
    <div className="space-y-6" onChange={() => setChanged(true)}>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-muted/20 p-4">
        <div>
          <p className="text-sm font-semibold">Draft workspace</p>
          <p className="text-xs text-muted-foreground">
            Changes autosave after a short pause. Publish only after previewing every block.
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {autosavePending ? "Autosaving…" : lastSaved ? `Saved ${lastSaved}` : "Draft not changed"}
          <form action={autosaveAction} className="inline-flex">
            <input type="hidden" name="lessonId" value={data.lesson.id} />
            <input type="hidden" name="changeSummary" value="Manual draft save" />
            <Button type="submit" size="sm" variant="outline" disabled={autosavePending}>
              <Save className="h-3.5 w-3.5" aria-hidden="true" />
              Save draft
            </Button>
          </form>
        </div>
        <ActionFeedback state={autosaveState} />
      </div>
      <section className="space-y-4" aria-labelledby="lesson-assets-heading">
        <div>
          <h2 id="lesson-assets-heading" className="text-lg font-semibold">
            Lesson assets
          </h2>
          <p className="text-sm text-muted-foreground">
            Keep reusable media metadata beside the structured blocks that reference it.
          </p>
        </div>
        {data.assets.length ? (
          <div className="grid gap-2 sm:grid-cols-2">
            {data.assets.map((asset) => (
              <AssetRow key={asset.id} asset={asset} />
            ))}
          </div>
        ) : (
          <p className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
            No assets attached yet.
          </p>
        )}
        <details className="rounded-lg border border-dashed p-3">
          <summary className="cursor-pointer text-sm font-medium text-accent">Add asset</summary>
          <div className="mt-3">
            <AssetForm lessonId={data.lesson.id} />
          </div>
        </details>
      </section>
      <section className="space-y-4" aria-labelledby="lesson-sections-heading">
        <div className="flex items-center justify-between">
          <div>
            <h2 id="lesson-sections-heading" className="text-lg font-semibold">
              Structured sections
            </h2>
            <p className="text-sm text-muted-foreground">
              Sections carry the teaching intent; blocks carry the content.
            </p>
          </div>
        </div>
        {data.sections.map(({ section, blocks }) => (
          <article key={section.id} className="rounded-xl border p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex min-w-0 items-start gap-2">
                <GripVertical
                  className="mt-1 h-4 w-4 shrink-0 text-muted-foreground"
                  aria-hidden="true"
                />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">
                    {section.kind}
                  </p>
                  <h3 className="mt-1 font-semibold">{section.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{section.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <DeleteSectionButton id={section.id} />
              </div>
            </div>
            <div className="mt-4 space-y-3">
              {blocks.map((block) => (
                <div key={block.id} className="rounded-lg border-l-2 border-accent/50 pl-3">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <span className="text-xs font-medium text-muted-foreground">
                      {block.type} · #{block.sortOrder + 1}
                    </span>
                    <div className="flex items-center gap-1">
                      <DuplicateBlockButton id={block.id} />
                      <DeleteBlockButton id={block.id} />
                    </div>
                  </div>
                  <BlockForm lessonId={data.lesson.id} sectionId={section.id} block={block} />
                </div>
              ))}
              <BlockForm lessonId={data.lesson.id} sectionId={section.id} />
            </div>
            <div className="mt-4 border-t pt-4">
              <SectionForm
                lessonId={data.lesson.id}
                id={section.id}
                kind={section.kind}
                title={section.title}
                description={section.description}
                sortOrder={section.sortOrder}
              />
            </div>
          </article>
        ))}
        <SectionForm lessonId={data.lesson.id} />
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
          Use the block type selector to apply a starter template.
        </div>
      </section>
    </div>
  );
}
