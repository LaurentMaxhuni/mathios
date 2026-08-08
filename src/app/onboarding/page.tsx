import Link from "next/link";
import { redirect } from "next/navigation";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { OnboardingForm } from "@/features/onboarding/components/onboarding-form";
import { getCurrentSession } from "@/infrastructure/auth/local-auth-provider";
import { getIdentityRepository } from "@/infrastructure/database/repositories/identity-repository";
import { defaultSettings } from "@/features/settings/service";

export default async function OnboardingPage() {
  const repository = getIdentityRepository();
  const session = await getCurrentSession(repository).catch(() => null);
  if (!session) redirect("/profiles");
  const response = await repository.getOnboarding(session.principal.profileId);
  const settings =
    (await repository.getSettings(session.principal.profileId)) ??
    defaultSettings(session.principal.profileId);
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-7 sm:px-6 lg:px-10 lg:py-10">
      <Breadcrumbs current="Onboarding" />
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Set up your daily learning</CardTitle>
          <CardDescription>
            Choose a subject and a small daily goal. Grade and curriculum details are optional and
            only help make course suggestions more relevant.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-7 flex flex-col justify-between gap-4 rounded-xl border border-accent/30 bg-accent/5 p-4 sm:flex-row sm:items-center">
            <div>
              <p className="text-sm font-semibold">The catalog is ready.</p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Browse prepared courses, concepts, practice, and experiments without filling in any
                content yourself.
              </p>
            </div>
            <Link href="/learn" className={buttonVariants({ variant: "outline", size: "sm" })}>
              Choose from all subjects
            </Link>
          </div>
          <OnboardingForm response={response} dailyGoalMinutes={settings.studySessionDuration} />
        </CardContent>
      </Card>
    </div>
  );
}
