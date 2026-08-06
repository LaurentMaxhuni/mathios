import { describe, expect, it } from "vitest";
import {
  buildLearnerAnalytics,
  calculateAccuracy,
  calculateDiscriminationIndex,
  calculateStudyStreak,
} from "@/domain/analytics/rules";
import type { LearnerAnalyticsSource } from "@/domain/analytics/types";

const source: LearnerAnalyticsSource = {
  profile: {
    id: "profile-rules",
    displayName: "Rules learner",
    currentGrade: "grade-8",
    currentCurriculum: "curriculum-kosovo",
  },
  subjects: [{ id: "subject-physics", name: "Physics", slug: "physics", accent: "physics" }],
  grades: [{ id: "grade-8", name: "Grade 8", sortOrder: 8 }],
  events: [
    {
      id: "event-study",
      profileId: "profile-rules",
      eventType: "study-session-completion",
      resourceType: "study-session",
      resourceId: "session-1",
      subjectId: null,
      gradeId: null,
      conceptId: null,
      learningSessionId: null,
      occurredAt: "2026-08-05T18:00:00.000Z",
      durationSeconds: 1800,
      score: null,
      isCorrect: null,
      hintsUsed: 0,
      attemptNumber: 1,
      responseTimeMs: null,
      dedupeKey: null,
      metadata: {},
      createdAt: "2026-08-05T18:00:00.000Z",
    },
  ],
  learningSessions: [],
  lessonProgress: [],
  questionAttempts: [
    {
      id: "question-attempt-1",
      profileId: "profile-rules",
      questionId: "question-1",
      questionTitle: "Velocity",
      subjectId: "subject-physics",
      subjectName: "Physics",
      gradeMinId: "grade-8",
      gradeMaxId: "grade-8",
      conceptIds: ["concept-velocity"],
      score: 1,
      maxScore: 1,
      scorePercentage: 1,
      isCorrect: true,
      answeredAt: "2026-08-05T18:20:00.000Z",
      assessmentId: null,
      assessmentTitle: null,
      attemptNumber: 1,
      hintsUsed: 0,
      responseTimeMs: 1200,
      mistakeCategory: null,
    },
  ],
  assessmentAttempts: [],
  mastery: [
    {
      conceptId: "concept-velocity",
      conceptName: "Velocity",
      subjectId: "subject-physics",
      subjectName: "Physics",
      gradeMinId: "grade-8",
      gradeMaxId: "grade-8",
      state: "developing",
      score: 0.5,
      confidence: 0.4,
      evidenceCount: 1,
      lastPracticedAt: "2026-08-05T18:20:00.000Z",
      updatedAt: "2026-08-05T18:20:00.000Z",
    },
  ],
  masterySnapshots: [],
  plannerSessions: [],
  roadmaps: [],
  currentLesson: null,
  recommendations: [],
  upcomingAssessments: [],
  notes: [],
  bookmarks: [],
  subjectLessonTotals: [],
};

describe("analytics rules", () => {
  it("calculates bounded accuracy and a current streak", () => {
    expect(calculateAccuracy(3, 4)).toBe(0.75);
    expect(calculateAccuracy(5, 0)).toBe(0);
    expect(calculateStudyStreak(["2026-08-03", "2026-08-04", "2026-08-05"], "2026-08-05")).toBe(3);
  });

  it("uses upper and lower outcome groups for discrimination", () => {
    expect(
      calculateDiscriminationIndex([
        { score: 0.1, correct: false },
        { score: 0.2, correct: false },
        { score: 0.8, correct: true },
        { score: 0.9, correct: true },
        { score: 1, correct: true },
      ]),
    ).toBeGreaterThan(0);
  });

  it("aggregates events and source records into learner metrics", () => {
    const analytics = buildLearnerAnalytics(
      source,
      { from: "2026-08-01", to: "2026-08-06" },
      "2026-08-06",
    );
    expect(analytics.summary.timeStudiedSeconds).toBe(1800);
    expect(analytics.summary.questionsAttempted).toBe(1);
    expect(analytics.summary.accuracy).toBe(1);
    expect(analytics.weakConcepts[0]?.conceptName).toBe("Velocity");
  });
});
