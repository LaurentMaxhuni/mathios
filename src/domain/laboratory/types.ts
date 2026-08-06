export type LaboratoryMode = "simulated" | "real-world" | "hybrid";
export type LaboratoryActivityStatus = "draft" | "published" | "archived";
export type LaboratoryStepType =
  "setup" | "procedure" | "observation" | "analysis" | "conclusion" | "extension";
export type LaboratoryVariableRole = "independent" | "dependent" | "controlled" | "measured";
export type LaboratoryDataType = "number" | "text" | "boolean";
export type LaboratorySessionStatus = "active" | "paused" | "completed" | "abandoned";
export type LaboratoryMeasurementSource = "manual" | "simulation" | "calculated";
export type LaboratoryReportStatus = "draft" | "submitted" | "returned" | "graded";

export type LaboratoryScalar = number | string | boolean;
export type LaboratoryConfiguration = Record<string, unknown>;

export interface LaboratoryActivityRecord {
  id: string;
  slug: string;
  title: string;
  description: string;
  subjectId: string;
  subjectName: string;
  mode: LaboratoryMode;
  status: LaboratoryActivityStatus;
  objective: string;
  theory: string;
  materials: readonly string[];
  safetyNotes: readonly string[];
  analysisPrompt: string;
  graphingInstructions: string;
  questions: readonly string[];
  conclusionPrompt: string;
  extensionActivity: string;
  simulationId: string | null;
  estimatedDurationMinutes: number;
  createdByProfileId: string | null;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
}

export interface LaboratoryStepRecord {
  id: string;
  activityId: string;
  type: LaboratoryStepType;
  title: string;
  instructions: string;
  expectedObservation: string;
  sortOrder: number;
  isRequired: boolean;
}

export interface LaboratoryVariableRecord {
  id: string;
  activityId: string;
  key: string;
  label: string;
  symbol: string;
  role: LaboratoryVariableRole;
  dataType: LaboratoryDataType;
  unit: string | null;
  description: string;
  defaultValue: LaboratoryScalar | null;
  minValue: number | null;
  maxValue: number | null;
  uncertainty: number | null;
  significantFigures: number | null;
  theoreticalValue: number | null;
  configuration: LaboratoryConfiguration;
  sortOrder: number;
}

export interface LaboratoryDetail {
  activity: LaboratoryActivityRecord;
  steps: readonly LaboratoryStepRecord[];
  variables: readonly LaboratoryVariableRecord[];
}

export interface LaboratorySessionRecord {
  id: string;
  profileId: string;
  activityId: string;
  status: LaboratorySessionStatus;
  mode: LaboratoryMode;
  simulationSessionId: string | null;
  inputs: LaboratoryConfiguration;
  state: LaboratoryConfiguration;
  elapsedSeconds: number;
  completionPercentage: number;
  startedAt: string;
  completedAt: string | null;
  updatedAt: string;
}

export interface LaboratoryObservationRecord {
  id: string;
  sessionId: string;
  stepId: string | null;
  prompt: string;
  notes: string;
  recordedAt: string;
  sortOrder: number;
  metadata: LaboratoryConfiguration;
}

export interface LaboratoryMeasurementRecord {
  id: string;
  sessionId: string;
  variableId: string;
  observationId: string | null;
  rowIndex: number;
  numericValue: number | null;
  textValue: string | null;
  unit: string | null;
  uncertainty: number | null;
  significantFigures: number | null;
  source: LaboratoryMeasurementSource;
  notes: string;
  recordedAt: string;
}

export interface ReportSection {
  id: string;
  title: string;
  body: string;
  sortOrder: number;
}

export interface ReportTable {
  id: string;
  title: string;
  headers: readonly string[];
  rows: readonly (readonly string[])[];
}

export interface ReportChart {
  id: string;
  title: string;
  xVariableId: string;
  yVariableId: string;
  showTrendline: boolean;
}

export interface ReportImage {
  id: string;
  src: string;
  alt: string;
  caption: string;
}

export interface LaboratoryFeedbackRecord {
  id: string;
  reportId: string;
  authorProfileId: string;
  authorName: string;
  body: string;
  rubric: LaboratoryConfiguration;
  createdAt: string;
  updatedAt: string;
}

export interface LaboratoryReportRecord {
  id: string;
  sessionId: string;
  profileId: string;
  status: LaboratoryReportStatus;
  title: string;
  abstract: string;
  sections: readonly ReportSection[];
  tables: readonly ReportTable[];
  charts: readonly ReportChart[];
  formulas: readonly string[];
  images: readonly ReportImage[];
  conclusion: string;
  submittedAt: string | null;
  createdAt: string;
  updatedAt: string;
  feedback: readonly LaboratoryFeedbackRecord[];
}

export interface LaboratorySessionDetail {
  session: LaboratorySessionRecord;
  activity: LaboratoryDetail;
  observations: readonly LaboratoryObservationRecord[];
  measurements: readonly LaboratoryMeasurementRecord[];
  report: LaboratoryReportRecord | null;
  analysis: LaboratoryAnalysis;
}

export interface LaboratoryGraphPoint {
  rowIndex: number;
  x: number;
  y: number;
  xUncertainty: number | null;
  yUncertainty: number | null;
}

export interface LaboratoryRegression {
  count: number;
  slope: number;
  intercept: number;
  rSquared: number;
  standardError: number | null;
}

export interface LaboratoryTheoryComparison {
  variableId: string;
  measuredValue: number;
  theoreticalValue: number;
  difference: number;
  percentError: number | null;
  withinUncertainty: boolean | null;
}

export interface LaboratoryAnalysis {
  graph: {
    xVariableId: string | null;
    yVariableId: string | null;
    points: readonly LaboratoryGraphPoint[];
    regression: LaboratoryRegression | null;
  };
  theoryComparisons: readonly LaboratoryTheoryComparison[];
  measurementCount: number;
}

export interface LaboratoryActivityInput {
  id?: string;
  slug: string;
  title: string;
  description: string;
  subjectId: string;
  mode: LaboratoryMode;
  status: LaboratoryActivityStatus;
  objective: string;
  theory: string;
  materials: readonly string[];
  safetyNotes: readonly string[];
  analysisPrompt: string;
  graphingInstructions: string;
  questions: readonly string[];
  conclusionPrompt: string;
  extensionActivity: string;
  simulationId: string | null;
  estimatedDurationMinutes: number;
  steps: readonly Omit<LaboratoryStepRecord, "activityId">[];
  variables: readonly Omit<LaboratoryVariableRecord, "activityId">[];
}

export interface LaboratorySessionInput {
  id: string;
  profileId: string;
  activityId: string;
  mode: LaboratoryMode;
  simulationSessionId?: string | null;
  inputs?: LaboratoryConfiguration;
  state?: LaboratoryConfiguration;
}
