import { randomUUID } from "node:crypto";
import { NotFoundError } from "@/domain/errors/application-error";
import {
  advanceSimulation,
  assertValidSimulationInputs,
  completionForTasks,
  defaultInputs,
} from "@/domain/simulation/rules";
import { getRegisteredSimulation } from "@/domain/simulation/registry";
import type { SimulationRepository } from "@/domain/ports/simulation-repository";
import type { SimulationSessionRecord } from "@/domain/simulation/types";
import type { AuthenticatedPrincipal, AuthSession } from "@/infrastructure/auth/auth-provider";
import { requireSession } from "@/features/auth/authorization";

function requireDefinition(id: string) {
  const definition = getRegisteredSimulation(id);
  if (!definition) throw new NotFoundError("Simulation", id);
  return definition;
}

export function requireSimulationLearner(session: AuthSession | null): AuthenticatedPrincipal {
  return requireSession(session);
}

export function canAuthorSimulations(
  principal: AuthenticatedPrincipal | null | undefined,
): boolean {
  return Boolean(principal?.permissions.includes("edit_content"));
}

export async function listSimulations(
  repository: SimulationRepository,
  options?: { includeDraft?: boolean; subjectId?: string },
) {
  return repository.listSimulations(options);
}

export async function getSimulation(
  id: string,
  repository: SimulationRepository,
  options?: { includeDraft?: boolean; profileId?: string | null },
) {
  return repository.getSimulation(id, options);
}

export async function startSimulation(
  profileId: string,
  simulationId: string,
  repository: SimulationRepository,
  presetValues?: Record<string, unknown>,
) {
  const definition = requireDefinition(simulationId);
  const detail = await repository.getSimulation(simulationId, { profileId });
  if (!detail) throw new NotFoundError("Simulation", simulationId);
  const inputs = { ...defaultInputs(definition), ...(presetValues ?? {}) };
  assertValidSimulationInputs(definition, inputs);
  return repository.createSession({
    id: `simulation-session-${randomUUID()}`,
    profileId,
    simulationId: detail.simulation.id,
    versionId: detail.version.id,
    inputs,
    state: definition.initialState(inputs),
  });
}

export async function updateSimulationSession(
  profileId: string,
  input: {
    sessionId: string;
    status: SimulationSessionRecord["status"];
    inputs: Record<string, unknown>;
    state: Record<string, number>;
    elapsedSeconds: number;
  },
  repository: SimulationRepository,
) {
  const session = await repository.getSession(profileId, input.sessionId);
  if (!session) throw new NotFoundError("Simulation session", input.sessionId);
  const definition = requireDefinition(session.simulationId);
  assertValidSimulationInputs(definition, input.inputs);
  return repository.updateSession({ ...input, profileId });
}

export async function completeSimulation(
  profileId: string,
  input: {
    sessionId: string;
    inputs: Record<string, unknown>;
    state: Record<string, number>;
    elapsedSeconds: number;
  },
  repository: SimulationRepository,
) {
  const session = await repository.getSession(profileId, input.sessionId);
  if (!session) throw new NotFoundError("Simulation session", input.sessionId);
  const definition = requireDefinition(session.simulationId);
  assertValidSimulationInputs(definition, input.inputs);
  const advanced = advanceSimulation(definition, input.state, input.inputs, 0);
  const completedSession = await repository.updateSession({
    ...input,
    profileId,
    status: "completed",
  });
  return repository.saveResult({
    id: `simulation-result-${randomUUID()}`,
    session: completedSession,
    result: advanced.frame,
    completionPercentage: completionForTasks(definition, input.inputs),
  });
}

export async function saveSimulationPreset(
  profileId: string,
  input: { simulationId: string; name: string; values: Record<string, unknown> },
  repository: SimulationRepository,
) {
  const definition = requireDefinition(input.simulationId);
  assertValidSimulationInputs(definition, input.values);
  return repository.savePreset({ ...input, profileId, id: `simulation-preset-${randomUUID()}` });
}

export function tickSimulation(
  simulationId: string,
  state: Record<string, number>,
  inputs: Record<string, unknown>,
  deltaSeconds: number,
) {
  const definition = requireDefinition(simulationId);
  return advanceSimulation(definition, state, inputs, deltaSeconds);
}
