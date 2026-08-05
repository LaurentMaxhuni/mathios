import Link from "next/link";
import { ArrowRight, BookOpen, Settings2, Sparkles, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { AuthenticatedPrincipal } from "@/infrastructure/auth/auth-provider";
import type { OnboardingResponseRecord } from "@/domain/identity/types";

export function ProfileDashboard({
  principal,
  onboarding,
}: {
  principal: AuthenticatedPrincipal;
  onboarding: OnboardingResponseRecord | null;
}) {
  const onboardingStatus = onboarding?.skipped
    ? "Not started"
    : onboarding?.completedAt
      ? "Saved"
      : "Not started";
  return (
    <div className="space-y-8">
      <section className="surface-grid relative overflow-hidden rounded-2xl border bg-card px-6 py-8 shadow-soft sm:px-10 sm:py-10">
        <div
          className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-accent/10 blur-3xl"
          aria-hidden="true"
        />
        <div className="relative max-w-3xl">
          <Badge variant="success">Local profile · {principal.roles.join(" · ")}</Badge>
          <h1 className="mt-5 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
            Welcome back, {principal.displayName}.
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
            Your personal science workspace is ready. Set your learning direction now; content
            modules will build on this identity foundation one phase at a time.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              href="/onboarding"
              className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90"
            >
              {onboarding?.completedAt ? "Review onboarding" : "Set learning direction"}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link
              href="/settings"
              className="inline-flex h-10 items-center gap-2 rounded-md border border-input px-4 text-sm font-medium hover:bg-accent/10"
            >
              Open settings
              <Settings2 className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>
      <section className="grid gap-4 md:grid-cols-3" aria-label="Profile overview">
        <Card>
          <CardHeader>
            <Sparkles className="h-5 w-5 text-accent" aria-hidden="true" />
            <CardTitle className="mt-3">Learning direction</CardTitle>
            <CardDescription>Curriculum, grade, goals, and study rhythm.</CardDescription>
          </CardHeader>
          <CardContent>
            <Badge variant={onboardingStatus === "Saved" ? "success" : "warning"}>
              {onboardingStatus}
            </Badge>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <ShieldCheck className="h-5 w-5 text-accent" aria-hidden="true" />
            <CardTitle className="mt-3">Profile security</CardTitle>
            <CardDescription>
              {principal.permissions.includes("manage_users")
                ? "You can manage local profiles and roles."
                : "Your profile is ready for local learning."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/profiles" className="text-sm font-medium text-accent hover:underline">
              Manage profiles <ArrowRight className="inline h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <BookOpen className="h-5 w-5 text-accent" aria-hidden="true" />
            <CardTitle className="mt-3">Content foundation</CardTitle>
            <CardDescription>Learning content arrives in the next planned phase.</CardDescription>
          </CardHeader>
          <CardContent>
            <Badge variant="outline">Phase 1 foundation</Badge>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
