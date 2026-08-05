export type SimulationSubject = "mathematics" | "physics" | "chemistry" | "biology" | "astronomy";

export type SimulationInputType = "number" | "range" | "toggle" | "select";
export type SimulationOutputType = "value" | "line" | "table" | "text";

export interface SimulationInputDefinition {
  key: string;
  label: string;
  type: SimulationInputType;
  defaultValue: number | boolean | string;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  options?: readonly { value: string; label: string }[];
}

export interface SimulationOutputDefinition {
  key: string;
  label: string;
  type: SimulationOutputType;
  unit?: string;
}

export interface SimulationPresetRecord {
  id: string;
  simulationId: string;
  profileId: string | null;
  name: string;
  values: Record<string, number | boolean | string>;
  isDefault: boolean;
}

export interface GuidedTask {
  id: string;
  title: string;
  instruction: string;
  targetInput?: string;
  targetValue?: number;
  tolerance?: number;
}

export interface SimulationFrame {
  time: number;
  values: Record<string, number | boolean | string>;
  series: Record<string, readonly { x: number; y: number }[]>;
  table: readonly Record<string, number | string>[];
  message?: string;
}

export interface SimulationDefinition {
  id: string;
  slug: string;
  title: string;
  description: string;
  subject: SimulationSubject;
  estimatedDurationMinutes: number;
  inputs: readonly SimulationInputDefinition[];
  outputs: readonly SimulationOutputDefinition[];
  presets: readonly Omit<SimulationPresetRecord, "id" | "simulationId" | "profileId">[];
  guidedTasks: readonly GuidedTask[];
  initialState: (inputs: Record<string, unknown>) => Record<string, number>;
  step: (
    state: Record<string, number>,
    inputs: Record<string, unknown>,
    deltaSeconds: number,
  ) => Record<string, number>;
  frame: (state: Record<string, number>, inputs: Record<string, unknown>) => SimulationFrame;
  validate: (inputs: Record<string, unknown>) => readonly string[];
}

export interface SimulationVersionRecord {
  id: string;
  simulationId: string;
  versionNumber: number;
  status: "draft" | "published" | "archived";
  definition: SimulationDefinition;
  changeSummary: string;
  createdAt: string;
  publishedAt: string | null;
}

export interface SimulationRecord {
  id: string;
  slug: string;
  title: string;
  description: string;
  subjectId: string;
  subjectName: string;
  status: "draft" | "published" | "archived";
  estimatedDurationMinutes: number;
  currentVersionNumber: number;
  publishedVersionId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SimulationDetail {
  simulation: SimulationRecord;
  version: SimulationVersionRecord;
  presets: readonly SimulationPresetRecord[];
  lessonLinks: readonly {
    lessonId: string;
    lessonTitle: string;
    simulationTitle?: string;
    simulationId?: string;
    instructions: string;
    sortOrder: number;
  }[];
}

export type SimulationSessionStatus = "active" | "paused" | "completed" | "abandoned";

export interface SimulationSessionRecord {
  id: string;
  profileId: string;
  simulationId: string;
  simulationVersionId: string;
  status: SimulationSessionStatus;
  inputs: Record<string, unknown>;
  state: Record<string, number>;
  elapsedSeconds: number;
  startedAt: string;
  completedAt: string | null;
  updatedAt: string;
}

export interface SimulationResultRecord {
  id: string;
  sessionId: string;
  profileId: string;
  simulationId: string;
  result: SimulationFrame;
  completionPercentage: number;
  createdAt: string;
}
