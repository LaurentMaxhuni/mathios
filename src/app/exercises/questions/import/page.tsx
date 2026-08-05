import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { redirect } from "next/navigation";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { BulkQuestionImportForm } from "@/features/exercises/components/question-forms";
import { canAuthorExercises } from "@/features/exercises/service";
import { getCurrentSession } from "@/infrastructure/auth/local-auth-provider";

export const dynamic = "force-dynamic";

export default async function QuestionImportPage() {
  const session = await getCurrentSession().catch(() => null);
  if (!session) redirect("/profiles");
  if (!canAuthorExercises(session.principal)) redirect("/exercises" as never);
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-7 sm:px-6 lg:px-10 lg:py-10">
      <Breadcrumbs current="Bulk import questions" />
      <Link
        href={"/exercises/questions" as never}
        className="mt-5 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Question catalog
      </Link>
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Bulk import reusable questions</CardTitle>
          <CardDescription>
            Validate the complete batch before any records are written, then review the imported
            drafts in the catalog.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <BulkQuestionImportForm />
        </CardContent>
      </Card>
      <Link
        href={"/exercises/questions/new" as never}
        className={buttonVariants({ variant: "ghost", className: "mt-4" })}
      >
        Create one question in the editor
      </Link>
    </div>
  );
}
