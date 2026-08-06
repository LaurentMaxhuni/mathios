import { randomUUID } from "node:crypto";
import { NotFoundError, ValidationError } from "@/domain/errors/application-error";
import {
  assertConfigurationIsBounded,
  assertReportCanSubmit,
  calculateSessionCompletion,
  defaultReportSections,
  normalizeMeasurement,
  validateVariableValue,
} from "@/domain/laboratory/rules";
import { advanceSimulation, defaultInputs } from "@/domain/simulation/rules";
import type { LaboratoryRepository } from "@/domain/ports/laboratory-repository";
import type {
  LaboratoryActivityInput,
  LaboratoryActivityRecord,
  LaboratoryConfiguration,
  LaboratoryDetail,
  LaboratoryMeasurementRecord,
  LaboratoryReportRecord,
  LaboratorySessionDetail,
  LaboratorySessionRecord,
} from "@/domain/laboratory/types";
import { getRegisteredSimulation } from "@/domain/simulation/registry";
import type { AuthenticatedPrincipal } from "@/infrastructure/auth/auth-provider";

function requireActivity(detail: LaboratoryDetail | null, id: string): LaboratoryDetail {
  if (!detail) throw new NotFoundError("Laboratory activity", id);
  return detail;
}

function requireDetail(
  detail: LaboratorySessionDetail | null,
  id: string,
): LaboratorySessionDetail {
  if (!detail) throw new NotFoundError("Laboratory session", id);
  return detail;
}

export function canAuthorLaboratories(
  principal: AuthenticatedPrincipal | null | undefined,
): boolean {
  return Boolean(principal?.permissions.includes("edit_content"));
}

export function canPublishLaboratories(
  principal: AuthenticatedPrincipal | null | undefined,
): boolean {
  return Boolean(principal?.permissions.includes("publish_content"));
}

export async function listLaboratoryActivities(
  repository: LaboratoryRepository,
  options: Parameters<LaboratoryRepository["listActivities"]>[0] = {},
) {
  return repository.listActivities(options);
}

export async function getLaboratoryActivity(
  id: string,
  repository: LaboratoryRepository,
  options: Parameters<LaboratoryRepository["getActivity"]>[1] = {},
) {
  return repository.getActivity(id, options);
}

export async function createLaboratoryActivity(
  profileId: string,
  input: LaboratoryActivityInput,
  repository: LaboratoryRepository,
) {
  if (input.status === "published")
    throw new ValidationError("Create the activity as a draft before publishing it.");
  return repository.createActivity({
    ...input,
    id: input.id ?? `laboratory-activity-${randomUUID()}`,
    createdByProfileId: profileId,
  });
}

export async function updateLaboratoryActivity(
  id: string,
  input: LaboratoryActivityInput,
  repository: LaboratoryRepository,
) {
  const existing = requireActivity(await repository.getActivity(id, { includeDraft: true }), id);
  if (existing.activity.status === "published" && input.status === "published") {
    throw new ValidationError("Create a draft revision before changing a published activity.");
  }
  return repository.updateActivity(id, input);
}

export async function setLaboratoryActivityStatus(
  id: string,
  status: LaboratoryActivityRecord["status"],
  repository: LaboratoryRepository,
) {
  const detail = requireActivity(await repository.getActivity(id, { includeDraft: true }), id);
  if (status === "published" && (!detail.steps.length || !detail.variables.length)) {
    throw new ValidationError(
      "An activity needs procedure steps and variables before publication.",
    );
  }
  return repository.setActivityStatus(id, status);
}

export async function startLaboratorySession(
  profileId: string,
  activityId: string,
  input: { mode?: LaboratoryActivityRecord["mode"]; inputs?: LaboratoryConfiguration },
  repository: LaboratoryRepository,
): Promise<LaboratorySessionRecord> {
  const detail = requireActivity(await repository.getActivity(activityId), activityId);
  const selectedMode = input.mode ?? detail.activity.mode;
  if (detail.activity.mode === "real-world" && selectedMode === "simulated") {
    throw new ValidationError("This activity is a real-world experiment guide.");
  }
  assertConfigurationIsBounded(input.inputs ?? {});
  return repository.createSession({
    id: `laboratory-session-${randomUUID()}`,
    profileId,
    activityId: detail.activity.id,
    mode: selectedMode,
    inputs: input.inputs,
    state: {},
  });
}

export async function getLaboratorySessionDetail(
  profileId: string,
  sessionId: string,
  repository: LaboratoryRepository,
) {
  return repository.getSessionDetail(profileId, sessionId);
}

async function refreshCompletion(
  profileId: string,
  sessionId: string,
  repository: LaboratoryRepository,
): Promise<LaboratorySessionRecord> {
  const detail = requireDetail(await repository.getSessionDetail(profileId, sessionId), sessionId);
  const completionPercentage = calculateSessionCompletion(
    detail.activity,
    detail.measurements,
    detail.observations,
  );
  return repository.updateSession({
    profileId,
    sessionId,
    status: detail.session.status,
    inputs: detail.session.inputs,
    state: detail.session.state,
    elapsedSeconds: detail.session.elapsedSeconds,
    completionPercentage,
  });
}

export async function updateLaboratorySession(
  profileId: string,
  input: {
    sessionId: string;
    status: LaboratorySessionRecord["status"];
    inputs: LaboratoryConfiguration;
    state: LaboratoryConfiguration;
    elapsedSeconds: number;
    completionPercentage?: number;
  },
  repository: LaboratoryRepository,
) {
  assertConfigurationIsBounded(input.inputs);
  assertConfigurationIsBounded(input.state);
  const current = await repository.getSession(profileId, input.sessionId);
  if (!current) throw new NotFoundError("Laboratory session", input.sessionId);
  if (current.status === "completed" || current.status === "abandoned")
    throw new ValidationError("This laboratory session is no longer editable.");
  return repository.updateSession({ ...input, profileId });
}

export async function saveLaboratoryObservation(
  profileId: string,
  sessionId: string,
  input: {
    stepId: string | null;
    prompt: string;
    notes: string;
    sortOrder: number;
    metadata: LaboratoryConfiguration;
  },
  repository: LaboratoryRepository,
) {
  assertConfigurationIsBounded(input.metadata);
  const observation = await repository.saveObservation({
    id: `laboratory-observation-${sessionId}-${input.stepId ?? input.sortOrder}`,
    profileId,
    sessionId,
    ...input,
  });
  await refreshCompletion(profileId, sessionId, repository);
  return observation;
}

export async function saveLaboratoryMeasurement(
  profileId: string,
  sessionId: string,
  input: {
    variableId: string;
    observationId: string | null;
    rowIndex: number;
    value: unknown;
    unit: string | null;
    uncertainty: number | null;
    significantFigures: number | null;
    source: LaboratoryMeasurementRecord["source"];
    notes: string;
  },
  repository: LaboratoryRepository,
) {
  const detail = requireDetail(await repository.getSessionDetail(profileId, sessionId), sessionId);
  const variable = detail.activity.variables.find((item) => item.id === input.variableId);
  if (!variable) throw new NotFoundError("Laboratory variable", input.variableId);
  const normalized = normalizeMeasurement(
    variable,
    input.value,
    input.unit,
    input.uncertainty,
    input.significantFigures,
  );
  const numericValue = typeof normalized.value === "number" ? normalized.value : null;
  const textValue = typeof normalized.value === "number" ? null : String(normalized.value);
  const measurement = await repository.saveMeasurement({
    id: `laboratory-measurement-${sessionId}-${input.variableId}-${input.rowIndex}`,
    profileId,
    sessionId,
    variableId: input.variableId,
    observationId: input.observationId,
    rowIndex: input.rowIndex,
    numericValue,
    textValue,
    unit: normalized.unit,
    uncertainty: normalized.uncertainty,
    significantFigures: normalized.significantFigures,
    source: input.source,
    notes: input.notes,
  });
  await refreshCompletion(profileId, sessionId, repository);
  return measurement;
}

export async function completeLaboratorySession(
  profileId: string,
  sessionId: string,
  repository: LaboratoryRepository,
) {
  const detail = requireDetail(await repository.getSessionDetail(profileId, sessionId), sessionId);
  if (detail.session.status === "abandoned")
    throw new ValidationError("An abandoned session cannot be completed.");
  const completionPercentage = calculateSessionCompletion(
    detail.activity,
    detail.measurements,
    detail.observations,
  );
  return repository.updateSession({
    profileId,
    sessionId,
    status: "completed",
    inputs: detail.session.inputs,
    state: detail.session.state,
    elapsedSeconds: detail.session.elapsedSeconds,
    completionPercentage,
  });
}

export async function importSimulationLaboratoryData(
  profileId: string,
  sessionId: string,
  repository: LaboratoryRepository,
) {
  const detail = requireDetail(await repository.getSessionDetail(profileId, sessionId), sessionId);
  const simulationId = detail.activity.activity.simulationId;
  if (!simulationId) throw new ValidationError("This activity does not have a linked simulation.");
  const definition = getRegisteredSimulation(simulationId);
  if (!definition) throw new NotFoundError("Registered simulation", simulationId);
  const inputs = { ...defaultInputs(definition), ...detail.session.inputs };
  const definitionErrors = definition.validate(inputs);
  if (definitionErrors.length) throw new ValidationError(definitionErrors.join(" "));
  const numericVariables = detail.activity.variables.filter(
    (variable) => variable.dataType === "number",
  );
  const sampleCount = Math.min(
    50,
    Math.max(2, Number(detail.activity.activity.estimatedDurationMinutes > 0 ? 12 : 2)),
  );
  const timeInput = definition.inputs.find((input) => input.key === "time");
  const duration = timeInput?.max ?? (Number(timeInput?.defaultValue ?? 10) || 10);
  let state = definition.initialState(inputs);
  for (let index = 0; index < sampleCount; index += 1) {
    const frame = definition.frame(state, inputs);
    for (const variable of numericVariables) {
      const simulationKey =
        typeof variable.configuration.simulationKey === "string"
          ? variable.configuration.simulationKey
          : variable.key;
      const raw = simulationKey === "time" ? frame.time : frame.values[simulationKey];
      if (typeof raw !== "number" || !Number.isFinite(raw)) continue;
      await repository.saveMeasurement({
        id: `laboratory-measurement-${sessionId}-${variable.id}-${index}`,
        profileId,
        sessionId,
        variableId: variable.id,
        observationId: null,
        rowIndex: index,
        numericValue: raw,
        textValue: null,
        unit: variable.unit,
        uncertainty: variable.uncertainty,
        significantFigures: variable.significantFigures,
        source: "simulation",
        notes: "Imported from the trusted simulation registry.",
      });
    }
    const delta = duration / Math.max(sampleCount - 1, 1);
    if (index < sampleCount - 1) state = advanceSimulation(definition, state, inputs, delta).state;
  }
  await repository.updateSession({
    profileId,
    sessionId,
    status: detail.session.status,
    inputs,
    state,
    elapsedSeconds: detail.session.elapsedSeconds,
  });
  return requireDetail(await repository.getSessionDetail(profileId, sessionId), sessionId);
}

export async function saveLaboratoryReport(
  profileId: string,
  sessionId: string,
  input: Omit<
    LaboratoryReportRecord,
    "id" | "sessionId" | "profileId" | "createdAt" | "updatedAt" | "submittedAt" | "feedback"
  >,
  repository: LaboratoryRepository,
) {
  requireDetail(await repository.getSessionDetail(profileId, sessionId), sessionId);
  if (input.status === "submitted") assertReportCanSubmit(input);
  const existing = await repository.getReportBySession(profileId, sessionId);
  return repository.saveReport({
    ...input,
    id: existing?.id ?? `laboratory-report-${randomUUID()}`,
    profileId,
    sessionId,
  });
}

export async function addLaboratoryFeedback(
  reportId: string,
  authorProfileId: string,
  input: { body: string; rubric: LaboratoryConfiguration },
  repository: LaboratoryRepository,
) {
  const report = await repository.getReportById(reportId);
  if (!report) throw new NotFoundError("Laboratory report", reportId);
  assertConfigurationIsBounded(input.rubric);
  return repository.addFeedback({
    ...input,
    id: `laboratory-feedback-${randomUUID()}`,
    reportId,
    authorProfileId,
  });
}

export function initialLaboratoryReport(
  detail: LaboratoryDetail,
): Omit<
  LaboratoryReportRecord,
  "id" | "sessionId" | "profileId" | "createdAt" | "updatedAt" | "submittedAt" | "feedback"
> {
  return {
    status: "draft",
    title: `${detail.activity.title} report`,
    abstract: "",
    sections: defaultReportSections(detail),
    tables: [],
    charts:
      detail.variables.filter((variable) => variable.role === "independent").length &&
      detail.variables.filter((variable) => variable.role === "dependent").length
        ? [
            {
              id: "main-chart",
              title: "Measured relationship",
              xVariableId: detail.variables.find((variable) => variable.role === "independent")!.id,
              yVariableId: detail.variables.find((variable) => variable.role === "dependent")!.id,
              showTrendline: true,
            },
          ]
        : [],
    formulas: [],
    images: [],
    conclusion: "",
  };
}

export function assertLaboratoryVariableValue(
  detail: LaboratoryDetail,
  variableId: string,
  value: unknown,
  unit?: string | null,
) {
  const variable = detail.variables.find((item) => item.id === variableId);
  if (!variable) throw new NotFoundError("Laboratory variable", variableId);
  return validateVariableValue(variable, value, unit);
}

export {
  renderLaboratoryReportHtml,
  renderLaboratoryReportPdf,
} from "@/features/laboratory/export";
