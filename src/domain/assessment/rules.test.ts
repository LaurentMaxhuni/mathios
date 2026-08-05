import { describe, expect, it } from "vitest";
import {
  analyzeDiagnostic,
  assessmentScoreSummary,
  selectAssessmentQuestions,
} from "@/domain/assessment/rules";
import type { AssessmentDetail } from "@/domain/assessment/types";

const question = (
  id: string,
  difficulty: "gentle" | "balanced" | "challenging",
  poolId: string | null,
) => ({
  id: `assessment-question-${id}`,
  assessmentId: "assessment-1",
  sectionId: "section-1",
  poolId,
  questionId: id,
  sortOrder: Number(id.replace("q-", "")) || 0,
  points: 1,
  isRequired: true,
  conceptIds: [`concept-${id}`],
  question: {
    id,
    slug: id,
    title: id,
    type: "numeric" as const,
    subjectId: "subject-physics",
    gradeMinId: null,
    gradeMaxId: null,
    difficulty,
    estimatedTimeSeconds: 60,
    source: "test",
    authorProfileId: null,
    tags: [],
    status: "published" as const,
    currentVersionNumber: 1,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    conceptCount: 1,
    exerciseSetCount: 0,
  },
});

const assessment = (questions: ReturnType<typeof question>[]): AssessmentDetail => ({
  assessment: {
    id: "assessment-1",
    slug: "diagnostic",
    title: "Diagnostic",
    description: "",
    type: "diagnostic-test",
    subjectId: "subject-physics",
    gradeId: null,
    status: "published",
    timeLimitSeconds: null,
    attemptLimit: 1,
    passingThreshold: 0.6,
    partialCredit: true,
    feedbackVisibility: "after-submit",
    reviewMode: "full",
    retakeRule: "after-failure",
    questionOrdering: "fixed",
    autoSubmit: false,
    configuration: { gradeBands: [{ gradeId: "grade-8", label: "Grade 8", minPercentage: 0.6 }] },
    createdByProfileId: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  sections: [
    {
      section: {
        id: "section-1",
        assessmentId: "assessment-1",
        title: "Core",
        description: "",
        sortOrder: 0,
        points: questions.length,
        timeLimitSeconds: null,
        questionOrdering: "fixed",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
      pools: [
        {
          id: "pool-1",
          assessmentId: "assessment-1",
          sectionId: "section-1",
          title: "Pool",
          selectionCount: 2,
          difficultyDistribution: { gentle: 1, challenging: 1 },
          conceptIds: [],
          questionOrdering: "fixed",
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
        },
      ],
      questions,
    },
  ],
  questions,
});

describe("assessment rules", () => {
  it("selects reproducible pool questions with configured difficulty coverage", () => {
    const detail = assessment([
      question("q-1", "gentle", "pool-1"),
      question("q-2", "balanced", "pool-1"),
      question("q-3", "challenging", "pool-1"),
    ]);
    const first = selectAssessmentQuestions(detail, 42);
    const second = selectAssessmentQuestions(detail, 42);
    expect(first.questionOrder).toEqual(second.questionOrder);
    expect(first.questions.map((item) => item.question.difficulty)).toContain("gentle");
    expect(first.questions.map((item) => item.question.difficulty)).toContain("challenging");
  });

  it("calculates pass/fail and produces explainable diagnostic output", () => {
    expect(assessmentScoreSummary(6, 10, 0.6)).toMatchObject({ percentage: 0.6, passed: true });
    const detail = assessment([question("q-1", "balanced", null)]);
    const diagnostic = analyzeDiagnostic({
      assessment: detail.assessment,
      selectedQuestions: detail.questions,
      questionAttempts: [
        {
          id: "attempt-q1",
          exerciseAttemptId: null,
          assessmentAttemptId: "attempt-1",
          questionId: "q-1",
          questionVersionId: "version-q1",
          templateId: null,
          instanceSeed: null,
          response: 2,
          validationResult: { status: "incorrect" },
          score: 0,
          maxScore: 1,
          answeredAt: "2026-01-01T00:00:00.000Z",
        },
      ],
    });
    expect(diagnostic.readinessGradeId).toBeNull();
    expect(diagnostic.weakConceptIds).toEqual(["concept-q-1"]);
    expect(diagnostic.recommendations[0]?.kind).toBe("starting-level");
  });
});
