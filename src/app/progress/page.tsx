import Link from "next/link";
import { ArrowRight, BarChart3, CheckCircle2, Flame, Target } from "lucide-react";
import { redirect } from "next/navigation";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { getLearnerAnalytics } from "@/features/analytics/service";
import { getCurrentSession } from "@/infrastructure/auth/local-auth-provider";

export const dynamic = "force-dynamic";

export default async function ProgressPage() {
  const session = await getCurrentSession().catch(() => null);
  if (!session) redirect("/profiles");
  const data = await getLearnerAnalytics(session.principal.profileId);
  const minutes = Math.round(data.summary.timeStudiedSeconds / 60);
  return (
    <div className="mx-auto w-full max-w-[1280px] px-4 py-7 sm:px-6 lg:px-10 lg:py-10">
      <Breadcrumbs current="Progress" />
      <header className="mt-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="eyebrow">Progress</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            Notice what is sticking.
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
            See your rhythm, mastery, and the concepts worth another short practice.
          </p>
        </div>
        <Link href="/mastery" className={buttonVariants({ variant: "outline", size: "sm" })}>
          Open mastery map <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </header>
      <section
        className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
        aria-label="Progress summary"
      >
        <ProgressStat
          label="Study streak"
          value={`${data.summary.studyStreak} days`}
          icon={<Flame className="h-5 w-5" aria-hidden="true" />}
        />
        <ProgressStat
          label="Time studied"
          value={`${minutes} min`}
          icon={<BarChart3 className="h-5 w-5" aria-hidden="true" />}
        />
        <ProgressStat
          label="Mastery"
          value={`${Math.round(data.summary.masteryScore * 100)}%`}
          icon={<Target className="h-5 w-5" aria-hidden="true" />}
        />
        <ProgressStat
          label="Lessons complete"
          value={String(data.summary.lessonsCompleted)}
          icon={<CheckCircle2 className="h-5 w-5" aria-hidden="true" />}
        />
      </section>
      <section className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Weak concepts</CardTitle>
            <CardDescription>Use these as a prompt for your next practice session.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.weakConcepts.slice(0, 6).map((concept) => (
              <Link
                key={concept.conceptId}
                href={`/mastery/concepts/${concept.conceptId}`}
                className="flex items-center justify-between gap-3 rounded-lg border p-3 transition hover:border-accent/50"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">{concept.conceptName}</span>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    {concept.subjectName} · {Math.round(concept.score * 100)}%
                  </span>
                </span>
                <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              </Link>
            ))}
            {!data.weakConcepts.length ? (
              <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                No weak concepts are flagged yet.
              </p>
            ) : null}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>By subject</CardTitle>
            <CardDescription>Your progress across the full science library.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.subjectMastery.map((subject) => (
              <div key={subject.subjectId}>
                <div className="flex justify-between gap-3 text-sm">
                  <span className="font-medium">{subject.subjectName}</span>
                  <span className="text-muted-foreground">
                    {Math.round(subject.averageScore * 100)}%
                  </span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-accent"
                    style={{ width: `${Math.max(0, Math.min(100, subject.averageScore * 100))}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function ProgressStat({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 pt-5">
        <span className="text-accent">{icon}</span>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="mt-1 font-semibold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
