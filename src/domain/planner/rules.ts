import { ValidationError } from "@/domain/errors/application-error";
import type {
  PlannerWorkItem,
  StudyAvailabilityRecord,
  StudyExceptionRecord,
  StudyPlanItemRecord,
  StudyPlanningInput,
  StudyScheduleResult,
  StudyScheduleSessionDraft,
  StudySessionConflict,
  StudySessionRecord,
  Weekday,
} from "@/domain/planner/types";

const MIN_SESSION_MINUTES = 10;
const DEFAULT_START_MINUTE = 18 * 60;
const DEFAULT_END_MINUTE = 21 * 60;

export const DEFAULT_STUDY_AVAILABILITY: readonly Pick<
  StudyAvailabilityRecord,
  "weekday" | "startMinute" | "endMinute" | "maxMinutes" | "label"
>[] = [
  {
    weekday: 1,
    startMinute: DEFAULT_START_MINUTE,
    endMinute: DEFAULT_END_MINUTE,
    maxMinutes: 90,
    label: "Monday evening",
  },
  {
    weekday: 2,
    startMinute: DEFAULT_START_MINUTE,
    endMinute: DEFAULT_END_MINUTE,
    maxMinutes: 90,
    label: "Tuesday evening",
  },
  {
    weekday: 3,
    startMinute: DEFAULT_START_MINUTE,
    endMinute: DEFAULT_END_MINUTE,
    maxMinutes: 90,
    label: "Wednesday evening",
  },
  {
    weekday: 4,
    startMinute: DEFAULT_START_MINUTE,
    endMinute: DEFAULT_END_MINUTE,
    maxMinutes: 90,
    label: "Thursday evening",
  },
  {
    weekday: 5,
    startMinute: DEFAULT_START_MINUTE,
    endMinute: DEFAULT_END_MINUTE,
    maxMinutes: 90,
    label: "Friday evening",
  },
];

export function assertDateOnly(value: string, field = "date"): void {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new ValidationError(`${field} must use YYYY-MM-DD format.`);
  }
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new ValidationError(`${field} is not a real calendar date.`);
  }
}

export function compareDateOnly(left: string, right: string): number {
  return left.localeCompare(right);
}

export function addDateOnly(value: string, days: number): string {
  assertDateOnly(value);
  const date = new Date(`${value}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function weekdayForDate(value: string): Weekday {
  assertDateOnly(value);
  const day = new Date(`${value}T00:00:00.000Z`).getUTCDay();
  return (day === 0 ? 7 : day) as Weekday;
}

export function dateRange(startDate: string, targetDate: string): readonly string[] {
  assertDateOnly(startDate, "startDate");
  assertDateOnly(targetDate, "targetDate");
  if (compareDateOnly(startDate, targetDate) > 0) {
    throw new ValidationError("The target date must be on or after the start date.");
  }
  const dates: string[] = [];
  let cursor = startDate;
  while (compareDateOnly(cursor, targetDate) <= 0) {
    dates.push(cursor);
    cursor = addDateOnly(cursor, 1);
  }
  return dates;
}

export function formatMinute(value: number): string {
  const normalized = Math.max(0, Math.min(1439, Math.round(value)));
  const hours = Math.floor(normalized / 60);
  const minutes = normalized % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export function validatePlanningInput(input: StudyPlanningInput): void {
  const dates = dateRange(input.startDate, input.targetDate);
  if (!dates.length) throw new ValidationError("Choose a planning window.");
  if (!Number.isInteger(input.weeklyStudyMinutes) || input.weeklyStudyMinutes < 30) {
    throw new ValidationError("Weekly study time must be at least 30 minutes.");
  }
  if (
    !Number.isInteger(input.sessionDurationMinutes) ||
    input.sessionDurationMinutes < MIN_SESSION_MINUTES ||
    input.sessionDurationMinutes > 240
  ) {
    throw new ValidationError("Session duration must be between 10 and 240 minutes.");
  }
  const availableDays = new Set(input.availableDays);
  if (!availableDays.size) throw new ValidationError("Choose at least one available study day.");
  if ([...availableDays].some((day) => !Number.isInteger(day) || day < 1 || day > 7)) {
    throw new ValidationError("Study days must be weekdays from 1 to 7.");
  }
  if (input.restDays.some((day) => !availableDays.has(day))) {
    throw new ValidationError("Rest days must be selected from available study days.");
  }
  if (
    !Number.isInteger(input.reviewFrequencyDays) ||
    input.reviewFrequencyDays < 0 ||
    input.reviewFrequencyDays > 90
  ) {
    throw new ValidationError("Review frequency must be between 0 and 90 days.");
  }
}

function normalizeAvailability(
  availability: readonly StudyAvailabilityRecord[],
  weekday: Weekday,
): readonly Pick<StudyAvailabilityRecord, "startMinute" | "endMinute" | "maxMinutes">[] {
  const slots = availability
    .filter((slot) => slot.weekday === weekday)
    .filter((slot) => slot.startMinute >= 0 && slot.endMinute > slot.startMinute)
    .map((slot) => ({
      startMinute: Math.max(0, Math.min(1439, slot.startMinute)),
      endMinute: Math.max(1, Math.min(1440, slot.endMinute)),
      maxMinutes: slot.maxMinutes,
    }))
    .sort((left, right) => left.startMinute - right.startMinute);
  if (slots.length || availability.length) return slots;
  return [{ startMinute: DEFAULT_START_MINUTE, endMinute: DEFAULT_END_MINUTE, maxMinutes: 90 }];
}

function overlaps(
  startMinute: number,
  endMinute: number,
  otherStart: number | null,
  otherEnd: number | null,
): boolean {
  if (otherStart === null || otherEnd === null) return true;
  return startMinute < otherEnd && endMinute > otherStart;
}

function availableWindows(
  date: string,
  input: StudyPlanningInput,
  availability: readonly StudyAvailabilityRecord[],
  exceptions: readonly StudyExceptionRecord[],
): readonly { startMinute: number; endMinute: number }[] {
  const weekday = weekdayForDate(date);
  if (!input.availableDays.includes(weekday) || input.restDays.includes(weekday)) return [];
  const exceptionRows = exceptions.filter((exception) => exception.exceptionDate === date);
  if (
    exceptionRows.some(
      (exception) => exception.kind === "unavailable" && exception.startMinute === null,
    )
  ) {
    return [];
  }
  const baseSlots = normalizeAvailability(availability, weekday).map((slot) => ({
    startMinute: slot.startMinute,
    endMinute: Math.min(
      slot.endMinute,
      slot.maxMinutes ? slot.startMinute + slot.maxMinutes : slot.endMinute,
    ),
  }));
  const extraSlots = exceptionRows
    .filter(
      (exception) =>
        exception.kind === "extra-availability" &&
        exception.startMinute !== null &&
        exception.endMinute !== null,
    )
    .map((exception) => ({ startMinute: exception.startMinute!, endMinute: exception.endMinute! }));
  const blocked = exceptionRows.filter(
    (exception) => exception.kind === "unavailable" || exception.kind === "blocked",
  );
  return [...baseSlots, ...extraSlots]
    .sort((left, right) => left.startMinute - right.startMinute)
    .flatMap((slot) => {
      let segments = [slot];
      for (const block of blocked) {
        segments = segments.flatMap((segment) => {
          if (!overlaps(segment.startMinute, segment.endMinute, block.startMinute, block.endMinute))
            return [segment];
          return [
            ...(block.startMinute !== null && block.startMinute > segment.startMinute
              ? [{ startMinute: segment.startMinute, endMinute: block.startMinute }]
              : []),
            ...(block.endMinute !== null && block.endMinute < segment.endMinute
              ? [{ startMinute: block.endMinute, endMinute: segment.endMinute }]
              : []),
          ];
        });
      }
      return segments.filter(
        (segment) => segment.endMinute - segment.startMinute >= MIN_SESSION_MINUTES,
      );
    });
}

function weekKey(date: string): string {
  return addDateOnly(date, 1 - weekdayForDate(date));
}

function createReviewWorkItems(
  items: readonly PlannerWorkItem[],
  reviewFrequencyDays: number,
): readonly PlannerWorkItem[] {
  if (!reviewFrequencyDays || items.length < 2) return [];
  const cadence = Math.max(2, Math.ceil(reviewFrequencyDays / 3));
  const reviews: PlannerWorkItem[] = [];
  for (let index = cadence - 1; index < items.length; index += cadence) {
    const source = items[index];
    reviews.push({
      sourceId: source.sourceId,
      itemType: "review",
      title: `Review · ${source.title}`,
      description: `Spaced review for ${source.title}.`,
      subjectId: source.subjectId,
      estimatedMinutes: Math.min(20, Math.max(MIN_SESSION_MINUTES, source.estimatedMinutes)),
      priority: source.priority + 1,
      sortOrder: items.length + reviews.length,
      metadata: { reviewOf: source.sourceId, cadenceDays: reviewFrequencyDays },
    });
  }
  return reviews;
}

function priorityForItem(item: PlannerWorkItem, prioritySubjectIds: readonly string[]): number {
  return item.priority + (item.subjectId && prioritySubjectIds.includes(item.subjectId) ? 20 : 0);
}

function findOpenStart(
  date: string,
  desiredStart: number,
  duration: number,
  windows: readonly { startMinute: number; endMinute: number }[],
  occupied: readonly { startMinute: number; endMinute: number }[],
): number | null {
  for (const window of windows) {
    let candidate = Math.max(desiredStart, window.startMinute);
    while (candidate + duration <= window.endMinute) {
      const conflict = occupied.find(
        (slot) => candidate < slot.endMinute && candidate + duration > slot.startMinute,
      );
      if (!conflict) return candidate;
      candidate = conflict.endMinute;
    }
  }
  return null;
}

export function generateStudySchedule(
  planId: string,
  workItems: readonly PlannerWorkItem[],
  input: StudyPlanningInput,
  availability: readonly StudyAvailabilityRecord[] = [],
  exceptions: readonly StudyExceptionRecord[] = [],
  existingSessions: readonly Pick<
    StudySessionRecord,
    "id" | "scheduledDate" | "startMinute" | "durationMinutes"
  >[] = [],
): StudyScheduleResult {
  validatePlanningInput(input);
  const baseItems = workItems
    .filter((item) => item.estimatedMinutes > 0 && item.title.trim())
    .map((item, index) => ({ ...item, sortOrder: item.sortOrder ?? index }));
  const generatedItems = [
    ...baseItems,
    ...createReviewWorkItems(baseItems, input.reviewFrequencyDays),
  ];
  const orderedWork = [...generatedItems].sort(
    (left, right) =>
      priorityForItem(right, input.prioritySubjectIds) -
        priorityForItem(left, input.prioritySubjectIds) ||
      left.sortOrder - right.sortOrder ||
      left.title.localeCompare(right.title),
  );
  const items: StudyPlanItemRecord[] = orderedWork.map((item, index) => ({
    id: `study-plan-item-${planId}-${index + 1}`,
    planId,
    itemType: item.itemType,
    sourceId: item.sourceId,
    title: item.title,
    description: item.description,
    subjectId: item.subjectId,
    estimatedMinutes: Math.max(MIN_SESSION_MINUTES, Math.round(item.estimatedMinutes)),
    priority: priorityForItem(item, input.prioritySubjectIds),
    sortOrder: index,
    metadata: item.metadata,
    createdAt: new Date(0).toISOString(),
  }));
  const remaining = new Map(items.map((item) => [item.id, item.estimatedMinutes]));
  const sessions: StudyScheduleSessionDraft[] = [];
  const occupied = new Map<string, { startMinute: number; endMinute: number }[]>();
  for (const session of existingSessions) {
    const slots = occupied.get(session.scheduledDate) ?? [];
    slots.push({
      startMinute: session.startMinute,
      endMinute: session.startMinute + session.durationMinutes,
    });
    occupied.set(session.scheduledDate, slots);
  }
  const weekUsage = new Map<string, number>();
  const dates = dateRange(input.startDate, input.targetDate);
  const eligibleDayCount = dates.filter(
    (date) => availableWindows(date, input, availability, exceptions).length,
  ).length;
  const weeklyDayCount = [1, 2, 3, 4, 5, 6, 7].filter(
    (day) =>
      input.availableDays.includes(day as Weekday) && !input.restDays.includes(day as Weekday),
  ).length;
  const dailyBudget = Math.max(
    MIN_SESSION_MINUTES,
    Math.ceil(input.weeklyStudyMinutes / Math.max(weeklyDayCount, 1)),
  );
  let capacityMinutes = 0;

  for (const date of dates) {
    const windows = availableWindows(date, input, availability, exceptions);
    if (!windows.length) continue;
    const dayCapacity = Math.min(
      dailyBudget,
      windows.reduce((total, window) => total + (window.endMinute - window.startMinute), 0),
    );
    capacityMinutes += dayCapacity;
    let dayUsed = 0;
    let desiredStart = windows[0].startMinute;
    while (dayUsed < dayCapacity && remaining.size) {
      const item = [...remaining.keys()]
        .map((id) => items.find((candidate) => candidate.id === id)!)
        .sort(
          (left, right) => right.priority - left.priority || left.sortOrder - right.sortOrder,
        )[0];
      if (!item) break;
      const week = weekKey(date);
      const weekRemaining = input.weeklyStudyMinutes - (weekUsage.get(week) ?? 0);
      if (weekRemaining < MIN_SESSION_MINUTES) break;
      const duration = Math.min(
        remaining.get(item.id) ?? 0,
        input.sessionDurationMinutes,
        dayCapacity - dayUsed,
        weekRemaining,
      );
      if (duration < MIN_SESSION_MINUTES) break;
      const startMinute = findOpenStart(
        date,
        desiredStart,
        duration,
        windows,
        occupied.get(date) ?? [],
      );
      if (startMinute === null) break;
      const sessionId = `study-session-${planId}-${sessions.length + 1}`;
      sessions.push({
        id: sessionId,
        planId,
        planItemId: item.id,
        scheduledDate: date,
        startMinute,
        durationMinutes: duration,
        status: "scheduled",
        rescheduledFromDate: null,
        skipReason: null,
        completedAt: null,
      });
      const daySlots = occupied.get(date) ?? [];
      daySlots.push({ startMinute, endMinute: startMinute + duration });
      daySlots.sort((left, right) => left.startMinute - right.startMinute);
      occupied.set(date, daySlots);
      desiredStart = startMinute + duration + 5;
      dayUsed += duration;
      weekUsage.set(week, (weekUsage.get(week) ?? 0) + duration);
      const nextRemaining = (remaining.get(item.id) ?? 0) - duration;
      if (nextRemaining < MIN_SESSION_MINUTES) remaining.delete(item.id);
      else remaining.set(item.id, nextRemaining);
    }
  }

  const totalMinutes = items.reduce((total, item) => total + item.estimatedMinutes, 0);
  const scheduledMinutes = sessions.reduce((total, session) => total + session.durationMinutes, 0);
  const unallocatedMinutes = Math.max(0, totalMinutes - scheduledMinutes);
  const warnings: string[] = [];
  if (!workItems.length) warnings.push("This goal has no unfinished learning items yet.");
  if (unallocatedMinutes > 0) {
    warnings.push(
      `${unallocatedMinutes} minutes remain unscheduled. Extend the target date or add weekly study time.`,
    );
  }
  if (eligibleDayCount === 0)
    warnings.push("No available study windows fall inside this planning window.");
  const realism =
    unallocatedMinutes === 0
      ? "realistic"
      : scheduledMinutes / Math.max(totalMinutes, 1) >= 0.8
        ? "tight"
        : "infeasible";
  return {
    items,
    sessions,
    totalMinutes,
    scheduledMinutes,
    unallocatedMinutes,
    capacityMinutes,
    realism,
    warnings,
  };
}

export function detectSessionConflicts(
  sessions: readonly Pick<
    StudySessionRecord,
    "id" | "scheduledDate" | "startMinute" | "durationMinutes"
  >[],
): readonly StudySessionConflict[] {
  const conflicts: StudySessionConflict[] = [];
  const byDate = new Map<string, typeof sessions>();
  for (const session of sessions)
    byDate.set(session.scheduledDate, [...(byDate.get(session.scheduledDate) ?? []), session]);
  for (const [date, rows] of byDate) {
    const ordered = [...rows].sort(
      (left, right) => left.startMinute - right.startMinute || left.id.localeCompare(right.id),
    );
    for (let index = 0; index < ordered.length; index += 1) {
      const current = ordered[index];
      const currentEnd = current.startMinute + current.durationMinutes;
      for (let otherIndex = index + 1; otherIndex < ordered.length; otherIndex += 1) {
        const other = ordered[otherIndex];
        if (other.startMinute >= currentEnd) break;
        conflicts.push({
          sessionId: current.id,
          conflictingSessionId: other.id,
          date,
          message: `${current.id} overlaps ${other.id} on ${date}.`,
        });
      }
    }
  }
  return conflicts;
}

export function assertSessionCanMove(
  session: Pick<StudySessionRecord, "id" | "durationMinutes">,
  targetDate: string,
  startMinute: number,
  existingSessions: readonly Pick<
    StudySessionRecord,
    "id" | "scheduledDate" | "startMinute" | "durationMinutes"
  >[],
): void {
  assertDateOnly(targetDate, "scheduledDate");
  if (
    !Number.isInteger(startMinute) ||
    startMinute < 0 ||
    startMinute + session.durationMinutes > 1440
  ) {
    throw new ValidationError("A study session must fit inside one calendar day.");
  }
  const conflicts = detectSessionConflicts([
    ...existingSessions.filter((candidate) => candidate.id !== session.id),
    {
      id: session.id,
      scheduledDate: targetDate,
      startMinute,
      durationMinutes: session.durationMinutes,
    },
  ]);
  if (
    conflicts.some(
      (conflict) =>
        conflict.sessionId === session.id || conflict.conflictingSessionId === session.id,
    )
  ) {
    throw new ValidationError("That time overlaps another study session.");
  }
}

export function buildCatchUpItems(
  sessions: readonly StudySessionRecord[],
  items: readonly StudyPlanItemRecord[],
): readonly PlannerWorkItem[] {
  const itemById = new Map(items.map((item) => [item.id, item]));
  return sessions
    .filter((session) => session.status === "missed")
    .map((session, index) => {
      const item = itemById.get(session.planItemId);
      return {
        sourceId: item?.sourceId ?? session.sourceId,
        itemType: "catch-up",
        title: `Catch up · ${item?.title ?? session.title}`,
        description: `Make up the missed study session from ${session.scheduledDate}.`,
        subjectId: item?.subjectId ?? session.subjectId,
        estimatedMinutes: session.durationMinutes,
        priority: (item?.priority ?? 0) + 10,
        sortOrder: index,
        metadata: { missedSessionId: session.id, originalDate: session.scheduledDate },
      } satisfies PlannerWorkItem;
    });
}
