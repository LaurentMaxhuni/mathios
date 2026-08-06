export const STUDY_GOAL_TYPES = [
  "grade-completion",
  "subject-completion",
  "course-completion",
  "roadmap-completion",
  "exam-preparation",
  "concept-mastery",
  "weekly-study-time",
] as const;
export type StudyGoalType = (typeof STUDY_GOAL_TYPES)[number];

export const STUDY_ITEM_TYPES = [
  "lesson",
  "exercise",
  "review",
  "simulation",
  "laboratory",
  "assessment",
  "catch-up",
] as const;
export type StudyItemType = (typeof STUDY_ITEM_TYPES)[number];

export const STUDY_PLAN_STATUSES = ["draft", "active", "completed", "paused", "archived"] as const;
export type StudyPlanStatus = (typeof STUDY_PLAN_STATUSES)[number];

export const STUDY_SESSION_STATUSES = [
  "scheduled",
  "in-progress",
  "completed",
  "skipped",
  "missed",
  "cancelled",
] as const;
export type StudySessionStatus = (typeof STUDY_SESSION_STATUSES)[number];

export const STUDY_GOAL_STATUSES = ["active", "paused", "completed", "archived"] as const;
export type StudyGoalStatus = (typeof STUDY_GOAL_STATUSES)[number];

export const STUDY_EXCEPTION_KINDS = ["unavailable", "blocked", "extra-availability"] as const;
export type StudyExceptionKind = (typeof STUDY_EXCEPTION_KINDS)[number];

export const STUDY_COMPLETION_EVENT_TYPES = [
  "completed",
  "skipped",
  "missed",
  "rescheduled",
] as const;
export type StudyCompletionEventType = (typeof STUDY_COMPLETION_EVENT_TYPES)[number];

export type StudyDifficulty = "gentle" | "balanced" | "challenging";
export type Weekday = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export interface StudyGoalRecord {
  id: string;
  profileId: string;
  title: string;
  description: string;
  goalType: StudyGoalType;
  targetId: string | null;
  targetTitle: string;
  startDate: string;
  targetDate: string;
  weeklyStudyMinutes: number;
  availableDays: readonly Weekday[];
  sessionDurationMinutes: number;
  prioritySubjectIds: readonly string[];
  restDays: readonly Weekday[];
  difficultyPreference: StudyDifficulty;
  reviewFrequencyDays: number;
  status: StudyGoalStatus;
  createdAt: string;
  updatedAt: string;
}

export interface StudyPlanRecord {
  id: string;
  profileId: string;
  goalId: string;
  sourceType: "goal" | "roadmap";
  sourceId: string | null;
  status: StudyPlanStatus;
  generatedAt: string;
  targetDate: string;
  weeklyStudyMinutes: number;
  totalMinutes: number;
  scheduledMinutes: number;
  unallocatedMinutes: number;
  capacityMinutes: number;
  realism: "realistic" | "tight" | "infeasible";
  warnings: readonly string[];
  createdAt: string;
  updatedAt: string;
}

export interface StudyPlanItemRecord {
  id: string;
  planId: string;
  itemType: StudyItemType;
  sourceId: string | null;
  title: string;
  description: string;
  subjectId: string | null;
  estimatedMinutes: number;
  priority: number;
  sortOrder: number;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface StudySessionRecord {
  id: string;
  profileId: string;
  planId: string;
  planItemId: string;
  itemType: StudyItemType;
  sourceId: string | null;
  title: string;
  subjectId: string | null;
  scheduledDate: string;
  startMinute: number;
  durationMinutes: number;
  status: StudySessionStatus;
  rescheduledFromDate: string | null;
  skipReason: string | null;
  completedAt: string | null;
  updatedAt: string;
}

export interface StudyAvailabilityRecord {
  id: string;
  profileId: string;
  weekday: Weekday;
  startMinute: number;
  endMinute: number;
  maxMinutes: number | null;
  label: string;
  createdAt: string;
  updatedAt: string;
}

export interface StudyExceptionRecord {
  id: string;
  profileId: string;
  exceptionDate: string;
  kind: StudyExceptionKind;
  startMinute: number | null;
  endMinute: number | null;
  reason: string;
  createdAt: string;
}

export interface StudyCompletionEventRecord {
  id: string;
  profileId: string;
  sessionId: string;
  planItemId: string;
  eventType: StudyCompletionEventType;
  minutes: number;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface PlannerWorkItem {
  sourceId: string | null;
  itemType: StudyItemType;
  title: string;
  description: string;
  subjectId: string | null;
  estimatedMinutes: number;
  priority: number;
  sortOrder: number;
  metadata: Record<string, unknown>;
}

export interface StudyPlanningInput {
  startDate: string;
  targetDate: string;
  weeklyStudyMinutes: number;
  availableDays: readonly Weekday[];
  sessionDurationMinutes: number;
  prioritySubjectIds: readonly string[];
  restDays: readonly Weekday[];
  difficultyPreference: StudyDifficulty;
  reviewFrequencyDays: number;
}

export interface StudyScheduleSessionDraft {
  id: string;
  planId: string;
  planItemId: string;
  scheduledDate: string;
  startMinute: number;
  durationMinutes: number;
  status: StudySessionStatus;
  rescheduledFromDate: string | null;
  skipReason: string | null;
  completedAt: string | null;
}

export interface StudyScheduleResult {
  items: readonly StudyPlanItemRecord[];
  sessions: readonly StudyScheduleSessionDraft[];
  totalMinutes: number;
  scheduledMinutes: number;
  unallocatedMinutes: number;
  capacityMinutes: number;
  realism: "realistic" | "tight" | "infeasible";
  warnings: readonly string[];
}

export interface StudyPlanDetail {
  plan: StudyPlanRecord;
  goal: StudyGoalRecord;
  items: readonly StudyPlanItemRecord[];
  sessions: readonly StudySessionRecord[];
  conflicts: readonly StudySessionConflict[];
}

export interface StudySessionConflict {
  sessionId: string;
  conflictingSessionId: string;
  date: string;
  message: string;
}

export interface PlannerDashboard {
  goals: readonly StudyGoalRecord[];
  activePlan: StudyPlanDetail | null;
  sessions: readonly StudySessionRecord[];
  availability: readonly StudyAvailabilityRecord[];
  exceptions: readonly StudyExceptionRecord[];
  today: string;
}

export interface PlannerOptions {
  roadmaps: readonly { id: string; title: string; estimatedMinutes: number }[];
  courses: readonly { id: string; title: string; subjectId: string; estimatedMinutes: number }[];
  grades: readonly { id: string; title: string }[];
  subjects: readonly { id: string; title: string }[];
  assessments: readonly { id: string; title: string; subjectId: string | null }[];
  concepts: readonly { id: string; title: string; subjectId: string }[];
}
