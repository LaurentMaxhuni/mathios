import Link from "next/link";
import { ArrowRight, Plus } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProfileAvatar } from "@/components/shared/profile-avatar";
import type { PublicProfile } from "@/features/profiles/service";

export function ProfileSelector({
  profiles,
  canCreate = profiles.length === 0,
}: {
  profiles: readonly PublicProfile[];
  canCreate?: boolean;
}) {
  return (
    <section aria-labelledby="profile-selection-heading">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
            Local profiles
          </p>
          <h1
            id="profile-selection-heading"
            className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl"
          >
            Who is learning today?
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
            Choose a local profile to continue to the provided learning library. Your profile keeps
            progress and preferences on this device; it does not supply the learning content.
          </p>
        </div>
        {canCreate ? (
          <Link href="/profiles/new" className={buttonVariants({ variant: "outline" })}>
            <Plus className="h-4 w-4" aria-hidden="true" /> Create profile
          </Link>
        ) : null}
      </div>
      <div className="mt-7 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {profiles.map((profile) => (
          <Card key={profile.id} className="group transition-transform hover:-translate-y-0.5">
            <CardHeader className="flex-row items-center gap-4 space-y-0">
              <ProfileAvatar avatar={profile.avatar} />
              <div className="min-w-0">
                <CardTitle className="truncate">{profile.displayName}</CardTitle>
                <p className="mt-1 text-xs text-muted-foreground">
                  {profile.hasSecret ? "PIN protected" : "Ready to open"}
                </p>
              </div>
            </CardHeader>
            <CardContent>
              <Link
                href={`/auth/sign-in?profileId=${encodeURIComponent(profile.id)}`}
                className={buttonVariants({ className: "w-full" })}
              >
                Continue <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
