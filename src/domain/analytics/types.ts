export const ACTIVITY_EVENT_TYPES = [
  "lesson-view",
  "lesson-completion",
  "question-attempt",
  "assessment-submission",
  "simulation-session",
  "note-creation",
  "study-session-completion",
  "mastery-change",
] as const;
export type ActivityEventType = (typeof ACTIVITY_EVENT_TYPES)[number];

export const LEARNING_SESSION_TYPES = [
  "study",
  "lesson",
  "exercise",
  "assessment",
  "simulation",
  "laboratory",
  "planner",
] as const;
export type LearningSessionType = (typeof LEARNING_SESSION_TYPES)[number];
export type LearningSessionStatus = "active" | "completed" | "abandoned";

export interface AnalyticsDateRange {
  from: string;
  to: string;
}

export interface ActivityEventRecord {
  id: string;
  profileId: string;
  eventType: ActivityEventType;
  resourceType: string | null;
  resourceId: string | null;
  subjectId: string | null;
  gradeId: string | null;
  conceptId: string | null;
  learningSessionId: string | null;
  occurredAt: string;
  durationSeconds: number;
  score: number | null;
  isCorrect: boolean | null;
  hintsUsed: number;
  attemptNumber: number;
  responseTimeMs: number | null;
  dedupeKey: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface ActivityEventInput {
  id: string;
  profileId: string;
  eventType: ActivityEventType;
  resourceType?: string | null;
  resourceId?: string | null;
  subjectId?: string | null;
  gradeId?: string | null;
  conceptId?: string | null;
  learningSessionId?: string | null;
  occurredAt?: string;
  durationSeconds?: number;
  score?: number | null;
  isCorrect?: boolean | null;
  hintsUsed?: number;
  attemptNumber?: number;
  responseTimeMs?: number | null;
  dedupeKey?: string | null;
  metadata?: Record<string, unknown>;
}

export interface LearningSessionRecord {
  id: string;
  profileId: string;
  sessionType: LearningSessionType;
  sourceType: string | null;
  sourceId: string | null;
  status: LearningSessionStatus;
  startedAt: string;
  endedAt: string | null;
  durationSeconds: number;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface LearningSessionInput {
  id: string;
  profileId: string;
  sessionType: LearningSessionType;
  sourceType?: string | null;
  sourceId?: string | null;
  startedAt?: string;
  metadata?: Record<string, unknown>;
}

export interface AnalyticsProfile {
  id: string;
  displayName: string;
  currentGrade: string | null;
  currentCurriculum: string | null;
  currentCurriculumName?: string | null;
  weeklyStudyTargetMinutes?: number | null;
}

export interface AnalyticsSubject {
  id: string;
  name: string;
  slug: string;
  accent: string;
}

export interface AnalyticsGrade {
  id: string;
  name: string;
  sortOrder: number;
}

export interface AnalyticsRoadmap {
  id: string;
  title: string;
  status: string;
  completedNodes: number;
  totalNodes: number;
  updatedAt: string;
}

export interface AnalyticsLessonProgress {
  lessonId: string;
  title: string;
  subjectId: string;
  subjectName: string;
  courseId: string;
  courseTitle: string;
  gradeId: string | null;
  completionPercentage: number;
  completed: boolean;
  timeSpentSeconds: number;
  startedAt: string | null;
  completedAt: string | null;
  lastViewedAt: string | null;
  updatedAt: string;
}

export interface AnalyticsQuestionAttempt {
  id: string;
  profileId: string;
  questionId: string;
  questionTitle: string;
  subjectId: string;
  subjectName: string;
  gradeMinId: string | null;
  gradeMaxId: string | null;
  conceptIds: readonly string[];
  score: number;
  maxScore: number;
  scorePercentage: number;
  isCorrect: boolean;
  answeredAt: string;
  assessmentId: string | null;
  assessmentTitle: string | null;
  attemptNumber: number;
  hintsUsed: number;
  responseTimeMs: number | null;
  mistakeCategory: string | null;
}

export interface AnalyticsAssessmentAttempt {
  id: string;
  assessmentId: string;
  title: string;
  subjectId: string | null;
  subjectName: string | null;
  gradeId: string | null;
  percentage: number;
  passed: boolean | null;
  startedAt: string;
  submittedAt: string | null;
}

export interface AnalyticsMastery {
  conceptId: string;
  conceptName: string;
  subjectId: string;
  subjectName: string;
  gradeMinId: string | null;
  gradeMaxId: string | null;
  state: string;
  score: number;
  confidence: number;
  evidenceCount: number;
  lastPracticedAt: string | null;
  updatedAt: string;
}

export interface AnalyticsMasterySnapshot {
  conceptId: string;
  score: number;
  state: string;
  createdAt: string;
}

export interface AnalyticsPlannerSession {
  id: string;
  scheduledDate: string;
  status: string;
  durationMinutes: number;
  completedAt: string | null;
  itemType: string;
  sourceId: string | null;
  title: string;
  subjectId: string | null;
}

export interface AnalyticsNote {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface AnalyticsBookmark {
  id: string;
  resourceType: string;
  resourceId: string;
  title: string;
  createdAt: string;
}

export interface AnalyticsRecommendation {
  id: string;
  title: string;
  reason: string;
  conceptId: string | null;
}

export interface AnalyticsUpcomingAssessment {
  id: string;
  title: string;
  subjectName: string | null;
  gradeName: string | null;
  passingThreshold: number;
}

export interface AnalyticsSubjectLessonTotal {
  subjectId: string;
  subjectName: string;
  totalLessons: number;
}

export interface LearnerAnalyticsSource {
  profile: AnalyticsProfile;
  subjects: readonly AnalyticsSubject[];
  grades: readonly AnalyticsGrade[];
  events: readonly ActivityEventRecord[];
  learningSessions: readonly LearningSessionRecord[];
  lessonProgress: readonly AnalyticsLessonProgress[];
  questionAttempts: readonly AnalyticsQuestionAttempt[];
  assessmentAttempts: readonly AnalyticsAssessmentAttempt[];
  mastery: readonly AnalyticsMastery[];
  masterySnapshots: readonly AnalyticsMasterySnapshot[];
  plannerSessions: readonly AnalyticsPlannerSession[];
  roadmaps: readonly AnalyticsRoadmap[];
  currentLesson: AnalyticsLessonProgress | null;
  recommendations: readonly AnalyticsRecommendation[];
  upcomingAssessments: readonly AnalyticsUpcomingAssessment[];
  notes: readonly AnalyticsNote[];
  bookmarks: readonly AnalyticsBookmark[];
  subjectLessonTotals: readonly AnalyticsSubjectLessonTotal[];
}

export interface LearnerMetricRecord {
  id: string;
  profileId: string;
  metricDate: string;
  timeStudiedSeconds: number;
  lessonsStarted: number;
  lessonsCompleted: number;
  questionsAttempted: number;
  correctQuestions: number;
  accuracy: number;
  assessmentCount: number;
  averageAssessmentScore: number;
  hintsUsed: number;
  attemptCount: number;
  averageResponseTimeMs: number;
  studyDays: number;
  streakDays: number;
  consistencyScore: number;
  masteryScore: number;
  masteredConcepts: number;
  weakConcepts: number;
  metadata: Record<string, unknown>;
}

export interface ContentMetricRecord {
  id: string;
  resourceType: string;
  resourceId: string;
  metricDate: string;
  subjectId: string | null;
  gradeId: string | null;
  conceptId: string | null;
  attemptCount: number;
  completionCount: number;
  correctCount: number;
  accuracy: number;
  averageResponseTimeMs: number;
  averageAttempts: number;
  hintRate: number;
  discriminationIndex: number;
  supportCount: number;
  metadata: Record<string, unknown>;
}

export interface LearnerAnalyticsSummary {
  timeStudiedSeconds: number;
  lessonsStarted: number;
  lessonsCompleted: number;
  questionsAttempted: number;
  correctQuestions: number;
  accuracy: number;
  assessmentCount: number;
  averageAssessmentScore: number;
  hintsUsed: number;
  attemptCount: number;
  averageResponseTimeMs: number;
  studyDays: number;
  studyStreak: number;
  consistencyScore: number;
  masteryScore: number;
  masteredConcepts: number;
  weakConcepts: number;
}

export interface LearnerDailyMetric {
  date: string;
  timeStudiedSeconds: number;
  lessonsCompleted: number;
  questionsAttempted: number;
  accuracy: number;
  masteryScore: number;
}

export interface SubjectMasteryMetric {
  subjectId: string;
  subjectName: string;
  conceptCount: number;
  assessedConcepts: number;
  masteredConcepts: number;
  averageScore: number;
  averageConfidence: number;
}

export interface GradeMasteryMetric {
  gradeId: string;
  gradeName: string;
  conceptCount: number;
  assessedConcepts: number;
  masteredConcepts: number;
  averageScore: number;
}

export interface ConceptAnalyticsMetric {
  conceptId: string;
  conceptName: string;
  subjectName: string;
  score: number;
  confidence: number;
  change: number;
  evidenceCount: number;
  reason: string;
}

export interface AssessmentScoreMetric {
  assessmentId: string;
  title: string;
  percentage: number;
  passed: boolean | null;
  submittedAt: string | null;
}

export interface LearnerAnalyticsData {
  range: AnalyticsDateRange;
  summary: LearnerAnalyticsSummary;
  daily: readonly LearnerDailyMetric[];
  subjectMastery: readonly SubjectMasteryMetric[];
  gradeMastery: readonly GradeMasteryMetric[];
  weakConcepts: readonly ConceptAnalyticsMetric[];
  mostImprovedConcepts: readonly ConceptAnalyticsMetric[];
  recentlyMasteredConcepts: readonly ConceptAnalyticsMetric[];
  assessmentScores: readonly AssessmentScoreMetric[];
  mistakeCategories: readonly { category: string; count: number }[];
}

export interface LearnerDashboardData {
  profile: AnalyticsProfile;
  currentGradeName: string | null;
  currentCurriculumName: string | null;
  activeSubjects: readonly AnalyticsSubject[];
  activeRoadmaps: readonly AnalyticsRoadmap[];
  currentLesson: AnalyticsLessonProgress | null;
  recommendedNextActivity: {
    title: string;
    reason: string;
    href: string;
  } | null;
  weeklyStudyProgress: {
    targetMinutes: number;
    studiedMinutes: number;
    percentage: number;
  };
  weakConcepts: readonly ConceptAnalyticsMetric[];
  recentlyMasteredConcepts: readonly ConceptAnalyticsMetric[];
  upcomingAssessments: readonly AnalyticsUpcomingAssessment[];
  studyStreak: number;
  timeStudiedSeconds: number;
  recentNotes: readonly AnalyticsNote[];
  bookmarks: readonly AnalyticsBookmark[];
  analytics: LearnerAnalyticsData;
}

export interface TeacherLearnerProgress {
  profileId: string;
  displayName: string;
  currentGrade: string | null;
  timeStudiedSeconds: number;
  lessonsCompleted: number;
  lessonCompletionRate: number;
  questionsAttempted: number;
  accuracy: number;
  masteryScore: number;
  weakConcepts: number;
  studyStreak: number;
  requiresSupport: boolean;
}

export interface TeacherAnalyticsData {
  range: AnalyticsDateRange;
  learnerProgress: readonly TeacherLearnerProgress[];
  gradeDistribution: readonly {
    gradeId: string;
    gradeName: string;
    learnerCount: number;
    averageMastery: number;
  }[];
  conceptDifficulty: readonly {
    conceptId: string;
    conceptName: string;
    subjectName: string;
    averageScore: number;
    attempts: number;
    supportCount: number;
  }[];
  commonMistakes: readonly { category: string; count: number }[];
  assessmentPerformance: readonly {
    assessmentId: string;
    title: string;
    attempts: number;
    averageScore: number;
    passRate: number;
  }[];
  questionDiscrimination: readonly {
    questionId: string;
    questionTitle: string;
    discriminationIndex: number;
    attempts: number;
  }[];
  learnersRequiringSupport: readonly TeacherLearnerProgress[];
  completionRates: readonly {
    subjectId: string;
    subjectName: string;
    completedLessons: number;
    totalLessons: number;
    completionRate: number;
  }[];
}

export interface AnalyticsSnapshotRecord {
  id: string;
  profileId: string;
  snapshotType: "daily" | "weekly" | "range";
  snapshotDate: string;
  metrics: Record<string, unknown>;
  createdAt: string;
}
