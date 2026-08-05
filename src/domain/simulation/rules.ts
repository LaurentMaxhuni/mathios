import { ValidationError } from "@/domain/errors/application-error";
import type {
  SimulationDefinition,
  SimulationInputDefinition,
  SimulationFrame,
} from "@/domain/simulation/types";

export function defaultInputs(definition: SimulationDefinition): Record<string, unknown> {
  return Object.fromEntries(definition.inputs.map((input) => [input.key, input.defaultValue]));
}

export function validateSimulationInputs(
  inputs: Record<string, unknown>,
  definitions: readonly SimulationInputDefinition[],
): readonly string[] {
  const errors: string[] = [];
  for (const input of definitions) {
    const value = inputs[input.key];
    if (input.type === "toggle") {
      if (typeof value !== "boolean") errors.push(`${input.label} must be enabled or disabled.`);
      continue;
    }
    if (input.type === "select") {
      if (typeof value !== "string" || !input.options?.some((option) => option.value === value))
        errors.push(`${input.label} has an invalid selection.`);
      continue;
    }
    const numeric = typeof value === "number" ? value : Number(value);
    if (!Number.isFinite(numeric)) errors.push(`${input.label} must be a number.`);
    if (input.min !== undefined && numeric < input.min) errors.push(`${input.label} is too small.`);
    if (input.max !== undefined && numeric > input.max) errors.push(`${input.label} is too large.`);
  }
  return errors;
}

export function assertValidSimulationInputs(
  definition: SimulationDefinition,
  inputs: Record<string, unknown>,
): void {
  const errors = [
    ...definition.validate(inputs),
    ...validateSimulationInputs(inputs, definition.inputs),
  ];
  if (errors.length) throw new ValidationError(errors.join(" "));
}

export function advanceSimulation(
  definition: SimulationDefinition,
  state: Record<string, number>,
  inputs: Record<string, unknown>,
  deltaSeconds: number,
): { state: Record<string, number>; frame: SimulationFrame } {
  assertValidSimulationInputs(definition, inputs);
  const safeDelta = Math.max(0, Math.min(5, deltaSeconds));
  const nextState = definition.step(state, inputs, safeDelta);
  return { state: nextState, frame: definition.frame(nextState, inputs) };
}

export function completionForTasks(
  definition: SimulationDefinition,
  inputs: Record<string, unknown>,
): number {
  if (!definition.guidedTasks.length) return 100;
  const completed = definition.guidedTasks.filter((task) => {
    if (!task.targetInput || task.targetValue === undefined) return false;
    const value = Number(inputs[task.targetInput]);
    return Number.isFinite(value) && Math.abs(value - task.targetValue) <= (task.tolerance ?? 0.01);
  });
  return Math.round((completed.length / definition.guidedTasks.length) * 100);
}
