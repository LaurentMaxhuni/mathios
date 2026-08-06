import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, Pencil, UserRound } from "lucide-react";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { BrandMark } from "@/components/shared/brand-mark";
import { ProfileAvatar } from "@/components/shared/profile-avatar";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentSession } from "@/infrastructure/auth/local-auth-provider";
import { getIdentityRepository } from "@/infrastructure/database/repositories/identity-repository";
import { toPublicProfile } from "@/features/profiles/service";
import { env } from "@/lib/env";

export default async function ProfilesPage() {
  if (env.AUTH_MODE === "neon-auth") redirect("/account/settings" as never);
  const repository = getIdentityRepository();
  const session = await getCurrentSession(repository).catch(() => null);
  const profiles = (await repository.listProfiles().catch(() => [])).map(toPublicProfile);
  return (
    <div className="mx-auto w-full max-w-[1200px] px-4 py-7 sm:px-6 lg:px-10 lg:py-10">
      <Link href="/" className="auth-page-brand mb-6" aria-label="Mathios home">
        <BrandMark className="auth-page-brand-mark" priority />
        <span className="auth-page-brand-name">Mathios</span>
      </Link>
      <Breadcrumbs current="Profiles" />
      <div className="mt-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">Identity</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Local profiles</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
            The learning library is already provided. Profiles only keep separate progress,
            preferences, and roles on this device.
          </p>
        </div>
        {session?.principal.permissions.includes("manage_users") || profiles.length === 0 ? (
          <Link href="/profiles/new" className={buttonVariants()}>
            <Plus className="h-4 w-4" aria-hidden="true" /> New profile
          </Link>
        ) : null}
      </div>
      <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {profiles.map((profile) => {
          const active = profile.id === session?.principal.profileId;
          return (
            <Card key={profile.id}>
              <CardHeader className="flex-row items-center gap-4 space-y-0">
                <ProfileAvatar avatar={profile.avatar} />
                <div className="min-w-0">
                  <CardTitle className="truncate">{profile.displayName}</CardTitle>
                  <div className="mt-1 flex flex-wrap gap-2">
                    <Badge variant={active ? "success" : "outline"}>
                      {active ? "Active" : "Local"}
                    </Badge>
                    {profile.hasSecret ? <Badge variant="outline">PIN protected</Badge> : null}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                <Link
                  href={`/auth/sign-in?profileId=${encodeURIComponent(profile.id)}`}
                  className={buttonVariants({ variant: "outline", size: "sm" })}
                >
                  <UserRound className="h-4 w-4" aria-hidden="true" /> Select
                </Link>
                {active || session?.principal.permissions.includes("manage_users") ? (
                  <Link
                    href={`/profiles/${profile.id}/edit`}
                    className={buttonVariants({ variant: "ghost", size: "sm" })}
                  >
                    <Pencil className="h-4 w-4" aria-hidden="true" /> Edit
                  </Link>
                ) : null}
              </CardContent>
            </Card>
          );
        })}
      </div>
      {!profiles.length ? (
        <Card className="mt-8">
          <CardContent className="py-10 text-center">
            <p className="font-semibold">No local profiles yet.</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Create the first profile to save progress while you use the provided library.
            </p>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
