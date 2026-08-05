import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { DeleteProfileButton } from "@/features/profiles/components/delete-profile-button";
import { ProfileForm } from "@/features/profiles/components/profile-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { getCurrentSession } from "@/infrastructure/auth/local-auth-provider";
import { getIdentityRepository } from "@/infrastructure/database/repositories/identity-repository";
import { hasPermission } from "@/features/auth/authorization";
import { toPublicProfile } from "@/features/profiles/service";

export default async function EditProfilePage({
  params,
}: {
  params: Promise<{ profileId: string }>;
}) {
  const { profileId } = await params;
  const repository = getIdentityRepository();
  const session = await getCurrentSession(repository).catch(() => null);
  if (!session) redirect("/profiles");
  const profile = await repository.getProfile(profileId);
  if (!profile) notFound();
  if (
    session.principal.profileId !== profileId &&
    !hasPermission(session.principal, "manage_users")
  )
    redirect("/profiles");
  const publicProfile = toPublicProfile(profile);
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-7 sm:px-6 lg:py-10">
      <Breadcrumbs current="Edit profile" />
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Edit {publicProfile.displayName}</CardTitle>
          <CardDescription>
            Update the local identity and its preferred presentation. Learning preferences live in
            Settings.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProfileForm mode="edit" profile={publicProfile} />
        </CardContent>
      </Card>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
        <Link href="/profiles" className={buttonVariants({ variant: "ghost", size: "sm" })}>
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to profiles
        </Link>
        <DeleteProfileButton profileId={publicProfile.id} displayName={publicProfile.displayName} />
      </div>
    </div>
  );
}
