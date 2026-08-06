import { randomUUID } from "node:crypto";
import { NotFoundError, ValidationError } from "@/domain/errors/application-error";
import {
  addDateOnly,
  assertDateOnly,
  assertSessionCanMove,
  buildCatchUpItems,
  compareDateOnly,
  generateStudySchedule,
} from "@/domain/planner/rules";
import type { StudyPlannerRepository } from "@/domain/ports/planner-repository";
import type { CourseRepository } from "@/domain/ports/course-repository";
import type { RoadmapRepository } from "@/domain/ports/roadmap-repository";
import type {
  PlannerDashboard,
  PlannerOptions,
  StudyGoalRecord,
  StudyPlanDetail,
  StudyPlanRecord,
  StudyPlanningInput,
  StudySessionRecord,
  StudySessionStatus,
} from "@/domain/planner/types";
import { getCourseRepository } from "@/infrastructure/database/repositories/course-repository";
import { getRoadmapRepository } from "@/infrastructure/database/repositories/roadmap-repository";

export interface PlannerCompletionDependencies {
  courseRepository?: CourseRepository;
  roadmapRepository?: RoadmapRepository;
}

function requireGoal(goal: StudyGoalRecord | null, goalId: string): StudyGoalRecord {
  if (!goal) throw new NotFoundError("Study goal", goalId);
  return goal;
}

function requirePlan(plan: StudyPlanDetail | null, planId: string): StudyPlanDetail {
  if (!plan) throw new NotFoundError("Study plan", planId);
  return plan;
}

function requireSession(session: StudySessionRecord | null, sessionId: string): StudySessionRecord {
  if (!session) throw new NotFoundError("Study session", sessionId);
  return session;
}

function planningInput(goal: StudyGoalRecord, startDate = goal.startDate): StudyPlanningInput {
  return {
    startDate,
    targetDate: goal.targetDate,
    weeklyStudyMinutes: goal.weeklyStudyMinutes,
    availableDays: goal.availableDays,
    sessionDurationMinutes: goal.sessionDurationMinutes,
    prioritySubjectIds: goal.prioritySubjectIds,
    restDays: goal.restDays,
    difficultyPreference: goal.difficultyPreference,
    reviewFrequencyDays: goal.reviewFrequencyDays,
  };
}

export function defaultPlannerToday(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function createStudyGoal(
  profileId: string,
  input: Omit<StudyGoalRecord, "id" | "profileId" | "createdAt" | "updatedAt">,
  repository: StudyPlannerRepository,
): Promise<StudyGoalRecord> {
  assertDateOnly(input.startDate, "startDate");
  assertDateOnly(input.targetDate, "targetDate");
  if (compareDateOnly(input.targetDate, input.startDate) < 0) {
    throw new ValidationError("The target date must be on or after the start date.");
  }
  if (input.restDays.some((day) => !input.availableDays.includes(day))) {
    throw new ValidationError("Rest days must be selected from available study days.");
  }
  return repository.createGoal({ ...input, id: `study-goal-${randomUUID()}`, profileId });
}

export async function updateStudyGoal(
  profileId: string,
  goalId: string,
  input: Omit<StudyGoalRecord, "id" | "profileId" | "createdAt" | "updatedAt">,
  repository: StudyPlannerRepository,
): Promise<StudyGoalRecord> {
  requireGoal(await repository.getGoal(profileId, goalId), goalId);
  return repository.updateGoal(profileId, goalId, input);
}

export async function generateStudyPlan(
  profileId: string,
  goalId: string,
  repository: StudyPlannerRepository,
): Promise<StudyPlanDetail> {
  const goal = requireGoal(await repository.getGoal(profileId, goalId), goalId);
  if (goal.status === "archived")
    throw new ValidationError("Archived goals cannot generate a plan.");
  const [workItems, availability, exceptions] = await Promise.all([
    repository.listPlanningItems(profileId, goal),
    repository.listAvailability(profileId),
    repository.listExceptions(profileId, { from: goal.startDate, to: goal.targetDate }),
  ]);
  const planId = `study-plan-${randomUUID()}`;
  const schedule = generateStudySchedule(
    planId,
    workItems,
    planningInput(goal),
    availability,
    exceptions,
  );
  const plan: Omit<StudyPlanRecord, "createdAt" | "updatedAt"> = {
    id: planId,
    profileId,
    goalId,
    sourceType: goal.goalType === "roadmap-completion" ? "roadmap" : "goal",
    sourceId: goal.targetId,
    status: "active",
    generatedAt: new Date().toISOString(),
    targetDate: goal.targetDate,
    weeklyStudyMinutes: goal.weeklyStudyMinutes,
    totalMinutes: schedule.totalMinutes,
    scheduledMinutes: schedule.scheduledMinutes,
    unallocatedMinutes: schedule.unallocatedMinutes,
    capacityMinutes: schedule.capacityMinutes,
    realism: schedule.realism,
    warnings: schedule.warnings,
  };
  return repository.createPlan({ plan, items: schedule.items, sessions: schedule.sessions });
}

export async function createGoalAndGeneratePlan(
  profileId: string,
  input: Omit<StudyGoalRecord, "id" | "profileId" | "createdAt" | "updatedAt">,
  repository: StudyPlannerRepository,
): Promise<{ goal: StudyGoalRecord; plan: StudyPlanDetail }> {
  const goal = await createStudyGoal(profileId, input, repository);
  return { goal, plan: await generateStudyPlan(profileId, goal.id, repository) };
}

async function markOverdueSessions(
  profileId: string,
  today: string,
  repository: StudyPlannerRepository,
): Promise<void> {
  const sessions = await repository.listSessions(profileId);
  for (const session of sessions) {
    if (
      compareDateOnly(session.scheduledDate, today) < 0 &&
      (session.status === "scheduled" || session.status === "in-progress")
    ) {
      await repository.updateSession({
        profileId,
        sessionId: session.id,
        scheduledDate: session.scheduledDate,
        startMinute: session.startMinute,
        status: "missed",
      });
      await repository.saveCompletionEvent({
        id: `study-event-${randomUUID()}`,
        profileId,
        sessionId: session.id,
        planItemId: session.planItemId,
        eventType: "missed",
        minutes: session.durationMinutes,
        metadata: { detectedOn: today },
      });
    }
  }
}

export async function getPlannerDashboard(
  profileId: string,
  repository: StudyPlannerRepository,
  range: { from?: string; to?: string } = {},
): Promise<PlannerDashboard> {
  const today = defaultPlannerToday();
  await markOverdueSessions(profileId, today, repository);
  const [goals, activePlan, sessions, availability, exceptions] = await Promise.all([
    repository.listGoals(profileId),
    repository.getActivePlan(profileId),
    repository.listSessions(profileId, range),
    repository.listAvailability(profileId),
    repository.listExceptions(profileId, range),
  ]);
  return { goals, activePlan, sessions, availability, exceptions, today };
}

export async function getPlannerOptions(
  repository: StudyPlannerRepository,
): Promise<PlannerOptions> {
  return repository.listPlannerOptions();
}

export async function rescheduleStudySession(
  profileId: string,
  sessionId: string,
  target: { scheduledDate: string; startMinute: number },
  repository: StudyPlannerRepository,
): Promise<StudySessionRecord> {
  const session = requireSession(await repository.getSession(profileId, sessionId), sessionId);
  if (
    session.status === "completed" ||
    session.status === "skipped" ||
    session.status === "cancelled"
  ) {
    throw new ValidationError("Completed, skipped, or cancelled sessions cannot be moved.");
  }
  const existing = await repository.listSessions(profileId);
  assertSessionCanMove(session, target.scheduledDate, target.startMinute, existing);
  const updated = await repository.updateSession({
    profileId,
    sessionId,
    scheduledDate: target.scheduledDate,
    startMinute: target.startMinute,
    status: session.status === "missed" ? "scheduled" : session.status,
    rescheduledFromDate: session.scheduledDate,
  });
  await repository.saveCompletionEvent({
    id: `study-event-${randomUUID()}`,
    profileId,
    sessionId,
    planItemId: session.planItemId,
    eventType: "rescheduled",
    minutes: session.durationMinutes,
    metadata: { fromDate: session.scheduledDate, toDate: target.scheduledDate },
  });
  return updated;
}

export async function updateStudySessionStatus(
  profileId: string,
  sessionId: string,
  status: StudySessionStatus,
  reason: string,
  repository: StudyPlannerRepository,
  dependencies: PlannerCompletionDependencies = {},
): Promise<StudySessionRecord> {
  const session = requireSession(await repository.getSession(profileId, sessionId), sessionId);
  if (session.status === "completed" && status !== "completed") {
    throw new ValidationError("Completed study sessions cannot be reopened from the calendar.");
  }
  const completedAt =
    status === "completed"
      ? (session.completedAt ?? new Date().toISOString())
      : session.completedAt;
  const updated = await repository.updateSession({
    profileId,
    sessionId,
    scheduledDate: session.scheduledDate,
    startMinute: session.startMinute,
    status,
    skipReason: status === "skipped" ? reason || "Skipped by learner." : null,
    completedAt,
  });
  if (status === "completed" || status === "skipped" || status === "missed") {
    await repository.saveCompletionEvent({
      id: `study-event-${randomUUID()}`,
      profileId,
      sessionId,
      planItemId: session.planItemId,
      eventType: status === "completed" ? "completed" : status,
      minutes: session.durationMinutes,
      metadata: reason ? { reason } : {},
    });
  }
  if (status === "completed")
    await propagateCompletion(profileId, updated, repository, dependencies);
  if (status === "completed" || status === "skipped") {
    const plan = await repository.getPlan(profileId, session.planId);
    if (plan) await completeGoalIfFinished(profileId, plan.goal.id, repository);
  }
  return updated;
}

async function propagateCompletion(
  profileId: string,
  session: StudySessionRecord,
  repository: StudyPlannerRepository,
  dependencies: PlannerCompletionDependencies,
): Promise<void> {
  const plan = await repository.getPlan(profileId, session.planId);
  if (!plan) return;
  const item = plan.items.find((candidate) => candidate.id === session.planItemId);
  if (!item) return;
  if (item.itemType === "lesson" && item.sourceId) {
    const courseRepository = dependencies.courseRepository ?? getCourseRepository();
    await courseRepository.saveLessonProgress({
      profileId,
      lessonId: item.sourceId,
      timeSpentSeconds: session.durationMinutes * 60,
      lastViewedBlockId: null,
      completionPercentage: 100,
      completed: true,
    });
  }
  const roadmapId = typeof item.metadata.roadmapId === "string" ? item.metadata.roadmapId : null;
  const roadmapNodeId =
    typeof item.metadata.roadmapNodeId === "string" ? item.metadata.roadmapNodeId : null;
  if (roadmapId && roadmapNodeId) {
    const roadmapRepository = dependencies.roadmapRepository ?? getRoadmapRepository();
    const enrollment = await roadmapRepository.getUserRoadmap(profileId, roadmapId);
    if (enrollment) {
      await roadmapRepository.saveProgress({
        userRoadmapId: enrollment.enrollment.id,
        profileId,
        roadmapNodeId,
        status: "completed",
        completionPercentage: 100,
      });
    }
  }
}

export async function rescheduleMissedSessions(
  profileId: string,
  planId: string,
  asOfDate: string,
  repository: StudyPlannerRepository,
): Promise<{ plan: StudyPlanDetail; moved: number; warnings: readonly string[] }> {
  assertDateOnly(asOfDate, "asOfDate");
  const plan = requirePlan(await repository.getPlan(profileId, planId), planId);
  const missed = plan.sessions.filter((session) => session.status === "missed");
  if (!missed.length)
    return { plan, moved: 0, warnings: ["There are no missed sessions to move."] };
  const [availability, exceptions] = await Promise.all([
    repository.listAvailability(profileId),
    repository.listExceptions(profileId, { from: asOfDate, to: plan.goal.targetDate }),
  ]);
  const startDate =
    compareDateOnly(asOfDate, plan.goal.startDate) > 0 ? asOfDate : plan.goal.startDate;
  const schedule = generateStudySchedule(
    `${plan.plan.id}-catch-up`,
    buildCatchUpItems(missed, plan.items),
    planningInput(plan.goal, startDate),
    availability,
    exceptions,
    plan.sessions.filter((session) => session.status !== "missed"),
  );
  const moved = Math.min(missed.length, schedule.sessions.length);
  for (let index = 0; index < moved; index += 1) {
    const original = missed[index];
    const replacement = schedule.sessions[index];
    await repository.updateSession({
      profileId,
      sessionId: original.id,
      scheduledDate: replacement.scheduledDate,
      startMinute: replacement.startMinute,
      status: "scheduled",
      rescheduledFromDate: original.scheduledDate,
      skipReason: null,
    });
    await repository.saveCompletionEvent({
      id: `study-event-${randomUUID()}`,
      profileId,
      sessionId: original.id,
      planItemId: original.planItemId,
      eventType: "rescheduled",
      minutes: original.durationMinutes,
      metadata: {
        fromDate: original.scheduledDate,
        toDate: replacement.scheduledDate,
        catchUp: true,
      },
    });
  }
  const refreshed = requirePlan(await repository.getPlan(profileId, planId), planId);
  return { plan: refreshed, moved, warnings: schedule.warnings };
}

export async function getPlanForProfile(
  profileId: string,
  planId: string,
  repository: StudyPlannerRepository,
): Promise<StudyPlanDetail> {
  return requirePlan(await repository.getPlan(profileId, planId), planId);
}

export async function completeGoalIfFinished(
  profileId: string,
  goalId: string,
  repository: StudyPlannerRepository,
): Promise<void> {
  const plan = await repository.getActivePlan(profileId, goalId);
  if (!plan || !plan.sessions.length) return;
  if (
    plan.sessions.every((session) => session.status === "completed" || session.status === "skipped")
  ) {
    await repository.setGoalStatus(profileId, goalId, "completed");
  }
}

export function plannerSessionProgress(plan: StudyPlanDetail): {
  completed: number;
  total: number;
  percentage: number;
} {
  const total = plan.sessions.length;
  const completed = plan.sessions.filter((session) => session.status === "completed").length;
  return { completed, total, percentage: total ? Math.round((completed / total) * 100) : 0 };
}

export function plannerWindowAround(today: string): { from: string; to: string } {
  return { from: today, to: addDateOnly(today, 35) };
}
