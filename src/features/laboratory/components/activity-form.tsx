"use client";

import * as React from "react";
import { Globe2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { SubjectRecord } from "@/domain/curriculum/types";
import type { LaboratoryDetail } from "@/domain/laboratory/types";

type ActivityFormProps = { subjects: readonly SubjectRecord[]; detail?: LaboratoryDetail };

export function ActivityForm({ subjects, detail }: ActivityFormProps) {
  const activity = detail?.activity;
  const [title, setTitle] = React.useState(activity?.title ?? "");
  const [slug, setSlug] = React.useState(activity?.slug ?? "");
  const [subjectId, setSubjectId] = React.useState(activity?.subjectId ?? subjects[0]?.id ?? "");
  const [mode, setMode] = React.useState(activity?.mode ?? "real-world");
  const [description, setDescription] = React.useState(activity?.description ?? "");
  const [objective, setObjective] = React.useState(activity?.objective ?? "");
  const [theory, setTheory] = React.useState(activity?.theory ?? "");
  const [materials, setMaterials] = React.useState(activity?.materials.join("\n") ?? "");
  const [safetyNotes, setSafetyNotes] = React.useState(activity?.safetyNotes.join("\n") ?? "");
  const [analysisPrompt, setAnalysisPrompt] = React.useState(activity?.analysisPrompt ?? "");
  const [graphingInstructions, setGraphingInstructions] = React.useState(
    activity?.graphingInstructions ?? "",
  );
  const [questions, setQuestions] = React.useState(activity?.questions.join("\n") ?? "");
  const [conclusionPrompt, setConclusionPrompt] = React.useState(activity?.conclusionPrompt ?? "");
  const [extensionActivity, setExtensionActivity] = React.useState(
    activity?.extensionActivity ?? "",
  );
  const [simulationId, setSimulationId] = React.useState(activity?.simulationId ?? "");
  const [duration, setDuration] = React.useState(activity?.estimatedDurationMinutes ?? 30);
  const [steps, setSteps] = React.useState(
    () =>
      detail?.steps.map((step) => `${step.type}|${step.title}|${step.instructions}`).join("\n") ??
      "setup|Prepare|Prepare the equipment and record the starting conditions.\nprocedure|Collect data|Record repeated measurements with units.\nanalysis|Analyze|Graph the data and calculate a result.\nconclusion|Conclude|Answer the questions and evaluate the method.",
  );
  const [variables, setVariables] = React.useState(
    () =>
      detail?.variables
        .map(
          (variable) => `${variable.key}|${variable.label}|${variable.role}|${variable.unit ?? ""}`,
        )
        .join("\n") ??
      "independent|Independent variable|independent|\ndependent|Dependent variable|dependent|",
  );
  const [status, setStatus] = React.useState<"draft" | "published">(
    activity?.status === "published" ? "draft" : "draft",
  );
  const [saving, setSaving] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    const activityId = detail?.activity.id;
    const parsedSteps = steps
      .split("\n")
      .map((line, index) => {
        const [type = "procedure", stepTitle = `Step ${index + 1}`, ...instructionParts] =
          line.split("|");
        return {
          type,
          title: stepTitle,
          instructions: instructionParts.join("|") || stepTitle,
          expectedObservation: "",
          sortOrder: index,
          isRequired: true,
        };
      })
      .filter((step) => step.title.trim() && step.instructions.trim());
    const parsedVariables = variables
      .split("\n")
      .map((line, index) => {
        const [key = `variable-${index + 1}`, label = key, role = "measured", unit = ""] =
          line.split("|");
        return {
          key: key
            .trim()
            .replace(/[^a-zA-Z0-9_-]/g, "-")
            .toLowerCase(),
          label: label.trim(),
          symbol: key.trim(),
          role,
          dataType: "number",
          unit: unit.trim() || null,
          description: "",
          defaultValue: null,
          minValue: null,
          maxValue: null,
          uncertainty: null,
          significantFigures: 3,
          theoreticalValue: null,
          configuration: {},
          sortOrder: index,
        };
      })
      .filter((variable) => variable.key && variable.label);
    const payload = {
      id: activityId,
      slug,
      title,
      description,
      subjectId,
      mode,
      status: detail ? status : "draft",
      objective,
      theory,
      materials: lines(materials),
      safetyNotes: lines(safetyNotes),
      analysisPrompt,
      graphingInstructions,
      questions: lines(questions),
      conclusionPrompt,
      extensionActivity,
      simulationId: simulationId.trim() || null,
      estimatedDurationMinutes: duration,
      steps: parsedSteps,
      variables: parsedVariables,
    };
    try {
      const response = await fetch(
        activityId ? `/api/laboratories/${activityId}` : "/api/laboratories",
        {
          method: activityId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const body = (await response.json()) as { message?: string };
      if (!response.ok) throw new Error(body.message ?? "Could not save activity.");
      setStatus("draft");
      setMessage(activityId ? "Activity draft saved." : "Activity created as a draft.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save activity.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save} className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="activity-title">Title</Label>
          <Input
            id="activity-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="activity-slug">Slug</Label>
          <Input
            id="activity-slug"
            value={slug}
            onChange={(event) => setSlug(event.target.value)}
            placeholder="my-laboratory-activity"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="activity-subject">Subject</Label>
          <select
            id="activity-subject"
            className="field-select"
            value={subjectId}
            onChange={(event) => setSubjectId(event.target.value)}
          >
            {subjects.map((subject) => (
              <option key={subject.id} value={subject.id}>
                {subject.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="activity-mode">Mode</Label>
          <select
            id="activity-mode"
            className="field-select"
            value={mode}
            onChange={(event) => setMode(event.target.value as typeof mode)}
          >
            <option value="real-world">Real-world guide</option>
            <option value="simulated">Simulated experiment</option>
            <option value="hybrid">Hybrid</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="activity-duration">Estimated minutes</Label>
          <Input
            id="activity-duration"
            type="number"
            min={0}
            value={duration}
            onChange={(event) => setDuration(Number(event.target.value))}
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="activity-simulation">Linked simulation ID (optional)</Label>
          <Input
            id="activity-simulation"
            value={simulationId}
            onChange={(event) => setSimulationId(event.target.value)}
            placeholder="simulation-one-dimensional-motion"
          />
        </div>
      </div>
      <Field
        id="activity-description"
        label="Description"
        value={description}
        onChange={setDescription}
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <Field
          id="activity-objective"
          label="Objective"
          value={objective}
          onChange={setObjective}
          rows={5}
        />
        <Field id="activity-theory" label="Theory" value={theory} onChange={setTheory} rows={5} />
        <Field
          id="activity-materials"
          label="Materials (one per line)"
          value={materials}
          onChange={setMaterials}
        />
        <Field
          id="activity-safety"
          label="Safety notes (one per line)"
          value={safetyNotes}
          onChange={setSafetyNotes}
        />
        <Field
          id="activity-analysis"
          label="Analysis prompt"
          value={analysisPrompt}
          onChange={setAnalysisPrompt}
        />
        <Field
          id="activity-graphing"
          label="Graphing instructions"
          value={graphingInstructions}
          onChange={setGraphingInstructions}
        />
        <Field
          id="activity-questions"
          label="Questions (one per line)"
          value={questions}
          onChange={setQuestions}
        />
        <Field
          id="activity-conclusion"
          label="Conclusion prompt"
          value={conclusionPrompt}
          onChange={setConclusionPrompt}
        />
        <Field
          id="activity-extension"
          label="Extension activity"
          value={extensionActivity}
          onChange={setExtensionActivity}
        />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Field
          id="activity-steps"
          label="Steps (type|title|instructions per line)"
          value={steps}
          onChange={setSteps}
          rows={8}
        />
        <Field
          id="activity-variables"
          label="Variables (key|label|role|unit per line)"
          value={variables}
          onChange={setVariables}
          rows={8}
        />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={saving}>
          <Save className="h-4 w-4" aria-hidden="true" />
          {saving ? "Saving…" : "Save activity draft"}
        </Button>
        {detail ? (
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={status === "published"}
              onChange={(event) => setStatus(event.target.checked ? "published" : "draft")}
            />
            Publish this revision (requires publish permission)
          </label>
        ) : null}
        {detail && activity?.status !== "published" ? (
          <Button
            type="button"
            variant="outline"
            onClick={async () => {
              setSaving(true);
              setMessage(null);
              try {
                const response = await fetch(`/api/laboratories/${detail.activity.id}/publish`, {
                  method: "POST",
                });
                const body = (await response.json()) as { message?: string };
                if (!response.ok) throw new Error(body.message ?? "Could not publish activity.");
                setStatus("published");
                setMessage("Activity published.");
              } catch (error) {
                setMessage(error instanceof Error ? error.message : "Could not publish activity.");
              } finally {
                setSaving(false);
              }
            }}
            disabled={saving}
          >
            <Globe2 className="h-4 w-4" aria-hidden="true" />
            Publish activity
          </Button>
        ) : null}
      </div>
      {message ? (
        <p role="status" className="text-sm text-muted-foreground">
          {message}
        </p>
      ) : null}
    </form>
  );
}

function lines(value: string): string[] {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function Field({
  id,
  label,
  value,
  onChange,
  rows = 3,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <textarea
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={rows}
        className="min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
      />
    </div>
  );
}
