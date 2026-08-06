import type {
  ActivityEventRecord,
  AnalyticsDateRange,
  AnalyticsGrade,
  AnalyticsMastery,
  AnalyticsMasterySnapshot,
  AnalyticsSubject,
  ContentMetricRecord,
  LearnerAnalyticsData,
  LearnerAnalyticsSource,
  LearnerDailyMetric,
  LearnerMetricRecord,
  TeacherAnalyticsData,
  TeacherLearnerProgress,
} from "@/domain/analytics/types";

const DAY_MS = 86_400_000;
const DEFAULT_RANGE_DAYS = 30;

function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));
}

function round(value: number, decimals = 4): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function timestamp(value: string | Date): number | null {
  const parsed = value instanceof Date ? value.getTime() : Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function dateKey(value: string | Date): string | null {
  const parsed = timestamp(value);
  return parsed === null ? null : new Date(parsed).toISOString().slice(0, 10);
}

function dayStart(value: string | Date): number {
  const parsed = timestamp(value);
  if (parsed === null) return Date.now();
  const date = new Date(parsed);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

function dateOnly(value: string | Date): string {
  return new Date(dayStart(value)).toISOString().slice(0, 10);
}

function addDays(value: string, days: number): string {
  return new Date(dayStart(value) + days * DAY_MS).toISOString().slice(0, 10);
}

function inRange(value: string | null | undefined, range: AnalyticsDateRange): boolean {
  if (!value) return false;
  const parsed = timestamp(value);
  if (parsed === null) return false;
  return parsed >= dayStart(range.from) && parsed < dayStart(addDays(range.to, 1));
}

function mean(values: readonly number[], fallback = 0): number {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : fallback;
}

function unique(values: readonly string[]): string[] {
  return [...new Set(values)];
}

export function normalizeAnalyticsRange(
  range?: Partial<AnalyticsDateRange>,
  now: string | Date = new Date(),
): AnalyticsDateRange {
  const end = dateOnly(range?.to ?? now);
  const requestedStart = range?.from
    ? dateOnly(range.from)
    : addDays(end, -(DEFAULT_RANGE_DAYS - 1));
  return requestedStart <= end ? { from: requestedStart, to: end } : { from: end, to: end };
}

export function rangeDates(range: AnalyticsDateRange): readonly string[] {
  const days: string[] = [];
  for (let current = range.from; current <= range.to; current = addDays(current, 1)) {
    days.push(current);
  }
  return days;
}

export function calculateAccuracy(correct: number, attempted: number): number {
  return attempted > 0 ? clamp(correct / attempted) : 0;
}

export function calculateStudyStreak(
  activeDates: readonly string[],
  referenceDate: string | Date = new Date(),
): number {
  const dates = new Set(activeDates.map((value) => dateOnly(value)));
  let current = dateOnly(referenceDate);
  if (!dates.has(current)) current = addDays(current, -1);
  let streak = 0;
  while (dates.has(current)) {
    streak += 1;
    current = addDays(current, -1);
  }
  return streak;
}

export function calculateDiscriminationIndex(
  outcomes: readonly { score: number; correct: boolean }[],
): number {
  if (outcomes.length < 3) return 0;
  const ordered = [...outcomes].sort((left, right) => left.score - right.score);
  const groupSize = Math.max(1, Math.floor(ordered.length / 3));
  const low = ordered.slice(0, groupSize);
  const high = ordered.slice(-groupSize);
  return round(
    mean(high.map((item) => (item.correct ? 1 : 0))) -
      mean(low.map((item) => (item.correct ? 1 : 0))),
    3,
  );
}

function activeDateForEvent(event: ActivityEventRecord): string | null {
  return dateKey(event.occurredAt);
}

function masteryAverage(mastery: readonly AnalyticsMastery[]): number {
  return mean(mastery.map((item) => item.score));
}

function masteryForConcept(
  mastery: readonly AnalyticsMastery[],
  conceptId: string,
): AnalyticsMastery | null {
  return mastery.find((item) => item.conceptId === conceptId) ?? null;
}

function conceptChange(
  conceptId: string,
  currentScore: number,
  snapshots: readonly AnalyticsMasterySnapshot[],
): number {
  const history = snapshots
    .filter((snapshot) => snapshot.conceptId === conceptId)
    .sort((left, right) => timestamp(left.createdAt)! - timestamp(right.createdAt)!);
  const previous = history.at(-2);
  return previous ? round(currentScore - previous.score) : 0;
}

function masteryMetric(
  item: AnalyticsMastery,
  change: number,
  reason: string,
): LearnerAnalyticsData["weakConcepts"][number] {
  return {
    conceptId: item.conceptId,
    conceptName: item.conceptName,
    subjectName: item.subjectName,
    score: item.score,
    confidence: item.confidence,
    change,
    evidenceCount: item.evidenceCount,
    reason,
  };
}

function conceptIsWeak(item: AnalyticsMastery): boolean {
  return (
    item.evidenceCount > 0 &&
    (item.state === "needs-review" || item.state === "developing" || item.score < 0.55)
  );
}

function subjectMetrics(
  mastery: readonly AnalyticsMastery[],
  subjects: readonly AnalyticsSubject[],
): LearnerAnalyticsData["subjectMastery"] {
  return subjects.map((subject) => {
    const items = mastery.filter((item) => item.subjectId === subject.id);
    const assessed = items.filter((item) => item.evidenceCount > 0);
    return {
      subjectId: subject.id,
      subjectName: subject.name,
      conceptCount: items.length,
      assessedConcepts: assessed.length,
      masteredConcepts: items.filter((item) => item.state === "mastered").length,
      averageScore: round(mean(items.map((item) => item.score))),
      averageConfidence: round(mean(assessed.map((item) => item.confidence))),
    };
  });
}

function gradeMetrics(
  mastery: readonly AnalyticsMastery[],
  grades: readonly AnalyticsGrade[],
): LearnerAnalyticsData["gradeMastery"] {
  const order = new Map(grades.map((grade) => [grade.id, grade.sortOrder]));
  return grades.map((grade) => {
    const gradeOrder = order.get(grade.id) ?? 0;
    const items = mastery.filter((item) => {
      const minimum = item.gradeMinId
        ? (order.get(item.gradeMinId) ?? gradeOrder)
        : Number.NEGATIVE_INFINITY;
      const maximum = item.gradeMaxId
        ? (order.get(item.gradeMaxId) ?? gradeOrder)
        : Number.POSITIVE_INFINITY;
      return minimum <= gradeOrder && maximum >= gradeOrder;
    });
    const assessed = items.filter((item) => item.evidenceCount > 0);
    return {
      gradeId: grade.id,
      gradeName: grade.name,
      conceptCount: items.length,
      assessedConcepts: assessed.length,
      masteredConcepts: items.filter((item) => item.state === "mastered").length,
      averageScore: round(mean(items.map((item) => item.score))),
    };
  });
}

function questionEventHints(
  events: readonly ActivityEventRecord[],
  questionId: string,
): { hints: number; responseTimes: number[] } {
  const matches = events.filter(
    (event) => event.eventType === "question-attempt" && event.resourceId === questionId,
  );
  return {
    hints: matches.reduce((sum, event) => sum + event.hintsUsed, 0),
    responseTimes: matches.flatMap((event) =>
      event.responseTimeMs === null ? [] : [event.responseTimeMs],
    ),
  };
}

export function buildLearnerAnalytics(
  source: LearnerAnalyticsSource,
  inputRange?: Partial<AnalyticsDateRange>,
  now: string | Date = new Date(),
): LearnerAnalyticsData {
  const range = normalizeAnalyticsRange(inputRange, now);
  const events = source.events.filter((event) => inRange(event.occurredAt, range));
  const sessions = source.learningSessions.filter((session) => inRange(session.startedAt, range));
  const questionAttempts = source.questionAttempts.filter((attempt) =>
    inRange(attempt.answeredAt, range),
  );
  const assessmentAttempts = source.assessmentAttempts.filter((attempt) =>
    inRange(attempt.submittedAt ?? attempt.startedAt, range),
  );
  const progress = source.lessonProgress.filter(
    (item) =>
      inRange(item.updatedAt, range) ||
      inRange(item.completedAt, range) ||
      inRange(item.lastViewedAt, range),
  );
  const plannerSessions = source.plannerSessions.filter(
    (session) =>
      session.status === "completed" &&
      inRange(session.completedAt ?? session.scheduledDate, range),
  );

  const daily = new Map<string, LearnerDailyMetric>();
  for (const date of rangeDates(range)) {
    daily.set(date, {
      date,
      timeStudiedSeconds: 0,
      lessonsCompleted: 0,
      questionsAttempted: 0,
      accuracy: 0,
      masteryScore: 0,
    });
  }
  const correctByDay = new Map<string, number>();
  const activeDates = new Set<string>();
  const lessonCompletions = new Set<string>();
  const lessonStarts = new Set<string>();

  const addStudyTime = (value: string | null | undefined, seconds: number) => {
    const date = value ? dateKey(value) : null;
    if (!date || !daily.has(date)) return;
    const metric = daily.get(date)!;
    metric.timeStudiedSeconds += Math.max(0, seconds);
    if (seconds > 0) activeDates.add(date);
  };
  for (const session of sessions) {
    if (session.status === "completed") addStudyTime(session.startedAt, session.durationSeconds);
  }
  for (const event of events) {
    const date = activeDateForEvent(event);
    if (!date || !daily.has(date)) continue;
    if (
      event.eventType === "study-session-completion" ||
      event.eventType === "simulation-session"
    ) {
      addStudyTime(event.occurredAt, event.durationSeconds);
    }
    if (event.eventType === "lesson-view") {
      if (event.resourceId) lessonStarts.add(event.resourceId);
      activeDates.add(date);
    }
    if (event.eventType === "lesson-completion" && event.resourceId) {
      lessonCompletions.add(event.resourceId);
      daily.get(date)!.lessonsCompleted += 1;
      activeDates.add(date);
    }
  }
  for (const item of progress) {
    if (item.startedAt && dateKey(item.startedAt)) lessonStarts.add(item.lessonId);
    if (item.completed && item.completedAt) lessonCompletions.add(item.lessonId);
    if (item.completedAt) {
      const date = dateKey(item.completedAt);
      if (
        date &&
        daily.has(date) &&
        !events.some(
          (event) =>
            event.eventType === "lesson-completion" &&
            event.resourceId === item.lessonId &&
            dateKey(event.occurredAt) === date,
        )
      ) {
        daily.get(date)!.lessonsCompleted += 1;
      }
    }
  }
  for (const session of plannerSessions)
    addStudyTime(session.completedAt ?? session.scheduledDate, session.durationMinutes * 60);

  for (const attempt of questionAttempts) {
    const date = dateKey(attempt.answeredAt);
    if (!date || !daily.has(date)) continue;
    const metric = daily.get(date)!;
    metric.questionsAttempted += 1;
    correctByDay.set(date, (correctByDay.get(date) ?? 0) + (attempt.isCorrect ? 1 : 0));
    activeDates.add(date);
  }
  for (const metric of daily.values())
    metric.accuracy = calculateAccuracy(
      correctByDay.get(metric.date) ?? 0,
      metric.questionsAttempted,
    );

  const snapshotsByDay = new Map<string, number[]>();
  for (const snapshot of source.masterySnapshots.filter((item) => inRange(item.createdAt, range))) {
    const date = dateKey(snapshot.createdAt);
    if (date) snapshotsByDay.set(date, [...(snapshotsByDay.get(date) ?? []), snapshot.score]);
  }
  let lastMasteryScore = masteryAverage(source.mastery);
  for (const metric of daily.values()) {
    const scores = snapshotsByDay.get(metric.date);
    if (scores?.length) lastMasteryScore = mean(scores);
    metric.masteryScore = round(lastMasteryScore);
  }

  const progressTime = progress.reduce((sum, item) => sum + item.timeSpentSeconds, 0);
  const sessionTime = sessions.reduce((sum, session) => sum + session.durationSeconds, 0);
  const eventTime = events
    .filter(
      (event) =>
        event.eventType === "study-session-completion" || event.eventType === "simulation-session",
    )
    .reduce((sum, event) => sum + event.durationSeconds, 0);
  const timeStudiedSeconds = Math.max(progressTime, sessionTime + eventTime);
  const questionHintData = questionAttempts.map((attempt) =>
    questionEventHints(events, attempt.questionId),
  );
  const hintsUsed = questionAttempts.reduce(
    (sum, attempt, index) => sum + attempt.hintsUsed + questionHintData[index]!.hints,
    0,
  );
  const responseTimes = questionAttempts.flatMap((attempt, index) => {
    if (attempt.responseTimeMs !== null) return [attempt.responseTimeMs];
    return questionHintData[index]!.responseTimes;
  });
  const lessonsCompleted = lessonCompletions.size;
  const questionsCorrect = questionAttempts.filter((attempt) => attempt.isCorrect).length;
  const assessmentScores = assessmentAttempts.map((attempt) => ({
    assessmentId: attempt.assessmentId,
    title: attempt.title,
    percentage: attempt.percentage,
    passed: attempt.passed,
    submittedAt: attempt.submittedAt,
  }));
  const weak = source.mastery
    .filter(conceptIsWeak)
    .map((item) =>
      masteryMetric(
        item,
        conceptChange(item.conceptId, item.score, source.masterySnapshots),
        "Recent evidence is below the stable practice range.",
      ),
    )
    .sort(
      (left, right) =>
        left.score - right.score || left.conceptName.localeCompare(right.conceptName),
    );
  const improved = source.mastery
    .map((item) =>
      masteryMetric(
        item,
        conceptChange(item.conceptId, item.score, source.masterySnapshots),
        "Recent snapshots show a positive change.",
      ),
    )
    .filter((item) => item.change > 0.02)
    .sort(
      (left, right) =>
        right.change - left.change || left.conceptName.localeCompare(right.conceptName),
    );
  const recentlyMastered = source.mastery
    .filter((item) => item.state === "mastered")
    .map((item) =>
      masteryMetric(
        item,
        conceptChange(item.conceptId, item.score, source.masterySnapshots),
        "This concept recently crossed its mastery threshold.",
      ),
    )
    .filter((item) =>
      source.masterySnapshots.some(
        (snapshot) =>
          snapshot.conceptId === item.conceptId &&
          snapshot.state === "mastered" &&
          inRange(snapshot.createdAt, { from: addDays(dateOnly(now), -30), to: dateOnly(now) }),
      ),
    )
    .sort(
      (left, right) =>
        right.change - left.change || left.conceptName.localeCompare(right.conceptName),
    );
  const mistakeCounts = new Map<string, number>();
  for (const attempt of questionAttempts) {
    if (attempt.isCorrect) continue;
    const category = attempt.mistakeCategory || "Incorrect answer";
    mistakeCounts.set(category, (mistakeCounts.get(category) ?? 0) + 1);
  }
  const studyDays = activeDates.size;
  const summary = {
    timeStudiedSeconds,
    lessonsStarted: lessonStarts.size,
    lessonsCompleted,
    questionsAttempted: questionAttempts.length,
    correctQuestions: questionsCorrect,
    accuracy: calculateAccuracy(questionsCorrect, questionAttempts.length),
    assessmentCount: assessmentAttempts.length,
    averageAssessmentScore: round(mean(assessmentAttempts.map((attempt) => attempt.percentage))),
    hintsUsed,
    attemptCount: questionAttempts.reduce(
      (sum, attempt) => sum + Math.max(1, attempt.attemptNumber),
      0,
    ),
    averageResponseTimeMs: round(mean(responseTimes)),
    studyDays,
    studyStreak: calculateStudyStreak([...activeDates], now),
    consistencyScore: round(clamp(studyDays / Math.max(1, rangeDates(range).length))),
    masteryScore: round(masteryAverage(source.mastery)),
    masteredConcepts: source.mastery.filter((item) => item.state === "mastered").length,
    weakConcepts: weak.length,
  };
  return {
    range,
    summary,
    daily: [...daily.values()],
    subjectMastery: subjectMetrics(source.mastery, source.subjects),
    gradeMastery: gradeMetrics(source.mastery, source.grades),
    weakConcepts: weak.slice(0, 10),
    mostImprovedConcepts: improved.slice(0, 10),
    recentlyMasteredConcepts: recentlyMastered.slice(0, 10),
    assessmentScores: assessmentScores.slice(0, 20),
    mistakeCategories: [...mistakeCounts.entries()]
      .map(([category, count]) => ({ category, count }))
      .sort(
        (left, right) => right.count - left.count || left.category.localeCompare(right.category),
      ),
  };
}

export function buildLearnerMetricRecords(
  source: LearnerAnalyticsSource,
  analytics: LearnerAnalyticsData,
): readonly LearnerMetricRecord[] {
  return analytics.daily.map((daily) => ({
    id: `learner-metric-${source.profile.id}-${daily.date}`,
    profileId: source.profile.id,
    metricDate: daily.date,
    timeStudiedSeconds: daily.timeStudiedSeconds,
    lessonsStarted: source.events.filter(
      (event) => event.eventType === "lesson-view" && dateKey(event.occurredAt) === daily.date,
    ).length,
    lessonsCompleted: daily.lessonsCompleted,
    questionsAttempted: daily.questionsAttempted,
    correctQuestions: Math.round(daily.questionsAttempted * daily.accuracy),
    accuracy: daily.accuracy,
    assessmentCount: source.assessmentAttempts.filter(
      (attempt) => dateKey(attempt.submittedAt ?? attempt.startedAt) === daily.date,
    ).length,
    averageAssessmentScore: mean(
      source.assessmentAttempts
        .filter((attempt) => dateKey(attempt.submittedAt ?? attempt.startedAt) === daily.date)
        .map((attempt) => attempt.percentage),
    ),
    hintsUsed: source.events
      .filter(
        (event) =>
          event.eventType === "question-attempt" && dateKey(event.occurredAt) === daily.date,
      )
      .reduce((sum, event) => sum + event.hintsUsed, 0),
    attemptCount: daily.questionsAttempted,
    averageResponseTimeMs: mean(
      source.events
        .filter(
          (event) =>
            event.eventType === "question-attempt" &&
            dateKey(event.occurredAt) === daily.date &&
            event.responseTimeMs !== null,
        )
        .map((event) => event.responseTimeMs!),
    ),
    studyDays: daily.timeStudiedSeconds > 0 ? 1 : 0,
    streakDays: 0,
    consistencyScore: analytics.summary.consistencyScore,
    masteryScore: daily.masteryScore,
    masteredConcepts: analytics.summary.masteredConcepts,
    weakConcepts: analytics.summary.weakConcepts,
    metadata: {},
  }));
}

export function buildLearnerDashboard(
  source: LearnerAnalyticsSource,
  now: string | Date = new Date(),
): import("@/domain/analytics/types").LearnerDashboardData {
  const today = dateOnly(now);
  const analytics = buildLearnerAnalytics(source, { from: addDays(today, -29), to: today }, now);
  const grade =
    source.grades.find((item) => item.id === source.profile.currentGrade)?.name ??
    source.profile.currentGrade;
  const curriculum = source.profile.currentCurriculum;
  const recommendation = source.recommendations[0];
  const recommendedNextActivity = recommendation
    ? {
        title: recommendation.title,
        reason: recommendation.reason,
        href: recommendation.conceptId
          ? `/mastery/concepts/${recommendation.conceptId}`
          : "/recommendations",
      }
    : source.currentLesson
      ? {
          title: `Continue ${source.currentLesson.title}`,
          reason: "Pick up the lesson where you last left off.",
          href: `/lessons/${source.currentLesson.lessonId}`,
        }
      : {
          title: "Browse a first course",
          reason: "Choose a published course to start building learning history.",
          href: "/courses",
        };
  const studiedMinutes = Math.round(
    analytics.daily.slice(-7).reduce((sum, item) => sum + item.timeStudiedSeconds, 0) / 60,
  );
  const targetMinutes = source.profile.weeklyStudyTargetMinutes ?? 180;
  return {
    profile: source.profile,
    currentGradeName: grade ?? null,
    currentCurriculumName: source.profile.currentCurriculumName ?? curriculum,
    activeSubjects: source.subjects,
    activeRoadmaps: source.roadmaps,
    currentLesson: source.currentLesson,
    recommendedNextActivity,
    weeklyStudyProgress: {
      targetMinutes,
      studiedMinutes,
      percentage: Math.round(clamp(studiedMinutes / Math.max(1, targetMinutes)) * 100),
    },
    weakConcepts: analytics.weakConcepts.slice(0, 5),
    recentlyMasteredConcepts: analytics.recentlyMasteredConcepts.slice(0, 5),
    upcomingAssessments: source.upcomingAssessments,
    studyStreak: analytics.summary.studyStreak,
    timeStudiedSeconds: analytics.summary.timeStudiedSeconds,
    recentNotes: source.notes.slice(0, 5),
    bookmarks: source.bookmarks.slice(0, 5),
    analytics,
  };
}

function groupBy<T>(values: readonly T[], key: (value: T) => string): Map<string, T[]> {
  const grouped = new Map<string, T[]>();
  for (const value of values) {
    const group = key(value);
    grouped.set(group, [...(grouped.get(group) ?? []), value]);
  }
  return grouped;
}

export function buildContentMetrics(
  sources: readonly LearnerAnalyticsSource[],
  range: AnalyticsDateRange,
): readonly ContentMetricRecord[] {
  const attempts = sources.flatMap((source) =>
    source.questionAttempts.filter((attempt) => inRange(attempt.answeredAt, range)),
  );
  const byQuestion = groupBy(attempts, (attempt) => attempt.questionId);
  return [...byQuestion.entries()].map(([questionId, questionAttempts]) => {
    const first = questionAttempts[0]!;
    const discriminationIndex = calculateDiscriminationIndex(
      questionAttempts.map((attempt) => ({
        score: attempt.scorePercentage,
        correct: attempt.isCorrect,
      })),
    );
    const responseTimes = questionAttempts.flatMap((attempt) =>
      attempt.responseTimeMs === null ? [] : [attempt.responseTimeMs],
    );
    const hints = questionAttempts.reduce((sum, attempt) => sum + attempt.hintsUsed, 0);
    const supportCount = questionAttempts.filter((attempt) => !attempt.isCorrect).length;
    return {
      id: `content-metric-question-${questionId}-${range.to}`,
      resourceType: "question",
      resourceId: questionId,
      metricDate: range.to,
      subjectId: first.subjectId,
      gradeId: first.gradeMinId,
      conceptId: first.conceptIds[0] ?? null,
      attemptCount: questionAttempts.length,
      completionCount: questionAttempts.length,
      correctCount: questionAttempts.filter((attempt) => attempt.isCorrect).length,
      accuracy: round(mean(questionAttempts.map((attempt) => attempt.scorePercentage))),
      averageResponseTimeMs: round(mean(responseTimes)),
      averageAttempts: round(
        mean(
          questionAttempts.map((attempt) => attempt.attemptNumber),
          1,
        ),
      ),
      hintRate: round(hints / Math.max(1, questionAttempts.length)),
      discriminationIndex,
      supportCount,
      metadata: { questionTitle: first.questionTitle },
    };
  });
}

export function buildTeacherAnalytics(
  sources: readonly LearnerAnalyticsSource[],
  inputRange?: Partial<AnalyticsDateRange>,
  now: string | Date = new Date(),
): TeacherAnalyticsData {
  const range = normalizeAnalyticsRange(inputRange, now);
  const learnerData = sources.map((source) => ({
    source,
    analytics: buildLearnerAnalytics(source, range, now),
  }));
  const learnerProgress: TeacherLearnerProgress[] = learnerData.map(({ source, analytics }) => {
    const totalLessons = source.subjectLessonTotals.reduce(
      (sum, item) => sum + item.totalLessons,
      0,
    );
    const completedLessons = new Set(
      source.lessonProgress.filter((item) => item.completed).map((item) => item.lessonId),
    ).size;
    const requiresSupport =
      analytics.summary.weakConcepts >= 2 ||
      (analytics.summary.questionsAttempted >= 3 && analytics.summary.accuracy < 0.6) ||
      analytics.summary.masteryScore < 0.4;
    return {
      profileId: source.profile.id,
      displayName: source.profile.displayName,
      currentGrade: source.profile.currentGrade,
      timeStudiedSeconds: analytics.summary.timeStudiedSeconds,
      lessonsCompleted: completedLessons,
      lessonCompletionRate: round(completedLessons / Math.max(1, totalLessons)),
      questionsAttempted: analytics.summary.questionsAttempted,
      accuracy: analytics.summary.accuracy,
      masteryScore: analytics.summary.masteryScore,
      weakConcepts: analytics.summary.weakConcepts,
      studyStreak: analytics.summary.studyStreak,
      requiresSupport,
    };
  });
  const gradeGroups = groupBy(
    learnerData,
    ({ source }) => source.profile.currentGrade ?? "unassigned",
  );
  const gradeDistribution = [...gradeGroups.entries()]
    .map(([gradeId, group]) => ({
      gradeId,
      gradeName:
        group[0]?.source.grades.find((grade) => grade.id === gradeId)?.name ?? "Unassigned",
      learnerCount: group.length,
      averageMastery: round(mean(group.map((item) => item.analytics.summary.masteryScore))),
    }))
    .sort(
      (left, right) =>
        right.learnerCount - left.learnerCount || left.gradeName.localeCompare(right.gradeName),
    );

  const conceptGroups = new Map<
    string,
    {
      conceptName: string;
      subjectName: string;
      scores: number[];
      attempts: number;
      supportCount: number;
    }
  >();
  for (const { source } of learnerData) {
    for (const attempt of source.questionAttempts.filter((item) =>
      inRange(item.answeredAt, range),
    )) {
      for (const conceptId of attempt.conceptIds) {
        const mastery = masteryForConcept(source.mastery, conceptId);
        const current = conceptGroups.get(conceptId) ?? {
          conceptName: mastery?.conceptName ?? conceptId,
          subjectName: mastery?.subjectName ?? attempt.subjectName,
          scores: [],
          attempts: 0,
          supportCount: 0,
        };
        current.scores.push(attempt.scorePercentage);
        current.attempts += 1;
        if (!attempt.isCorrect) current.supportCount += 1;
        conceptGroups.set(conceptId, current);
      }
    }
  }
  const conceptDifficulty = [...conceptGroups.entries()]
    .map(([conceptId, value]) => ({
      conceptId,
      conceptName: value.conceptName,
      subjectName: value.subjectName,
      averageScore: round(mean(value.scores)),
      attempts: value.attempts,
      supportCount: value.supportCount,
    }))
    .sort((left, right) => left.averageScore - right.averageScore || right.attempts - left.attempts)
    .slice(0, 20);

  const mistakeCounts = new Map<string, number>();
  for (const { analytics } of learnerData)
    for (const mistake of analytics.mistakeCategories)
      mistakeCounts.set(
        mistake.category,
        (mistakeCounts.get(mistake.category) ?? 0) + mistake.count,
      );
  const assessmentGroups = groupBy(
    learnerData.flatMap(({ source }) =>
      source.assessmentAttempts.filter((attempt) =>
        inRange(attempt.submittedAt ?? attempt.startedAt, range),
      ),
    ),
    (attempt) => attempt.assessmentId,
  );
  const assessmentPerformance = [...assessmentGroups.entries()]
    .map(([assessmentId, attempts]) => ({
      assessmentId,
      title: attempts[0]!.title,
      attempts: attempts.length,
      averageScore: round(mean(attempts.map((attempt) => attempt.percentage))),
      passRate: round(
        attempts.filter((attempt) => attempt.passed).length / Math.max(1, attempts.length),
      ),
    }))
    .sort(
      (left, right) => left.averageScore - right.averageScore || right.attempts - left.attempts,
    );
  const questionGroups = groupBy(
    learnerData.flatMap(({ source }) =>
      source.questionAttempts.filter((attempt) => inRange(attempt.answeredAt, range)),
    ),
    (attempt) => attempt.questionId,
  );
  const questionDiscrimination = [...questionGroups.entries()]
    .map(([questionId, attempts]) => ({
      questionId,
      questionTitle: attempts[0]!.questionTitle,
      discriminationIndex: calculateDiscriminationIndex(
        attempts.map((attempt) => ({ score: attempt.scorePercentage, correct: attempt.isCorrect })),
      ),
      attempts: attempts.length,
    }))
    .sort(
      (left, right) =>
        left.discriminationIndex - right.discriminationIndex || right.attempts - left.attempts,
    )
    .slice(0, 20);
  const completionGroups = new Map<
    string,
    { subjectName: string; completed: number; total: number }
  >();
  for (const { source } of learnerData) {
    for (const total of source.subjectLessonTotals) {
      const current = completionGroups.get(total.subjectId) ?? {
        subjectName: total.subjectName,
        completed: 0,
        total: 0,
      };
      current.total += total.totalLessons;
      current.completed += new Set(
        source.lessonProgress
          .filter((item) => item.subjectId === total.subjectId && item.completed)
          .map((item) => item.lessonId),
      ).size;
      completionGroups.set(total.subjectId, current);
    }
  }
  const completionRates = [...completionGroups.entries()].map(([subjectId, value]) => ({
    subjectId,
    subjectName: value.subjectName,
    completedLessons: value.completed,
    totalLessons: value.total,
    completionRate: round(value.completed / Math.max(1, value.total)),
  }));
  const learnersRequiringSupport = learnerProgress
    .filter((learner) => learner.requiresSupport)
    .sort(
      (left, right) =>
        left.masteryScore - right.masteryScore || left.displayName.localeCompare(right.displayName),
    );
  return {
    range,
    learnerProgress: learnerProgress.sort((left, right) =>
      left.displayName.localeCompare(right.displayName),
    ),
    gradeDistribution,
    conceptDifficulty,
    commonMistakes: [...mistakeCounts.entries()]
      .map(([category, count]) => ({ category, count }))
      .sort(
        (left, right) => right.count - left.count || left.category.localeCompare(right.category),
      ),
    assessmentPerformance,
    questionDiscrimination,
    learnersRequiringSupport,
    completionRates,
  };
}

function calculateDailyMasteryScore(
  mastery: readonly AnalyticsMastery[],
  snapshots: readonly AnalyticsMasterySnapshot[],
  date: string,
): number {
  const scores = snapshots
    .filter((snapshot) => dateKey(snapshot.createdAt) === date)
    .map((snapshot) => snapshot.score);
  return round(scores.length ? mean(scores) : masteryAverage(mastery));
}

export function withDailyMasteryScores(
  daily: readonly LearnerDailyMetric[],
  mastery: readonly AnalyticsMastery[],
  snapshots: readonly AnalyticsMasterySnapshot[],
): readonly LearnerDailyMetric[] {
  return daily.map((metric) => ({
    ...metric,
    masteryScore: calculateDailyMasteryScore(mastery, snapshots, metric.date),
  }));
}

export function subjectIdsForMastery(
  mastery: readonly AnalyticsMastery[],
  subjectId: string,
): readonly string[] {
  return unique(
    mastery.filter((item) => item.subjectId === subjectId).map((item) => item.conceptId),
  );
}

export { addDays, dateKey, inRange, round };
