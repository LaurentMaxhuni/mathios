import { randomUUID } from "node:crypto";
import type { ActivityEventRecord, AnalyticsDateRange } from "@/domain/analytics/types";
import type { TodayActivity, TodayActivityKind, TodayDashboardData } from "@/domain/today/types";
import type { IdentityRepository } from "@/domain/ports/identity-repository";
import type { AnalyticsRepository } from "@/domain/ports/analytics-repository";
import type { CourseRepository } from "@/domain/ports/course-repository";
import type { ExerciseRepository } from "@/domain/ports/exercise-repository";
import type { UserSettingsRecord } from "@/domain/identity/types";
import { defaultSettings } from "@/features/settings/service";
import { getIdentityRepository } from "@/infrastructure/database/repositories/identity-repository";
import { getAnalyticsRepository } from "@/infrastructure/database/repositories/analytics-repository";
import { getCourseRepository } from "@/infrastructure/database/repositories/course-repository";
import { getExerciseRepository } from "@/infrastructure/database/repositories/exercise-repository";

export interface TodayDependencies {
  identityRepository: IdentityRepository;
  analyticsRepository: AnalyticsRepository;
  courseRepository: CourseRepository;
  exerciseRepository: ExerciseRepository;
}

function defaultDependencies(): TodayDependencies {
  return {
    identityRepository: getIdentityRepository(),
    analyticsRepository: getAnalyticsRepository(),
    courseRepository: getCourseRepository(),
    exerciseRepository: getExerciseRepository(),
  };
}

function dateKey(value: string | Date): string {
  return new Date(value).toISOString().slice(0, 10);
}

function rangeFor(now: Date): AnalyticsDateRange {
  const from = new Date(now);
  from.setUTCDate(from.getUTCDate() - 30);
  return { from: dateKey(from), to: dateKey(now) };
}

function subjectMatches(
  value: string,
  subject: { id: string; slug: string; name: string },
): boolean {
  const normalized = value.trim().toLowerCase();
  return [subject.id, subject.slug, subject.name].some(
    (candidate) => candidate.toLowerCase() === normalized,
  );
}

export function selectActiveSubject<T extends { id: string; slug: string; name: string }>(
  subjects: readonly T[],
  preferredSubjects: readonly string[],
): T | null {
  for (const preferred of preferredSubjects) {
    const match = subjects.find((subject) => subjectMatches(preferred, subject));
    if (match) return match;
  }
  return subjects[0] ?? null;
}

function eventPoints(event: ActivityEventRecord): number {
  const points = event.metadata.points;
  if (typeof points === "number" && Number.isFinite(points)) return Math.max(0, points);
  if (event.eventType === "lesson-completion") return 20;
  if (event.eventType === "question-attempt" && event.isCorrect) return 5;
  if (event.eventType === "study-session-completion") return 10;
  return 0;
}

export function calculateLearningPoints(events: readonly ActivityEventRecord[]): number {
  const counted = new Set<string>();
  return events.reduce((total, event) => {
    const key = `${event.eventType}:${event.dedupeKey ?? event.id}`;
    if (counted.has(key)) return total;
    counted.add(key);
    return total + eventPoints(event);
  }, 0);
}

export function calculateStudyStreak(events: readonly ActivityEventRecord[], now: Date): number {
  const activeDays = new Set(events.map((event) => dateKey(event.occurredAt)));
  let streak = 0;
  const cursor = new Date(now);
  while (activeDays.has(dateKey(cursor))) {
    streak += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  if (streak > 0) return streak;
  cursor.setTime(now.getTime());
  cursor.setUTCDate(cursor.getUTCDate() - 1);
  while (activeDays.has(dateKey(cursor))) {
    streak += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return streak;
}

function isComplete(progress: { completedAt: string | null; completionPercentage: number } | null) {
  return Boolean(progress?.completedAt || (progress?.completionPercentage ?? 0) >= 100);
}

function orderedLessons(detail: Awaited<ReturnType<CourseRepository["getCourseDetail"]>>) {
  return (detail?.modules ?? [])
    .filter((courseModule) => !courseModule.isArchived)
    .sort((left, right) => left.sortOrder - right.sortOrder || left.id.localeCompare(right.id))
    .flatMap((courseModule) =>
      [...courseModule.lessons]
        .filter((lesson) => lesson.status === "published")
        .sort((left, right) => left.sortOrder - right.sortOrder || left.id.localeCompare(right.id)),
    );
}

function activity(
  kind: TodayActivityKind,
  input: Omit<TodayActivity, "id" | "kind">,
): TodayActivity {
  return { id: `${kind}:${input.href}`, kind, ...input };
}

export async function getTodayDashboard(
  profileId: string,
  dependencies: TodayDependencies = defaultDependencies(),
  nowInput: string | Date = new Date(),
): Promise<TodayDashboardData> {
  const now = new Date(nowInput);
  const [profile, settings, source] = await Promise.all([
    dependencies.identityRepository.getProfile(profileId),
    dependencies.identityRepository.getSettings(profileId),
    dependencies.analyticsRepository.getLearnerSource(profileId, rangeFor(now)),
  ]);
  if (!profile || !source) {
    throw new Error("Learner profile is not available.");
  }
  const effectiveSettings: Pick<UserSettingsRecord, "preferredSubjects" | "studySessionDuration"> =
    settings ?? { preferredSubjects: [], studySessionDuration: 15 };
  const activeSubject = selectActiveSubject(source.subjects, effectiveSettings.preferredSubjects);
  const subjects = source.subjects.map((subject) => ({
    ...subject,
    isActive: subject.id === activeSubject?.id,
  }));
  const today = dateKey(now);
  const progressByLesson = new Map(
    source.lessonProgress.map((progress) => [progress.lessonId, progress]),
  );
  const subjectProgress = activeSubject
    ? source.lessonProgress.filter((progress) => progress.subjectId === activeSubject.id)
    : [];
  const activities: TodayActivity[] = [];

  const incomplete = [...subjectProgress]
    .filter((progress) => !isComplete(progress))
    .sort(
      (left, right) =>
        Date.parse(right.lastViewedAt ?? right.updatedAt) -
          Date.parse(left.lastViewedAt ?? left.updatedAt) ||
        left.lessonId.localeCompare(right.lessonId),
    )[0];
  if (incomplete && activeSubject) {
    const reader = await dependencies.courseRepository.getLessonReader(
      incomplete.lessonId,
      profileId,
    );
    activities.push(
      activity("resume", {
        title: `Continue ${incomplete.title}`,
        description: incomplete.completionPercentage
          ? `${incomplete.completionPercentage}% complete · pick up at your last step.`
          : "Start the first bite-sized step in this lesson.",
        href: `/lessons/${incomplete.lessonId}`,
        subjectId: activeSubject.id,
        subjectName: activeSubject.name,
        estimatedMinutes: Math.max(5, reader?.lesson.estimatedDurationMinutes ?? 10),
        reason: "Resume where you left off",
        completed: false,
        resumeBlockId: reader?.progress?.lastViewedBlockId ?? null,
      }),
    );
  }

  if (activeSubject) {
    const exerciseSets = await dependencies.exerciseRepository.listExerciseSets({
      status: "published",
      subjectId: activeSubject.id,
    });
    const practiceSet = [...exerciseSets].sort(
      (left, right) => left.title.localeCompare(right.title) || left.id.localeCompare(right.id),
    )[0];
    const weakConcept = source.mastery
      .filter((concept) => concept.subjectId === activeSubject.id && concept.score < 0.7)
      .sort(
        (left, right) => left.score - right.score || left.conceptId.localeCompare(right.conceptId),
      )[0];
    const recentMiss = source.events
      .filter(
        (event) =>
          event.subjectId === activeSubject.id &&
          event.eventType === "question-attempt" &&
          event.isCorrect === false,
      )
      .sort((left, right) => Date.parse(right.occurredAt) - Date.parse(left.occurredAt))[0];
    if (practiceSet && weakConcept) {
      activities.push(
        activity("review", {
          title: `Review ${weakConcept.conceptName}`,
          description: "A short practice set focused on a concept that needs another pass.",
          href: `/exercise-sets/${practiceSet.id}`,
          subjectId: activeSubject.id,
          subjectName: activeSubject.name,
          estimatedMinutes: Math.max(5, Math.ceil(practiceSet.estimatedTimeSeconds / 60)),
          reason: "Strengthen a weak concept",
          completed: false,
        }),
      );
    } else if (practiceSet && recentMiss) {
      activities.push(
        activity("practice", {
          title: "Practice a recent miss",
          description: "Try one more focused set while the idea is still fresh.",
          href: `/exercise-sets/${practiceSet.id}`,
          subjectId: activeSubject.id,
          subjectName: activeSubject.name,
          estimatedMinutes: Math.max(5, Math.ceil(practiceSet.estimatedTimeSeconds / 60)),
          reason: "Learn from a recent answer",
          completed: false,
        }),
      );
    }

    const courses = await dependencies.courseRepository.listCourses({
      status: "published",
      subjectId: activeSubject.id,
    });
    const orderedCourses = [...courses].sort(
      (left, right) => left.title.localeCompare(right.title) || left.id.localeCompare(right.id),
    );
    const detailCache = new Map<
      string,
      NonNullable<Awaited<ReturnType<CourseRepository["getCourseDetail"]>>> | null
    >();
    const getDetail = async (courseId: string) => {
      if (!detailCache.has(courseId))
        detailCache.set(courseId, await dependencies.courseRepository.getCourseDetail(courseId));
      return detailCache.get(courseId) ?? null;
    };
    const courseIsComplete = async (courseId: string) => {
      const detail = await getDetail(courseId);
      const lessons = orderedLessons(detail);
      return Boolean(
        lessons.length &&
        lessons.every((lesson) => isComplete(progressByLesson.get(lesson.id) ?? null)),
      );
    };
    for (const course of orderedCourses) {
      const detail = await getDetail(course.id);
      if (!detail) continue;
      const lessons = orderedLessons(detail);
      if (
        !lessons.length ||
        lessons.every((lesson) => isComplete(progressByLesson.get(lesson.id) ?? null))
      )
        continue;
      const prerequisitesReady = await Promise.all(
        detail.prerequisites.map((prerequisite) =>
          courseIsComplete(prerequisite.prerequisiteCourseId),
        ),
      ).then((results) => results.every(Boolean));
      if (!prerequisitesReady) continue;
      const nextLesson = lessons.find(
        (lesson) => !isComplete(progressByLesson.get(lesson.id) ?? null),
      );
      if (!nextLesson) continue;
      activities.push(
        activity("next-lesson", {
          title: nextLesson.title,
          description: course.description || "Take the next short step in your subject.",
          href: `/lessons/${nextLesson.id}`,
          subjectId: activeSubject.id,
          subjectName: activeSubject.name,
          estimatedMinutes: Math.max(5, nextLesson.estimatedDurationMinutes || 10),
          reason: `Next in ${course.title}`,
          completed: false,
        }),
      );
      break;
    }
  }

  const todayEvents = source.events.filter((event) => dateKey(event.occurredAt) === today);
  const todaySessions = source.learningSessions.filter(
    (session) => dateKey(session.startedAt) === today,
  );
  const studiedSeconds = Math.max(
    todaySessions.reduce((total, session) => total + session.durationSeconds, 0),
    todayEvents.reduce((total, event) => total + event.durationSeconds, 0),
  );
  const dailyPlanCompleted = todayEvents.some(
    (event) =>
      event.eventType === "study-session-completion" &&
      event.dedupeKey === `daily-plan:${profileId}:${today}`,
  );
  return {
    profile: { id: profile.id, displayName: profile.displayName },
    activeSubject,
    subjects,
    activities,
    primaryActivity: activities[0] ?? null,
    dailyGoalMinutes: Math.max(5, effectiveSettings.studySessionDuration || 15),
    studiedMinutesToday: Math.round(studiedSeconds / 60),
    studyStreak: calculateStudyStreak(source.events, now),
    learningPoints: calculateLearningPoints(source.events),
    dailyPlanCompleted,
    needsSubjectChoice: !activeSubject,
  };
}

export async function startTodaySession(
  input: { profileId: string; activityId: string; subjectId?: string | null },
  analyticsRepository: AnalyticsRepository = getAnalyticsRepository(),
) {
  return analyticsRepository.startLearningSession({
    id: randomUUID(),
    profileId: input.profileId,
    sessionType:
      input.activityId.startsWith("practice:") || input.activityId.startsWith("review:")
        ? "exercise"
        : "lesson",
    sourceType: "today",
    sourceId: input.activityId,
    metadata: { subjectId: input.subjectId ?? null, activityId: input.activityId },
  });
}

export async function completeTodaySession(
  input: {
    profileId: string;
    sessionId: string;
    completed?: boolean;
    durationSeconds?: number;
    activityId?: string | null;
    subjectId?: string | null;
    completedAt?: string | Date;
  },
  analyticsRepository: AnalyticsRepository = getAnalyticsRepository(),
) {
  const completed = input.completed ?? true;
  const session = await analyticsRepository.completeLearningSession(
    input.profileId,
    input.sessionId,
    {
      durationSeconds: input.durationSeconds,
      endedAt: input.completedAt ? new Date(input.completedAt).toISOString() : undefined,
      status: completed ? "completed" : "abandoned",
    },
  );
  if (completed) {
    const completedAt = input.completedAt ? new Date(input.completedAt) : new Date();
    const today = dateKey(completedAt);
    await analyticsRepository.recordActivityEvent({
      id: `activity-daily-plan-${input.profileId}-${today}`,
      profileId: input.profileId,
      eventType: "study-session-completion",
      resourceType: "today",
      resourceId: input.activityId ?? session.sourceId,
      subjectId: input.subjectId ?? null,
      learningSessionId: session.id,
      durationSeconds: session.durationSeconds,
      dedupeKey: `daily-plan:${input.profileId}:${today}`,
      metadata: { points: 10, activityId: input.activityId ?? session.sourceId },
    });
  }
  return session;
}

export async function selectActiveSubjectForProfile(
  profileId: string,
  subjectId: string,
  identityRepository: IdentityRepository = getIdentityRepository(),
) {
  const current = (await identityRepository.getSettings(profileId)) ?? defaultSettings(profileId);
  const selected = current.preferredSubjects.filter((subject) => subject !== subjectId);
  return identityRepository.saveSettings({
    ...current,
    preferredSubjects: [subjectId, ...selected],
  });
}
