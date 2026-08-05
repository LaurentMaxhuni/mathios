import Link from "next/link";
import { Edit3, Plus, Upload } from "lucide-react";
import { redirect } from "next/navigation";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { canAuthorExercises } from "@/features/exercises/service";
import { getCurrentSession } from "@/infrastructure/auth/local-auth-provider";
import { getExerciseRepository } from "@/infrastructure/database/repositories/exercise-repository";

export const dynamic = "force-dynamic";

export default async function QuestionCatalogPage() {
  const session = await getCurrentSession().catch(() => null);
  if (!session) redirect("/profiles");
  if (!canAuthorExercises(session.principal)) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-10">
        <Breadcrumbs current="Question catalog" />
        <div className="mt-6">
          <ErrorState
            title="Content author permission required"
            description="Teachers, content creators, and administrators can author and review questions."
          />
        </div>
      </div>
    );
  }
  const questions = await getExerciseRepository().listQuestions({ includeArchived: true });
  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 py-7 sm:px-6 lg:px-10 lg:py-10">
      <Breadcrumbs current="Question catalog" />
      <div className="mt-6 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="eyebrow">Authoring surface · Phase 5</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            Reusable question bank.
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
            Keep prompts, answer rules, hints, solutions, versions, and concept links together.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={"/exercises/questions/import" as never}
            className={buttonVariants({ variant: "outline" })}
          >
            <Upload className="h-4 w-4" aria-hidden="true" /> Bulk import
          </Link>
          <Link href={"/exercises/questions/new" as never} className={buttonVariants()}>
            <Plus className="h-4 w-4" aria-hidden="true" /> New question
          </Link>
        </div>
      </div>
      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        {questions.map((question) => (
          <Link
            key={question.id}
            href={("/exercises/questions/" + question.id + "/edit") as never}
            className="group rounded-xl border bg-card p-5 transition hover:border-accent/50 hover:bg-accent/5"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-semibold">{question.title}</h2>
                  <Badge
                    variant={
                      question.status === "published"
                        ? "success"
                        : question.status === "archived"
                          ? "warning"
                          : "outline"
                    }
                  >
                    {question.status}
                  </Badge>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {question.subjectName} · {question.type.replaceAll("-", " ")} ·{" "}
                  {question.difficulty}
                </p>
                <p className="mt-3 text-xs text-muted-foreground">
                  {question.conceptCount} concepts · version {question.currentVersionNumber}
                </p>
              </div>
              <Edit3
                className="h-4 w-4 shrink-0 text-muted-foreground transition group-hover:text-accent"
                aria-hidden="true"
              />
            </div>
          </Link>
        ))}
      </div>
      {!questions.length ? (
        <div className="mt-6">
          <EmptyState
            title="No questions yet"
            description="Create the first reusable question from the authoring studio."
          />
          <Link
            href={"/exercises/questions/new" as never}
            className={buttonVariants({ className: "mt-4" })}
          >
            Create question
          </Link>
        </div>
      ) : null}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Validation contract</CardTitle>
          <CardDescription>
            All previews and learner attempts share the same safe, server-side validator.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {[
            "Exact matching",
            "Numeric tolerance",
            "Unit conversion",
            "Equivalent expressions",
            "Partial credit",
            "Reproducible templates",
          ].map((item) => (
            <Badge key={item} variant="outline">
              {item}
            </Badge>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
