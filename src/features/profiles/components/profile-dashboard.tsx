import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  BrainCircuit,
  Network,
  Orbit,
  Settings2,
  ShieldCheck,
  StickyNote,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Reveal, Stagger, StaggerItem } from "@/components/shared/motion-reveal";
import type { AuthenticatedPrincipal } from "@/infrastructure/auth/auth-provider";
import type { OnboardingResponseRecord } from "@/domain/identity/types";

const providedLibrary = [
  {
    href: "/courses",
    label: "Course library",
    description: "Prepared lessons arranged into a sequence you can follow.",
    action: "Browse courses",
    icon: BookOpen,
  },
  {
    href: "/concepts",
    label: "Concept map",
    description: "See the ideas, prerequisites, and connections behind each subject.",
    action: "Explore concepts",
    icon: Network,
  },
  {
    href: "/exercises",
    label: "Practice library",
    description: "Use provided exercises and feedback to make the ideas stick.",
    action: "Start practice",
    icon: BrainCircuit,
  },
  {
    href: "/simulations",
    label: "Explore and experiment",
    description: "Move from explanation to simulations and virtual laboratories.",
    action: "Open explorations",
    icon: Orbit,
  },
] as const;

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
      <Reveal>
        <section className="dashboard-hero surface-grid relative overflow-hidden rounded-3xl border px-6 py-8 shadow-soft sm:px-10 sm:py-10">
          <div
            className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-accent/15 blur-3xl"
            aria-hidden="true"
          />
          <div className="relative max-w-3xl">
            <Badge variant="success" className="dashboard-hero-badge">
              Provided library · {principal.roles.join(" · ")}
            </Badge>
            <h1 className="dashboard-hero-title mt-5 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
              Your science library is ready, {principal.displayName}.
            </h1>
            <p className="dashboard-hero-copy mt-4 max-w-2xl text-base leading-7 sm:text-lg">
              Lessons, concepts, practice, simulations, and experiments are already here. Start with
              a prepared course or path; personal notes and learning preferences are optional.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href="/courses"
                className="dashboard-hero-primary inline-flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-semibold shadow-sm"
              >
                Browse course library
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link
                href="/roadmaps"
                className="dashboard-hero-secondary inline-flex h-10 items-center gap-2 rounded-xl border px-4 text-sm font-semibold"
              >
                See a prepared path
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
            <p className="dashboard-hero-meta mt-4 text-xs leading-5">
              Optional:{" "}
              <Link href="/onboarding" className="font-medium text-accent hover:underline">
                tune your learning preferences
              </Link>{" "}
              or{" "}
              <Link href="/notes" className="font-medium text-accent hover:underline">
                keep your own notes
              </Link>
              .
            </p>
          </div>
        </section>
      </Reveal>

      <Reveal delay={0.08}>
        <section aria-labelledby="provided-library-heading">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <p className="eyebrow">Start here</p>
              <h2
                id="provided-library-heading"
                className="mt-2 text-2xl font-semibold tracking-tight"
              >
                Start with provided content
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                The core learning experience is ready before you arrive. Choose the format that fits
                the idea you want to understand next.
              </p>
            </div>
          </div>
          <Stagger className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {providedLibrary.map((item) => {
              const Icon = item.icon;
              return (
                <StaggerItem key={item.href}>
                  <Link href={item.href} className="group block h-full">
                    <Card className="dashboard-card h-full transition duration-200 group-hover:-translate-y-1 group-hover:border-accent/50 group-hover:shadow-soft">
                      <CardHeader>
                        <span className="dashboard-card-icon grid h-10 w-10 place-items-center rounded-xl">
                          <Icon className="h-5 w-5" aria-hidden="true" />
                        </span>
                        <CardTitle className="mt-4 text-lg">{item.label}</CardTitle>
                        <CardDescription className="mt-2 leading-6">
                          {item.description}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <span className="inline-flex items-center gap-2 text-sm font-medium text-accent">
                          {item.action}
                          <ArrowRight
                            className="h-4 w-4 transition-transform group-hover:translate-x-1"
                            aria-hidden="true"
                          />
                        </span>
                      </CardContent>
                    </Card>
                  </Link>
                </StaggerItem>
              );
            })}
          </Stagger>
        </section>
      </Reveal>

      <Reveal delay={0.14}>
        <section className="grid gap-4 md:grid-cols-2" aria-label="Optional profile tools">
          <Card className="dashboard-card">
            <CardHeader>
              <StickyNote className="h-5 w-5 text-accent" aria-hidden="true" />
              <CardTitle className="mt-3">Your optional layer</CardTitle>
              <CardDescription>
                Add notes, highlights, and personal context when they help. None of this is required
                to start learning.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/notes" className="text-sm font-medium text-accent hover:underline">
                Open your notes <ArrowRight className="inline h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </CardContent>
          </Card>
          <Card className="dashboard-card">
            <CardHeader>
              <Settings2 className="h-5 w-5 text-accent" aria-hidden="true" />
              <CardTitle className="mt-3">Personalize only if useful</CardTitle>
              <CardDescription>
                {onboardingStatus === "Saved"
                  ? "Your learning preferences are saved and can be adjusted any time."
                  : "Tune curriculum, level, goals, and rhythm later if you want a more tailored start."}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-4">
              <Link href="/onboarding" className="text-sm font-medium text-accent hover:underline">
                {onboardingStatus === "Saved" ? "Review preferences" : "Set preferences"}
                <ArrowRight className="ml-1 inline h-3.5 w-3.5" aria-hidden="true" />
              </Link>
              {principal.permissions.includes("manage_users") ? (
                <Link
                  href="/profiles"
                  className="text-sm font-medium text-muted-foreground hover:text-foreground"
                >
                  Manage profiles{" "}
                  <ShieldCheck className="ml-1 inline h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              ) : null}
            </CardContent>
          </Card>
        </section>
      </Reveal>
    </div>
  );
}
