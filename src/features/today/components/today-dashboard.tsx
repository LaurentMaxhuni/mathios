import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Circle,
  Clock3,
  Flame,
  Lightbulb,
  PlayCircle,
  Sparkles,
  Target,
  Trophy,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import type { TodayActivity, TodayDashboardData, TodaySourceMission } from "@/domain/today/types";
import { SubjectChooser } from "@/features/today/components/subject-chooser";

function ActivityIcon({ kind }: { kind: TodayActivity["kind"] }) {
  if (kind === "resume") return <BookOpen className="h-5 w-5" aria-hidden="true" />;
  if (kind === "review") return <Lightbulb className="h-5 w-5" aria-hidden="true" />;
  if (kind === "practice") return <Target className="h-5 w-5" aria-hidden="true" />;
  return <Sparkles className="h-5 w-5" aria-hidden="true" />;
}

function activityLabel(kind: TodayActivity["kind"]) {
  if (kind === "resume") return "Continue your mission";
  if (kind === "review") return "Strengthen a skill";
  if (kind === "practice") return "Practice round";
  return "New lesson mission";
}

function activityReward(kind: TodayActivity["kind"]) {
  return kind === "practice" || kind === "review" ? "5 XP" : "20 XP";
}

function MissionAction({
  activity,
  primary = false,
  position,
}: {
  activity: TodayActivity;
  primary?: boolean;
  position: number;
}) {
  return (
    <li className={primary ? "daily-route-step is-current" : "daily-route-step"}>
      <span className="daily-route-rail" aria-hidden="true" />
      <span
        className="daily-route-node"
        aria-label={primary ? "Current mission" : `Step ${position}`}
      >
        {primary ? <PlayCircle className="h-5 w-5 fill-current" aria-hidden="true" /> : position}
      </span>
      <article
        className={
          primary
            ? "relative overflow-hidden rounded-3xl border border-accent/35 bg-accent/[0.07] p-5 shadow-sm sm:p-6"
            : "rounded-2xl border bg-card p-4 transition duration-200 hover:-translate-y-0.5 hover:border-accent/45 hover:shadow-sm"
        }
      >
        {primary ? (
          <div
            className="pointer-events-none absolute -right-12 -top-14 h-44 w-44 rounded-full bg-accent/15 blur-3xl"
            aria-hidden="true"
          />
        ) : null}
        <div className="relative flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <span
              className={
                primary
                  ? "grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-accent text-accent-foreground shadow-sm"
                  : "grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-muted text-accent"
              }
            >
              <ActivityIcon kind={activity.kind} />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-accent">
                {activityLabel(activity.kind)}
              </p>
              <h2 className="mt-1 text-lg font-semibold tracking-tight sm:text-xl">
                {activity.title}
              </h2>
            </div>
          </div>
          <Badge variant={primary ? "success" : "outline"} className="shrink-0">
            {activity.estimatedMinutes} min
          </Badge>
        </div>
        <p className="relative mt-4 max-w-2xl text-sm leading-6 text-muted-foreground">
          {activity.description}
        </p>
        <div className="relative mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-border/70 pt-4">
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Zap className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
            {activityReward(activity.kind)} when you finish
          </span>
          <Link
            href={activity.href as never}
            className={buttonVariants({
              variant: primary ? "default" : "outline",
              size: "sm",
              className: "group gap-2",
            })}
            aria-label={`${primary ? "Start" : "Open"}: ${activity.title}`}
          >
            {primary ? "Start mission" : "Open"}
            <ArrowRight
              className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
              aria-hidden="true"
            />
          </Link>
        </div>
      </article>
    </li>
  );
}

function MissionPack({ mission, index }: { mission: TodaySourceMission; index: number }) {
  const coreProgress = mission.coreMissionCount
    ? Math.round((mission.completedCoreMissionCount / mission.coreMissionCount) * 100)
    : 0;
  const isComplete = !mission.nextMission;
  const nextHref = mission.nextMission ? `/lessons/${mission.nextMission.id}` : mission.href;

  return (
    <article className="group flex h-full flex-col rounded-3xl border bg-card p-5 transition duration-200 hover:-translate-y-1 hover:border-accent/45 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-muted font-mono text-sm font-semibold text-accent">
          {String(index + 1).padStart(2, "0")}
        </span>
        <Badge variant={isComplete ? "success" : "outline"}>
          {isComplete
            ? "Core route done"
            : `${mission.completedMissionCount}/${mission.totalMissionCount} complete`}
        </Badge>
      </div>
      <p className="mt-5 text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">
        Lesson pack
      </p>
      <h3 className="mt-2 text-xl font-semibold tracking-tight text-balance">
        {mission.courseTitle}
      </h3>
      <p className="mt-3 line-clamp-3 text-sm leading-6 text-muted-foreground">
        {mission.nextMission?.summary ?? "You have completed every mission in this lesson pack."}
      </p>
      <div className="mt-6">
        <div className="flex items-center justify-between gap-3 text-xs font-medium text-muted-foreground">
          <span>Core route</span>
          <span>
            {mission.completedCoreMissionCount}/{mission.coreMissionCount} missions
          </span>
        </div>
        <div
          className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-label={`${mission.courseTitle} core mission progress`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={coreProgress}
        >
          <div
            className="h-full rounded-full bg-accent transition-all"
            style={{ width: `${coreProgress}%` }}
          />
        </div>
      </div>
      <div className="mt-5 flex items-center justify-between gap-3 border-t pt-4">
        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
          {mission.nextMission
            ? `${mission.nextMission.estimatedMinutes} min next`
            : "Ready to review"}
        </span>
        <Link
          href={nextHref as never}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent transition group-hover:gap-2 hover:underline"
        >
          {mission.nextMission ? "Play next" : "View pack"}
          {isComplete ? (
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
          ) : (
            <PlayCircle className="h-4 w-4" aria-hidden="true" />
          )}
        </Link>
      </div>
    </article>
  );
}

function EmptyMissionDeck() {
  return (
    <div className="rounded-3xl border border-dashed bg-muted/25 p-7 sm:p-9">
      <BookOpen className="h-7 w-7 text-accent" aria-hidden="true" />
      <h3 className="mt-4 text-xl font-semibold tracking-tight">Pick a lesson pack to begin</h3>
      <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
        Your library is organized into short lessons and quick checks. You learn in the app; there
        is no PDF reading route to complete.
      </p>
      <Link href="/courses" className={buttonVariants({ variant: "outline", className: "mt-5" })}>
        Explore lesson packs <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </Link>
    </div>
  );
}

export function TodayDashboard({ data }: { data: TodayDashboardData }) {
  const goalProgress = Math.min(
    100,
    Math.round((data.studiedMinutesToday / data.dailyGoalMinutes) * 100),
  );
  const remainingMinutes = Math.max(0, data.dailyGoalMinutes - data.studiedMinutesToday);
  const pointsIntoMilestone = data.learningPoints % 100;
  const nextMilestonePoints = pointsIntoMilestone === 0 ? 100 : 100 - pointsIntoMilestone;
  const primaryActivity = data.primaryActivity;

  return (
    <div className="mx-auto w-full max-w-[1280px] px-4 py-5 sm:px-6 sm:py-7 lg:px-10 lg:py-10">
      <header className="mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="eyebrow">Mission control</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {data.activeSubject
              ? `Your ${data.activeSubject.name} learning route`
              : "Choose a subject to begin"}
          </p>
        </div>
        <SubjectChooser subjects={data.subjects} activeSubjectId={data.activeSubject?.id} />
      </header>

      <section className="relative overflow-hidden rounded-[2rem] border bg-primary px-5 py-6 text-primary-foreground shadow-soft sm:px-8 sm:py-8">
        <div
          className="pointer-events-none absolute -right-24 -top-32 h-80 w-80 rounded-full bg-accent/20 blur-3xl"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute bottom-0 left-1/2 h-px w-full -translate-x-1/2 bg-gradient-to-r from-transparent via-accent/60 to-transparent"
          aria-hidden="true"
        />
        <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1fr)_13rem] lg:items-end">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-primary-foreground/75">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.16em]">
                <Sparkles className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
                Today&apos;s quest
              </span>
              {data.studyStreak > 0 ? (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-primary-foreground/70">
                  <Flame className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
                  {data.studyStreak}-day streak
                </span>
              ) : null}
            </div>
            <h1 className="mt-4 max-w-3xl text-balance text-3xl font-semibold tracking-tight sm:text-5xl">
              {primaryActivity
                ? `One clear move: ${primaryActivity.title}`
                : data.needsSubjectChoice
                  ? "Choose your first learning route."
                  : "Your next mission is ready."}
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-primary-foreground/75 sm:text-base sm:leading-7">
              {primaryActivity
                ? `${primaryActivity.reason}. Finish the focused step, earn progress, and see what unlocks next.`
                : "Short lessons, useful feedback, and visible progress. No reading a long source document to get started."}
            </p>
            {primaryActivity ? (
              <Link
                href={primaryActivity.href as never}
                className={buttonVariants({
                  className:
                    "mt-6 gap-2 bg-accent text-accent-foreground shadow-sm hover:bg-accent/90 focus-visible:ring-accent",
                })}
              >
                Start {primaryActivity.estimatedMinutes}-minute mission
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            ) : data.needsSubjectChoice ? (
              <p className="mt-6 text-sm font-medium text-accent">
                Choose a subject above to create your route.
              </p>
            ) : null}
          </div>

          <div className="justify-self-start lg:justify-self-end">
            <div
              className="grid h-36 w-36 place-items-center rounded-full p-2"
              style={{
                background: `conic-gradient(hsl(var(--accent)) ${goalProgress * 3.6}deg, hsl(var(--primary-foreground) / 0.16) 0deg)`,
              }}
              aria-label={`${goalProgress}% of daily goal complete`}
            >
              <div className="grid h-full w-full place-items-center rounded-full bg-primary text-center shadow-inner">
                <span className="font-mono text-2xl font-semibold tabular-nums">
                  {goalProgress}%
                </span>
                <span className="mt-0.5 text-[0.68rem] font-medium uppercase tracking-[0.13em] text-primary-foreground/60">
                  quest done
                </span>
              </div>
            </div>
            <p className="mt-3 max-w-36 text-center text-xs leading-5 text-primary-foreground/65">
              {data.dailyPlanCompleted
                ? "Today’s quest is complete. Keep going if you want to."
                : remainingMinutes
                  ? `${remainingMinutes} minutes to today’s target.`
                  : "Daily target reached."}
            </p>
          </div>
        </div>
      </section>

      <section
        className="mt-4 grid gap-3 sm:grid-cols-3"
        aria-label="Learning rewards and progress"
      >
        <div className="flex items-center gap-3 rounded-2xl border bg-card px-4 py-3.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-accent/10 text-accent">
            <Clock3 className="h-4 w-4" aria-hidden="true" />
          </span>
          <div>
            <p className="text-xs text-muted-foreground">Quest time</p>
            <p className="font-semibold tabular-nums">
              {data.studiedMinutesToday}/{data.dailyGoalMinutes} min
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border bg-card px-4 py-3.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-accent/10 text-accent">
            <Flame className="h-4 w-4" aria-hidden="true" />
          </span>
          <div>
            <p className="text-xs text-muted-foreground">Consistency</p>
            <p className="font-semibold">
              {data.studyStreak ? `${data.studyStreak}-day streak` : "Start a streak today"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border bg-card px-4 py-3.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-accent/10 text-accent">
            <Trophy className="h-4 w-4" aria-hidden="true" />
          </span>
          <div>
            <p className="text-xs text-muted-foreground">Learning XP</p>
            <p className="font-semibold tabular-nums">{data.learningPoints} XP</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {nextMilestonePoints} XP to your next marker
            </p>
          </div>
        </div>
      </section>

      <div className="mt-9 grid gap-9 xl:grid-cols-[minmax(0,1fr)_19rem]">
        <main>
          <section aria-labelledby="next-moves-heading">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="eyebrow">Your route</p>
                <h2 id="next-moves-heading" className="mt-2 text-2xl font-semibold tracking-tight">
                  Do this next
                </h2>
              </div>
              <span className="text-sm text-muted-foreground">One focused step at a time</span>
            </div>
            {data.needsSubjectChoice ? (
              <div className="mt-4 rounded-3xl border border-dashed bg-muted/20 p-7 text-center">
                <Target className="mx-auto h-7 w-7 text-accent" aria-hidden="true" />
                <h3 className="mt-3 text-lg font-semibold">Choose a subject to build a route</h3>
                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                  We will line up short lessons, a quick check, and the next visible reward.
                </p>
              </div>
            ) : data.activities.length ? (
              <ol className="daily-route mt-4">
                {data.activities.slice(0, 3).map((activity, index) => (
                  <MissionAction
                    key={activity.id}
                    activity={activity}
                    primary={index === 0}
                    position={index + 1}
                  />
                ))}
              </ol>
            ) : (
              <div className="mt-4 rounded-3xl border border-dashed bg-muted/20 p-7 text-center">
                <CheckCircle2 className="mx-auto h-7 w-7 text-accent" aria-hidden="true" />
                <h3 className="mt-3 text-lg font-semibold">Your route is clear for now</h3>
                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                  Choose another lesson pack below whenever you want a new challenge.
                </p>
              </div>
            )}
          </section>

          <section className="mt-10" aria-labelledby="mission-library-heading">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="eyebrow">Your lesson library</p>
                <h2
                  id="mission-library-heading"
                  className="mt-2 text-2xl font-semibold tracking-tight"
                >
                  Source material, rebuilt as missions
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                  Learn the core idea in a short lesson, answer a quick check, and choose deeper
                  work only when you want it.
                </p>
              </div>
              <Link
                href="/courses"
                className="inline-flex items-center gap-1 text-sm font-semibold text-accent hover:underline"
              >
                Browse all packs <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
            {data.sourceMissions.length ? (
              <div className="mt-5 grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
                {data.sourceMissions.map((mission, index) => (
                  <MissionPack key={mission.courseId} mission={mission} index={index} />
                ))}
              </div>
            ) : (
              <div className="mt-5">
                <EmptyMissionDeck />
              </div>
            )}
          </section>
        </main>

        <aside className="space-y-4 xl:pt-1">
          <section
            className="rounded-3xl border bg-muted/30 p-5"
            aria-labelledby="how-it-works-heading"
          >
            <p className="eyebrow">How a mission works</p>
            <h2 id="how-it-works-heading" className="mt-2 text-lg font-semibold tracking-tight">
              Learn. Check. Unlock.
            </h2>
            <ol className="mt-5 space-y-4">
              {[
                "Read the guided idea, not a long document.",
                "Answer one quick check and get feedback.",
                "Finish the mission to earn XP and reveal your next step.",
              ].map((step, index) => (
                <li key={step} className="flex gap-3 text-sm leading-6 text-muted-foreground">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border bg-background text-xs font-semibold text-accent">
                    {index + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </section>

          <section className="rounded-3xl border bg-card p-5" aria-labelledby="momentum-heading">
            <div className="flex items-center gap-2 text-accent">
              <Circle className="h-4 w-4 fill-accent/20" aria-hidden="true" />
              <p className="text-xs font-semibold uppercase tracking-[0.14em]">Momentum</p>
            </div>
            <h2 id="momentum-heading" className="mt-3 text-lg font-semibold tracking-tight">
              {data.dailyPlanCompleted ? "You finished today’s quest." : "Small sessions count."}
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {data.dailyPlanCompleted
                ? "Your next mission is ready whenever you are; there is no penalty for stopping here."
                : "A single completed mission moves the goal ring, your streak, and your learning XP."}
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}
