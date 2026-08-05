import { Activity, Database, KeyRound, Layers3, PackageCheck, ServerCog } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { ProfileDashboard } from "@/features/profiles/components/profile-dashboard";
import { ProfileSelector } from "@/features/profiles/components/profile-selector";
import { toPublicProfile } from "@/features/profiles/service";
import { getCurrentSession } from "@/infrastructure/auth/local-auth-provider";
import { getIdentityRepository } from "@/infrastructure/database/repositories/identity-repository";

const systems = [
  {
    title: "Application shell",
    description: "Responsive layout, navigation, themes, and accessible shared UI primitives.",
    icon: Layers3,
  },
  {
    title: "Database foundation",
    description:
      "Transactional migrations with SQLite by default and a PostgreSQL-compatible path.",
    icon: Database,
  },
  {
    title: "Storage abstraction",
    description: "Safe local filesystem storage with a provider-neutral S3-compatible seam.",
    icon: PackageCheck,
  },
  {
    title: "Provider boundaries",
    description:
      "Authentication, search, and AI can evolve without coupling domain logic to vendors.",
    icon: KeyRound,
  },
];

export default async function HomePage() {
  const repository = getIdentityRepository();
  try {
    const session = await getCurrentSession(repository);
    if (session) {
      const onboarding = await repository.getOnboarding(session.principal.profileId);
      return (
        <div className="mx-auto w-full max-w-[1440px] px-4 py-7 sm:px-6 lg:px-10 lg:py-10">
          <Breadcrumbs current="Overview" />
          <div className="mt-6">
            <ProfileDashboard principal={session.principal} onboarding={onboarding} />
          </div>
        </div>
      );
    }
    const profiles = (await repository.listProfiles()).map(toPublicProfile);
    return <StartupPage profiles={profiles} />;
  } catch {
    return <StartupPage profiles={[]} />;
  }
}

function StartupPage({ profiles }: { profiles: ReturnType<typeof toPublicProfile>[] }) {
  return (
    <div className="mx-auto w-full max-w-[1440px] space-y-8 px-4 py-7 sm:px-6 lg:px-10 lg:py-10">
      <Breadcrumbs current={profiles.length ? "Select profile" : "Overview"} />
      {!profiles.length ? (
        <section className="surface-grid relative overflow-hidden rounded-2xl border bg-card px-6 py-8 shadow-soft sm:px-10 sm:py-10">
          <div
            className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-accent/10 blur-3xl"
            aria-hidden="true"
          />
          <div className="relative max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="success">Phase 3 - Courses and authoring</Badge>
              <span className="text-xs text-muted-foreground">
                Local profiles, roles, settings, onboarding, and a structured learning studio
              </span>
            </div>
            <h1 className="mt-5 max-w-2xl text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
              A sturdy place to build curious minds.
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
              Mathios is ready for your first local profile. Create one to keep learning preferences
              and permissions on this device, with no cloud account required.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-3 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-2">
                <Activity className="h-4 w-4 text-accent" aria-hidden="true" /> Offline-ready
                identity
              </span>
              <span className="inline-flex items-center gap-2">
                <ServerCog className="h-4 w-4 text-accent" aria-hidden="true" /> Local mode
              </span>
            </div>
          </div>
        </section>
      ) : null}
      <ProfileSelector profiles={profiles} />
      {!profiles.length ? <FoundationMap /> : null}
    </div>
  );
}

function FoundationMap() {
  return (
    <section aria-labelledby="systems-heading">
      <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
            Foundation map
          </p>
          <h2 id="systems-heading" className="mt-2 text-xl font-semibold tracking-tight">
            The learning map is in place.
          </h2>
        </div>
        <p className="max-w-md text-sm leading-6 text-muted-foreground sm:text-right">
          Create a profile first, then browse the reusable curriculum, grade, subject, and domain
          structure.
        </p>
      </div>
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        {systems.map((system) => {
          const Icon = system.icon;
          return (
            <Card key={system.title} className="transition-transform hover:-translate-y-0.5">
              <CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
                <div>
                  <CardTitle>{system.title}</CardTitle>
                  <CardDescription className="mt-2 leading-6">{system.description}</CardDescription>
                </div>
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-accent/10 text-accent">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
              </CardHeader>
              <CardContent>
                <Badge variant="success">Ready</Badge>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
