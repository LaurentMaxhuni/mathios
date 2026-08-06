import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  CheckCircle2,
  Clock3,
  Flame,
  GraduationCap,
  Lightbulb,
  NotebookPen,
  Route,
  Target,
  TrendingUp,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type {
  LearnerAnalyticsData,
  LearnerDashboardData,
  TeacherAnalyticsData,
} from "@/domain/analytics/types";

function percent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function duration(seconds: number): string {
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder ? `${hours}h ${remainder}m` : `${hours}h`;
}

function MetricCard({
  label,
  value,
  detail,
  icon: Icon,
}: {
  label: string;
  value: string;
  detail: string;
  icon: typeof Flame;
}) {
  return (
    <Card>
      <CardContent className="flex items-start justify-between gap-3 pt-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            {label}
          </p>
          <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
          <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
        </div>
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-accent/10 text-accent">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
      </CardContent>
    </Card>
  );
}

function ProgressBar({
  value,
  className = "bg-accent",
  label = "Progress",
}: {
  value: number;
  className?: string;
  label?: string;
}) {
  const percentage = Math.round(Math.max(0, Math.min(1, value)) * 100);
  return (
    <div
      className="h-2 overflow-hidden rounded-full bg-muted"
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percentage}
    >
      <div className={`h-full rounded-full ${className}`} style={{ width: `${percentage}%` }} />
    </div>
  );
}

function EmptyList({ children }: { children: string }) {
  return (
    <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">{children}</p>
  );
}

function ConceptList({
  concepts,
  empty,
  showChange = false,
}: {
  concepts: LearnerAnalyticsData["weakConcepts"];
  empty: string;
  showChange?: boolean;
}) {
  if (!concepts.length) return <EmptyList>{empty}</EmptyList>;
  return (
    <div className="space-y-3">
      {concepts.map((concept) => (
        <Link
          key={concept.conceptId}
          href={`/mastery/concepts/${concept.conceptId}`}
          className="block rounded-lg border p-3 transition hover:border-accent/50 hover:bg-accent/5"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{concept.conceptName}</p>
              <p className="mt-1 text-xs text-muted-foreground">{concept.subjectName}</p>
            </div>
            <Badge variant={concept.score >= 0.7 ? "success" : "warning"}>
              {percent(concept.score)}
            </Badge>
          </div>
          <div className="mt-3">
            <ProgressBar value={concept.score} />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {showChange && concept.change > 0 ? `Improved ${percent(concept.change)} · ` : ""}
            {concept.reason}
          </p>
        </Link>
      ))}
    </div>
  );
}

export function LearnerDashboard({ data }: { data: LearnerDashboardData }) {
  return (
    <div className="mt-8 space-y-8" aria-labelledby="learning-dashboard-heading">
      <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
            Your learning pulse
          </p>
          <h2
            id="learning-dashboard-heading"
            className="mt-2 text-2xl font-semibold tracking-tight"
          >
            Learning dashboard
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            A local view of what you are learning, where to go next, and the concepts worth another
            look.
          </p>
        </div>
        <Link
          href={"/analytics" as never}
          className="inline-flex items-center gap-2 text-sm font-medium text-accent hover:underline"
        >
          Open detailed analytics <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Learning summary">
        <MetricCard
          label="Study streak"
          value={`${data.studyStreak} days`}
          detail="Keep the rhythm going"
          icon={Flame}
        />
        <MetricCard
          label="Time studied"
          value={duration(data.timeStudiedSeconds)}
          detail="In the current analytics window"
          icon={Clock3}
        />
        <MetricCard
          label="Weekly progress"
          value={`${data.weeklyStudyProgress.studiedMinutes} min`}
          detail={`Target ${data.weeklyStudyProgress.targetMinutes} min`}
          icon={Target}
        />
        <MetricCard
          label="Mastery focus"
          value={`${data.weakConcepts.length} concepts`}
          detail="Ready for deliberate practice"
          icon={Lightbulb}
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-accent" aria-hidden="true" />
              <CardTitle>Continue learning</CardTitle>
            </div>
            <CardDescription>
              {data.currentGradeName ?? "Choose a grade"}
              {data.currentCurriculumName ? ` · ${data.currentCurriculumName}` : ""}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {data.currentLesson ? (
              <div className="rounded-xl border bg-accent/5 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">
                  Current lesson
                </p>
                <h3 className="mt-2 text-lg font-semibold">{data.currentLesson.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {data.currentLesson.courseTitle} · {data.currentLesson.subjectName}
                </p>
                <div className="mt-4">
                  <ProgressBar value={data.currentLesson.completionPercentage / 100} />
                </div>
                <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                  <span>{data.currentLesson.completionPercentage}% complete</span>
                  <span>{duration(data.currentLesson.timeSpentSeconds)} spent</span>
                </div>
                <Link
                  href={`/lessons/${data.currentLesson.lessonId}` as never}
                  className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-accent hover:underline"
                >
                  Resume lesson <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>
            ) : (
              <EmptyList>No lesson progress yet. Browse a course to begin.</EmptyList>
            )}
            <div className="mt-4 rounded-xl border p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Recommended next activity
              </p>
              <p className="mt-2 font-medium">
                {data.recommendedNextActivity?.title ?? "Choose a learning activity"}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {data.recommendedNextActivity?.reason ??
                  "Your next step will appear after you start learning."}
              </p>
              {data.recommendedNextActivity ? (
                <Link
                  href={data.recommendedNextActivity.href as never}
                  className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-accent hover:underline"
                >
                  Open recommendation <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-accent" aria-hidden="true" />
              <CardTitle>Weekly study progress</CardTitle>
            </div>
            <CardDescription>Time captured by your local learning activity.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between gap-3">
              <p className="text-3xl font-semibold">
                {data.weeklyStudyProgress.studiedMinutes}
                <span className="ml-1 text-base font-normal text-muted-foreground">min</span>
              </p>
              <Badge variant={data.weeklyStudyProgress.percentage >= 100 ? "success" : "outline"}>
                {data.weeklyStudyProgress.percentage}% of target
              </Badge>
            </div>
            <div className="mt-4">
              <ProgressBar value={data.weeklyStudyProgress.percentage / 100} />
            </div>
            <div className="mt-6 space-y-3">
              {data.activeSubjects.slice(0, 5).map((subject) => (
                <div key={subject.id} className="flex items-center justify-between text-sm">
                  <span>{subject.name}</span>
                  <span className="text-xs text-muted-foreground">{subject.accent}</span>
                </div>
              ))}
              {!data.activeSubjects.length ? (
                <EmptyList>No active subjects have been selected yet.</EmptyList>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-amber-600" aria-hidden="true" />
              <CardTitle>Weak concepts</CardTitle>
            </div>
            <CardDescription>Small, focused practice beats a long review queue.</CardDescription>
          </CardHeader>
          <CardContent>
            <ConceptList concepts={data.weakConcepts} empty="No weak concepts are flagged yet." />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-accent" aria-hidden="true" />
              <CardTitle>Recently mastered</CardTitle>
            </div>
            <CardDescription>
              Concepts that have recently crossed a stable threshold.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ConceptList
              concepts={data.recentlyMasteredConcepts}
              empty="Keep practicing—recent mastery will appear here."
              showChange
            />
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Route className="h-5 w-5 text-accent" aria-hidden="true" />
              <CardTitle>Active roadmaps</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.activeRoadmaps.length ? (
              data.activeRoadmaps.slice(0, 4).map((roadmap) => (
                <div key={roadmap.id}>
                  <div className="flex justify-between gap-3 text-sm">
                    <span className="truncate font-medium">{roadmap.title}</span>
                    <span className="text-xs text-muted-foreground">
                      {roadmap.completedNodes}/{roadmap.totalNodes}
                    </span>
                  </div>
                  <div className="mt-2">
                    <ProgressBar value={roadmap.completedNodes / Math.max(1, roadmap.totalNodes)} />
                  </div>
                </div>
              ))
            ) : (
              <EmptyList>No active roadmap yet.</EmptyList>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-accent" aria-hidden="true" />
              <CardTitle>Upcoming assessments</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.upcomingAssessments.length ? (
              data.upcomingAssessments.slice(0, 4).map((assessment) => (
                <Link
                  key={assessment.id}
                  href={`/assessments/${assessment.id}`}
                  className="block rounded-lg border p-3 hover:border-accent/50"
                >
                  <p className="text-sm font-medium">{assessment.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {assessment.subjectName ?? "General"}
                    {assessment.gradeName ? ` · ${assessment.gradeName}` : ""}
                  </p>
                </Link>
              ))
            ) : (
              <EmptyList>No published assessments yet.</EmptyList>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <NotebookPen className="h-5 w-5 text-accent" aria-hidden="true" />
              <CardTitle>Recent notes & bookmarks</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.recentNotes.length || data.bookmarks.length ? (
              <>
                {data.recentNotes.slice(0, 3).map((note) => (
                  <Link
                    key={note.id}
                    href={`/notes?note=${note.id}`}
                    className="block text-sm font-medium hover:text-accent"
                  >
                    {note.title}
                    <span className="ml-2 text-xs font-normal text-muted-foreground">note</span>
                  </Link>
                ))}
                {data.bookmarks.slice(0, 3).map((bookmark) => (
                  <Link
                    key={bookmark.id}
                    href="/notes"
                    className="block text-sm font-medium hover:text-accent"
                  >
                    {bookmark.title}
                    <span className="ml-2 text-xs font-normal text-muted-foreground">bookmark</span>
                  </Link>
                ))}
              </>
            ) : (
              <EmptyList>Your saved notes and bookmarks will show here.</EmptyList>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

export function LearnerAnalyticsWorkspace({ data }: { data: LearnerAnalyticsData }) {
  const maxStudyTime = Math.max(1, ...data.daily.map((item) => item.timeStudiedSeconds));
  return (
    <div className="space-y-8">
      <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
            Progress over time
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Learning analytics</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {data.range.from} through {data.range.to} · calculated from local learning activity.
          </p>
        </div>
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-medium text-accent hover:underline"
        >
          Back to dashboard <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </section>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Time studied"
          value={duration(data.summary.timeStudiedSeconds)}
          detail={`${data.summary.studyDays} active days`}
          icon={Clock3}
        />
        <MetricCard
          label="Questions attempted"
          value={`${data.summary.questionsAttempted}`}
          detail={`${percent(data.summary.accuracy)} accuracy`}
          icon={Target}
        />
        <MetricCard
          label="Study consistency"
          value={percent(data.summary.consistencyScore)}
          detail={`${data.summary.studyStreak}-day streak`}
          icon={Flame}
        />
        <MetricCard
          label="Assessment average"
          value={percent(data.summary.averageAssessmentScore)}
          detail={`${data.summary.assessmentCount} completed`}
          icon={GraduationCap}
        />
      </section>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-accent" aria-hidden="true" />
            <CardTitle>Daily study progress</CardTitle>
          </div>
          <CardDescription>Study time, completed lessons, and question accuracy.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex h-48 items-end gap-1 overflow-hidden">
            {data.daily.map((item) => (
              <div
                key={item.date}
                className="group flex min-w-0 flex-1 flex-col items-center justify-end gap-2"
                title={`${item.date}: ${duration(item.timeStudiedSeconds)}`}
              >
                <div
                  className="w-full rounded-t bg-accent/70 transition group-hover:bg-accent"
                  style={{
                    height: `${Math.max(item.timeStudiedSeconds ? 5 : 1, (item.timeStudiedSeconds / maxStudyTime) * 100)}%`,
                  }}
                />
                <span className="hidden truncate text-[0.6rem] text-muted-foreground first-letter:sm:block">
                  {item.date.slice(5)}
                </span>
              </div>
            ))}
          </div>
          <ul className="sr-only" aria-label="Daily study progress values">
            {data.daily.map((item) => (
              <li key={`daily-text-${item.date}`}>
                {item.date}: {duration(item.timeStudiedSeconds)}, {item.lessonsCompleted} lessons
                completed, {item.questionsAttempted} questions attempted, {percent(item.accuracy)}
                accuracy.
              </li>
            ))}
          </ul>
          <div className="mt-4 flex justify-between text-xs text-muted-foreground">
            <span>{data.range.from}</span>
            <span>{data.range.to}</span>
          </div>
        </CardContent>
      </Card>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Mastery by subject</CardTitle>
            <CardDescription>Average score and assessed concepts.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.subjectMastery.length ? (
              data.subjectMastery.map((subject) => (
                <div key={subject.subjectId}>
                  <div className="flex justify-between gap-3 text-sm">
                    <span className="font-medium">{subject.subjectName}</span>
                    <span className="text-muted-foreground">{percent(subject.averageScore)}</span>
                  </div>
                  <div className="mt-2">
                    <ProgressBar value={subject.averageScore} />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {subject.masteredConcepts} mastered · {subject.assessedConcepts}/
                    {subject.conceptCount} assessed
                  </p>
                </div>
              ))
            ) : (
              <EmptyList>No subject mastery data yet.</EmptyList>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Mastery by grade</CardTitle>
            <CardDescription>Concept coverage across the grade structure.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.gradeMastery.filter((grade) => grade.conceptCount).length ? (
              data.gradeMastery
                .filter((grade) => grade.conceptCount)
                .map((grade) => (
                  <div key={grade.gradeId}>
                    <div className="flex justify-between gap-3 text-sm">
                      <span className="font-medium">{grade.gradeName}</span>
                      <span className="text-muted-foreground">{percent(grade.averageScore)}</span>
                    </div>
                    <div className="mt-2">
                      <ProgressBar value={grade.averageScore} className="bg-subject-astronomy" />
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {grade.masteredConcepts} mastered · {grade.assessedConcepts}/
                      {grade.conceptCount} assessed
                    </p>
                  </div>
                ))
            ) : (
              <EmptyList>No grade mastery data yet.</EmptyList>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Weakest concepts</CardTitle>
            <CardDescription>Prioritized by current score and evidence.</CardDescription>
          </CardHeader>
          <CardContent>
            <ConceptList concepts={data.weakConcepts} empty="No weak concepts are flagged yet." />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Most improved</CardTitle>
            <CardDescription>Positive movement in recent mastery snapshots.</CardDescription>
          </CardHeader>
          <CardContent>
            <ConceptList
              concepts={data.mostImprovedConcepts}
              empty="More practice history is needed to show improvement."
              showChange
            />
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Assessment scores</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.assessmentScores.length ? (
              data.assessmentScores.map((assessment) => (
                <div
                  key={`${assessment.assessmentId}-${assessment.submittedAt}`}
                  className="flex items-center justify-between gap-3 border-b pb-3 last:border-0 last:pb-0"
                >
                  <span className="truncate text-sm font-medium">{assessment.title}</span>
                  <Badge variant={assessment.passed ? "success" : "warning"}>
                    {percent(assessment.percentage)}
                  </Badge>
                </div>
              ))
            ) : (
              <EmptyList>No assessment submissions in this window.</EmptyList>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Question behavior</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span>Hints used</span>
              <span className="font-medium">{data.summary.hintsUsed}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Total attempts</span>
              <span className="font-medium">{data.summary.attemptCount}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Average response</span>
              <span className="font-medium">
                {data.summary.averageResponseTimeMs
                  ? `${Math.round(data.summary.averageResponseTimeMs / 1000)}s`
                  : "—"}
              </span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Common mistakes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.mistakeCategories.length ? (
              data.mistakeCategories.slice(0, 6).map((mistake) => (
                <div key={mistake.category} className="flex justify-between gap-3 text-sm">
                  <span className="truncate">{mistake.category}</span>
                  <Badge variant="outline">{mistake.count}</Badge>
                </div>
              ))
            ) : (
              <EmptyList>No incorrect-answer patterns yet.</EmptyList>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

export function TeacherAnalyticsWorkspace({ data }: { data: TeacherAnalyticsData }) {
  return (
    <div className="space-y-8">
      <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
            Instructional view
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Teacher analytics</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {data.range.from} through {data.range.to} · local learner progress and content signals.
          </p>
        </div>
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-medium text-accent hover:underline"
        >
          Back to overview <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </section>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Learners"
          value={`${data.learnerProgress.length}`}
          detail={`${data.learnersRequiringSupport.length} require support`}
          icon={Users}
        />
        <MetricCard
          label="Difficult concepts"
          value={`${data.conceptDifficulty.length}`}
          detail="Sorted by lowest average score"
          icon={Lightbulb}
        />
        <MetricCard
          label="Assessment groups"
          value={`${data.assessmentPerformance.length}`}
          detail="With completed attempts"
          icon={GraduationCap}
        />
        <MetricCard
          label="Question signals"
          value={`${data.questionDiscrimination.length}`}
          detail="Discrimination observations"
          icon={BarChart3}
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
        <Card>
          <CardHeader>
            <CardTitle>Learner progress</CardTitle>
            <CardDescription>
              Completion, practice accuracy, mastery, and support flags.
            </CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <caption className="sr-only">Learner progress and support status</caption>
              <thead className="border-b text-xs uppercase tracking-[0.12em] text-muted-foreground">
                <tr>
                  <th scope="col" className="pb-3 pr-3">
                    Learner
                  </th>
                  <th scope="col" className="pb-3 pr-3">
                    Grade
                  </th>
                  <th scope="col" className="pb-3 pr-3">
                    Lessons
                  </th>
                  <th scope="col" className="pb-3 pr-3">
                    Accuracy
                  </th>
                  <th scope="col" className="pb-3 pr-3">
                    Mastery
                  </th>
                  <th scope="col" className="pb-3">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.learnerProgress.map((learner) => (
                  <tr key={learner.profileId} className="border-b last:border-0">
                    <td className="py-3 pr-3 font-medium">{learner.displayName}</td>
                    <td className="py-3 pr-3 text-muted-foreground">
                      {learner.currentGrade ?? "—"}
                    </td>
                    <td className="py-3 pr-3">{percent(learner.lessonCompletionRate)}</td>
                    <td className="py-3 pr-3">{percent(learner.accuracy)}</td>
                    <td className="py-3 pr-3">{percent(learner.masteryScore)}</td>
                    <td className="py-3">
                      {learner.requiresSupport ? (
                        <Badge variant="warning">Support</Badge>
                      ) : (
                        <Badge variant="success">On track</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!data.learnerProgress.length ? (
              <EmptyList>No learner profiles have activity yet.</EmptyList>
            ) : null}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Learners requiring support</CardTitle>
            <CardDescription>
              Signals combine weak concepts, low practice accuracy, and low mastery.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.learnersRequiringSupport.length ? (
              data.learnersRequiringSupport.map((learner) => (
                <div key={learner.profileId} className="rounded-lg border p-3">
                  <div className="flex justify-between gap-3">
                    <span className="font-medium">{learner.displayName}</span>
                    <Badge variant="warning">{percent(learner.masteryScore)}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {learner.weakConcepts} weak concepts · {percent(learner.accuracy)} accuracy
                  </p>
                </div>
              ))
            ) : (
              <EmptyList>No support flags in this window.</EmptyList>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Grade distribution</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.gradeDistribution.length ? (
              data.gradeDistribution.map((grade) => (
                <div key={grade.gradeId}>
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{grade.gradeName}</span>
                    <span className="text-muted-foreground">
                      {grade.learnerCount} learners · {percent(grade.averageMastery)} mastery
                    </span>
                  </div>
                  <div className="mt-2">
                    <ProgressBar value={grade.averageMastery} />
                  </div>
                </div>
              ))
            ) : (
              <EmptyList>No grade distribution yet.</EmptyList>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Completion rates</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.completionRates.length ? (
              data.completionRates.map((rate) => (
                <div key={rate.subjectId}>
                  <div className="flex justify-between text-sm">
                    <span>{rate.subjectName}</span>
                    <span className="font-medium">{percent(rate.completionRate)}</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {rate.completedLessons}/{rate.totalLessons} lessons completed
                  </p>
                </div>
              ))
            ) : (
              <EmptyList>No completion data yet.</EmptyList>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Concept difficulty</CardTitle>
            <CardDescription>Concepts with the lowest observed scores.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.conceptDifficulty.length ? (
              data.conceptDifficulty.slice(0, 10).map((concept) => (
                <div
                  key={concept.conceptId}
                  className="flex items-center justify-between gap-3 border-b pb-3 last:border-0 last:pb-0"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{concept.conceptName}</p>
                    <p className="text-xs text-muted-foreground">
                      {concept.subjectName} · {concept.attempts} attempts
                    </p>
                  </div>
                  <Badge variant="warning">{percent(concept.averageScore)}</Badge>
                </div>
              ))
            ) : (
              <EmptyList>No concept difficulty data yet.</EmptyList>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Common mistakes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.commonMistakes.length ? (
              data.commonMistakes.slice(0, 10).map((mistake) => (
                <div key={mistake.category} className="flex justify-between gap-3 text-sm">
                  <span className="truncate">{mistake.category}</span>
                  <Badge variant="outline">{mistake.count}</Badge>
                </div>
              ))
            ) : (
              <EmptyList>No common mistakes have been recorded.</EmptyList>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Assessment performance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.assessmentPerformance.length ? (
              data.assessmentPerformance.slice(0, 10).map((assessment) => (
                <div
                  key={assessment.assessmentId}
                  className="flex items-center justify-between gap-3 border-b pb-3 last:border-0 last:pb-0"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{assessment.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {assessment.attempts} attempts · {percent(assessment.passRate)} pass rate
                    </p>
                  </div>
                  <Badge variant={assessment.averageScore >= 0.6 ? "success" : "warning"}>
                    {percent(assessment.averageScore)}
                  </Badge>
                </div>
              ))
            ) : (
              <EmptyList>No assessment performance data yet.</EmptyList>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Question discrimination</CardTitle>
            <CardDescription>Low or negative values are candidates for review.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.questionDiscrimination.length ? (
              data.questionDiscrimination.slice(0, 10).map((question) => (
                <div
                  key={question.questionId}
                  className="flex items-center justify-between gap-3 border-b pb-3 last:border-0 last:pb-0"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{question.questionTitle}</p>
                    <p className="text-xs text-muted-foreground">{question.attempts} attempts</p>
                  </div>
                  <Badge variant={question.discriminationIndex >= 0 ? "success" : "warning"}>
                    {question.discriminationIndex.toFixed(2)}
                  </Badge>
                </div>
              ))
            ) : (
              <EmptyList>At least three outcomes are needed for discrimination signals.</EmptyList>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
