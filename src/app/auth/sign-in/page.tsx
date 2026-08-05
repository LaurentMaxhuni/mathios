import Link from "next/link";
import { ArrowLeft, LockKeyhole } from "lucide-react";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { ProfileAvatar } from "@/components/shared/profile-avatar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SignInForm } from "@/features/auth/components/sign-in-form";
import { getIdentityRepository } from "@/infrastructure/database/repositories/identity-repository";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ profileId?: string; created?: string }>;
}) {
  const { profileId, created } = await searchParams;
  if (!profileId) notFound();
  const repository = getIdentityRepository();
  const profile = await repository.getProfile(profileId);
  if (!profile) notFound();
  return (
    <div className="mx-auto w-full max-w-md px-4 py-7 sm:px-6 lg:py-10">
      <Breadcrumbs current="Sign in" />
      <Card className="mt-6">
        <CardHeader className="items-center text-center">
          <ProfileAvatar avatar={profile.avatar} size="lg" />
          <CardTitle className="mt-4">Continue as {profile.displayName}</CardTitle>
          <CardDescription>
            {created
              ? "Your local profile is ready."
              : profile.secretHash
                ? "Enter the local PIN or password to continue."
                : "Open this local profile to continue."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SignInForm profileId={profile.id} requiresSecret={Boolean(profile.secretHash)} />
        </CardContent>
      </Card>
      <Link
        href="/profiles"
        className="mt-5 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Choose another profile
      </Link>
      <p className="mt-5 flex items-center justify-center gap-2 text-center text-xs text-muted-foreground">
        <LockKeyhole className="h-3.5 w-3.5" aria-hidden="true" /> Local authentication stays on
        this device.
      </p>
    </div>
  );
}
