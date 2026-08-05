import { redirect } from "next/navigation";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { OnboardingForm } from "@/features/onboarding/components/onboarding-form";
import { getCurrentSession } from "@/infrastructure/auth/local-auth-provider";
import { getIdentityRepository } from "@/infrastructure/database/repositories/identity-repository";

export default async function OnboardingPage() {
  const repository = getIdentityRepository();
  const session = await getCurrentSession(repository).catch(() => null);
  if (!session) redirect("/profiles");
  const response = await repository.getOnboarding(session.principal.profileId);
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-7 sm:px-6 lg:px-10 lg:py-10">
      <Breadcrumbs current="Onboarding" />
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Set your learning direction</CardTitle>
          <CardDescription>
            Tell Mathios what you are working toward. You can skip this and come back whenever you
            want.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <OnboardingForm response={response} />
        </CardContent>
      </Card>
    </div>
  );
}
