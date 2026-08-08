import { describe, expect, it, vi } from "vitest";
import type { ActivityEventRecord, LearnerAnalyticsSource } from "@/domain/analytics/types";
import type { TodayDependencies } from "@/features/today/service";
import {
  calculateLearningPoints,
  calculateStudyStreak,
  getTodayDashboard,
  selectActiveSubject,
  selectActiveSubjectForProfile,
} from "@/features/today/service";

const subject = (id: string, slug: string, name: string) => ({
  id,
  slug,
  name,
  accent: "accent",
});

function event(input: Partial<ActivityEventRecord>): ActivityEventRecord {
  return {
    id: input.id ?? "event",
    profileId: "profile-1",
    eventType: input.eventType ?? "lesson-view",
    resourceType: null,
    resourceId: null,
    subjectId: null,
    gradeId: null,
    conceptId: null,
    learningSessionId: null,
    occurredAt: input.occurredAt ?? "2026-08-06T09:00:00.000Z",
    durationSeconds: 0,
    score: null,
    isCorrect: null,
    hintsUsed: 0,
    attemptNumber: 1,
    responseTimeMs: null,
    dedupeKey: null,
    metadata: {},
    createdAt: input.createdAt ?? "2026-08-06T09:00:00.000Z",
    ...input,
  };
}

function source(
  subjects: readonly ReturnType<typeof subject>[],
  overrides: Record<string, unknown> = {},
) {
  return {
    profile: { id: "profile-1", displayName: "Ada", currentGrade: null, currentCurriculum: null },
    subjects,
    grades: [],
    events: [],
    learningSessions: [],
    lessonProgress: [],
    questionAttempts: [],
    assessmentAttempts: [],
    mastery: [],
    masterySnapshots: [],
    plannerSessions: [],
    roadmaps: [],
    currentLesson: null,
    recommendations: [],
    upcomingAssessments: [],
    notes: [],
    bookmarks: [],
    subjectLessonTotals: [],
    ...overrides,
  } as unknown as LearnerAnalyticsSource;
}

function dependencies(
  sourceValue: LearnerAnalyticsSource,
  settings = { preferredSubjects: ["physics"], studySessionDuration: 15 },
): TodayDependencies {
  const lesson = {
    id: "lesson-1",
    moduleId: "module-1",
    slug: "motion",
    title: "Motion",
    summary: "How things move.",
    sortOrder: 0,
    estimatedDurationMinutes: 10,
    status: "published" as const,
    currentVersionNumber: 1,
    publishedVersionId: "version-1",
    createdByProfileId: null,
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-01T00:00:00.000Z",
  };
  const course = {
    id: "course-1",
    title: "Physics foundations",
    subjectId: "subject-physics",
    description: "Start here.",
    status: "published" as const,
  };
  return {
    identityRepository: {
      getProfile: vi.fn(async () => ({ id: "profile-1", displayName: "Ada" })),
      getSettings: vi.fn(async () => settings),
    } as never,
    analyticsRepository: {
      getLearnerSource: vi.fn(async () => sourceValue),
    } as never,
    courseRepository: {
      getLessonReader: vi.fn(async () => null),
      listCourses: vi.fn(async () => [
        {
          ...course,
          slug: "physics-foundations",
          subjectName: "Physics",
          subjectSlug: "physics",
          moduleCount: 1,
          lessonCount: 1,
          curriculumIds: [],
          gradeIds: [],
          difficulty: "balanced",
          estimatedDurationMinutes: 10,
          gradeMinId: null,
          gradeMaxId: null,
          courseImage: null,
          isRequired: false,
          createdByProfileId: null,
          createdAt: "",
          updatedAt: "",
        },
      ]),
      getCourseDetail: vi.fn(async () => ({
        ...course,
        subjectName: "Physics",
        subjectSlug: "physics",
        curricula: [],
        grades: [],
        prerequisites: [],
        objectiveIds: [],
        modules: [
          {
            id: "module-1",
            courseId: "course-1",
            title: "Basics",
            description: "",
            sortOrder: 0,
            estimatedStudyTimeMinutes: 10,
            assessmentReference: null,
            isArchived: false,
            createdAt: "",
            updatedAt: "",
            lessons: [lesson],
            objectiveIds: [],
            prerequisiteModuleIds: [],
          },
        ],
      })),
    } as never,
    exerciseRepository: { listExerciseSets: vi.fn(async () => []) } as never,
  };
}

describe("Today orchestration", () => {
  it("prefers the first matching subject preference and falls back to the first subject", () => {
    const subjects = [
      subject("subject-math", "mathematics", "Mathematics"),
      subject("subject-physics", "physics", "Physics"),
    ];
    expect(selectActiveSubject(subjects, ["physics"])?.id).toBe("subject-physics");
    expect(selectActiveSubject(subjects, ["missing"])?.id).toBe("subject-math");
  });

  it("resumes incomplete lesson progress before choosing a new lesson", async () => {
    const physics = subject("subject-physics", "physics", "Physics");
    const data = source([physics], {
      lessonProgress: [
        {
          lessonId: "lesson-1",
          title: "Motion",
          subjectId: physics.id,
          subjectName: physics.name,
          courseId: "course-1",
          courseTitle: "Physics foundations",
          gradeId: null,
          completionPercentage: 35,
          completed: false,
          timeSpentSeconds: 120,
          startedAt: "2026-08-05T09:00:00.000Z",
          completedAt: null,
          lastViewedAt: "2026-08-06T08:00:00.000Z",
          updatedAt: "2026-08-06T08:00:00.000Z",
        },
      ],
    });
    const dashboard = await getTodayDashboard(
      "profile-1",
      dependencies(data),
      "2026-08-06T10:00:00.000Z",
    );
    expect(dashboard.primaryActivity?.kind).toBe("resume");
    expect(dashboard.primaryActivity?.href).toBe("/lessons/lesson-1");
  });

  it("shows a subject chooser instead of an empty learner state", async () => {
    const dashboard = await getTodayDashboard(
      "profile-1",
      dependencies(source([]), { preferredSubjects: [], studySessionDuration: 15 }),
      "2026-08-06T10:00:00.000Z",
    );
    expect(dashboard.needsSubjectChoice).toBe(true);
    expect(dashboard.activities).toHaveLength(0);
  });

  it("derives deduplicated point values from recorded events and counts a current streak", () => {
    const events = [
      event({ id: "lesson", eventType: "lesson-completion", metadata: { points: 20 } }),
      event({
        id: "answer",
        eventType: "question-attempt",
        isCorrect: true,
        metadata: { points: 5 },
      }),
      event({ id: "plan", eventType: "study-session-completion", metadata: { points: 10 } }),
      event({
        id: "lesson-duplicate",
        eventType: "lesson-completion",
        dedupeKey: "lesson-completion:lesson-1",
        metadata: { points: 20 },
      }),
      event({
        id: "lesson-replay",
        eventType: "lesson-completion",
        dedupeKey: "lesson-completion:lesson-1",
        metadata: { points: 20 },
      }),
      event({ id: "yesterday", occurredAt: "2026-08-05T09:00:00.000Z" }),
    ];
    expect(calculateLearningPoints(events)).toBe(55);
    expect(calculateStudyStreak(events, new Date("2026-08-06T10:00:00.000Z"))).toBe(2);
  });

  it("moves the selected subject to the front without discarding preferences", async () => {
    const saveSettings = vi.fn(async (value) => value);
    await selectActiveSubjectForProfile("profile-1", "subject-physics", {
      getSettings: vi.fn(async () => ({
        preferredSubjects: ["subject-math", "subject-physics"],
        studySessionDuration: 15,
      })),
      saveSettings,
    } as never);
    expect(saveSettings.mock.calls[0]?.[0].preferredSubjects).toEqual([
      "subject-physics",
      "subject-math",
    ]);
  });
});
