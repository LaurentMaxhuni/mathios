import Link from "next/link";
import { redirect } from "next/navigation";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentSession } from "@/infrastructure/auth/local-auth-provider";
import { getCurriculumRepository } from "@/infrastructure/database/repositories/curriculum-repository";
import { getLaboratoryRepository } from "@/infrastructure/database/repositories/laboratory-repository";
import { canAuthorLaboratories, listLaboratoryActivities } from "@/features/laboratory/service";
import { ActivityForm } from "@/features/laboratory/components/activity-form";

export default async function LaboratoryManagePage() {
  const session = await getCurrentSession();
  if (!session) redirect("/profiles");
  if (!canAuthorLaboratories(session.principal)) redirect("/laboratories" as never);
  const [subjects, activities] = await Promise.all([
    getCurriculumRepository().listSubjects(),
    listLaboratoryActivities(getLaboratoryRepository(), { includeDraft: true }),
  ]);
  return (
    <div className="mx-auto w-full max-w-[1500px] px-4 py-7 sm:px-6 lg:px-10 lg:py-10">
      <Breadcrumbs current="Laboratory studio" />
      <div className="mt-7">
        <p className="eyebrow">Content authoring</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight">Laboratory studio.</h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Create structured experiment guides with explicit variables, safe procedures, analysis
          prompts, and report-ready data contracts.
        </p>
      </div>
      <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <Card>
          <CardHeader>
            <CardTitle>New activity</CardTitle>
          </CardHeader>
          <CardContent>
            <ActivityForm subjects={subjects} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Activity catalog</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {activities.map((activity) => (
              <Link
                key={activity.id}
                href={`/laboratories/${activity.id}/edit` as never}
                className="block rounded-lg border p-3 hover:border-accent"
              >
                <p className="font-medium">{activity.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {activity.status} · {activity.mode}
                </p>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
