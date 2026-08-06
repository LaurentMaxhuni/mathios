import { ValidationError } from "@/domain/errors/application-error";
import type {
  LaboratoryConfiguration,
  LaboratoryDataType,
  LaboratoryDetail,
  LaboratoryGraphPoint,
  LaboratoryMeasurementRecord,
  LaboratoryRegression,
  LaboratoryTheoryComparison,
  LaboratoryVariableRecord,
  LaboratoryScalar,
} from "@/domain/laboratory/types";

type UnitDefinition = {
  dimension: string;
  canonical: string;
  factor: number;
  offset?: number;
};

const units: Record<string, UnitDefinition> = {
  "": { dimension: "dimensionless", canonical: "", factor: 1 },
  "1": { dimension: "dimensionless", canonical: "", factor: 1 },
  m: { dimension: "length", canonical: "m", factor: 1 },
  cm: { dimension: "length", canonical: "m", factor: 0.01 },
  mm: { dimension: "length", canonical: "m", factor: 0.001 },
  km: { dimension: "length", canonical: "m", factor: 1000 },
  s: { dimension: "time", canonical: "s", factor: 1 },
  ms: { dimension: "time", canonical: "s", factor: 0.001 },
  min: { dimension: "time", canonical: "s", factor: 60 },
  h: { dimension: "time", canonical: "s", factor: 3600 },
  kg: { dimension: "mass", canonical: "kg", factor: 1 },
  g: { dimension: "mass", canonical: "kg", factor: 0.001 },
  mg: { dimension: "mass", canonical: "kg", factor: 0.000001 },
  A: { dimension: "current", canonical: "A", factor: 1 },
  mA: { dimension: "current", canonical: "A", factor: 0.001 },
  V: { dimension: "voltage", canonical: "V", factor: 1 },
  mV: { dimension: "voltage", canonical: "V", factor: 0.001 },
  Ω: { dimension: "resistance", canonical: "Ω", factor: 1 },
  ohm: { dimension: "resistance", canonical: "Ω", factor: 1 },
  kΩ: { dimension: "resistance", canonical: "Ω", factor: 1000 },
  J: { dimension: "energy", canonical: "J", factor: 1 },
  kJ: { dimension: "energy", canonical: "J", factor: 1000 },
  N: { dimension: "force", canonical: "N", factor: 1 },
  Hz: { dimension: "frequency", canonical: "Hz", factor: 1 },
  kHz: { dimension: "frequency", canonical: "Hz", factor: 1000 },
  K: { dimension: "temperature", canonical: "K", factor: 1 },
  "°C": { dimension: "temperature", canonical: "K", factor: 1, offset: 273.15 },
  C: { dimension: "temperature", canonical: "K", factor: 1, offset: 273.15 },
  rad: { dimension: "angle", canonical: "rad", factor: 1 },
  "°": { dimension: "angle", canonical: "rad", factor: Math.PI / 180 },
  "m/s": { dimension: "speed", canonical: "m/s", factor: 1 },
  "km/h": { dimension: "speed", canonical: "m/s", factor: 1000 / 3600 },
  "m/s²": { dimension: "acceleration", canonical: "m/s²", factor: 1 },
  "cm/s²": { dimension: "acceleration", canonical: "m/s²", factor: 0.01 },
  L: { dimension: "volume", canonical: "L", factor: 1 },
  mL: { dimension: "volume", canonical: "L", factor: 0.001 },
  mol: { dimension: "amount", canonical: "mol", factor: 1 },
  mM: { dimension: "concentration", canonical: "mM", factor: 1 },
  µM: { dimension: "concentration", canonical: "mM", factor: 0.001 },
  Pa: { dimension: "pressure", canonical: "Pa", factor: 1 },
  kPa: { dimension: "pressure", canonical: "Pa", factor: 1000 },
  atm: { dimension: "pressure", canonical: "Pa", factor: 101325 },
  AU: { dimension: "distance", canonical: "AU", factor: 1 },
  year: { dimension: "period", canonical: "year", factor: 1 },
  yr: { dimension: "period", canonical: "year", factor: 1 },
  nm: { dimension: "wavelength", canonical: "nm", factor: 1 },
  "J·s": { dimension: "action", canonical: "J·s", factor: 1 },
};

const unitAliases: Record<string, string> = {
  deg: "°",
  degree: "°",
  degrees: "°",
  "m/s^2": "m/s²",
  "cm/s^2": "cm/s²",
  "N·m": "J",
  "J*s": "J·s",
  "J s": "J·s",
};

export function normalizeUnit(unit: string | null | undefined): string | null {
  const value = unit?.trim() ?? "";
  if (!value) return null;
  const alias = unitAliases[value] ?? value;
  return units[alias] ? alias : null;
}

export function convertUnit(value: number, fromUnit: string | null, toUnit: string | null): number {
  if (!Number.isFinite(value))
    throw new ValidationError("Measurement values must be finite numbers.");
  const from = units[unitAliases[fromUnit?.trim() ?? ""] ?? fromUnit?.trim() ?? ""];
  const to = units[unitAliases[toUnit?.trim() ?? ""] ?? toUnit?.trim() ?? ""];
  if (!from || !to || from.dimension !== to.dimension) {
    throw new ValidationError("Measurements must use compatible units.");
  }
  const base =
    from.offset === undefined ? value * from.factor : (value + from.offset) * from.factor;
  return to.offset === undefined ? base / to.factor : base / to.factor - to.offset;
}

export function roundToSignificantFigures(value: number, significantFigures: number): number {
  if (!Number.isFinite(value)) return value;
  if (!Number.isInteger(significantFigures) || significantFigures < 1 || significantFigures > 12) {
    throw new ValidationError("Significant figures must be an integer from 1 to 12.");
  }
  if (value === 0) return 0;
  const scale = 10 ** (significantFigures - 1 - Math.floor(Math.log10(Math.abs(value))));
  return Math.round(value * scale) / scale;
}

export function formatSignificantFigures(value: number, significantFigures = 3): string {
  const rounded = roundToSignificantFigures(value, significantFigures);
  if (rounded === 0) return "0";
  const exponent = Math.floor(Math.log10(Math.abs(rounded)));
  const decimals = Math.max(0, significantFigures - exponent - 1);
  return rounded.toFixed(decimals);
}

export function parseLaboratoryScalar(
  value: unknown,
  dataType: LaboratoryDataType,
): LaboratoryScalar {
  if (dataType === "number") {
    const numeric = typeof value === "number" ? value : Number(value);
    if (!Number.isFinite(numeric)) throw new ValidationError("Enter a finite numeric measurement.");
    return numeric;
  }
  if (dataType === "boolean") {
    if (typeof value === "boolean") return value;
    if (value === "true" || value === "false") return value === "true";
    throw new ValidationError("Enter true or false for this observation.");
  }
  if (typeof value !== "string") throw new ValidationError("Enter text for this observation.");
  const text = value.trim();
  if (!text) throw new ValidationError("Text observations cannot be empty.");
  return text;
}

export function validateVariableValue(
  variable: Pick<LaboratoryVariableRecord, "dataType" | "minValue" | "maxValue" | "unit">,
  value: unknown,
  unit?: string | null,
): LaboratoryScalar {
  const parsed = parseLaboratoryScalar(value, variable.dataType);
  if (typeof parsed === "number") {
    const normalized = variable.unit && unit ? convertUnit(parsed, unit, variable.unit) : parsed;
    if (variable.minValue !== null && normalized < variable.minValue)
      throw new ValidationError("The measurement is below the allowed range.");
    if (variable.maxValue !== null && normalized > variable.maxValue)
      throw new ValidationError("The measurement is above the allowed range.");
    if (variable.unit && !normalizeUnit(unit ?? variable.unit))
      throw new ValidationError(`Use a recognized unit for ${variable.unit}.`);
    if (variable.unit && unit) convertUnit(parsed, unit, variable.unit);
  }
  return parsed;
}

export function normalizeMeasurement(
  variable: Pick<
    LaboratoryVariableRecord,
    "dataType" | "minValue" | "maxValue" | "unit" | "significantFigures"
  >,
  value: unknown,
  unit?: string | null,
  uncertainty?: number | null,
  significantFigures?: number | null,
): {
  value: LaboratoryScalar;
  unit: string | null;
  uncertainty: number | null;
  significantFigures: number | null;
} {
  const parsed = validateVariableValue(variable, value, unit);
  if (typeof parsed !== "number") {
    return { value: parsed, unit: null, uncertainty: null, significantFigures: null };
  }
  const targetUnit = variable.unit ?? normalizeUnit(unit) ?? null;
  const converted = targetUnit && unit ? convertUnit(parsed, unit, targetUnit) : parsed;
  const rawUncertainty =
    uncertainty === null || uncertainty === undefined ? null : Number(uncertainty);
  if (rawUncertainty !== null && (!Number.isFinite(rawUncertainty) || rawUncertainty < 0)) {
    throw new ValidationError("Uncertainty must be a finite, non-negative number.");
  }
  const figures = significantFigures ?? variable.significantFigures ?? null;
  if (figures !== null && (!Number.isInteger(figures) || figures < 1 || figures > 12)) {
    throw new ValidationError("Significant figures must be an integer from 1 to 12.");
  }
  return {
    value: figures ? roundToSignificantFigures(converted, figures) : converted,
    unit: targetUnit,
    uncertainty:
      rawUncertainty === null || !targetUnit || !unit
        ? rawUncertainty
        : convertUncertainty(rawUncertainty, unit, targetUnit),
    significantFigures: figures,
  };
}

function convertUncertainty(value: number, fromUnit: string, toUnit: string): number {
  const fromKey = unitAliases[fromUnit.trim()] ?? fromUnit.trim();
  const toKey = unitAliases[toUnit.trim()] ?? toUnit.trim();
  const from = units[fromKey];
  const to = units[toKey];
  if (!from || !to || from.dimension !== to.dimension)
    throw new ValidationError("Measurements must use compatible units.");
  return (value * from.factor) / to.factor;
}

export function calculateUncertainty(
  values: readonly number[],
  method: "standard-deviation" | "half-range" | "mean-absolute-deviation" = "standard-deviation",
): number {
  const finite = values.filter(Number.isFinite);
  if (finite.length < 2) return 0;
  const mean = finite.reduce((sum, value) => sum + value, 0) / finite.length;
  if (method === "half-range") return (Math.max(...finite) - Math.min(...finite)) / 2;
  if (method === "mean-absolute-deviation") {
    return finite.reduce((sum, value) => sum + Math.abs(value - mean), 0) / finite.length;
  }
  const variance =
    finite.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (finite.length - 1);
  return Math.sqrt(variance);
}

export function linearRegression(
  points: readonly Pick<LaboratoryGraphPoint, "x" | "y">[],
): LaboratoryRegression | null {
  const finite = points.filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y));
  if (finite.length < 2) return null;
  const meanX = finite.reduce((sum, point) => sum + point.x, 0) / finite.length;
  const meanY = finite.reduce((sum, point) => sum + point.y, 0) / finite.length;
  const denominator = finite.reduce((sum, point) => sum + (point.x - meanX) ** 2, 0);
  if (denominator === 0) return null;
  const slope =
    finite.reduce((sum, point) => sum + (point.x - meanX) * (point.y - meanY), 0) / denominator;
  const intercept = meanY - slope * meanX;
  const total = finite.reduce((sum, point) => sum + (point.y - meanY) ** 2, 0);
  const residual = finite.reduce(
    (sum, point) => sum + (point.y - (slope * point.x + intercept)) ** 2,
    0,
  );
  return {
    count: finite.length,
    slope,
    intercept,
    rSquared: total === 0 ? 1 : Math.max(0, Math.min(1, 1 - residual / total)),
    standardError: finite.length > 2 ? Math.sqrt(residual / (finite.length - 2)) : null,
  };
}

export function compareToTheory(
  variableId: string,
  measuredValue: number,
  theoreticalValue: number,
  uncertainty: number | null = null,
): LaboratoryTheoryComparison {
  const difference = measuredValue - theoreticalValue;
  return {
    variableId,
    measuredValue,
    theoreticalValue,
    difference,
    percentError:
      theoreticalValue === 0 ? null : (Math.abs(difference) / Math.abs(theoreticalValue)) * 100,
    withinUncertainty: uncertainty === null ? null : Math.abs(difference) <= uncertainty,
  };
}

export function buildGraphPoints(
  measurements: readonly LaboratoryMeasurementRecord[],
  xVariable: LaboratoryVariableRecord,
  yVariable: LaboratoryVariableRecord,
): readonly LaboratoryGraphPoint[] {
  const xByRow = new Map<number, LaboratoryMeasurementRecord>();
  const yByRow = new Map<number, LaboratoryMeasurementRecord>();
  for (const measurement of measurements) {
    if (measurement.numericValue === null) continue;
    if (measurement.variableId === xVariable.id) xByRow.set(measurement.rowIndex, measurement);
    if (measurement.variableId === yVariable.id) yByRow.set(measurement.rowIndex, measurement);
  }
  return [...xByRow.keys()]
    .filter((rowIndex) => yByRow.has(rowIndex))
    .sort((a, b) => a - b)
    .map((rowIndex) => {
      const x = xByRow.get(rowIndex)!;
      const y = yByRow.get(rowIndex)!;
      return {
        rowIndex,
        x: x.numericValue!,
        y: y.numericValue!,
        xUncertainty: x.uncertainty,
        yUncertainty: y.uncertainty,
      };
    });
}

export function calculateSessionCompletion(
  detail: Pick<LaboratoryDetail, "steps" | "variables">,
  measurements: readonly LaboratoryMeasurementRecord[],
  observations: readonly { notes: string }[],
): number {
  const requiredSteps = detail.steps.filter((step) => step.isRequired).length;
  const completedSteps = observations.filter(
    (observation) => observation.notes.trim().length > 0,
  ).length;
  const requiredVariables = detail.variables.filter(
    (variable) => variable.dataType === "number",
  ).length;
  const measuredVariables = new Set(measurements.map((measurement) => measurement.variableId)).size;
  const stepScore = requiredSteps ? Math.min(1, completedSteps / requiredSteps) : 1;
  const variableScore = requiredVariables ? Math.min(1, measuredVariables / requiredVariables) : 1;
  return Math.round(((stepScore + variableScore) / 2) * 100);
}

export function assertReportCanSubmit(input: {
  title: string;
  conclusion: string;
  sections: readonly { body: string }[];
}): void {
  if (input.title.trim().length < 3)
    throw new ValidationError("Give the report a descriptive title before submitting.");
  if (!input.sections.some((section) => section.body.trim().length > 0)) {
    throw new ValidationError("Add at least one report section before submitting.");
  }
  if (input.conclusion.trim().length < 20) {
    throw new ValidationError("Write a conclusion of at least 20 characters before submitting.");
  }
}

export function defaultReportSections(
  detail: LaboratoryDetail,
): readonly { id: string; title: string; body: string; sortOrder: number }[] {
  return [
    { id: "objective", title: "Objective", body: detail.activity.objective, sortOrder: 0 },
    { id: "theory", title: "Theory", body: detail.activity.theory, sortOrder: 1 },
    {
      id: "method",
      title: "Method",
      body: detail.steps.map((step) => `${step.title}: ${step.instructions}`).join("\n"),
      sortOrder: 2,
    },
    { id: "analysis", title: "Analysis", body: detail.activity.analysisPrompt, sortOrder: 3 },
  ];
}

export function assertConfigurationIsBounded(
  configuration: LaboratoryConfiguration,
  maxEntries = 100,
): void {
  if (Object.keys(configuration).length > maxEntries)
    throw new ValidationError("Laboratory data contains too many fields.");
  for (const value of Object.values(configuration)) {
    if (typeof value === "string" && value.length > 20000)
      throw new ValidationError("Laboratory text is too long.");
  }
}
