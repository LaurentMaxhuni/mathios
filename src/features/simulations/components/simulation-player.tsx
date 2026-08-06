"use client";

import * as React from "react";
import { Download, Expand, Pause, Play, RotateCcw, Save, Square } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type Value = string | number | boolean;
type Input = {
  key: string;
  label: string;
  type: "number" | "range" | "toggle" | "select";
  defaultValue: Value;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  options?: readonly { value: string; label: string }[];
};
type Definition = {
  id: string;
  slug: string;
  title: string;
  inputs: readonly Input[];
  outputs: readonly {
    key: string;
    label: string;
    type: "value" | "line" | "table" | "text";
    unit?: string;
  }[];
  guidedTasks: readonly {
    id: string;
    title: string;
    instruction: string;
    targetInput?: string;
    targetValue?: number;
    tolerance?: number;
  }[];
};
type Frame = {
  time: number;
  values: Record<string, Value>;
  series: Record<string, readonly { x: number; y: number }[]>;
  table: readonly Record<string, Value>[];
};
type Preset = { id: string; name: string; values: Record<string, Value> };

export function SimulationPlayer({
  simulationId,
  definition,
  presets,
}: {
  simulationId: string;
  definition: Definition;
  presets: readonly Preset[];
}) {
  const [inputs, setInputs] = React.useState<Record<string, Value>>(() =>
    Object.fromEntries(definition.inputs.map((input) => [input.key, input.defaultValue])),
  );
  const [state, setState] = React.useState<Record<string, number>>({ time: 0 });
  const [frame, setFrame] = React.useState<Frame>({ time: 0, values: {}, series: {}, table: [] });
  const [sessionId, setSessionId] = React.useState<string | null>(null);
  const [playing, setPlaying] = React.useState(false);
  const [elapsed, setElapsed] = React.useState(0);
  const [message, setMessage] = React.useState("");
  const [fullscreen, setFullscreen] = React.useState(false);
  const [presetName, setPresetName] = React.useState("");
  const inputsRef = React.useRef(inputs);
  const stateRef = React.useRef(state);
  const frameAbortRef = React.useRef<AbortController | null>(null);
  const frameRequestRef = React.useRef(0);

  React.useEffect(() => {
    inputsRef.current = inputs;
  }, [inputs]);

  const refreshFrame = React.useCallback(
    async (deltaSeconds = 0) => {
      frameAbortRef.current?.abort();
      const controller = new AbortController();
      frameAbortRef.current = controller;
      const requestId = ++frameRequestRef.current;
      try {
        const response = await fetch(`/api/simulations/${simulationId}/frame`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            inputs: inputsRef.current,
            state: stateRef.current,
            deltaSeconds,
          }),
          signal: controller.signal,
        });
        if (!response.ok || requestId !== frameRequestRef.current) return;
        const next = (await response.json()) as { state: Record<string, number>; frame: Frame };
        stateRef.current = next.state;
        setState(next.state);
        setFrame(next.frame);
      } catch (error) {
        if (
          (error instanceof DOMException && error.name === "AbortError") ||
          (error instanceof Error && error.name === "AbortError")
        )
          return;
        setMessage("The model could not calculate the next frame.");
      } finally {
        if (frameAbortRef.current === controller) frameAbortRef.current = null;
      }
    },
    [simulationId],
  );

  React.useEffect(() => () => frameAbortRef.current?.abort(), []);

  React.useEffect(() => {
    if (!fullscreen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setFullscreen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [fullscreen]);

  React.useEffect(() => {
    void refreshFrame();
  }, [inputs, refreshFrame]);
  React.useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => {
      setElapsed((value) => value + 1);
      void refreshFrame(0.25);
    }, 250);
    return () => window.clearInterval(timer);
  }, [playing, refreshFrame]);
  React.useEffect(() => {
    void fetch(`/api/simulations/${simulationId}/sessions`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ presetValues: inputs }),
    }).then(async (response) => {
      if (response.ok)
        setSessionId(((await response.json()) as { session: { id: string } }).session.id);
    });
    // The first request establishes a durable learner session; live frames stay local to the player.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [simulationId]);

  function setInput(key: string, value: Value) {
    const nextInputs = { ...inputsRef.current, [key]: value };
    inputsRef.current = nextInputs;
    setInputs(nextInputs);
    stateRef.current = { time: 0 };
    setState({ time: 0 });
  }
  function reset() {
    setPlaying(false);
    setElapsed(0);
    stateRef.current = { time: 0 };
    setState({ time: 0 });
    void refreshFrame();
  }
  async function saveProgress(status: "active" | "paused") {
    if (!sessionId) return;
    await fetch(`/api/simulations/sessions/${sessionId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status, inputs, state, elapsedSeconds: elapsed }),
    });
  }
  async function complete() {
    if (!sessionId) return;
    const response = await fetch(`/api/simulations/sessions/${sessionId}/complete`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ inputs, state, elapsedSeconds: elapsed }),
    });
    setMessage(
      response.ok ? "Result saved to your learning history." : "Could not save the result.",
    );
  }
  async function savePreset() {
    if (!presetName.trim()) return;
    const response = await fetch(`/api/simulations/${simulationId}/presets`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: presetName, values: inputs }),
    });
    setMessage(response.ok ? `Preset “${presetName}” saved.` : "Could not save the preset.");
    if (response.ok) setPresetName("");
  }
  function exportResult() {
    const blob = new Blob(
      [
        JSON.stringify(
          { simulation: definition.title, inputs, frame, elapsedSeconds: elapsed },
          null,
          2,
        ),
      ],
      { type: "application/json" },
    );
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${definition.slug}-result.json`;
    link.click();
    URL.revokeObjectURL(link.href);
  }
  const completedTasks = definition.guidedTasks.filter(
    (task) =>
      task.targetInput &&
      task.targetValue !== undefined &&
      Math.abs(Number(inputs[task.targetInput]) - task.targetValue) <= (task.tolerance ?? 0.01),
  ).length;

  return (
    <div
      className={fullscreen ? "fixed inset-0 z-50 overflow-y-auto bg-background p-4 sm:p-8" : ""}
      role={fullscreen ? "dialog" : undefined}
      aria-modal={fullscreen ? "true" : undefined}
      aria-label={fullscreen ? "Fullscreen simulation player" : undefined}
    >
      <Card className="overflow-hidden">
        <CardHeader className="border-b bg-muted/20">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="mb-2 flex items-center gap-2">
                <Badge variant="outline">Interactive model</Badge>
                <Badge variant="success">{frame.time.toFixed(1)} s</Badge>
              </div>
              <CardTitle>{definition.title}</CardTitle>
              <CardDescription>
                Adjust a control, run the model, and save an evidence-backed result.
              </CardDescription>
            </div>
            <p className="sr-only">Current model time {frame.time.toFixed(1)} seconds.</p>
            <Button variant="ghost" size="sm" onClick={() => setFullscreen((value) => !value)}>
              <Expand className="h-4 w-4" aria-hidden="true" />
              {fullscreen ? "Exit fullscreen" : "Fullscreen"}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="grid gap-6 p-4 sm:p-6 lg:grid-cols-[18rem_minmax(0,1fr)]">
          <aside className="space-y-5" aria-label="Simulation controls">
            <div className="space-y-4">
              {definition.inputs.map((input) => (
                <label key={input.key} className="block text-sm">
                  <span className="flex justify-between gap-2 font-medium">
                    <span>{input.label}</span>
                    <span className="text-muted-foreground">
                      {String(inputs[input.key])}
                      {input.unit ? ` ${input.unit}` : ""}
                    </span>
                  </span>
                  {input.type === "toggle" ? (
                    <input
                      className="mt-2"
                      type="checkbox"
                      checked={Boolean(inputs[input.key])}
                      onChange={(event) => setInput(input.key, event.target.checked)}
                    />
                  ) : input.type === "select" ? (
                    <select
                      className="mt-2 w-full rounded-md border bg-background px-3 py-2"
                      value={String(inputs[input.key])}
                      onChange={(event) => setInput(input.key, event.target.value)}
                    >
                      {input.options?.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      className="mt-3 w-full accent-primary"
                      type={input.type === "number" ? "number" : "range"}
                      min={input.min}
                      max={input.max}
                      step={input.step}
                      value={Number(inputs[input.key])}
                      onChange={(event) => setInput(input.key, Number(event.target.value))}
                    />
                  )}
                </label>
              ))}
            </div>
            {presets.length ? (
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Presets
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {presets.map((preset) => (
                    <Button
                      key={preset.id}
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setInputs((current) => ({ ...current, ...preset.values }));
                        setState({ time: 0 });
                      }}
                    >
                      {preset.name}
                    </Button>
                  ))}
                </div>
                <div className="mt-3 flex gap-2">
                  <input
                    aria-label="New preset name"
                    className="min-w-0 flex-1 rounded-md border bg-background px-3 py-2 text-sm"
                    placeholder="Name this setup"
                    value={presetName}
                    onChange={(event) => setPresetName(event.target.value)}
                  />
                  <Button size="sm" variant="outline" onClick={() => void savePreset()}>
                    <Save className="h-4 w-4" aria-hidden="true" />
                    Save
                  </Button>
                </div>
              </div>
            ) : null}
            {definition.guidedTasks.length ? (
              <div className="rounded-lg border bg-accent/5 p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">
                  Guided task · {completedTasks}/{definition.guidedTasks.length}
                </p>
                {definition.guidedTasks.map((task) => (
                  <p key={task.id} className="mt-2 text-sm">
                    {task.instruction}
                  </p>
                ))}
              </div>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                onClick={() => {
                  setPlaying((value) => !value);
                  void saveProgress(playing ? "paused" : "active");
                }}
              >
                {playing ? (
                  <Pause className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Play className="h-4 w-4" aria-hidden="true" />
                )}
                {playing ? "Pause" : "Run"}
              </Button>
              <Button size="sm" variant="outline" onClick={reset}>
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
                Reset
              </Button>
              <Button size="sm" variant="outline" onClick={() => void complete()}>
                <Square className="h-4 w-4" aria-hidden="true" />
                Complete
              </Button>
            </div>
          </aside>
          <div className="min-w-0 space-y-5">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {definition.outputs
                .filter((output) => output.type === "value" || output.type === "text")
                .map((output) => (
                  <div key={output.key} className="rounded-lg border bg-muted/30 p-3">
                    <p className="text-xs text-muted-foreground">{output.label}</p>
                    <p className="mt-1 text-xl font-semibold">
                      {String(frame.values[output.key] ?? "—")}
                      <span className="ml-1 text-xs font-normal text-muted-foreground">
                        {output.unit}
                      </span>
                    </p>
                  </div>
                ))}
            </div>
            <Graph frame={frame} />
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-left text-sm">
                <caption className="sr-only">Current simulation values</caption>
                <thead className="bg-muted/40">
                  <tr>
                    <th scope="col" className="px-3 py-2">
                      Time
                    </th>
                    {Object.keys(frame.values).map((key) => (
                      <th scope="col" className="px-3 py-2" key={key}>
                        {key}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="px-3 py-2">{frame.time.toFixed(2)}</td>
                    {Object.keys(frame.values).map((key) => (
                      <td className="px-3 py-2" key={key}>
                        {String(frame.values[key])}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" onClick={exportResult}>
                <Download className="h-4 w-4" aria-hidden="true" />
                Export results
              </Button>
              {message ? (
                <span className="text-sm text-muted-foreground" role="status" aria-live="polite">
                  {message}
                </span>
              ) : null}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Graph({ frame }: { frame: Frame }) {
  const series = Object.entries(frame.series).find(([, values]) => values.length > 1)?.[1];
  if (!series)
    return (
      <div className="grid min-h-48 place-items-center rounded-lg border border-dashed bg-muted/20 text-sm text-muted-foreground">
        Adjust the controls to reveal the model output.
      </div>
    );
  const maxX = Math.max(...series.map((point) => point.x), 1);
  const minY = Math.min(...series.map((point) => point.y), 0);
  const maxY = Math.max(...series.map((point) => point.y), 1);
  const path = series
    .map(
      (point, index) =>
        `${index ? "L" : "M"}${(point.x / maxX) * 100},${100 - ((point.y - minY) / Math.max(maxY - minY, 0.001)) * 100}`,
    )
    .join(" ");
  return (
    <div className="rounded-lg border bg-slate-950 p-3">
      <svg
        viewBox="0 0 100 100"
        className="h-64 w-full"
        role="img"
        aria-label="Simulation graph"
        preserveAspectRatio="none"
      >
        <path
          d={path}
          fill="none"
          stroke="#67e8f9"
          strokeWidth="1.5"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </div>
  );
}
