import type {
  SimulationDetail,
  SimulationPresetRecord,
  SimulationRecord,
  SimulationResultRecord,
  SimulationSessionRecord,
} from "@/domain/simulation/types";

export interface SimulationRepository {
  listSimulations(options?: {
    includeDraft?: boolean;
    subjectId?: string;
  }): Promise<readonly SimulationRecord[]>;
  getSimulation(
    id: string,
    options?: { includeDraft?: boolean; profileId?: string | null },
  ): Promise<SimulationDetail | null>;
  listLessonSimulations(
    lessonId: string,
  ): Promise<ReadonlyArray<SimulationDetail["lessonLinks"][number]>>;
  createSession(input: {
    id: string;
    profileId: string;
    simulationId: string;
    versionId: string;
    inputs: Record<string, unknown>;
    state: Record<string, number>;
  }): Promise<SimulationSessionRecord>;
  getSession(profileId: string, sessionId: string): Promise<SimulationSessionRecord | null>;
  updateSession(input: {
    profileId: string;
    sessionId: string;
    status: SimulationSessionRecord["status"];
    inputs: Record<string, unknown>;
    state: Record<string, number>;
    elapsedSeconds: number;
  }): Promise<SimulationSessionRecord>;
  saveResult(input: {
    id: string;
    session: SimulationSessionRecord;
    result: SimulationResultRecord["result"];
    completionPercentage: number;
  }): Promise<SimulationResultRecord>;
  savePreset(input: {
    id: string;
    simulationId: string;
    profileId: string;
    name: string;
    values: Record<string, unknown>;
  }): Promise<SimulationPresetRecord>;
}
