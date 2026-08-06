"use client";

import * as React from "react";
import {
  BarChart3,
  CheckCircle2,
  Download,
  FlaskConical,
  Loader2,
  Play,
  Save,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type {
  LaboratoryDetail,
  LaboratoryReportRecord,
  LaboratorySessionDetail,
} from "@/domain/laboratory/types";

type ReportDraft = Omit<
  LaboratoryReportRecord,
  "id" | "sessionId" | "profileId" | "createdAt" | "updatedAt" | "submittedAt" | "feedback"
>;

async function readResponse<T>(response: Response): Promise<T> {
  const body = (await response.json().catch(() => ({}))) as { message?: string } & T;
  if (!response.ok) throw new Error(body.message ?? "The laboratory request failed.");
  return body as T;
}

export function LaboratoryWorkspace({ activity }: { activity: LaboratoryDetail }) {
  const [detail, setDetail] = React.useState<LaboratorySessionDetail | null>(null);
  const [rowCount, setRowCount] = React.useState(6);
  const [busy, setBusy] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    void fetch(`/api/laboratories/${activity.activity.id}/sessions`)
      .then((response) =>
        readResponse<{ sessions: LaboratorySessionDetail["session"][] }>(response),
      )
      .then(async ({ sessions }) => {
        const current = sessions.find(
          (session) => session.status === "active" || session.status === "paused",
        );
        if (!current) return;
        const response = await fetch(`/api/laboratories/sessions/${current.id}`);
        const next = await readResponse<{ detail: LaboratorySessionDetail }>(response);
        if (!cancelled) setDetail(next.detail);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [activity.activity.id]);

  async function refresh(sessionId: string) {
    const response = await fetch(`/api/laboratories/sessions/${sessionId}`);
    const body = await readResponse<{ detail: LaboratorySessionDetail }>(response);
    setDetail(body.detail);
    setRowCount((current) =>
      Math.max(current, ...body.detail.measurements.map((item) => item.rowIndex + 1), 6),
    );
  }

  async function start() {
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/laboratories/${activity.activity.id}/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: activity.activity.mode, inputs: {} }),
      });
      const body = await readResponse<{ session: LaboratorySessionDetail["session"] }>(response);
      await refresh(body.session.id);
      setMessage("Experiment workspace ready.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not start the experiment.");
    } finally {
      setBusy(false);
    }
  }

  async function importSimulationData() {
    if (!detail) return;
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch(
        `/api/laboratories/sessions/${detail.session.id}/simulation-data`,
        { method: "POST" },
      );
      await readResponse(response);
      await refresh(detail.session.id);
      setMessage("Simulation data imported into the data table.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not import simulation data.");
    } finally {
      setBusy(false);
    }
  }

  async function saveObservation(stepId: string, prompt: string, notes: string, sortOrder: number) {
    if (!detail) return;
    try {
      const response = await fetch(`/api/laboratories/sessions/${detail.session.id}/observations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stepId, prompt, notes, sortOrder, metadata: {} }),
      });
      await readResponse(response);
      await refresh(detail.session.id);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save the observation.");
    }
  }

  async function saveMeasurement(
    variableId: string,
    rowIndex: number,
    value: string,
    unit: string | null,
  ) {
    if (!detail || !value.trim()) return;
    const variable = detail.activity.variables.find((item) => item.id === variableId);
    if (!variable) return;
    try {
      const response = await fetch(`/api/laboratories/sessions/${detail.session.id}/measurements`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          variableId,
          observationId: null,
          rowIndex,
          value: variable.dataType === "number" ? Number(value) : value,
          unit,
          uncertainty: variable.uncertainty,
          significantFigures: variable.significantFigures,
          source: "manual",
          notes: "",
        }),
      });
      await readResponse(response);
      await refresh(detail.session.id);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save the measurement.");
    }
  }

  async function complete() {
    if (!detail) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/laboratories/sessions/${detail.session.id}/complete`, {
        method: "POST",
      });
      await readResponse(response);
      await refresh(detail.session.id);
      setMessage("Experiment completed. Your report can now be submitted.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not complete the experiment.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      {!detail ? (
        <Card className="overflow-hidden border-accent/30 bg-accent/5">
          <CardContent className="flex flex-wrap items-center justify-between gap-4 p-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
                Start a lab session
              </p>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                Create a private workspace for observations, measurements, graphing, and your
                scientific report.
              </p>
            </div>
            <Button onClick={() => void start()} disabled={busy}>
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Play className="h-4 w-4" aria-hidden="true" />
              )}
              Begin experiment
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-4">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-lg bg-accent/10 text-accent">
                <FlaskConical className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <p className="font-semibold">Experiment workspace</p>
                <p className="text-sm text-muted-foreground">
                  {detail.session.completionPercentage}% complete ·{" "}
                  {detail.analysis.measurementCount} measurements
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={detail.session.status === "completed" ? "success" : "outline"}>
                {detail.session.status}
              </Badge>
              <Button
                size="sm"
                onClick={() => void complete()}
                disabled={busy || detail.session.status === "completed"}
              >
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                Complete experiment
              </Button>
            </div>
          </div>
          <ProcedureSection detail={detail} onSaveObservation={saveObservation} />
          <MeasurementTable
            detail={detail}
            rowCount={rowCount}
            onAddRow={() => setRowCount((current) => current + 1)}
            onSaveMeasurement={saveMeasurement}
            onImportSimulation={importSimulationData}
            busy={busy}
          />
          <AnalysisSection detail={detail} />
          <ReportEditor
            detail={detail}
            onSaved={(report) =>
              setDetail((current) => (current ? { ...current, report } : current))
            }
          />
        </>
      )}
      {message ? (
        <p
          role="status"
          className="rounded-md border border-accent/30 bg-accent/5 px-4 py-3 text-sm text-muted-foreground"
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}

function ProcedureSection({
  detail,
  onSaveObservation,
}: {
  detail: LaboratorySessionDetail;
  onSaveObservation: (
    stepId: string,
    prompt: string,
    notes: string,
    sortOrder: number,
  ) => Promise<void>;
}) {
  const notesByStep = new Map(
    detail.observations.map((observation) => [observation.stepId, observation.notes]),
  );
  return (
    <Card>
      <CardHeader>
        <p className="eyebrow">Method</p>
        <CardTitle>Procedure and observations</CardTitle>
        <CardDescription>
          Follow each step, then record what you actually observed. Real-world labs keep the guide
          alongside the same structured notebook.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {detail.activity.steps.map((step, index) => (
          <div key={step.id} className="rounded-lg border bg-muted/20 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">{index + 1}</Badge>
              <p className="font-semibold">{step.title}</p>
              <Badge variant={step.type === "procedure" ? "default" : "outline"}>{step.type}</Badge>
            </div>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{step.instructions}</p>
            {step.expectedObservation ? (
              <p className="mt-2 text-xs text-accent">Look for: {step.expectedObservation}</p>
            ) : null}
            <div className="mt-3 space-y-2">
              <Label htmlFor={`observation-${step.id}`}>Observation notes</Label>
              <textarea
                id={`observation-${step.id}`}
                defaultValue={notesByStep.get(step.id) ?? ""}
                onBlur={(event) =>
                  void onSaveObservation(
                    step.id,
                    step.title,
                    event.currentTarget.value,
                    step.sortOrder,
                  )
                }
                className="min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder="What did you observe?"
              />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function MeasurementTable({
  detail,
  rowCount,
  onAddRow,
  onSaveMeasurement,
  onImportSimulation,
  busy,
}: {
  detail: LaboratorySessionDetail;
  rowCount: number;
  onAddRow: () => void;
  onSaveMeasurement: (
    variableId: string,
    rowIndex: number,
    value: string,
    unit: string | null,
  ) => Promise<void>;
  onImportSimulation: () => Promise<void>;
  busy: boolean;
}) {
  const byKey = new Map(
    detail.measurements.map((measurement) => [
      `${measurement.variableId}-${measurement.rowIndex}`,
      measurement,
    ]),
  );
  return (
    <Card>
      <CardHeader className="flex-row flex-wrap items-start justify-between gap-4 space-y-0">
        <div>
          <p className="eyebrow">Data table</p>
          <CardTitle>Record measurements</CardTitle>
          <CardDescription>
            Values are normalized to the variable unit and checked for finite numbers, ranges,
            uncertainty, and significant figures.
          </CardDescription>
        </div>
        <div className="flex flex-wrap gap-2">
          {detail.activity.activity.simulationId ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => void onImportSimulation()}
              disabled={busy}
            >
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              Import simulation data
            </Button>
          ) : null}
          <Button size="sm" variant="outline" onClick={onAddRow}>
            <BarChart3 className="h-4 w-4" aria-hidden="true" />
            Add row
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full min-w-[680px] text-left text-sm">
            <caption className="sr-only">Laboratory measurement data table</caption>
            <thead className="bg-muted/40">
              <tr>
                <th className="px-3 py-3">Trial</th>
                {detail.activity.variables.map((variable) => (
                  <th key={variable.id} className="px-3 py-3">
                    <span className="block font-semibold">{variable.label}</span>
                    <span className="text-xs font-normal text-muted-foreground">
                      {variable.unit ?? "unitless"} · {variable.role}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: rowCount }, (_, rowIndex) => (
                <tr key={rowIndex} className="border-t">
                  <th scope="row" className="px-3 py-2 font-medium">
                    {rowIndex + 1}
                  </th>
                  {detail.activity.variables.map((variable) => {
                    const value = byKey.get(`${variable.id}-${rowIndex}`);
                    return (
                      <td key={variable.id} className="px-2 py-2">
                        <Input
                          aria-label={`${variable.label}, trial ${rowIndex + 1}`}
                          defaultValue={value?.numericValue ?? value?.textValue ?? ""}
                          type={variable.dataType === "number" ? "number" : "text"}
                          step="any"
                          disabled={detail.session.status === "completed"}
                          onBlur={(event) =>
                            void onSaveMeasurement(
                              variable.id,
                              rowIndex,
                              event.currentTarget.value,
                              variable.unit,
                            )
                          }
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Tip: repeat a trial on the same row before moving to the next condition. Simulation
          imports are labelled and remain distinguishable from manual measurements.
        </p>
      </CardContent>
    </Card>
  );
}

function AnalysisSection({ detail }: { detail: LaboratorySessionDetail }) {
  const { graph, theoryComparisons } = detail.analysis;
  const maxX = Math.max(...graph.points.map((point) => point.x), 1);
  const minX = Math.min(...graph.points.map((point) => point.x), 0);
  const minY = Math.min(...graph.points.map((point) => point.y), 0);
  const maxY = Math.max(...graph.points.map((point) => point.y), 1);
  const x = (value: number) => 8 + ((value - minX) / Math.max(maxX - minX, 0.001)) * 84;
  const y = (value: number) => 92 - ((value - minY) / Math.max(maxY - minY, 0.001)) * 84;
  const path = graph.points
    .map((point, index) => `${index ? "L" : "M"}${x(point.x)},${y(point.y)}`)
    .join(" ");
  return (
    <Card>
      <CardHeader>
        <p className="eyebrow">Analysis and graphing</p>
        <CardTitle>Make the evidence visible</CardTitle>
        <CardDescription>{detail.activity.activity.analysisPrompt}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div>
          <div className="rounded-lg border bg-slate-950 p-3">
            <svg
              viewBox="0 0 100 100"
              className="h-72 w-full"
              role="img"
              aria-label="Laboratory data graph"
              preserveAspectRatio="none"
            >
              <line x1="8" y1="92" x2="92" y2="92" stroke="#64748b" strokeWidth="0.5" />
              <line x1="8" y1="8" x2="8" y2="92" stroke="#64748b" strokeWidth="0.5" />
              {path ? (
                <path
                  d={path}
                  fill="none"
                  stroke="#67e8f9"
                  strokeWidth="1.2"
                  vectorEffect="non-scaling-stroke"
                />
              ) : null}
              {graph.points.map((point) => (
                <circle
                  key={point.rowIndex}
                  cx={x(point.x)}
                  cy={y(point.y)}
                  r="1.6"
                  fill="#fbbf24"
                />
              ))}
            </svg>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            {detail.activity.activity.graphingInstructions}
          </p>
        </div>
        <div className="space-y-3">
          <div className="rounded-lg border bg-muted/20 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Trendline
            </p>
            {graph.regression ? (
              <>
                <p className="mt-2 text-sm">
                  y = {graph.regression.slope.toPrecision(4)}x +{" "}
                  {graph.regression.intercept.toPrecision(4)}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  R² = {graph.regression.rSquared.toFixed(3)} · n = {graph.regression.count}
                </p>
              </>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">
                Record paired numeric values to calculate a trendline.
              </p>
            )}
          </div>
          {theoryComparisons.map((comparison) => (
            <div key={comparison.variableId} className="rounded-lg border bg-accent/5 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">
                Theory comparison
              </p>
              <p className="mt-2 text-sm">
                Measured {comparison.measuredValue.toPrecision(4)} · Expected{" "}
                {comparison.theoreticalValue.toPrecision(4)}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {comparison.percentError === null
                  ? "No percentage error"
                  : `${comparison.percentError.toFixed(2)}% error`}
                {comparison.withinUncertainty === null
                  ? ""
                  : comparison.withinUncertainty
                    ? " · within uncertainty"
                    : " · outside uncertainty"}
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function ReportEditor({
  detail,
  onSaved,
}: {
  detail: LaboratorySessionDetail;
  onSaved: (report: LaboratoryReportRecord) => void;
}) {
  const [draft, setDraft] = React.useState<ReportDraft | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);
  React.useEffect(() => {
    let cancelled = false;
    void fetch(`/api/laboratories/sessions/${detail.session.id}/report`)
      .then((response) =>
        readResponse<{ report: LaboratoryReportRecord | null; template: ReportDraft }>(response),
      )
      .then((body) => {
        if (!cancelled) setDraft(body.report ? toDraft(body.report) : body.template);
      })
      .catch((error) => {
        if (!cancelled)
          setMessage(error instanceof Error ? error.message : "Could not load the report editor.");
      });
    return () => {
      cancelled = true;
    };
  }, [detail.session.id]);

  function updateSection(index: number, body: string) {
    setDraft((current) =>
      current
        ? {
            ...current,
            sections: current.sections.map((section, sectionIndex) =>
              sectionIndex === index ? { ...section, body } : section,
            ),
          }
        : current,
    );
  }

  async function save(status: ReportDraft["status"]) {
    if (!draft) return;
    setSaving(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/laboratories/sessions/${detail.session.id}/report`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...draft, status }),
      });
      const body = await readResponse<{ report: LaboratoryReportRecord }>(response);
      onSaved(body.report);
      setDraft(toDraft(body.report));
      setMessage(status === "submitted" ? "Report submitted for feedback." : "Draft saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save the report.");
    } finally {
      setSaving(false);
    }
  }

  if (!draft)
    return (
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">
          Loading report editor…
        </CardContent>
      </Card>
    );
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="eyebrow">Scientific report</p>
            <CardTitle>Write up the experiment</CardTitle>
            <CardDescription>
              Structured sections stay editable as a draft, then become a submitted report with a
              reproducible HTML or PDF export.
            </CardDescription>
          </div>
          {detail.report ? (
            <Badge variant={detail.report.status === "submitted" ? "success" : "outline"}>
              {detail.report.status}
            </Badge>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="report-title">Report title</Label>
          <Input
            id="report-title"
            value={draft.title}
            onChange={(event) => setDraft({ ...draft, title: event.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="report-abstract">Abstract</Label>
          <textarea
            id="report-abstract"
            value={draft.abstract}
            onChange={(event) => setDraft({ ...draft, abstract: event.target.value })}
            className="min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            placeholder="Summarize the method and result."
          />
        </div>
        <div className="space-y-4">
          {draft.sections.map((section, index) => (
            <div key={section.id} className="space-y-2">
              <Label htmlFor={`report-section-${section.id}`}>{section.title}</Label>
              <textarea
                id={`report-section-${section.id}`}
                value={section.body}
                onChange={(event) => updateSection(index, event.target.value)}
                className="min-h-28 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
          ))}
        </div>
        <div className="space-y-2">
          <Label htmlFor="report-formulas">Formulas</Label>
          <textarea
            id="report-formulas"
            value={draft.formulas.join("\n")}
            onChange={(event) =>
              setDraft({ ...draft, formulas: event.target.value.split("\n").filter(Boolean) })
            }
            className="min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
            placeholder="One formula per line, for example V = IR"
          />
        </div>
        <div className="space-y-4 rounded-lg border bg-muted/10 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <Label>Report tables</Label>
              <p className="mt-1 text-xs text-muted-foreground">
                Add report-ready tables. Use a pipe between cells and one row per line.
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() =>
                setDraft({
                  ...draft,
                  tables: [
                    ...draft.tables,
                    {
                      id: "report-table-" + Date.now(),
                      title: "New data table",
                      headers: ["Column 1", "Column 2"],
                      rows: [["", ""]],
                    },
                  ],
                })
              }
            >
              Add table
            </Button>
          </div>
          {draft.tables.map((table, index) => (
            <div key={table.id} className="space-y-3 rounded-md border bg-background p-3">
              <div className="flex items-center gap-2">
                <Input
                  aria-label={"Table " + (index + 1) + " title"}
                  value={table.title}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      tables: draft.tables.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, title: event.target.value } : item,
                      ),
                    })
                  }
                />
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    setDraft({
                      ...draft,
                      tables: draft.tables.filter((_, itemIndex) => itemIndex !== index),
                    })
                  }
                >
                  Remove
                </Button>
              </div>
              <Input
                aria-label={"Table " + (index + 1) + " headers"}
                value={table.headers.join(" | ")}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    tables: draft.tables.map((item, itemIndex) =>
                      itemIndex === index
                        ? {
                            ...item,
                            headers: event.target.value
                              .split("|")
                              .map((value) => value.trim())
                              .filter(Boolean),
                          }
                        : item,
                    ),
                  })
                }
              />
              <textarea
                aria-label={"Table " + (index + 1) + " rows"}
                value={table.rows.map((row) => row.join(" | ")).join("\n")}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    tables: draft.tables.map((item, itemIndex) =>
                      itemIndex === index
                        ? { ...item, rows: parseReportTableRows(event.target.value) }
                        : item,
                    ),
                  })
                }
                rows={4}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder="value 1 | value 2"
              />
            </div>
          ))}
        </div>
        <ReportChartsEditor detail={detail} draft={draft} setDraft={setDraft} />
        <ReportImagesEditor draft={draft} setDraft={setDraft} />
        <div className="space-y-2">
          <Label htmlFor="report-conclusion">Conclusion</Label>
          <textarea
            id="report-conclusion"
            value={draft.conclusion}
            onChange={(event) => setDraft({ ...draft, conclusion: event.target.value })}
            className="min-h-32 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            placeholder={detail.activity.activity.conclusionPrompt}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => void save("draft")} disabled={saving}>
            <Save className="h-4 w-4" aria-hidden="true" />
            {saving ? "Saving…" : "Save draft"}
          </Button>
          <Button variant="outline" onClick={() => void save("submitted")} disabled={saving}>
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            Submit report
          </Button>
          {detail.report ? (
            <>
              <a
                className="inline-flex h-10 items-center gap-2 rounded-md border px-4 text-sm font-medium hover:bg-accent/10"
                href={`/api/laboratories/reports/${detail.report.id}/export?format=html`}
                target="_blank"
                rel="noreferrer"
              >
                <Download className="h-4 w-4" aria-hidden="true" />
                HTML export
              </a>
              <a
                className="inline-flex h-10 items-center gap-2 rounded-md border px-4 text-sm font-medium hover:bg-accent/10"
                href={`/api/laboratories/reports/${detail.report.id}/export?format=pdf`}
              >
                <Download className="h-4 w-4" aria-hidden="true" />
                PDF export
              </a>
            </>
          ) : null}
        </div>
        {message ? (
          <p role="status" className="text-sm text-muted-foreground">
            {message}
          </p>
        ) : null}
        {detail.report?.feedback.length ? (
          <div className="space-y-3 rounded-lg border bg-accent/5 p-4">
            <p className="font-semibold">Teacher feedback</p>
            {detail.report.feedback.map((feedback) => (
              <blockquote key={feedback.id} className="border-l-2 border-accent pl-3 text-sm">
                <p className="font-medium">{feedback.authorName}</p>
                <p className="mt-1 text-muted-foreground">{feedback.body}</p>
              </blockquote>
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

type SetReportDraft = React.Dispatch<React.SetStateAction<ReportDraft | null>>;

function parseReportTableRows(value: string): string[][] {
  return value
    .split(/\r?\n/)
    .filter((line) => line.trim())
    .map((line) => line.split("|").map((cell) => cell.trim()));
}

function ReportChartsEditor({
  detail,
  draft,
  setDraft,
}: {
  detail: LaboratorySessionDetail;
  draft: ReportDraft;
  setDraft: SetReportDraft;
}) {
  const variables = detail.activity.variables;
  return (
    <div className="space-y-4 rounded-lg border bg-muted/10 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Label>Report charts</Label>
          <p className="mt-1 text-xs text-muted-foreground">
            Charts use the recorded variable pairs and can include a trendline.
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={variables.length < 2}
          onClick={() =>
            setDraft({
              ...draft,
              charts: [
                ...draft.charts,
                {
                  id: "report-chart-" + Date.now(),
                  title: "Measured relationship",
                  xVariableId: variables[0]?.id ?? "",
                  yVariableId: variables[1]?.id ?? variables[0]?.id ?? "",
                  showTrendline: true,
                },
              ],
            })
          }
        >
          Add chart
        </Button>
      </div>
      {draft.charts.map((chart, index) => (
        <div key={chart.id} className="space-y-3 rounded-md border bg-background p-3">
          <div className="flex items-center gap-2">
            <Input
              aria-label={"Chart " + (index + 1) + " title"}
              value={chart.title}
              onChange={(event) =>
                setDraft({
                  ...draft,
                  charts: draft.charts.map((item, itemIndex) =>
                    itemIndex === index ? { ...item, title: event.target.value } : item,
                  ),
                })
              }
            />
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() =>
                setDraft({
                  ...draft,
                  charts: draft.charts.filter((_, itemIndex) => itemIndex !== index),
                })
              }
            >
              Remove
            </Button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <select
              className="field-select"
              aria-label={"Chart " + (index + 1) + " horizontal variable"}
              value={chart.xVariableId}
              onChange={(event) =>
                setDraft({
                  ...draft,
                  charts: draft.charts.map((item, itemIndex) =>
                    itemIndex === index ? { ...item, xVariableId: event.target.value } : item,
                  ),
                })
              }
            >
              {variables.map((variable) => (
                <option key={variable.id} value={variable.id}>
                  X: {variable.label}
                </option>
              ))}
            </select>
            <select
              className="field-select"
              aria-label={"Chart " + (index + 1) + " vertical variable"}
              value={chart.yVariableId}
              onChange={(event) =>
                setDraft({
                  ...draft,
                  charts: draft.charts.map((item, itemIndex) =>
                    itemIndex === index ? { ...item, yVariableId: event.target.value } : item,
                  ),
                })
              }
            >
              {variables.map((variable) => (
                <option key={variable.id} value={variable.id}>
                  Y: {variable.label}
                </option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={chart.showTrendline}
              onChange={(event) =>
                setDraft({
                  ...draft,
                  charts: draft.charts.map((item, itemIndex) =>
                    itemIndex === index ? { ...item, showTrendline: event.target.checked } : item,
                  ),
                })
              }
            />
            Show trendline
          </label>
        </div>
      ))}
    </div>
  );
}

function ReportImagesEditor({ draft, setDraft }: { draft: ReportDraft; setDraft: SetReportDraft }) {
  return (
    <div className="space-y-4 rounded-lg border bg-muted/10 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Label>Report images</Label>
          <p className="mt-1 text-xs text-muted-foreground">
            Add a safe image URL or data URL with accessible alt text and a caption.
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() =>
            setDraft({
              ...draft,
              images: [
                ...draft.images,
                {
                  id: "report-image-" + Date.now(),
                  src: "",
                  alt: "",
                  caption: "",
                },
              ],
            })
          }
        >
          Add image
        </Button>
      </div>
      {draft.images.map((image, index) => (
        <div key={image.id} className="space-y-3 rounded-md border bg-background p-3">
          <div className="flex items-center gap-2">
            <Input
              aria-label={"Image " + (index + 1) + " source"}
              value={image.src}
              onChange={(event) =>
                setDraft({
                  ...draft,
                  images: draft.images.map((item, itemIndex) =>
                    itemIndex === index ? { ...item, src: event.target.value } : item,
                  ),
                })
              }
              placeholder="https://… or data:image/…"
            />
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() =>
                setDraft({
                  ...draft,
                  images: draft.images.filter((_, itemIndex) => itemIndex !== index),
                })
              }
            >
              Remove
            </Button>
          </div>
          <Input
            aria-label={"Image " + (index + 1) + " alt text"}
            value={image.alt}
            onChange={(event) =>
              setDraft({
                ...draft,
                images: draft.images.map((item, itemIndex) =>
                  itemIndex === index ? { ...item, alt: event.target.value } : item,
                ),
              })
            }
            placeholder="Alternative text"
          />
          <Input
            aria-label={"Image " + (index + 1) + " caption"}
            value={image.caption}
            onChange={(event) =>
              setDraft({
                ...draft,
                images: draft.images.map((item, itemIndex) =>
                  itemIndex === index ? { ...item, caption: event.target.value } : item,
                ),
              })
            }
            placeholder="Caption"
          />
        </div>
      ))}
    </div>
  );
}

function toDraft(report: LaboratoryReportRecord): ReportDraft {
  return {
    status: report.status,
    title: report.title,
    abstract: report.abstract,
    sections: report.sections,
    tables: report.tables,
    charts: report.charts,
    formulas: report.formulas,
    images: report.images,
    conclusion: report.conclusion,
  };
}
