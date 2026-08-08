import type { AnalyticsSubject } from "@/domain/analytics/types";

export const TODAY_ACTIVITY_KINDS = ["resume", "practice", "review", "next-lesson"] as const;
export type TodayActivityKind = (typeof TODAY_ACTIVITY_KINDS)[number];

export interface TodayActivity {
  id: string;
  kind: TodayActivityKind;
  title: string;
  description: string;
  href: string;
  subjectId: string;
  subjectName: string;
  estimatedMinutes: number;
  reason: string;
  completed: boolean;
  resumeBlockId?: string | null;
}

export interface TodayDashboardData {
  profile: { id: string; displayName: string };
  activeSubject: AnalyticsSubject | null;
  subjects: readonly (AnalyticsSubject & { isActive: boolean })[];
  activities: readonly TodayActivity[];
  primaryActivity: TodayActivity | null;
  dailyGoalMinutes: number;
  studiedMinutesToday: number;
  studyStreak: number;
  learningPoints: number;
  dailyPlanCompleted: boolean;
  needsSubjectChoice: boolean;
}
