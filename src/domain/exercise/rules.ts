import { ValidationError } from "@/domain/errors/application-error";
import {
  areEquivalentExpressions,
  parseMathematicalExpression,
} from "@/domain/exercise/expression";
import type {
  AnswerValidationResult,
  JsonValue,
  QuestionType,
  QuestionValidationSpec,
} from "@/domain/exercise/types";

interface ParsedNumber {
  value: number;
  unit: string | null;
  significantFigures: number | null;
}

interface UnitDefinition {
  dimension: string;
  factor: number;
}

const unitDefinitions: Readonly<Record<string, UnitDefinition>> = {
  "": { dimension: "dimensionless", factor: 1 },
  m: { dimension: "length", factor: 1 },
  cm: { dimension: "length", factor: 0.01 },
  mm: { dimension: "length", factor: 0.001 },
  km: { dimension: "length", factor: 1000 },
  in: { dimension: "length", factor: 0.0254 },
  ft: { dimension: "length", factor: 0.3048 },
  s: { dimension: "time", factor: 1 },
  ms: { dimension: "time", factor: 0.001 },
  min: { dimension: "time", factor: 60 },
  h: { dimension: "time", factor: 3600 },
  kg: { dimension: "mass", factor: 1 },
  g: { dimension: "mass", factor: 0.001 },
  mg: { dimension: "mass", factor: 0.000001 },
  N: { dimension: "force", factor: 1 },
  kN: { dimension: "force", factor: 1000 },
  J: { dimension: "energy", factor: 1 },
  W: { dimension: "power", factor: 1 },
  Pa: { dimension: "pressure", factor: 1 },
  kPa: { dimension: "pressure", factor: 1000 },
  L: { dimension: "volume", factor: 1 },
  mL: { dimension: "volume", factor: 0.001 },
  mol: { dimension: "amount", factor: 1 },
  K: { dimension: "temperature", factor: 1 },
  rad: { dimension: "angle", factor: 1 },
  deg: { dimension: "angle", factor: Math.PI / 180 },
  "m/s": { dimension: "speed", factor: 1 },
  "km/h": { dimension: "speed", factor: 1000 / 3600 },
  "m/s^2": { dimension: "acceleration", factor: 1 },
  "km/h^2": { dimension: "acceleration", factor: 1000 / (3600 * 3600) },
};

const superscriptMap: Record<string, string> = { "²": "^2", "³": "^3" };

function normalizeUnit(value: string): string {
  return value
    .trim()
    .replace(/[μµ]/g, "u")
    .replace(/[²³]/g, (character) => superscriptMap[character] ?? character)
    .replace(/\s+/g, "")
    .replace(/per/g, "/")
    .replace(/sec(?:ond)?s?/gi, "s")
    .replace(/meters?/gi, "m")
    .replace(/kilometers?/gi, "km")
    .replace(/centimeters?/gi, "cm");
}

function countSignificantFigures(source: string): number | null {
  const normalized = source
    .trim()
    .replace(/^[+-]/, "")
    .replace(/[eE].*$/, "");
  if (!normalized || !/[0-9]/.test(normalized)) return null;
  const digits = normalized.replace(".", "");
  const firstSignificant = digits.search(/[1-9]/);
  if (firstSignificant < 0) return 1;
  if (normalized.includes(".")) return digits.length - firstSignificant;
  const withoutTrailingZeroes = digits.replace(/0+$/, "");
  return Math.max(1, withoutTrailingZeroes.length - firstSignificant);
}

export function parseNumericAnswer(value: unknown): ParsedNumber | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? { value, unit: null, significantFigures: null } : null;
  }
  if (typeof value !== "string") return null;
  const source = value.trim();
  const fraction = source.match(/^([+-]?\d+)\s*\/\s*([+-]?\d+)(?:\s+(.+))?$/);
  if (fraction) {
    const numerator = Number(fraction[1]);
    const denominator = Number(fraction[2]);
    if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator === 0) {
      return null;
    }
    return {
      value: numerator / denominator,
      unit: fraction[3] ? normalizeUnit(fraction[3]) : null,
      significantFigures: null,
    };
  }
  const match = source.match(/^([+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?)(?:\s+(.+))?$/);
  if (!match) return null;
  const number = Number(match[1]);
  if (!Number.isFinite(number)) return null;
  return {
    value: number,
    unit: match[2] ? normalizeUnit(match[2]) : null,
    significantFigures: countSignificantFigures(match[1]),
  };
}

function convertUnit(value: number, from: string | null, to: string | null): number | null {
  if (!to) return from ? null : value;
  const target = unitDefinitions[normalizeUnit(to)];
  if (!target) return null;
  if (!from) return null;
  const source = unitDefinitions[normalizeUnit(from)];
  if (!source || source.dimension !== target.dimension) return null;
  return (value * source.factor) / target.factor;
}

export function convertUnitValue(value: number, fromUnit: string, toUnit: string): number {
  const converted = convertUnit(value, fromUnit, toUnit);
  if (converted === null) throw new ValidationError(`Cannot convert ${fromUnit} to ${toUnit}.`);
  return converted;
}

function text(value: unknown, caseInsensitive: boolean, trimWhitespace = true): string {
  const result = String(value ?? "");
  const trimmed = trimWhitespace ? result.trim() : result;
  return caseInsensitive ? trimmed.toLocaleLowerCase() : trimmed;
}

function jsonEqual(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function acceptedValues(spec: QuestionValidationSpec): readonly unknown[] {
  if (Array.isArray(spec.acceptedAnswers)) return spec.acceptedAnswers;
  if (spec.expected !== undefined) return [spec.expected];
  return [];
}

function result(
  score: number,
  maxScore: number,
  feedback: string,
  options: Pick<AnswerValidationResult, "status" | "errorKey" | "normalizedAnswer" | "perPart"> = {
    status: score === maxScore ? "correct" : "incorrect",
  },
): AnswerValidationResult {
  const safeMax = Math.max(0, maxScore);
  const safeScore = Math.max(0, Math.min(safeMax, score));
  return {
    status: options.status,
    correct: options.status === "correct",
    score: safeScore,
    maxScore: safeMax,
    percentage: safeMax ? Math.round((safeScore / safeMax) * 100) : 0,
    feedback,
    ...(options.errorKey ? { errorKey: options.errorKey } : {}),
    ...(options.normalizedAnswer !== undefined
      ? { normalizedAnswer: options.normalizedAnswer }
      : {}),
    ...(options.perPart ? { perPart: options.perPart } : {}),
  };
}

function numericMatches(
  answer: unknown,
  expected: unknown,
  spec: QuestionValidationSpec,
  requireUnit: boolean,
): AnswerValidationResult {
  const candidate = parseNumericAnswer(answer);
  const expectedNumber = parseNumericAnswer(expected);
  if (!candidate || !expectedNumber)
    return result(0, 1, "Enter a valid numeric answer.", {
      status: "incorrect",
      errorKey: "invalid-number",
    });
  const targetUnit = spec.unit ?? expectedNumber.unit;
  if (requireUnit && !candidate.unit) {
    return result(0, 1, `Include the answer unit${targetUnit ? ` (${targetUnit})` : ""}.`, {
      status: "incorrect",
      errorKey: "missing-unit",
    });
  }
  const acceptedUnits = spec.acceptedUnits?.map(normalizeUnit);
  if (acceptedUnits?.length && (!candidate.unit || !acceptedUnits.includes(candidate.unit))) {
    return result(0, 1, "Use one of the accepted units.", {
      status: "incorrect",
      errorKey: "wrong-unit",
    });
  }
  if (requireUnit && candidate.unit && !unitDefinitions[candidate.unit]) {
    return result(0, 1, "Use a recognized unit.", {
      status: "incorrect",
      errorKey: "wrong-unit",
    });
  }
  const converted = targetUnit
    ? convertUnit(candidate.value, candidate.unit, targetUnit)
    : candidate.unit
      ? candidate.value
      : candidate.value;
  if (converted === null)
    return result(0, 1, "Use the requested unit.", { status: "incorrect", errorKey: "wrong-unit" });
  const expectedValue =
    targetUnit && expectedNumber.unit
      ? convertUnit(expectedNumber.value, expectedNumber.unit, targetUnit)
      : expectedNumber.value;
  if (expectedValue === null)
    return result(0, 1, "The question has an invalid unit rule.", {
      status: "incorrect",
      errorKey: "invalid-unit-rule",
    });
  const absoluteTolerance = spec.tolerance ?? 0;
  const relativeTolerance = spec.relativeTolerance ?? 0;
  const allowed = Math.max(absoluteTolerance, Math.abs(expectedValue) * relativeTolerance);
  if (Math.abs(converted - expectedValue) > allowed) {
    return result(0, 1, "The value is outside the allowed tolerance.", {
      status: "incorrect",
      errorKey: "outside-tolerance",
      normalizedAnswer: converted,
    });
  }
  if (spec.significantFigures && candidate.significantFigures !== spec.significantFigures) {
    return result(0, 1, `Use ${spec.significantFigures} significant figures.`, {
      status: "incorrect",
      errorKey: "significant-figures",
      normalizedAnswer: converted,
    });
  }
  return result(1, 1, "Correct.", { status: "correct", normalizedAnswer: converted });
}

function validateText(answer: unknown, spec: QuestionValidationSpec): AnswerValidationResult {
  const caseInsensitive = spec.caseInsensitive ?? true;
  const normalizedAnswer = text(answer, caseInsensitive, spec.trimWhitespace ?? true);
  const accepted = acceptedValues(spec).map((value) =>
    text(value, caseInsensitive, spec.trimWhitespace ?? true),
  );
  const aliases = Object.entries(spec.aliases ?? {}).flatMap(([key, values]) => [key, ...values]);
  const acceptedWithAliases = [...accepted, ...aliases].map((value) =>
    text(value, caseInsensitive),
  );
  const matches = acceptedWithAliases.includes(normalizedAnswer);
  return result(
    matches ? 1 : 0,
    1,
    matches ? "Correct." : "That answer does not match a valid answer.",
    {
      status: matches ? "correct" : "incorrect",
      errorKey: matches ? undefined : "text-mismatch",
      normalizedAnswer,
    },
  );
}

function asStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((item) => String(item));
  if (typeof value === "string")
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  return [];
}

function validateOptions(
  answer: unknown,
  spec: QuestionValidationSpec,
  multiple: boolean,
): AnswerValidationResult {
  const expected = new Set(spec.correctOptionKeys ?? asStringArray(spec.expected));
  const selected = new Set(multiple ? asStringArray(answer) : [String(answer ?? "")]);
  if (!expected.size)
    return result(0, 1, "The question has no configured correct option.", {
      status: "incorrect",
      errorKey: "missing-answer-key",
    });
  const correctSelected = [...selected].filter((value) => expected.has(value)).length;
  const incorrectSelected = [...selected].filter((value) => !expected.has(value)).length;
  const exact =
    correctSelected === expected.size && incorrectSelected === 0 && selected.size === expected.size;
  if (!multiple)
    return result(exact ? 1 : 0, 1, exact ? "Correct." : "Choose a different option.", {
      status: exact ? "correct" : "incorrect",
      errorKey: exact ? undefined : "option-mismatch",
      normalizedAnswer: [...selected],
    });
  const denominator = expected.size;
  const penalty = spec.partialCredit?.penaltyForIncorrect ? incorrectSelected / denominator : 0;
  const score = Math.max(0, correctSelected / denominator - penalty);
  const status = exact ? "correct" : score > 0 ? "partial" : "incorrect";
  return result(
    score,
    1,
    exact ? "Correct." : score > 0 ? "Partly correct." : "Review the selected options.",
    { status, errorKey: exact ? undefined : "option-mismatch", normalizedAnswer: [...selected] },
  );
}

function validateMatching(answer: unknown, spec: QuestionValidationSpec): AnswerValidationResult {
  const expected =
    spec.correctPairs ??
    (typeof spec.expected === "object" && spec.expected
      ? (spec.expected as Record<string, string>)
      : {});
  const actual = typeof answer === "object" && answer ? (answer as Record<string, unknown>) : {};
  const keys = Object.keys(expected);
  if (!keys.length)
    return result(0, 1, "The question has no configured matching pairs.", {
      status: "incorrect",
      errorKey: "missing-answer-key",
    });
  let matched = 0;
  for (const key of keys) {
    if (text(actual[key], true) === text(expected[key], true)) matched += 1;
  }
  const score = matched / keys.length;
  return result(
    score,
    1,
    score === 1
      ? "Correct."
      : score > 0
        ? `${matched} of ${keys.length} matches are correct.`
        : "Review the matches.",
    {
      status: score === 1 ? "correct" : score > 0 ? "partial" : "incorrect",
      errorKey: score === 1 ? undefined : "matching-mismatch",
      normalizedAnswer: actual as JsonValue,
    },
  );
}

function validateOrdering(answer: unknown, spec: QuestionValidationSpec): AnswerValidationResult {
  const expected = spec.correctOrder ?? asStringArray(spec.expected);
  const actual = asStringArray(answer);
  if (!expected.length)
    return result(0, 1, "The question has no configured order.", {
      status: "incorrect",
      errorKey: "missing-answer-key",
    });
  const matched = expected.reduce(
    (total, value, index) => total + (actual[index] === value ? 1 : 0),
    0,
  );
  const score = matched / expected.length;
  return result(
    score,
    1,
    score === 1
      ? "Correct order."
      : score > 0
        ? `${matched} of ${expected.length} positions are correct.`
        : "Review the order.",
    {
      status: score === 1 ? "correct" : score > 0 ? "partial" : "incorrect",
      errorKey: score === 1 ? undefined : "ordering-mismatch",
      normalizedAnswer: actual,
    },
  );
}

function validateMultiStep(answer: unknown, spec: QuestionValidationSpec): AnswerValidationResult {
  const steps = spec.steps ?? [];
  const actual = Array.isArray(answer) ? answer : [];
  if (!steps.length)
    return result(0, 1, "The question has no configured steps.", {
      status: "incorrect",
      errorKey: "missing-answer-key",
    });
  const perPart = steps.map((step, index) => validateAnswer(step.type, step.spec, actual[index]));
  const maxScore = steps.reduce((total, step) => total + (step.weight ?? 1), 0);
  const score = perPart.reduce(
    (total, part, index) => total + part.score * (steps[index].weight ?? 1),
    0,
  );
  const hasReview = perPart.some((part) => part.status === "needs-review");
  const status = hasReview
    ? "needs-review"
    : score === maxScore
      ? "correct"
      : score > 0
        ? "partial"
        : "incorrect";
  return result(
    score,
    maxScore,
    status === "correct"
      ? "All steps are correct."
      : `${perPart.filter((part) => part.correct).length} of ${steps.length} steps are fully correct.`,
    { status, perPart },
  );
}

export function validateAnswer(
  type: QuestionType,
  spec: QuestionValidationSpec,
  answer: unknown,
): AnswerValidationResult {
  if (type === "long-answer") {
    const hasText = text(answer, false).length > 0;
    return result(0, 1, hasText ? "Saved for review." : "Write an answer before submitting.", {
      status: hasText ? "needs-review" : "incorrect",
      errorKey: hasText ? undefined : "empty-answer",
      normalizedAnswer: text(answer, false),
    });
  }
  if (type === "multiple-choice") return validateOptions(answer, spec, false);
  if (type === "multiple-selection") return validateOptions(answer, spec, true);
  if (type === "true-false") {
    const expected =
      typeof spec.expected === "boolean" ? spec.expected : text(spec.expected, true) === "true";
    const actual = typeof answer === "boolean" ? answer : text(answer, true) === "true";
    return result(
      actual === expected ? 1 : 0,
      1,
      actual === expected ? "Correct." : "That is not the expected answer.",
      {
        status: actual === expected ? "correct" : "incorrect",
        errorKey: actual === expected ? undefined : "boolean-mismatch",
        normalizedAnswer: actual,
      },
    );
  }
  if (["numeric", "numeric-tolerance", "numeric-unit"].includes(type)) {
    const expected = acceptedValues(spec);
    const matches = expected.some(
      (candidate) =>
        numericMatches(answer, candidate, spec, type === "numeric-unit").status === "correct",
    );
    const first = expected[0];
    if (matches)
      return numericMatches(
        answer,
        expected.find(
          (candidate) =>
            numericMatches(answer, candidate, spec, type === "numeric-unit").status === "correct",
        ) ?? first,
        spec,
        type === "numeric-unit",
      );
    return numericMatches(answer, first, spec, type === "numeric-unit");
  }
  if (type === "algebraic-expression" || type === "formula") {
    const answerText = text(answer, false);
    const expected = acceptedValues(spec).map((value) => String(value));
    const matches = expected.some((value) =>
      areEquivalentExpressions(answerText, value, spec.variables ?? []),
    );
    return result(
      matches ? 1 : 0,
      1,
      matches ? "Equivalent expression." : "The expression is not equivalent.",
      {
        status: matches ? "correct" : "incorrect",
        errorKey: matches ? undefined : "expression-mismatch",
        normalizedAnswer: answerText,
      },
    );
  }
  if (["short-answer", "graph-interpretation", "table-interpretation"].includes(type))
    return validateText(answer, spec);
  if (type === "matching") return validateMatching(answer, spec);
  if (type === "ordering") return validateOrdering(answer, spec);
  if (type === "diagram-labeling") return validateMatching(answer, spec);
  if (type === "multi-step") return validateMultiStep(answer, spec);
  try {
    const expected = String(spec.expected ?? "");
    return result(jsonEqual(answer, expected) ? 1 : 0, 1, "Review your answer.", {
      status: jsonEqual(answer, expected) ? "correct" : "incorrect",
    });
  } catch {
    return result(0, 1, "The answer could not be validated.", {
      status: "incorrect",
      errorKey: "validation-error",
    });
  }
}

export function assertValidQuestionDefinition(input: {
  type: QuestionType;
  prompt: string;
  answerSpec: QuestionValidationSpec;
}): void {
  if (!input.prompt.trim()) throw new ValidationError("A question prompt cannot be empty.");
  if (input.prompt.length > 30000)
    throw new ValidationError("Keep question prompts under 30,000 characters.");
  if (input.type === "algebraic-expression" || input.type === "formula") {
    const expected = acceptedValues(input.answerSpec);
    if (!expected.length)
      throw new ValidationError("Expression questions need at least one accepted expression.");
    for (const value of expected) {
      try {
        parseMathematicalExpression(String(value));
      } catch {
        throw new ValidationError("Expression answers must use the supported safe math syntax.");
      }
    }
  }
  if (["numeric", "numeric-tolerance", "numeric-unit"].includes(input.type)) {
    if (
      !acceptedValues(input.answerSpec).length ||
      acceptedValues(input.answerSpec).some((value) => !parseNumericAnswer(value))
    ) {
      throw new ValidationError("Numeric questions need at least one finite numeric answer.");
    }
    if (input.answerSpec.tolerance !== undefined && input.answerSpec.tolerance < 0) {
      throw new ValidationError("Numeric tolerance cannot be negative.");
    }
  }
}
