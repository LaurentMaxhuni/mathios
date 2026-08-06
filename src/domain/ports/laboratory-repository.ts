import type {
  LaboratoryActivityInput,
  LaboratoryActivityRecord,
  LaboratoryDetail,
  LaboratoryFeedbackRecord,
  LaboratoryMeasurementRecord,
  LaboratoryObservationRecord,
  LaboratoryReportRecord,
  LaboratorySessionDetail,
  LaboratorySessionInput,
  LaboratorySessionRecord,
  LaboratoryActivityStatus,
  LaboratoryConfiguration,
} from "@/domain/laboratory/types";

export interface LaboratoryRepository {
  listActivities(options?: {
    includeDraft?: boolean;
    subjectId?: string;
    mode?: LaboratoryActivityRecord["mode"];
  }): Promise<readonly LaboratoryActivityRecord[]>;
  getActivity(id: string, options?: { includeDraft?: boolean }): Promise<LaboratoryDetail | null>;
  createActivity(
    input: LaboratoryActivityInput & { id: string; createdByProfileId: string },
  ): Promise<LaboratoryDetail>;
  updateActivity(id: string, input: LaboratoryActivityInput): Promise<LaboratoryDetail>;
  setActivityStatus(
    id: string,
    status: LaboratoryActivityStatus,
  ): Promise<LaboratoryActivityRecord>;
  createSession(input: LaboratorySessionInput): Promise<LaboratorySessionRecord>;
  getSession(profileId: string, sessionId: string): Promise<LaboratorySessionRecord | null>;
  getSessionDetail(profileId: string, sessionId: string): Promise<LaboratorySessionDetail | null>;
  listSessions(profileId: string, activityId?: string): Promise<readonly LaboratorySessionRecord[]>;
  updateSession(input: {
    profileId: string;
    sessionId: string;
    status: LaboratorySessionRecord["status"];
    inputs: LaboratoryConfiguration;
    state: LaboratoryConfiguration;
    elapsedSeconds: number;
    completionPercentage?: number;
  }): Promise<LaboratorySessionRecord>;
  saveObservation(input: {
    id: string;
    profileId: string;
    sessionId: string;
    stepId: string | null;
    prompt: string;
    notes: string;
    sortOrder: number;
    metadata: LaboratoryConfiguration;
  }): Promise<LaboratoryObservationRecord>;
  saveMeasurement(input: {
    id: string;
    profileId: string;
    sessionId: string;
    variableId: string;
    observationId: string | null;
    rowIndex: number;
    numericValue: number | null;
    textValue: string | null;
    unit: string | null;
    uncertainty: number | null;
    significantFigures: number | null;
    source: LaboratoryMeasurementRecord["source"];
    notes: string;
  }): Promise<LaboratoryMeasurementRecord>;
  getReport(profileId: string, reportId: string): Promise<LaboratoryReportRecord | null>;
  getReportById(reportId: string): Promise<LaboratoryReportRecord | null>;
  getReportBySession(profileId: string, sessionId: string): Promise<LaboratoryReportRecord | null>;
  saveReport(input: {
    id: string;
    profileId: string;
    sessionId: string;
    status: LaboratoryReportRecord["status"];
    title: string;
    abstract: string;
    sections: LaboratoryReportRecord["sections"];
    tables: LaboratoryReportRecord["tables"];
    charts: LaboratoryReportRecord["charts"];
    formulas: LaboratoryReportRecord["formulas"];
    images: LaboratoryReportRecord["images"];
    conclusion: string;
  }): Promise<LaboratoryReportRecord>;
  addFeedback(input: {
    id: string;
    reportId: string;
    authorProfileId: string;
    body: string;
    rubric: LaboratoryConfiguration;
  }): Promise<LaboratoryFeedbackRecord>;
}
