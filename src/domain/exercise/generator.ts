import { ValidationError } from "@/domain/errors/application-error";
import {
  evaluateMathematicalExpression,
  parseMathematicalExpression,
} from "@/domain/exercise/expression";
import type {
  GeneratedQuestionInstance,
  JsonValue,
  QuestionTemplateRecord,
  QuestionTemplateVariable,
} from "@/domain/exercise/types";

function hashSeed(seed: number): number {
  let value = Math.trunc(seed) | 0;
  value = Math.imul(value ^ (value >>> 16), 0x45d9f3b);
  value = Math.imul(value ^ (value >>> 16), 0x45d9f3b);
  return (value ^ (value >>> 16)) >>> 0;
}

export function createSeededRandom(seed: number): () => number {
  let state = hashSeed(seed) || 0x6d2b79f5;
  return () => {
    state = Math.imul(state ^ (state >>> 15), state | 1);
    state ^= state + Math.imul(state ^ (state >>> 7), state | 61);
    return ((state ^ (state >>> 14)) >>> 0) / 4294967296;
  };
}

function round(value: number, decimals = 4): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function valueForVariable(
  variable: QuestionTemplateVariable,
  random: () => number,
): string | number {
  if (variable.values?.length) {
    return variable.values[Math.floor(random() * variable.values.length)];
  }
  const step = variable.step && variable.step > 0 ? variable.step : 1;
  const count = Math.floor((variable.max - variable.min) / step);
  const value = variable.min + Math.floor(random() * (count + 1)) * step;
  return round(value, variable.decimals ?? 4);
}

function interpolate(template: string, values: Readonly<Record<string, string | number>>): string {
  return template.replace(/\{\{\s*([A-Za-z_][A-Za-z0-9_]*)\s*\}\}/g, (_match, name: string) => {
    if (!(name in values))
      throw new ValidationError(`Template variable '${name}' is not configured.`);
    return String(values[name]);
  });
}

function replaceVariables(
  expression: string,
  values: Readonly<Record<string, string | number>>,
): string {
  return expression.replace(/\b([A-Za-z_][A-Za-z0-9_]*)\b/g, (match) => {
    if (!(match in values)) return match;
    return String(values[match]);
  });
}

export function generateQuestionInstance(
  template: QuestionTemplateRecord,
  seed = template.seed ?? 1,
): GeneratedQuestionInstance {
  const random = createSeededRandom(seed);
  const variables: Record<string, string | number> = {};
  for (const variable of template.variables)
    variables[variable.name] = valueForVariable(variable, random);
  const prompt = interpolate(template.promptTemplate, variables);
  let expectedAnswer: JsonValue = template.validationSpec.expected ?? null;
  if (template.answerExpression.trim()) {
    try {
      const expression = parseMathematicalExpression(
        replaceVariables(template.answerExpression, variables),
      );
      expectedAnswer = round(evaluateMathematicalExpression(expression), 6);
    } catch {
      throw new ValidationError(
        "The template answer expression is not safe or cannot be evaluated.",
      );
    }
  }
  const validationSpec = JSON.parse(
    JSON.stringify(template.validationSpec),
  ) as QuestionTemplateRecord["validationSpec"];
  validationSpec.expected = expectedAnswer;
  return { templateId: template.id, seed, variables, prompt, expectedAnswer, validationSpec };
}

export function previewTemplate(
  template: QuestionTemplateRecord,
  seeds: readonly number[] = [
    template.seed ?? 1,
    (template.seed ?? 1) + 1,
    (template.seed ?? 1) + 2,
  ],
): readonly GeneratedQuestionInstance[] {
  return seeds.map((seed) => generateQuestionInstance(template, seed));
}
