import Link from "next/link";
import { ArrowRight, UserRound } from "lucide-react";
import { redirect } from "next/navigation";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { ProfileAvatar } from "@/components/shared/profile-avatar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { SettingsForm } from "@/features/settings/components/settings-form";
import { getCurrentSession } from "@/infrastructure/auth/local-auth-provider";
import { getIdentityRepository } from "@/infrastructure/database/repositories/identity-repository";
import { getSettings } from "@/features/settings/service";

export default async function SettingsPage() {
  const repository = getIdentityRepository();
  const session = await getCurrentSession(repository).catch(() => null);
  if (!session) redirect("/profiles");
  const profile = await repository.getProfile(session.principal.profileId);
  if (!profile) redirect("/profiles");
  const settings = await getSettings(profile.id, repository);
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-7 sm:px-6 lg:px-10 lg:py-10">
      <Breadcrumbs current="Settings" />
      <div className="mt-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
            Personal workspace
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Settings</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Tune how this profile looks, speaks, and makes room for study.
          </p>
        </div>
        <Link
          href={`/profiles/${profile.id}/edit`}
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          <UserRound className="h-4 w-4" aria-hidden="true" /> Edit profile
        </Link>
      </div>
      <Card className="mt-7">
        <CardHeader className="flex-row items-center gap-4 space-y-0">
          <ProfileAvatar avatar={profile.avatar} />
          <div>
            <CardTitle>{profile.displayName}</CardTitle>
            <CardDescription>
              Profile preferences and accessibility settings are stored locally.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <SettingsForm settings={settings} />
        </CardContent>
      </Card>
      <Link
        href="/settings/accessibility"
        className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-accent hover:underline"
      >
        Open accessibility settings <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </Link>
    </div>
  );
}
