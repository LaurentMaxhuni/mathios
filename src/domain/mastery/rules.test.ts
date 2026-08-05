import { describe, expect, it } from "vitest";
import { computeMastery, generateRecommendations } from "@/domain/mastery/rules";
import type { MasteryEventRecord } from "@/domain/mastery/types";

const event = (overrides: Partial<MasteryEventRecord> = {}): MasteryEventRecord => ({
  id: "event-1",
  profileId: "profile-1",
  conceptId: "concept-1",
  eventType: "exercise",
  sourceId: "attempt-1",
  score: 0.9,
  difficulty: "balanced",
  attempts: 1,
  hintsUsed: 0,
  partialCredit: false,
  metadata: {},
  occurredAt: "2026-08-01T00:00:00.000Z",
  createdAt: "2026-08-01T00:00:00.000Z",
  ...overrides,
});

describe("mastery rules", () => {
  it("does not grant mastery from one easy exercise", () => {
    const result = computeMastery({
      events: [event({ difficulty: "gentle" })],
      masteryThreshold: 0.7,
      now: "2026-08-02T00:00:00.000Z",
    });
    expect(result.score).toBeGreaterThan(0.8);
    expect(result.state).not.toBe("mastered");
    expect(result.confidence).toBeLessThan(0.65);
  });

  it("needs varied evidence and respects weak prerequisites", () => {
    const events = [
      event({
        id: "lesson",
        eventType: "lesson-completion",
        sourceId: "lesson-1",
        score: 1,
        difficulty: "gentle",
      }),
      event({ id: "practice", sourceId: "exercise-1", difficulty: "balanced", score: 0.95 }),
      event({
        id: "assessment",
        eventType: "assessment",
        sourceId: "assessment-1",
        difficulty: "challenging",
        score: 0.9,
      }),
    ];
    const result = computeMastery({
      events,
      masteryThreshold: 0.7,
      prerequisiteStates: [{ conceptId: "concept-prereq", score: 0.3, state: "developing" }],
      now: "2026-08-02T00:00:00.000Z",
    });
    expect(result.state).not.toBe("mastered");
    expect(result.breakdown.weakPrerequisiteIds).toEqual(["concept-prereq"]);
    expect(result.evidenceTypeCount).toBe(3);
  });

  it("moves old evidence into review", () => {
    const result = computeMastery({
      events: [event({ occurredAt: "2025-01-01T00:00:00.000Z" })],
      now: "2026-08-02T00:00:00.000Z",
    });
    expect(result.state).toBe("needs-review");
    expect(result.nextReviewAt).not.toBeNull();
  });

  it("explains prerequisite, review, and unlock recommendations", () => {
    const recommendations = generateRecommendations({
      concepts: [
        {
          id: "concept-advanced",
          name: "Advanced concept",
          slug: "advanced-concept",
          subjectId: "subject-physics",
          subjectName: "Physics",
          subjectSlug: "physics",
          domainName: "Mechanics",
          gradeMinId: "grade-8",
          gradeMaxId: "grade-10",
          difficulty: "balanced",
          masteryThreshold: 75,
        },
        {
          id: "concept-prereq",
          name: "Prerequisite",
          slug: "prerequisite",
          subjectId: "subject-physics",
          subjectName: "Physics",
          subjectSlug: "physics",
          domainName: "Mechanics",
          gradeMinId: "grade-7",
          gradeMaxId: "grade-8",
          difficulty: "gentle",
          masteryThreshold: 70,
        },
      ],
      mastery: [
        {
          conceptId: "concept-advanced",
          state: "developing",
          score: 0.4,
          confidence: 0.5,
          confidenceLabel: "medium",
          evidenceCount: 2,
          lastPracticedAt: "2026-08-01T00:00:00.000Z",
          nextReviewAt: null,
        },
        {
          conceptId: "concept-prereq",
          state: "developing",
          score: 0.3,
          confidence: 0.4,
          confidenceLabel: "low",
          evidenceCount: 1,
          lastPracticedAt: "2026-08-01T00:00:00.000Z",
          nextReviewAt: "2026-08-01T00:00:00.000Z",
        },
      ],
      prerequisiteLinks: [
        {
          conceptId: "concept-advanced",
          prerequisiteConceptId: "concept-prereq",
          prerequisiteName: "Prerequisite",
        },
      ],
      now: "2026-08-02T00:00:00.000Z",
    });
    expect(recommendations.map((recommendation) => recommendation.kind)).toEqual(
      expect.arrayContaining(["missing-prerequisite", "weak-concept", "due-for-review"]),
    );
    expect(recommendations.every((recommendation) => recommendation.reason.length > 10)).toBe(true);
  });
});
