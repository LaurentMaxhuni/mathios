import { redirect } from "next/navigation";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentSession } from "@/infrastructure/auth/local-auth-provider";
import { getCurriculumRepository } from "@/infrastructure/database/repositories/curriculum-repository";
import { getLaboratoryRepository } from "@/infrastructure/database/repositories/laboratory-repository";
import { canAuthorLaboratories, getLaboratoryActivity } from "@/features/laboratory/service";
import { ActivityForm } from "@/features/laboratory/components/activity-form";

export default async function LaboratoryEditPage({
  params,
}: {
  params: Promise<{ activityId: string }>;
}) {
  const session = await getCurrentSession();
  if (!session) redirect("/profiles");
  if (!canAuthorLaboratories(session.principal)) redirect("/laboratories" as never);
  const { activityId } = await params;
  const [detail, subjects] = await Promise.all([
    getLaboratoryActivity(activityId, getLaboratoryRepository(), { includeDraft: true }),
    getCurriculumRepository().listSubjects(),
  ]);
  if (!detail) redirect("/laboratories/manage" as never);
  return (
    <div className="mx-auto w-full max-w-[1200px] px-4 py-7 sm:px-6 lg:px-10 lg:py-10">
      <Breadcrumbs current={`Edit ${detail.activity.title}`} />
      <div className="mt-7">
        <p className="eyebrow">Laboratory studio</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight">Edit activity.</h1>
      </div>
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>{detail.activity.title}</CardTitle>
        </CardHeader>
        <CardContent>
          <ActivityForm subjects={subjects} detail={detail} />
        </CardContent>
      </Card>
    </div>
  );
}
