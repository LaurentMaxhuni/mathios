import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock3,
  Flame,
  Lightbulb,
  Sparkles,
  Target,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import type { TodayActivity, TodayDashboardData } from "@/domain/today/types";
import { SubjectChooser } from "@/features/today/components/subject-chooser";

function ActivityIcon({ kind }: { kind: TodayActivity["kind"] }) {
  if (kind === "resume") return <BookOpen className="h-5 w-5" aria-hidden="true" />;
  if (kind === "review") return <Lightbulb className="h-5 w-5" aria-hidden="true" />;
  return <Sparkles className="h-5 w-5" aria-hidden="true" />;
}

function ActivityCard({ activity, primary }: { activity: TodayActivity; primary?: boolean }) {
  return (
    <Card className={primary ? "border-accent/45 bg-accent/[0.045]" : ""}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-accent/10 text-accent">
            <ActivityIcon kind={activity.kind} />
          </span>
          <Badge variant={primary ? "success" : "outline"}>{activity.estimatedMinutes} min</Badge>
        </div>
        <CardTitle className="mt-3 text-xl">{activity.title}</CardTitle>
        <CardDescription className="leading-6">{activity.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-xs font-medium text-muted-foreground">{activity.reason}</p>
        <Link
          href={activity.href as never}
          className={buttonVariants({ className: "mt-4 w-full justify-between" })}
          aria-label={`${primary ? "Start" : "Open"}: ${activity.title}`}
        >
          {primary ? "Start today" : "Open activity"}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </CardContent>
    </Card>
  );
}

export function TodayDashboard({ data }: { data: TodayDashboardData }) {
  const goalProgress = Math.min(
    100,
    Math.round((data.studiedMinutesToday / data.dailyGoalMinutes) * 100),
  );
  return (
    <div className="mx-auto w-full max-w-[1280px] px-4 py-7 sm:px-6 lg:px-10 lg:py-10">
      <header className="flex flex-col justify-between gap-5 border-b pb-7 sm:flex-row sm:items-end">
        <div>
          <p className="eyebrow">Today</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-5xl">
            A small step in {data.activeSubject?.name ?? "your learning"}.
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
            A focused 10–15 minute session, chosen from what will help most next.
          </p>
        </div>
        <SubjectChooser subjects={data.subjects} activeSubjectId={data.activeSubject?.id} />
      </header>

      <section className="mt-7 grid gap-3 sm:grid-cols-3" aria-label="Today summary">
        <Card>
          <CardContent className="flex items-center gap-3 pt-5">
            <Clock3 className="h-5 w-5 text-accent" aria-hidden="true" />
            <div>
              <p className="text-xs text-muted-foreground">Daily goal</p>
              <p className="font-semibold">
                {data.studiedMinutesToday}/{data.dailyGoalMinutes} min
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-5">
            <Flame className="h-5 w-5 text-accent" aria-hidden="true" />
            <div>
              <p className="text-xs text-muted-foreground">Streak</p>
              <p className="font-semibold">
                {data.studyStreak} day{data.studyStreak === 1 ? "" : "s"}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-5">
            <Target className="h-5 w-5 text-accent" aria-hidden="true" />
            <div>
              <p className="text-xs text-muted-foreground">Learning points</p>
              <p className="font-semibold">{data.learningPoints}</p>
            </div>
          </CardContent>
        </Card>
      </section>

      <section
        className="mt-7 grid gap-7 lg:grid-cols-[minmax(0,1fr)_18rem]"
        aria-labelledby="today-plan-heading"
      >
        <div>
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="eyebrow">Your next steps</p>
              <h2 id="today-plan-heading" className="mt-2 text-2xl font-semibold tracking-tight">
                Keep the thread going
              </h2>
            </div>
            <Link href="/learn" className="text-sm font-medium text-accent hover:underline">
              Browse all learning
            </Link>
          </div>
          {data.needsSubjectChoice ? (
            <Card className="mt-4 border-dashed">
              <CardContent className="py-10 text-center">
                <BookOpen className="mx-auto h-8 w-8 text-accent" aria-hidden="true" />
                <h3 className="mt-4 text-lg font-semibold">Choose a subject to begin</h3>
                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                  All five subjects are available. Pick the one you want to spend a few minutes with
                  today.
                </p>
              </CardContent>
            </Card>
          ) : data.activities.length ? (
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {data.activities.slice(0, 3).map((activity, index) => (
                <ActivityCard key={activity.id} activity={activity} primary={index === 0} />
              ))}
            </div>
          ) : (
            <Card className="mt-4 border-dashed">
              <CardContent className="py-10 text-center">
                <CheckCircle2 className="mx-auto h-8 w-8 text-accent" aria-hidden="true" />
                <h3 className="mt-4 text-lg font-semibold">You are caught up for now</h3>
                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                  Explore Learn to choose another published course or switch subjects for a fresh
                  path.
                </p>
                <Link
                  href="/learn"
                  className={buttonVariants({ variant: "outline", className: "mt-5" })}
                >
                  Open Learn
                </Link>
              </CardContent>
            </Card>
          )}
        </div>

        <aside className="space-y-4">
          <Card className="surface-grid">
            <CardHeader>
              <CardTitle className="text-base">Today’s rhythm</CardTitle>
              <CardDescription>Short, steady sessions add up.</CardDescription>
            </CardHeader>
            <CardContent>
              <div
                className="h-2 overflow-hidden rounded-full bg-muted"
                role="progressbar"
                aria-label="Today goal progress"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={goalProgress}
              >
                <div
                  className="h-full rounded-full bg-accent transition-all"
                  style={{ width: `${goalProgress}%` }}
                />
              </div>
              <p className="mt-3 text-sm text-muted-foreground">
                {data.dailyPlanCompleted
                  ? "Daily plan complete. Nice work keeping the habit."
                  : `${Math.max(0, data.dailyGoalMinutes - data.studiedMinutesToday)} minutes left in today’s goal.`}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Learn your way</CardTitle>
              <CardDescription>Choose another surface when you need it.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <Link
                href="/practice"
                className="flex items-center justify-between rounded-lg border p-3 transition hover:bg-muted/50"
              >
                <span>Practice</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link
                href="/progress"
                className="flex items-center justify-between rounded-lg border p-3 transition hover:bg-muted/50"
              >
                <span>Progress</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link
                href="/more"
                className="flex items-center justify-between rounded-lg border p-3 transition hover:bg-muted/50"
              >
                <span>More tools</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </CardContent>
          </Card>
        </aside>
      </section>
    </div>
  );
}
