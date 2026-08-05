import { describe, expect, it } from "vitest";
import { areEquivalentExpressions } from "@/domain/exercise/expression";
import { generateQuestionInstance } from "@/domain/exercise/generator";
import { validateAnswer, convertUnitValue } from "@/domain/exercise/rules";
import type { QuestionTemplateRecord } from "@/domain/exercise/types";

describe("exercise answer validation", () => {
  it("handles exact, case-insensitive, numeric, and unit-aware answers", () => {
    expect(validateAnswer("short-answer", { expected: "Velocity" }, " velocity ").status).toBe(
      "correct",
    );
    expect(
      validateAnswer("numeric-tolerance", { expected: 9.8, tolerance: 0.1 }, 9.85).status,
    ).toBe("correct");
    expect(
      validateAnswer("numeric-unit", { expected: 1000, unit: "m", tolerance: 0 }, "1 km").status,
    ).toBe("correct");
    expect(convertUnitValue(1, "km", "m")).toBe(1000);
    expect(validateAnswer("numeric", { expected: 0.5 }, "1/2").status).toBe("correct");
    expect(
      validateAnswer("numeric-unit", { expected: 1000, unit: "m", acceptedUnits: ["km"] }, "1 km")
        .status,
    ).toBe("correct");
    expect(validateAnswer("numeric-unit", { expected: 9.8, unit: "m/s^2" }, "9.8").errorKey).toBe(
      "missing-unit",
    );
  });

  it("supports equivalent expressions without evaluating arbitrary code", () => {
    expect(areEquivalentExpressions("2(x + 1)", "2*x+2", ["x"])).toBe(true);
    expect(
      validateAnswer(
        "algebraic-expression",
        { acceptedAnswers: ["x^2 + 2*x + 1"], variables: ["x"] },
        "(x+1)^2",
      ).status,
    ).toBe("correct");
    expect(areEquivalentExpressions("process.exit()", "1")).toBe(false);
  });

  it("returns meaningful partial credit for selections, matches, order, and steps", () => {
    expect(
      validateAnswer("multiple-selection", { correctOptionKeys: ["a", "b"] }, ["a"]).status,
    ).toBe("partial");
    expect(
      validateAnswer("multiple-selection", { correctOptionKeys: ["a", "b"] }, "a,b").status,
    ).toBe("correct");
    expect(
      validateAnswer("matching", { correctPairs: { one: "1", two: "2" } }, { one: "1", two: "x" })
        .percentage,
    ).toBe(50);
    expect(
      validateAnswer("ordering", { correctOrder: ["a", "b", "c"] }, ["a", "c", "b"]).percentage,
    ).toBe(33);
    expect(
      validateAnswer(
        "multi-step",
        {
          steps: [
            { id: "first", type: "numeric", spec: { expected: 2 } },
            { id: "second", type: "numeric", spec: { expected: 4 } },
          ],
        },
        [2, 3],
      ).status,
    ).toBe("partial");
  });
});

describe("reproducible question templates", () => {
  it("generates the same instance for the same seed", () => {
    const template: QuestionTemplateRecord = {
      id: "template-test",
      questionId: "question-test",
      slug: "template-test",
      name: "Test template",
      questionType: "numeric",
      promptTemplate: "What is {{a}} + {{b}}?",
      variables: [
        { name: "a", label: "A", min: 1, max: 5, step: 1 },
        { name: "b", label: "B", min: 1, max: 5, step: 1 },
      ],
      answerExpression: "a + b",
      validationSpec: {},
      seed: 7,
      isActive: true,
      createdAt: "now",
      updatedAt: "now",
    };
    expect(generateQuestionInstance(template, 42)).toEqual(generateQuestionInstance(template, 42));
    expect(generateQuestionInstance(template, 42)).not.toEqual(
      generateQuestionInstance(template, 43),
    );
  });
});
