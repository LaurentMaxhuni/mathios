import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { redirect } from "next/navigation";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AccessibilityForm } from "@/features/settings/components/accessibility-form";
import { getCurrentSession } from "@/infrastructure/auth/local-auth-provider";
import { getIdentityRepository } from "@/infrastructure/database/repositories/identity-repository";
import { getSettings } from "@/features/settings/service";

export default async function AccessibilitySettingsPage() {
  const repository = getIdentityRepository();
  const session = await getCurrentSession(repository).catch(() => null);
  if (!session) redirect("/profiles");
  const settings = await getSettings(session.principal.profileId, repository);
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-7 sm:px-6 lg:px-10 lg:py-10">
      <Breadcrumbs current="Accessibility" />
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Accessibility settings</CardTitle>
          <CardDescription>
            Adjust motion, sizing, contrast, keyboard focus, and formula presentation for this
            profile.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AccessibilityForm settings={settings} />
        </CardContent>
      </Card>
      <Link
        href="/settings"
        className="mt-5 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to settings
      </Link>
    </div>
  );
}
