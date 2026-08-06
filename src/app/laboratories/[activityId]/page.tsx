import Link from "next/link";
import { ArrowLeft, BookOpen, FlaskConical, ShieldAlert } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentSession } from "@/infrastructure/auth/local-auth-provider";
import { getLaboratoryRepository } from "@/infrastructure/database/repositories/laboratory-repository";
import { canAuthorLaboratories, getLaboratoryActivity } from "@/features/laboratory/service";
import { LaboratoryWorkspace } from "@/features/laboratory/components/laboratory-workspace";

export default async function LaboratoryActivityPage({
  params,
}: {
  params: Promise<{ activityId: string }>;
}) {
  const session = await getCurrentSession().catch(() => null);
  if (!session) redirect("/profiles");
  const { activityId } = await params;
  const detail = await getLaboratoryActivity(activityId, getLaboratoryRepository(), {
    includeDraft: canAuthorLaboratories(session.principal),
  });
  if (!detail) notFound();
  const { activity } = detail;
  return (
    <div className="mx-auto w-full max-w-[1500px] px-4 py-7 sm:px-6 lg:px-10 lg:py-10">
      <Breadcrumbs current={activity.title} />
      <Link
        href={"/laboratories" as never}
        className="mt-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Laboratory catalog
      </Link>
      <div className="mt-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{activity.subjectName}</Badge>
            <Badge variant={activity.mode === "real-world" ? "outline" : "success"}>
              {activity.mode}
            </Badge>
            <Badge variant="outline">{activity.estimatedDurationMinutes} min</Badge>
          </div>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight">{activity.title}</h1>
          <p className="mt-3 max-w-3xl text-muted-foreground">{activity.description}</p>
        </div>
        {canAuthorLaboratories(session.principal) ? (
          <Link
            href={`/laboratories/${activity.id}/edit` as never}
            className="inline-flex h-10 items-center gap-2 rounded-md border px-4 text-sm font-medium hover:bg-accent/10"
          >
            Edit activity
          </Link>
        ) : null}
      </div>
      <div className="mt-8 grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-accent" aria-hidden="true" />
              Objective
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-6 text-muted-foreground">{activity.objective}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FlaskConical className="h-4 w-4 text-accent" aria-hidden="true" />
              Materials
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {activity.materials.map((item) => (
                <li key={item}>• {item}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-accent" aria-hidden="true" />
              Safety
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {activity.safetyNotes.map((item) => (
                <li key={item}>• {item}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Theory</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="max-w-4xl whitespace-pre-wrap text-sm leading-7 text-muted-foreground">
            {activity.theory}
          </p>
        </CardContent>
      </Card>
      <div className="mt-8">
        <LaboratoryWorkspace activity={detail} />
      </div>
    </div>
  );
}
