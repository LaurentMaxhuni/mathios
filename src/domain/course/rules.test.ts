import { describe, expect, it } from "vitest";
import { ValidationError } from "@/domain/errors/application-error";
import {
  calculateCompletionPercentage,
  validateBlockPayload,
  validateFormula,
} from "@/domain/course/rules";

describe("Phase 3 lesson rules", () => {
  it("validates balanced formulas and requires accessible labels for formula blocks", () => {
    expect(() => validateFormula("\\frac{a}{b}")).not.toThrow();
    expect(() => validateFormula("\\frac{a}{b")).toThrow(ValidationError);
    expect(() => validateBlockPayload("formula", { latex: "x^2" })).toThrow(ValidationError);
    expect(() =>
      validateBlockPayload("formula", { latex: "x^2", accessibleLabel: "x squared" }),
    ).not.toThrow();
  });

  it("calculates bounded progress percentages", () => {
    expect(calculateCompletionPercentage(4, 1)).toBe(25);
    expect(calculateCompletionPercentage(0, 1)).toBe(0);
    expect(calculateCompletionPercentage(4, 9)).toBe(100);
  });
});
