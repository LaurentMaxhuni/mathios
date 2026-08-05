import Link from "next/link";
import { ArrowRight, BrainCircuit, CheckCircle2, Clock3, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import type {
  MasteryConceptView,
  MasteryGradeSummary,
  MasterySubjectSummary,
  RecommendationRecord,
  MasteryState,
} from "@/domain/mastery/types";
import { recommendationKindLabel } from "@/domain/mastery/rules";
import { DismissRecommendationForm } from "@/features/mastery/components/recommendation-form";

export function masteryStateLabel(state: MasteryState): string {
  return state.replaceAll("-", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function percentage(value: number): string {
  return `${Math.round(value * 100)}%`;
}

export function MasteryBar({ value, label }: { value: number; label?: string }) {
  return (
    <div>
      <div className="flex items-center justify-between gap-3 text-xs">
        <span className="text-muted-foreground">{label ?? "Mastery score"}</span>
        <span className="font-semibold">{percentage(value)}</span>
      </div>
      <div
        className="mt-2 h-2 overflow-hidden rounded-full bg-muted"
        aria-label={label ?? "Mastery score"}
      >
        <div
          className="h-full rounded-full bg-accent transition-all"
          style={{ width: `${Math.round(value * 100)}%` }}
        />
      </div>
    </div>
  );
}

export function MasteryStateBadge({ state }: { state: MasteryState }) {
  return (
    <Badge
      variant={state === "mastered" ? "success" : state === "needs-review" ? "warning" : "outline"}
    >
      {masteryStateLabel(state)}
    </Badge>
  );
}

export function MasteryConceptCard({
  view,
  compact = false,
}: {
  view: MasteryConceptView;
  compact?: boolean;
}) {
  return (
    <Link href={`/mastery/concepts/${view.id}` as never} className="group block">
      <Card className="h-full transition duration-200 group-hover:-translate-y-0.5 group-hover:border-accent/50 group-hover:shadow-soft">
        <CardHeader className={compact ? "p-4" : undefined}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                {view.subjectName}
              </p>
              <CardTitle className="mt-2 truncate text-lg">{view.name}</CardTitle>
            </div>
            <MasteryStateBadge state={view.mastery.state} />
          </div>
        </CardHeader>
        <CardContent className={compact ? "p-4 pt-0" : undefined}>
          <MasteryBar value={view.mastery.score} />
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
            <span>
              {view.mastery.evidenceCount} evidence item
              {view.mastery.evidenceCount === 1 ? "" : "s"}
            </span>
            <span>{view.mastery.confidenceLabel} confidence</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export function SummaryStat({
  label,
  value,
  detail,
  icon,
}: {
  label: string;
  value: string;
  detail: string;
  icon?: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-5">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent/10 text-accent">
          {icon ?? <BrainCircuit className="h-5 w-5" aria-hidden="true" />}
        </span>
        <div className="min-w-0">
          <p className="text-2xl font-semibold">{value}</p>
          <p className="text-sm font-medium">{label}</p>
          <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export function SubjectSummaryCard({ summary }: { summary: MasterySubjectSummary }) {
  return (
    <Link href={`/mastery/subjects/${summary.subjectId}` as never} className="group block">
      <Card className="h-full transition group-hover:border-accent/50 group-hover:shadow-soft">
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle>{summary.subjectName}</CardTitle>
              <CardDescription className="mt-1">{summary.conceptCount} concepts</CardDescription>
            </div>
            <ArrowRight
              className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-accent"
              aria-hidden="true"
            />
          </div>
        </CardHeader>
        <CardContent>
          <MasteryBar value={summary.averageScore} label="Average score" />
          <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
            <div className="rounded-lg bg-muted p-2">
              <strong className="block text-sm">{summary.assessedCount}</strong>assessed
            </div>
            <div className="rounded-lg bg-muted p-2">
              <strong className="block text-sm">{summary.masteredCount}</strong>mastered
            </div>
            <div className="rounded-lg bg-muted p-2">
              <strong className="block text-sm">{summary.reviewCount}</strong>review
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export function GradeSummaryCard({ summary }: { summary: MasteryGradeSummary }) {
  return (
    <Link href={`/mastery/grades/${summary.gradeId}` as never} className="group block">
      <Card className="h-full transition group-hover:border-accent/50 group-hover:shadow-soft">
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle>{summary.gradeName}</CardTitle>
              <CardDescription className="mt-1">
                {summary.conceptCount} concepts in range
              </CardDescription>
            </div>
            <ArrowRight
              className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-accent"
              aria-hidden="true"
            />
          </div>
        </CardHeader>
        <CardContent>
          <MasteryBar value={summary.averageScore} label="Average score" />
          <p className="mt-4 text-xs text-muted-foreground">
            {summary.requirementMasteredCount} of {summary.requirementCount || summary.conceptCount}{" "}
            placement requirements mastered.
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}

export function RecommendationCard({ recommendation }: { recommendation: RecommendationRecord }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Badge variant="outline">{recommendationKindLabel(recommendation.kind)}</Badge>
          <span className="text-xs font-semibold text-muted-foreground">
            Priority {recommendation.priority}
          </span>
        </div>
        <CardTitle className="mt-3 text-lg">{recommendation.title}</CardTitle>
        <CardDescription className="mt-2 leading-6">{recommendation.reason}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap items-center justify-between gap-3">
        {recommendation.conceptId ? (
          <Link
            href={`/mastery/concepts/${recommendation.conceptId}` as never}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            Open mastery <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        ) : (
          <span />
        )}
        <DismissRecommendationForm recommendationId={recommendation.id} />
      </CardContent>
    </Card>
  );
}

export function RecommendationFeed({
  recommendations,
}: {
  recommendations: readonly RecommendationRecord[];
}) {
  if (!recommendations.length) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <CheckCircle2 className="mx-auto h-8 w-8 text-accent" aria-hidden="true" />
          <p className="mt-3 font-semibold">No active recommendations.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Keep practicing and new evidence will shape the next suggestions.
          </p>
        </CardContent>
      </Card>
    );
  }
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {recommendations.map((recommendation) => (
        <RecommendationCard key={recommendation.id} recommendation={recommendation} />
      ))}
    </div>
  );
}

export function EvidenceNote({ detail }: { detail: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border bg-muted/40 p-4 text-sm leading-6">
      <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
      <span>{detail}</span>
    </div>
  );
}

export function ReviewDue({ date }: { date: string | null }) {
  return date ? (
    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
      <Clock3 className="h-3.5 w-3.5" aria-hidden="true" /> Review{" "}
      {new Date(date).toLocaleDateString()}
    </span>
  ) : null;
}
