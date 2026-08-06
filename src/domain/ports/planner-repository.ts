import type {
  PlannerOptions,
  PlannerWorkItem,
  StudyAvailabilityRecord,
  StudyCompletionEventRecord,
  StudyExceptionRecord,
  StudyGoalRecord,
  StudyPlanDetail,
  StudyPlanRecord,
  StudySessionRecord,
  StudySessionStatus,
} from "@/domain/planner/types";

export interface StudyPlannerRepository {
  listGoals(profileId: string): Promise<readonly StudyGoalRecord[]>;
  getGoal(profileId: string, goalId: string): Promise<StudyGoalRecord | null>;
  createGoal(input: Omit<StudyGoalRecord, "createdAt" | "updatedAt">): Promise<StudyGoalRecord>;
  updateGoal(
    profileId: string,
    goalId: string,
    input: Omit<StudyGoalRecord, "id" | "profileId" | "createdAt" | "updatedAt">,
  ): Promise<StudyGoalRecord>;
  setGoalStatus(
    profileId: string,
    goalId: string,
    status: StudyGoalRecord["status"],
  ): Promise<StudyGoalRecord>;

  listAvailability(profileId: string): Promise<readonly StudyAvailabilityRecord[]>;
  replaceAvailability(
    profileId: string,
    input: readonly Omit<StudyAvailabilityRecord, "id" | "profileId" | "createdAt" | "updatedAt">[],
  ): Promise<readonly StudyAvailabilityRecord[]>;
  listExceptions(
    profileId: string,
    options?: { from?: string; to?: string },
  ): Promise<readonly StudyExceptionRecord[]>;
  createException(input: Omit<StudyExceptionRecord, "createdAt">): Promise<StudyExceptionRecord>;
  deleteException(profileId: string, exceptionId: string): Promise<void>;

  listPlanningItems(profileId: string, goal: StudyGoalRecord): Promise<readonly PlannerWorkItem[]>;
  listPlannerOptions(): Promise<PlannerOptions>;
  createPlan(input: {
    plan: Omit<StudyPlanRecord, "createdAt" | "updatedAt">;
    items: readonly Omit<StudyPlanDetail["items"][number], "createdAt">[];
    sessions: readonly Omit<
      StudySessionRecord,
      "profileId" | "itemType" | "sourceId" | "title" | "subjectId" | "updatedAt"
    >[];
  }): Promise<StudyPlanDetail>;
  getPlan(profileId: string, planId: string): Promise<StudyPlanDetail | null>;
  getActivePlan(profileId: string, goalId?: string): Promise<StudyPlanDetail | null>;
  setPlanStatus(
    profileId: string,
    planId: string,
    status: StudyPlanRecord["status"],
  ): Promise<StudyPlanRecord>;
  listSessions(
    profileId: string,
    options?: { from?: string; to?: string },
  ): Promise<readonly StudySessionRecord[]>;
  getSession(profileId: string, sessionId: string): Promise<StudySessionRecord | null>;
  updateSession(input: {
    profileId: string;
    sessionId: string;
    scheduledDate: string;
    startMinute: number;
    status?: StudySessionStatus;
    rescheduledFromDate?: string | null;
    skipReason?: string | null;
    completedAt?: string | null;
  }): Promise<StudySessionRecord>;
  saveCompletionEvent(
    input: Omit<StudyCompletionEventRecord, "createdAt">,
  ): Promise<StudyCompletionEventRecord>;
  listCompletionEvents(
    profileId: string,
    sessionId: string,
  ): Promise<readonly StudyCompletionEventRecord[]>;
}
