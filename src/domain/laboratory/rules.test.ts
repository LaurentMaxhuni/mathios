import { describe, expect, it } from "vitest";
import {
  buildGraphPoints,
  calculateUncertainty,
  compareToTheory,
  convertUnit,
  formatSignificantFigures,
  linearRegression,
  normalizeMeasurement,
  roundToSignificantFigures,
} from "@/domain/laboratory/rules";

describe("laboratory calculations", () => {
  it("converts compatible units and rejects invalid measurements", () => {
    expect(convertUnit(120, "cm", "m")).toBeCloseTo(1.2);
    expect(convertUnit(25, "°C", "K")).toBeCloseTo(298.15);
    expect(() => convertUnit(1, "m", "s")).toThrow("compatible units");
    expect(
      normalizeMeasurement(
        { dataType: "number", minValue: 0, maxValue: 10, unit: "m", significantFigures: 2 },
        125,
        "cm",
        0.5,
        2,
      ),
    ).toMatchObject({ value: 1.3, unit: "m", uncertainty: 0.005, significantFigures: 2 });
  });

  it("rounds and formats values to significant figures", () => {
    expect(roundToSignificantFigures(1234, 3)).toBe(1230);
    expect(formatSignificantFigures(0.01234, 3)).toBe("0.0123");
    expect(calculateUncertainty([1, 2, 3], "half-range")).toBe(1);
  });

  it("calculates a regression and compares measured values with theory", () => {
    const regression = linearRegression([
      { x: 1, y: 3 },
      { x: 2, y: 5 },
      { x: 3, y: 7 },
    ]);
    expect(regression).toMatchObject({ count: 3, slope: 2, intercept: 1, rSquared: 1 });
    expect(compareToTheory("gravity", 9.9, 9.81, 0.2)).toMatchObject({ withinUncertainty: true });
  });

  it("pairs measurements into graph points by trial row", () => {
    const points = buildGraphPoints(
      [
        {
          id: "x0",
          sessionId: "s",
          variableId: "x",
          observationId: null,
          rowIndex: 1,
          numericValue: 2,
          textValue: null,
          unit: "s",
          uncertainty: null,
          significantFigures: null,
          source: "manual",
          notes: "",
          recordedAt: "",
        },
        {
          id: "y0",
          sessionId: "s",
          variableId: "y",
          observationId: null,
          rowIndex: 1,
          numericValue: 5,
          textValue: null,
          unit: "m",
          uncertainty: 0.1,
          significantFigures: 2,
          source: "manual",
          notes: "",
          recordedAt: "",
        },
      ],
      {
        id: "x",
        activityId: "a",
        key: "x",
        label: "Time",
        symbol: "t",
        role: "independent",
        dataType: "number",
        unit: "s",
        description: "",
        defaultValue: null,
        minValue: null,
        maxValue: null,
        uncertainty: null,
        significantFigures: null,
        theoreticalValue: null,
        configuration: {},
        sortOrder: 0,
      },
      {
        id: "y",
        activityId: "a",
        key: "y",
        label: "Distance",
        symbol: "x",
        role: "dependent",
        dataType: "number",
        unit: "m",
        description: "",
        defaultValue: null,
        minValue: null,
        maxValue: null,
        uncertainty: null,
        significantFigures: null,
        theoreticalValue: null,
        configuration: {},
        sortOrder: 1,
      },
    );
    expect(points).toEqual([{ rowIndex: 1, x: 2, y: 5, xUncertainty: null, yUncertainty: 0.1 }]);
  });
});
