import { describe, expect, it } from "vitest";
import {
  assertSessionCanMove,
  detectSessionConflicts,
  generateStudySchedule,
} from "@/domain/planner/rules";
import type { StudyPlanningInput, StudySessionRecord } from "@/domain/planner/types";

const input: StudyPlanningInput = {
  startDate: "2026-08-10",
  targetDate: "2026-08-21",
  weeklyStudyMinutes: 180,
  availableDays: [1, 2, 3, 4, 5],
  sessionDurationMinutes: 45,
  prioritySubjectIds: ["subject-mathematics"],
  restDays: [5],
  difficultyPreference: "balanced",
  reviewFrequencyDays: 0,
};

const workItems = [
  {
    sourceId: "lesson-a",
    itemType: "lesson" as const,
    title: "Linear equations",
    description: "Solve equations.",
    subjectId: "subject-mathematics",
    estimatedMinutes: 45,
    priority: 1,
    sortOrder: 0,
    metadata: {},
  },
  {
    sourceId: "lesson-b",
    itemType: "lesson" as const,
    title: "Motion graphs",
    description: "Read motion graphs.",
    subjectId: "subject-physics",
    estimatedMinutes: 90,
    priority: 0,
    sortOrder: 1,
    metadata: {},
  },
];

describe("study planner scheduling rules", () => {
  it("allocates work to available weekdays, honors rest days, and stays deterministic", () => {
    const first = generateStudySchedule("plan-a", workItems, input);
    const second = generateStudySchedule("plan-a", workItems, input);
    expect(first).toEqual(second);
    expect(first.sessions).toHaveLength(3);
    expect(
      first.sessions.every((session) =>
        [1, 2, 3, 4].includes(new Date(`${session.scheduledDate}T00:00:00Z`).getUTCDay() || 7),
      ),
    ).toBe(true);
    expect(first.scheduledMinutes).toBe(135);
    expect(first.unallocatedMinutes).toBe(0);
  });

  it("adds spaced review work and warns when the target is unrealistic", () => {
    const result = generateStudySchedule(
      "plan-tight",
      [
        ...workItems,
        { ...workItems[1], sourceId: "lesson-c", title: "Energy", estimatedMinutes: 180 },
      ],
      { ...input, targetDate: "2026-08-10", weeklyStudyMinutes: 60, reviewFrequencyDays: 7 },
    );
    expect(result.items.some((item) => item.itemType === "review")).toBe(true);
    expect(result.unallocatedMinutes).toBeGreaterThan(0);
    expect(result.warnings.join(" ")).toMatch(/remain unscheduled/);
    expect(result.realism).toBe("infeasible");
  });

  it("uses exceptions and existing sessions when finding schedule slots", () => {
    const result = generateStudySchedule(
      "plan-exception",
      [workItems[0]],
      { ...input, targetDate: "2026-08-10", availableDays: [1], restDays: [] },
      [
        {
          id: "availability",
          profileId: "profile",
          weekday: 1,
          startMinute: 18 * 60,
          endMinute: 21 * 60,
          maxMinutes: 180,
          label: "Long Monday window",
          createdAt: "",
          updatedAt: "",
        },
      ],
      [
        {
          id: "exception",
          profileId: "profile",
          exceptionDate: "2026-08-10",
          kind: "blocked",
          startMinute: 18 * 60,
          endMinute: 18 * 60 + 45,
          reason: "Appointment",
          createdAt: "",
        },
      ],
      [
        {
          id: "existing",
          scheduledDate: "2026-08-10",
          startMinute: 19 * 60,
          durationMinutes: 45,
        },
      ],
    );
    expect(result.sessions[0]?.startMinute).toBe(19 * 60 + 45);

    const customAvailability = generateStudySchedule(
      "plan-custom-availability",
      workItems,
      { ...input, targetDate: "2026-08-11", availableDays: [1, 2], restDays: [] },
      [
        {
          id: "monday-only",
          profileId: "profile",
          weekday: 1,
          startMinute: 18 * 60,
          endMinute: 21 * 60,
          maxMinutes: 120,
          label: "Monday only",
          createdAt: "",
          updatedAt: "",
        },
      ],
    );
    expect(customAvailability.scheduledMinutes).toBe(90);
    expect(
      customAvailability.sessions.every((session) => session.scheduledDate === "2026-08-10"),
    ).toBe(true);
  });

  it("reports conflicts and prevents a drag onto an occupied session", () => {
    const sessions = [
      { id: "a", scheduledDate: "2026-08-10", startMinute: 1080, durationMinutes: 45 },
      { id: "b", scheduledDate: "2026-08-10", startMinute: 1100, durationMinutes: 30 },
    ];
    expect(detectSessionConflicts(sessions)).toHaveLength(1);
    expect(() => assertSessionCanMove(sessions[0], "2026-08-10", 1090, sessions)).toThrow(
      "overlaps",
    );
  });

  it("supports catch-up sessions without changing the original session identity", () => {
    const session = {
      id: "session",
      profileId: "profile",
      planId: "plan",
      planItemId: "item",
      itemType: "lesson" as const,
      sourceId: "lesson",
      title: "Missed lesson",
      subjectId: null,
      scheduledDate: "2026-08-08",
      startMinute: 1080,
      durationMinutes: 30,
      status: "missed" as const,
      rescheduledFromDate: null,
      skipReason: null,
      completedAt: null,
      updatedAt: "",
    } satisfies StudySessionRecord;
    expect(session.status).toBe("missed");
  });
});
