"use client";

import * as React from "react";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock3,
  Flag,
  GripVertical,
  Loader2,
  MoveRight,
  PanelRight,
  Plus,
  RefreshCw,
  Sparkles,
  Target,
  TriangleAlert,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type {
  PlannerDashboard,
  PlannerOptions,
  StudyAvailabilityRecord,
  StudyGoalRecord,
  StudyPlanDetail,
  StudySessionRecord,
  Weekday,
} from "@/domain/planner/types";
import {
  DEFAULT_STUDY_AVAILABILITY,
  addDateOnly,
  formatMinute,
  weekdayForDate,
} from "@/domain/planner/rules";

type CalendarView = "month" | "week" | "agenda";

const weekdayLabels: readonly { value: Weekday; short: string; name: string }[] = [
  { value: 1, short: "Mon", name: "Monday" },
  { value: 2, short: "Tue", name: "Tuesday" },
  { value: 3, short: "Wed", name: "Wednesday" },
  { value: 4, short: "Thu", name: "Thursday" },
  { value: 5, short: "Fri", name: "Friday" },
  { value: 6, short: "Sat", name: "Saturday" },
  { value: 7, short: "Sun", name: "Sunday" },
];

const itemColors: Record<StudySessionRecord["itemType"], string> = {
  lesson: "border-l-subject-mathematics bg-subject-mathematics/10",
  exercise: "border-l-subject-physics bg-subject-physics/10",
  review: "border-l-accent bg-accent/10",
  simulation: "border-l-subject-astronomy bg-subject-astronomy/10",
  laboratory: "border-l-subject-biology bg-subject-biology/10",
  assessment: "border-l-subject-chemistry bg-subject-chemistry/10",
  "catch-up": "border-l-destructive bg-destructive/10",
};

function toDate(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

function startOfWeek(value: string): string {
  return addDateOnly(value, 1 - weekdayForDate(value));
}

function startOfMonth(value: string): string {
  return `${value.slice(0, 7)}-01`;
}

function endOfMonth(value: string): string {
  const date = toDate(startOfMonth(value));
  date.setUTCMonth(date.getUTCMonth() + 1, 0);
  return date.toISOString().slice(0, 10);
}

function visibleDates(anchor: string, view: CalendarView): readonly string[] {
  if (view === "week")
    return Array.from({ length: 7 }, (_, index) => addDateOnly(startOfWeek(anchor), index));
  if (view === "agenda")
    return Array.from({ length: 14 }, (_, index) => addDateOnly(anchor, index));
  const first = startOfWeek(startOfMonth(anchor));
  const last = endOfMonth(anchor);
  const count = Math.max(
    35,
    Math.ceil((toDate(last).getTime() - toDate(first).getTime()) / 86400000) + 1,
  );
  return Array.from({ length: count }, (_, index) => addDateOnly(first, index));
}

function humanDate(
  value: string,
  options: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" },
): string {
  return new Intl.DateTimeFormat("en", { ...options, timeZone: "UTC" }).format(toDate(value));
}

function monthTitle(value: string): string {
  return new Intl.DateTimeFormat("en", { month: "long", year: "numeric", timeZone: "UTC" }).format(
    toDate(value),
  );
}

function minutesBetween(sessions: readonly StudySessionRecord[]): number {
  return sessions.reduce((total, session) => total + session.durationMinutes, 0);
}

async function readResponse<T>(response: Response): Promise<T> {
  const body = (await response.json().catch(() => ({}))) as { message?: string } & T;
  if (!response.ok) throw new Error(body.message ?? "The planner request failed.");
  return body as T;
}

function targetOptions(type: StudyGoalRecord["goalType"], options: PlannerOptions) {
  if (type === "roadmap-completion")
    return options.roadmaps.map((item) => ({ id: item.id, title: item.title }));
  if (type === "course-completion")
    return options.courses.map((item) => ({ id: item.id, title: item.title }));
  if (type === "grade-completion") return options.grades;
  if (type === "subject-completion") return options.subjects;
  if (type === "exam-preparation")
    return options.assessments.map((item) => ({ id: item.id, title: item.title }));
  if (type === "concept-mastery")
    return options.concepts.map((item) => ({ id: item.id, title: item.title }));
  return [];
}

export function PlannerWorkspace({
  initialDashboard,
  initialOptions,
}: {
  initialDashboard: PlannerDashboard;
  initialOptions: PlannerOptions;
}) {
  const [dashboard, setDashboard] = React.useState(initialDashboard);
  const [options, setOptions] = React.useState(initialOptions);
  const [view, setView] = React.useState<CalendarView>("month");
  const [anchor, setAnchor] = React.useState(initialDashboard.today);
  const [busy, setBusy] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);
  const [showGoalForm, setShowGoalForm] = React.useState(!initialDashboard.activePlan);

  const dates = visibleDates(anchor, view);
  const activePlan = dashboard.activePlan;
  const sessions = activePlan?.sessions ?? dashboard.sessions;
  const progress = activePlan ? planProgress(activePlan) : { complete: 0, total: 0, percentage: 0 };

  async function refresh() {
    const range = { from: dates[0], to: dates[dates.length - 1] };
    const query = new URLSearchParams(range);
    const body = await readResponse<{ dashboard: PlannerDashboard; options: PlannerOptions }>(
      await fetch(`/api/planner?${query.toString()}`),
    );
    setDashboard(body.dashboard);
    setOptions(body.options);
  }

  async function runMutation(action: () => Promise<void>, successMessage: string) {
    setBusy(true);
    setMessage(null);
    try {
      await action();
      await refresh();
      setMessage(successMessage);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "The planner could not save that change.",
      );
    } finally {
      setBusy(false);
    }
  }

  function moveAnchor(direction: -1 | 1) {
    const step = view === "month" ? 28 : view === "week" ? 7 : 14;
    setAnchor(addDateOnly(anchor, direction * step));
  }

  async function moveSession(sessionId: string, scheduledDate: string, startMinute: number) {
    await runMutation(async () => {
      await readResponse(
        await fetch(`/api/planner/sessions/${sessionId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ scheduledDate, startMinute }),
        }),
      );
    }, "Session moved. The rest of the plan stays anchored.");
  }

  async function setSessionStatus(sessionId: string, status: "completed" | "skipped" | "missed") {
    await runMutation(
      async () => {
        await readResponse(
          await fetch(`/api/planner/sessions/${sessionId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              status,
              reason: status === "skipped" ? "Skipped from the planner." : "",
            }),
          }),
        );
      },
      status === "completed"
        ? "Session complete — progress has been carried into the learning graph."
        : `Session marked ${status}.`,
    );
  }

  async function regenerate(goalId: string) {
    await runMutation(async () => {
      await readResponse(await fetch(`/api/planner/goals/${goalId}/generate`, { method: "POST" }));
    }, "A fresh schedule is ready.");
  }

  async function moveMissed() {
    if (!activePlan) return;
    await runMutation(async () => {
      await readResponse(
        await fetch(`/api/planner/plans/${activePlan.plan.id}/reschedule-missed`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ asOfDate: dashboard.today }),
        }),
      );
    }, "Missed work was redistributed into the remaining window.");
  }

  async function saveAvailability(
    slots: readonly Omit<StudyAvailabilityRecord, "id" | "profileId" | "createdAt" | "updatedAt">[],
  ) {
    await runMutation(async () => {
      await readResponse(
        await fetch("/api/planner/availability", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slots }),
        }),
      );
    }, "Availability windows saved.");
  }

  async function addException(date: string, reason: string) {
    await runMutation(async () => {
      await readResponse(
        await fetch("/api/planner/exceptions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ exceptionDate: date, kind: "unavailable", reason }),
        }),
      );
    }, "Calendar exception added. Regenerate if you want the plan to absorb it.");
  }

  async function removeException(id: string) {
    await runMutation(async () => {
      await readResponse(
        await fetch(`/api/planner/exceptions?id=${encodeURIComponent(id)}`, { method: "DELETE" }),
      );
    }, "Calendar exception removed.");
  }

  return (
    <div className="mt-7 space-y-6">
      <section className="relative overflow-hidden rounded-[1.8rem] border border-primary/20 bg-primary px-6 py-7 text-primary-foreground shadow-soft sm:px-8 lg:px-10 lg:py-9">
        <div
          className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full border-[38px] border-accent/20"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute bottom-0 right-28 h-32 w-32 rotate-12 border border-primary-foreground/10"
          aria-hidden="true"
        />
        <div className="relative grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.26em] text-accent">
              The next useful hour
            </p>
            <h1 className="mt-3 max-w-3xl text-3xl font-semibold tracking-tight sm:text-5xl">
              Study with a shape, not a wish.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-primary-foreground/70 sm:text-base">
              Turn a roadmap, course, or exam target into a calm sequence of sessions. The planner
              keeps the workload visible and bends when real life does.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <HeroMetric label="Scheduled" value={`${minutesBetween(sessions)}m`} />
            <HeroMetric label="Complete" value={`${progress.percentage}%`} />
            <HeroMetric
              label="To target"
              value={
                activePlan
                  ? humanDate(activePlan.goal.targetDate, { month: "short", day: "numeric" })
                  : "—"
              }
            />
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="min-w-0 space-y-5" aria-labelledby="planner-calendar-heading">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <p className="eyebrow">Calendar cockpit</p>
              <h2
                id="planner-calendar-heading"
                className="mt-1 text-2xl font-semibold tracking-tight"
              >
                {view === "agenda" ? "Your next sessions" : monthTitle(anchor)}
              </h2>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div
                className="flex rounded-lg border bg-card p-1"
                role="tablist"
                aria-label="Calendar view"
              >
                {(["month", "week", "agenda"] as const).map((option) => (
                  <button
                    key={option}
                    type="button"
                    role="tab"
                    id={`planner-${option}-tab`}
                    aria-controls={`planner-${option}-panel`}
                    aria-selected={view === option}
                    onClick={() => setView(option)}
                    className={`rounded-md px-3 py-1.5 text-xs font-semibold capitalize transition-colors ${view === option ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
                  >
                    {option}
                  </button>
                ))}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setAnchor(dashboard.today)}
              >
                Today
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label="Previous calendar period"
                onClick={() => moveAnchor(-1)}
              >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label="Next calendar period"
                onClick={() => moveAnchor(1)}
              >
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
          </div>

          {message ? (
            <div
              className="flex items-center gap-2 rounded-lg border border-accent/25 bg-accent/10 px-4 py-3 text-sm text-accent"
              role="status"
              aria-live="polite"
            >
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              {message}
            </div>
          ) : null}

          {activePlan ? (
            <PlanStrip
              plan={activePlan}
              progress={progress}
              busy={busy}
              onRegenerate={() => void regenerate(activePlan.goal.id)}
              onMoveMissed={() => void moveMissed()}
            />
          ) : (
            <Card className="border-dashed border-accent/30 bg-accent/5">
              <CardContent className="flex flex-col items-start gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold">Give the week a direction.</p>
                  <p className="mt-1 max-w-xl text-sm leading-6 text-muted-foreground">
                    Create a goal on the right and Mathios will turn the existing learning catalog
                    into sessions you can actually see.
                  </p>
                </div>
                <Button type="button" onClick={() => setShowGoalForm(true)}>
                  <Plus className="h-4 w-4" aria-hidden="true" /> Create a goal
                </Button>
              </CardContent>
            </Card>
          )}

          <div
            id={`planner-${view}-panel`}
            role="tabpanel"
            aria-labelledby={`planner-${view}-tab`}
            tabIndex={0}
          >
            {view === "agenda" ? (
              <AgendaView dates={dates} sessions={sessions} onStatus={setSessionStatus} />
            ) : (
              <CalendarViewGrid
                view={view}
                dates={dates}
                anchor={anchor}
                sessions={sessions}
                onStatus={setSessionStatus}
                onMove={moveSession}
              />
            )}
          </div>
        </section>

        <aside className="space-y-5">
          {showGoalForm || !dashboard.goals.length ? (
            <GoalComposer
              options={options}
              today={dashboard.today}
              busy={busy}
              onCreated={() => {
                setShowGoalForm(false);
                void refresh();
              }}
              onCancel={() => setShowGoalForm(false)}
            />
          ) : (
            <GoalList
              goals={dashboard.goals}
              activeGoalId={activePlan?.goal.id ?? null}
              onNew={() => setShowGoalForm(true)}
              onGenerate={regenerate}
              busy={busy}
            />
          )}
          <AvailabilityCard
            availability={dashboard.availability}
            busy={busy}
            onSave={saveAvailability}
          />
          <ExceptionsCard
            exceptions={dashboard.exceptions}
            busy={busy}
            onAdd={addException}
            onRemove={removeException}
          />
          {activePlan?.conflicts.length ? <ConflictCard plan={activePlan} /> : null}
        </aside>
      </div>
    </div>
  );
}

function planProgress(plan: StudyPlanDetail) {
  const total = plan.sessions.length;
  const complete = plan.sessions.filter((session) => session.status === "completed").length;
  return { complete, total, percentage: total ? Math.round((complete / total) * 100) : 0 };
}

function HeroMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-20 rounded-xl border border-primary-foreground/10 bg-primary-foreground/10 px-3 py-3 text-center">
      <p className="text-lg font-semibold sm:text-xl">{value}</p>
      <p className="mt-1 text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-primary-foreground/50">
        {label}
      </p>
    </div>
  );
}

function PlanStrip({
  plan,
  progress,
  busy,
  onRegenerate,
  onMoveMissed,
}: {
  plan: StudyPlanDetail;
  progress: { complete: number; total: number; percentage: number };
  busy: boolean;
  onRegenerate: () => void;
  onMoveMissed: () => void;
}) {
  const missed = plan.sessions.filter((session) => session.status === "missed").length;
  return (
    <Card className="overflow-hidden border-primary/15">
      <div className="h-1 bg-gradient-to-r from-accent via-subject-astronomy to-subject-chemistry" />
      <CardContent className="p-5">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={plan.plan.realism === "realistic" ? "success" : "warning"}>
                {plan.plan.realism}
              </Badge>
              <Badge variant="outline">{plan.goal.goalType.replaceAll("-", " ")}</Badge>
            </div>
            <h3 className="mt-2 truncate text-lg font-semibold">{plan.goal.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {plan.plan.scheduledMinutes} of {plan.plan.totalMinutes} minutes placed · target{" "}
              {humanDate(plan.goal.targetDate, { month: "short", day: "numeric", year: "numeric" })}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onRegenerate}
              disabled={busy}
            >
              <RefreshCw className="h-4 w-4" aria-hidden="true" /> Rebuild
            </Button>
            {missed ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onMoveMissed}
                disabled={busy}
              >
                <MoveRight className="h-4 w-4" aria-hidden="true" /> Move {missed} missed
              </Button>
            ) : null}
          </div>
        </div>
        <div className="mt-5">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>
              {progress.complete} of {progress.total} sessions complete
            </span>
            <span>{progress.percentage}%</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-accent transition-all"
              style={{ width: `${progress.percentage}%` }}
            />
          </div>
        </div>
        {plan.plan.warnings.length ? (
          <div className="mt-4 flex gap-2 rounded-lg bg-warning/10 p-3 text-xs leading-5 text-muted-foreground">
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
            <span>{plan.plan.warnings.join(" ")}</span>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function CalendarViewGrid({
  view,
  dates,
  anchor,
  sessions,
  onStatus,
  onMove,
}: {
  view: "month" | "week";
  dates: readonly string[];
  anchor: string;
  sessions: readonly StudySessionRecord[];
  onStatus: (id: string, status: "completed" | "skipped" | "missed") => void;
  onMove: (id: string, date: string, minute: number) => void;
}) {
  const columns = view === "week" ? dates : dates;
  const gridClass = view === "week" ? "grid-cols-7" : "grid-cols-7";
  const sessionsByDate = React.useMemo(() => {
    const grouped = new Map<string, StudySessionRecord[]>();
    for (const session of sessions) {
      const dateSessions = grouped.get(session.scheduledDate) ?? [];
      dateSessions.push(session);
      grouped.set(session.scheduledDate, dateSessions);
    }
    return grouped;
  }, [sessions]);
  return (
    <Card
      className="overflow-hidden"
      role="grid"
      aria-label={view === "week" ? "Weekly study calendar" : "Monthly study calendar"}
    >
      <div className={`grid ${gridClass} border-b bg-muted/35`} role="row">
        {weekdayLabels.map((day) => (
          <div
            key={day.value}
            role="columnheader"
            aria-label={day.name}
            className="border-r px-2 py-2 text-center text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground last:border-r-0 sm:px-3"
          >
            <span className="sm:hidden">{day.short.slice(0, 1)}</span>
            <span className="hidden sm:inline">{day.short}</span>
          </div>
        ))}
      </div>
      <div className={`grid ${gridClass}`} role="row">
        {columns.map((date) => (
          <CalendarDay
            key={date}
            date={date}
            currentMonth={date.slice(0, 7) === anchor.slice(0, 7)}
            sessions={sessionsByDate.get(date) ?? []}
            onStatus={onStatus}
            onMove={onMove}
          />
        ))}
      </div>
    </Card>
  );
}

function CalendarDay({
  date,
  currentMonth,
  sessions,
  onStatus,
  onMove,
}: {
  date: string;
  currentMonth: boolean;
  sessions: readonly StudySessionRecord[];
  onStatus: (id: string, status: "completed" | "skipped" | "missed") => void;
  onMove: (id: string, date: string, minute: number) => void;
}) {
  const isToday = date === new Date().toISOString().slice(0, 10);
  return (
    <div
      role="gridcell"
      aria-label={`${humanDate(date, { weekday: "long", month: "long", day: "numeric" })}${sessions.length ? `, ${sessions.length} ${sessions.length === 1 ? "session" : "sessions"}` : ", no sessions"}`}
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        const sessionId = event.dataTransfer.getData("text/plain");
        if (sessionId) onMove(sessionId, date, 18 * 60);
      }}
      className={`min-h-32 border-b border-r p-2 transition-colors hover:bg-accent/5 sm:min-h-40 ${!currentMonth ? "bg-muted/15 text-muted-foreground" : "bg-card"} ${isToday ? "bg-accent/[0.06]" : ""}`}
    >
      <div className="flex items-center justify-between">
        <span
          className={`grid h-7 w-7 place-items-center rounded-full text-xs font-semibold ${isToday ? "bg-accent text-accent-foreground" : ""}`}
        >
          {Number(date.slice(-2))}
        </span>
        {sessions.length ? (
          <span className="text-[0.62rem] text-muted-foreground">{minutesBetween(sessions)}m</span>
        ) : null}
      </div>
      <div className="mt-2 space-y-1.5">
        {sessions.map((session) => (
          <SessionChip key={session.id} session={session} onStatus={onStatus} />
        ))}
      </div>
    </div>
  );
}

function SessionChip({
  session,
  onStatus,
}: {
  session: StudySessionRecord;
  onStatus: (id: string, status: "completed" | "skipped" | "missed") => void;
}) {
  const done = session.status === "completed";
  const closed = done || session.status === "skipped" || session.status === "cancelled";
  return (
    <div
      draggable={!closed}
      onDragStart={(event) => event.dataTransfer.setData("text/plain", session.id)}
      className={`group rounded-md border border-l-[3px] px-2 py-1.5 text-left text-xs shadow-sm ${itemColors[session.itemType]} ${closed ? "opacity-60" : ""}`}
      role="group"
      aria-label={`${session.title}, ${formatMinute(session.startMinute)}, ${session.durationMinutes} minutes, ${session.status}`}
      title={`${session.title} · ${formatMinute(session.startMinute)} · ${session.durationMinutes} minutes`}
    >
      <div className="flex items-start gap-1.5">
        <GripVertical
          className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground/50 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100"
          aria-hidden="true"
        />
        <span className={`line-clamp-2 min-w-0 flex-1 font-medium ${done ? "line-through" : ""}`}>
          {session.title}
        </span>
      </div>
      <div className="mt-1 flex items-center justify-between gap-1 text-[0.65rem] text-muted-foreground">
        <span>
          {formatMinute(session.startMinute)} · {session.durationMinutes}m
        </span>
        {closed ? (
          <span className="font-semibold capitalize text-accent">{session.status}</span>
        ) : (
          <span className="flex items-center gap-1">
            <button
              type="button"
              aria-label={`Skip ${session.title}`}
              className="rounded px-1 py-0.5 text-[0.6rem] font-semibold opacity-0 transition-opacity hover:bg-muted group-hover:opacity-100 focus:opacity-100"
              onClick={() => onStatus(session.id, "skipped")}
            >
              Skip
            </button>
            <button
              type="button"
              aria-label={`Complete ${session.title}`}
              className="rounded p-0.5 opacity-0 transition-opacity hover:bg-accent/20 group-hover:opacity-100 focus:opacity-100"
              onClick={() => onStatus(session.id, "completed")}
            >
              <Check className="h-3 w-3" aria-hidden="true" />
            </button>
          </span>
        )}
      </div>
    </div>
  );
}

function AgendaView({
  dates,
  sessions,
  onStatus,
}: {
  dates: readonly string[];
  sessions: readonly StudySessionRecord[];
  onStatus: (id: string, status: "completed" | "skipped" | "missed") => void;
}) {
  return (
    <div className="space-y-3">
      {dates.map((date) => {
        const rows = sessions.filter((session) => session.scheduledDate === date);
        return (
          <Card key={date} className={rows.length ? "" : "border-dashed bg-muted/15"}>
            <CardContent className="p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                <div className="w-28 shrink-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-accent">
                    {humanDate(date, { weekday: "short" })}
                  </p>
                  <p className="mt-1 text-lg font-semibold">{humanDate(date)}</p>
                </div>
                <div className="min-w-0 flex-1 space-y-2">
                  {rows.length ? (
                    rows.map((session) => (
                      <AgendaSession key={session.id} session={session} onStatus={onStatus} />
                    ))
                  ) : (
                    <p className="py-2 text-sm text-muted-foreground">
                      A clear day. Keep it clear, or drag a session here.
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function AgendaSession({
  session,
  onStatus,
}: {
  session: StudySessionRecord;
  onStatus: (id: string, status: "completed" | "skipped" | "missed") => void;
}) {
  const closed =
    session.status === "completed" ||
    session.status === "skipped" ||
    session.status === "cancelled";
  return (
    <div
      draggable={!closed}
      onDragStart={(event) => event.dataTransfer.setData("text/plain", session.id)}
      className={`flex flex-col justify-between gap-3 rounded-xl border border-l-4 p-3 sm:flex-row sm:items-center ${itemColors[session.itemType]}`}
    >
      <div className="flex min-w-0 items-start gap-3">
        <span className="mt-1 text-xs font-semibold text-muted-foreground">
          {formatMinute(session.startMinute)}
        </span>
        <div className="min-w-0">
          <p
            className={`font-medium ${session.status === "completed" ? "line-through opacity-60" : ""}`}
          >
            {session.title}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {session.itemType.replaceAll("-", " ")} · {session.durationMinutes} minutes
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Badge
          variant={
            session.status === "completed"
              ? "success"
              : session.status === "missed"
                ? "warning"
                : "outline"
          }
        >
          {session.status}
        </Badge>
        {!closed ? (
          <>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => onStatus(session.id, "skipped")}
            >
              Skip
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => onStatus(session.id, "completed")}
            >
              <Check className="h-3.5 w-3.5" aria-hidden="true" /> Done
            </Button>
          </>
        ) : null}
      </div>
    </div>
  );
}

function GoalList({
  goals,
  activeGoalId,
  onNew,
  onGenerate,
  busy,
}: {
  goals: readonly StudyGoalRecord[];
  activeGoalId: string | null;
  onNew: () => void;
  onGenerate: (id: string) => void;
  busy: boolean;
}) {
  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-4 w-4 text-accent" aria-hidden="true" /> Goals
          </CardTitle>
          <CardDescription className="mt-1">Your current reasons for showing up.</CardDescription>
        </div>
        <Button
          type="button"
          size="icon"
          variant="outline"
          aria-label="New study goal"
          onClick={onNew}
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-2">
        {goals.map((goal) => (
          <div
            key={goal.id}
            className={`rounded-xl border p-3 ${activeGoalId === goal.id ? "border-accent/50 bg-accent/5" : ""}`}
          >
            <div className="flex items-start gap-2">
              <Flag className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="font-medium">{goal.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {goal.targetTitle || goal.goalType.replaceAll("-", " ")} ·{" "}
                  {humanDate(goal.targetDate)}
                </p>
              </div>
            </div>
            {activeGoalId !== goal.id ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="mt-2 w-full justify-start"
                onClick={() => onGenerate(goal.id)}
                disabled={busy}
              >
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" /> Generate schedule
              </Button>
            ) : (
              <Badge variant="success" className="mt-2">
                Active plan
              </Badge>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function GoalComposer({
  options,
  today,
  busy,
  onCreated,
  onCancel,
}: {
  options: PlannerOptions;
  today: string;
  busy: boolean;
  onCreated: () => void;
  onCancel: () => void;
}) {
  const [goalType, setGoalType] = React.useState<StudyGoalRecord["goalType"]>("roadmap-completion");
  const [targetId, setTargetId] = React.useState("");
  const [title, setTitle] = React.useState("");
  const [targetDate, setTargetDate] = React.useState(addDateOnly(today, 28));
  const [weekly, setWeekly] = React.useState(180);
  const [duration, setDuration] = React.useState(45);
  const [review, setReview] = React.useState(7);
  const [availableDays, setAvailableDays] = React.useState<Weekday[]>([1, 2, 3, 4, 5]);
  const [restDays, setRestDays] = React.useState<Weekday[]>([5]);
  const [prioritySubjects, setPrioritySubjects] = React.useState<string[]>([]);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const targets = targetOptions(goalType, options);
  React.useEffect(() => {
    if (targets.length && !targets.some((target) => target.id === targetId))
      setTargetId(targets[0].id);
    if (!targets.length) setTargetId("");
  }, [goalType, options, targetId, targets]);
  React.useEffect(() => {
    if (!title && targetId) {
      const target = targets.find((item) => item.id === targetId);
      if (target) setTitle(`${target.title} study plan`);
    }
  }, [targetId, targets, title]);

  function toggleDay(day: Weekday, setter: React.Dispatch<React.SetStateAction<Weekday[]>>) {
    setter((current) =>
      current.includes(day)
        ? current.filter((value) => value !== day)
        : ([...current, day].sort((a, b) => a - b) as Weekday[]),
    );
  }
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const targetTitle =
        targets.find((target) => target.id === targetId)?.title ?? "Weekly study rhythm";
      await readResponse(
        await fetch("/api/planner", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: title || targetTitle,
            description: "A focused, adaptive Mathios study plan.",
            goalType,
            targetId: targetId || null,
            targetTitle,
            startDate: today,
            targetDate,
            weeklyStudyMinutes: weekly,
            availableDays,
            sessionDurationMinutes: duration,
            prioritySubjectIds: prioritySubjects,
            restDays: restDays.filter((day) => availableDays.includes(day)),
            difficultyPreference: "balanced",
            reviewFrequencyDays: review,
            status: "active",
            generatePlan: true,
          }),
        }),
      );
      onCreated();
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : "The goal could not be created.",
      );
    } finally {
      setSubmitting(false);
    }
  }
  return (
    <Card className="overflow-hidden border-accent/30">
      <CardHeader className="bg-accent/5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="eyebrow">Build a rhythm</p>
            <CardTitle className="mt-1">New study goal</CardTitle>
            <CardDescription className="mt-1">
              A few constraints make the plan more honest.
            </CardDescription>
          </div>
          <button
            type="button"
            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted"
            onClick={onCancel}
            aria-label="Close goal form"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </CardHeader>
      <CardContent className="p-5">
        <form onSubmit={(event) => void submit(event)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="planner-goal-type">I want to work toward</Label>
            <select
              id="planner-goal-type"
              value={goalType}
              onChange={(event) => setGoalType(event.target.value as StudyGoalRecord["goalType"])}
              className="field-select"
            >
              <option value="roadmap-completion">A roadmap</option>
              <option value="course-completion">A course</option>
              <option value="grade-completion">A grade</option>
              <option value="subject-completion">A subject</option>
              <option value="exam-preparation">An exam</option>
              <option value="concept-mastery">A concept</option>
              <option value="weekly-study-time">A steady weekly practice</option>
            </select>
          </div>
          {targets.length ? (
            <div className="space-y-2">
              <Label htmlFor="planner-goal-target">Target</Label>
              <select
                id="planner-goal-target"
                value={targetId}
                onChange={(event) => setTargetId(event.target.value)}
                className="field-select"
              >
                {targets.map((target) => (
                  <option key={target.id} value={target.id}>
                    {target.title}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
          <div className="space-y-2">
            <Label htmlFor="planner-goal-title">Goal label</Label>
            <Input
              id="planner-goal-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Build my science foundation"
              required
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="planner-target-date">Target date</Label>
              <Input
                id="planner-target-date"
                type="date"
                value={targetDate}
                min={today}
                onChange={(event) => setTargetDate(event.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="planner-weekly-minutes">Weekly minutes</Label>
              <Input
                id="planner-weekly-minutes"
                type="number"
                min={30}
                step={15}
                value={weekly}
                onChange={(event) => setWeekly(Number(event.target.value))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="planner-session-duration">Session length</Label>
              <Input
                id="planner-session-duration"
                type="number"
                min={10}
                max={240}
                step={5}
                value={duration}
                onChange={(event) => setDuration(Number(event.target.value))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="planner-review">Review every (days)</Label>
              <Input
                id="planner-review"
                type="number"
                min={0}
                max={90}
                value={review}
                onChange={(event) => setReview(Number(event.target.value))}
                required
              />
            </div>
          </div>
          <DayPicker
            label="Available days"
            selected={availableDays}
            onToggle={(day) => toggleDay(day, setAvailableDays)}
          />
          <DayPicker
            label="Rest days"
            selected={restDays}
            onToggle={(day) => toggleDay(day, setRestDays)}
            compact
          />
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Priority subjects
            </p>
            <div className="flex flex-wrap gap-1.5">
              {options.subjects.map((subject) => (
                <button
                  key={subject.id}
                  type="button"
                  onClick={() =>
                    setPrioritySubjects((current) =>
                      current.includes(subject.id)
                        ? current.filter((id) => id !== subject.id)
                        : [...current, subject.id],
                    )
                  }
                  className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${prioritySubjects.includes(subject.id) ? "border-accent bg-accent/10 text-accent" : "text-muted-foreground hover:bg-muted"}`}
                >
                  {subject.title}
                </button>
              ))}
            </div>
          </div>
          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
          <Button
            type="submit"
            className="w-full"
            disabled={busy || submitting || !availableDays.length}
          >
            {busy || submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Sparkles className="h-4 w-4" aria-hidden="true" />
            )}{" "}
            Generate my plan
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function DayPicker({
  label,
  selected,
  onToggle,
  compact = false,
}: {
  label: string;
  selected: readonly Weekday[];
  onToggle: (day: Weekday) => void;
  compact?: boolean;
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </p>
      <div className="grid grid-cols-7 gap-1">
        {weekdayLabels.map((day) => (
          <button
            key={day.value}
            type="button"
            onClick={() => onToggle(day.value)}
            className={`rounded-md border py-1.5 text-[0.68rem] font-semibold ${selected.includes(day.value) ? (compact ? "border-primary/30 bg-primary/10 text-primary" : "border-accent bg-accent/10 text-accent") : "text-muted-foreground hover:bg-muted"}`}
          >
            {day.short.slice(0, 2)}
          </button>
        ))}
      </div>
    </div>
  );
}

function AvailabilityCard({
  availability,
  busy,
  onSave,
}: {
  availability: readonly StudyAvailabilityRecord[];
  busy: boolean;
  onSave: (
    slots: readonly Omit<StudyAvailabilityRecord, "id" | "profileId" | "createdAt" | "updatedAt">[],
  ) => void;
}) {
  const source = availability.length
    ? availability
    : DEFAULT_STUDY_AVAILABILITY.map((slot) => ({ ...slot }));
  const [days, setDays] = React.useState<Weekday[]>(source.map((slot) => slot.weekday));
  const [start, setStart] = React.useState(source[0]?.startMinute ?? 1080);
  const [end, setEnd] = React.useState(source[0]?.endMinute ?? 1260);
  React.useEffect(() => {
    if (availability.length) {
      setDays([...new Set(availability.map((slot) => slot.weekday))]);
      setStart(availability[0].startMinute);
      setEnd(availability[0].endMinute);
    }
  }, [availability]);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock3 className="h-4 w-4 text-accent" aria-hidden="true" /> Availability
        </CardTitle>
        <CardDescription>Default windows for generated sessions.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-7 gap-1">
          {weekdayLabels.map((day) => (
            <button
              type="button"
              key={day.value}
              onClick={() =>
                setDays((current) =>
                  current.includes(day.value)
                    ? current.filter((item) => item !== day.value)
                    : ([...current, day.value].sort((a, b) => a - b) as Weekday[]),
                )
              }
              className={`rounded-md border py-1.5 text-[0.68rem] font-semibold ${days.includes(day.value) ? "border-accent bg-accent/10 text-accent" : "text-muted-foreground"}`}
            >
              {day.short.slice(0, 2)}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label htmlFor="availability-start">From</Label>
            <Input
              id="availability-start"
              type="time"
              value={`${String(Math.floor(start / 60)).padStart(2, "0")}:${String(start % 60).padStart(2, "0")}`}
              onChange={(event) => {
                const [hours, minutes] = event.target.value.split(":").map(Number);
                setStart(hours * 60 + minutes);
              }}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="availability-end">To</Label>
            <Input
              id="availability-end"
              type="time"
              value={`${String(Math.floor(end / 60)).padStart(2, "0")}:${String(end % 60).padStart(2, "0")}`}
              onChange={(event) => {
                const [hours, minutes] = event.target.value.split(":").map(Number);
                setEnd(hours * 60 + minutes);
              }}
            />
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full"
          disabled={busy || !days.length || end <= start}
          onClick={() =>
            onSave(
              days.map((weekday) => ({
                weekday,
                startMinute: start,
                endMinute: end,
                maxMinutes: end - start,
                label: "My study window",
              })),
            )
          }
        >
          <PanelRight className="h-4 w-4" aria-hidden="true" /> Save windows
        </Button>
      </CardContent>
    </Card>
  );
}

function ExceptionsCard({
  exceptions,
  busy,
  onAdd,
  onRemove,
}: {
  exceptions: PlannerDashboard["exceptions"];
  busy: boolean;
  onAdd: (date: string, reason: string) => void;
  onRemove: (id: string) => void;
}) {
  const [date, setDate] = React.useState("");
  const [reason, setReason] = React.useState("");
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-accent" aria-hidden="true" /> Exceptions
        </CardTitle>
        <CardDescription>Protect a day from automatic scheduling.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <Input
            aria-label="Exception date"
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
          />
          <Button
            type="button"
            size="icon"
            aria-label="Add unavailable date"
            disabled={busy || !date}
            onClick={() => {
              onAdd(date, reason || "Unavailable");
              setDate("");
              setReason("");
            }}
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
        <Input
          aria-label="Exception reason"
          placeholder="Reason (optional)"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
        />
        {exceptions.length ? (
          <div className="space-y-1.5">
            {exceptions.map((exception) => (
              <div
                key={exception.id}
                className="flex items-center justify-between gap-2 rounded-lg bg-muted/50 px-3 py-2 text-xs"
              >
                <span>
                  <strong>{humanDate(exception.exceptionDate)}</strong>
                  <span className="ml-1 text-muted-foreground">{exception.reason}</span>
                </span>
                <button
                  type="button"
                  className="rounded p-1 text-muted-foreground hover:bg-card hover:text-foreground"
                  aria-label={`Remove ${exception.reason}`}
                  onClick={() => onRemove(exception.id)}
                >
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">No exceptions in this window.</p>
        )}
      </CardContent>
    </Card>
  );
}

function ConflictCard({ plan }: { plan: StudyPlanDetail }) {
  return (
    <Card className="border-destructive/30 bg-destructive/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-destructive">
          <TriangleAlert className="h-4 w-4" aria-hidden="true" /> Calendar conflicts
        </CardTitle>
        <CardDescription>The plan needs a small manual untangle.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2 text-xs text-muted-foreground">
        {plan.conflicts.map((conflict) => (
          <p key={`${conflict.sessionId}-${conflict.conflictingSessionId}`}>{conflict.message}</p>
        ))}
      </CardContent>
    </Card>
  );
}
