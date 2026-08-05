import { describe, expect, it } from "vitest";
import {
  advanceSimulation,
  completionForTasks,
  defaultInputs,
  validateSimulationInputs,
} from "@/domain/simulation/rules";
import { getRegisteredSimulation, simulationRegistry } from "@/domain/simulation/registry";

describe("simulation registry and rules", () => {
  it("ships the initial examples across all five subjects", () => {
    expect(simulationRegistry.length).toBe(17);
    expect(new Set(simulationRegistry.map((simulation) => simulation.subject))).toEqual(
      new Set(["mathematics", "physics", "chemistry", "biology", "astronomy"]),
    );
  });

  it("validates, steps, and computes a frame without evaluating arbitrary code", () => {
    const simulation = getRegisteredSimulation("one-dimensional-motion")!;
    const inputs = defaultInputs(simulation);
    expect(validateSimulationInputs(inputs, simulation.inputs)).toEqual([]);
    const result = advanceSimulation(simulation, simulation.initialState(inputs), inputs, 1);
    expect(result.state.time).toBe(1);
    expect(result.frame.values.position).toBeCloseTo(2.5);
    expect(result.frame.series.motion.length).toBeGreaterThan(1);
  });

  it("reports guided task completion as a bounded percentage", () => {
    const simulation = getRegisteredSimulation("function-transformations")!;
    expect(completionForTasks(simulation, { a: -1, b: 0, x: 1 })).toBe(100);
    expect(completionForTasks(simulation, { a: 1, b: 0, x: 1 })).toBe(0);
  });
});
