import Link from "next/link";
import {
  Activity,
  Archive,
  ArrowRight,
  FlaskConical,
  GraduationCap,
  Route,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { redirect } from "next/navigation";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { ProfileAvatar } from "@/components/shared/profile-avatar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { SettingsForm } from "@/features/settings/components/settings-form";
import { getCurrentSession } from "@/infrastructure/auth/local-auth-provider";
import { getIdentityRepository } from "@/infrastructure/database/repositories/identity-repository";
import { getSettings } from "@/features/settings/service";

const workspaceTools = [
  {
    href: "/onboarding",
    label: "Learning direction",
    description: "Set your curriculum, goals, and study rhythm.",
    icon: Route,
  },
  {
    href: "/profiles",
    label: "Profiles & access",
    description: "Switch profiles or manage local identity on this device.",
    icon: UserRound,
  },
  {
    href: "/portability",
    label: "Import & backup",
    description: "Move learning data, create backups, or review restore options.",
    icon: Archive,
  },
  {
    href: "/grades",
    label: "Grades",
    description: "Browse grade-level structure connected to your curricula.",
    icon: GraduationCap,
  },
  {
    href: "/subjects",
    label: "Subjects",
    description: "Browse reusable subjects and their learning domains.",
    icon: FlaskConical,
  },
] as const;

export default async function SettingsPage() {
  const repository = getIdentityRepository();
  const session = await getCurrentSession(repository).catch(() => null);
  if (!session) redirect("/profiles");
  const profile = await repository.getProfile(session.principal.profileId);
  if (!profile) redirect("/profiles");
  const settings = await getSettings(profile.id, repository);
  const adminTools = [
    session.principal.permissions.includes("manage_users")
      ? {
          href: "/settings/roles",
          label: "Roles",
          description: "Assign permissions to local profiles.",
          icon: ShieldCheck,
        }
      : null,
    session.principal.permissions.includes("manage_application_settings")
      ? {
          href: "/settings/system",
          label: "System diagnostics",
          description: "Review deployment, database, storage, and runtime readiness.",
          icon: Activity,
        }
      : null,
  ].filter((tool): tool is NonNullable<typeof tool> => tool !== null);
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
      <section className="mt-10" aria-labelledby="workspace-tools-heading">
        <div>
          <p className="eyebrow">More workspace tools</p>
          <h2 id="workspace-tools-heading" className="mt-2 text-xl font-semibold tracking-tight">
            Keep the sidebar focused
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Setup, identity, data portability, and learning-map destinations are available here when
            you need them.
          </p>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {workspaceTools.map((tool) => {
            const Icon = tool.icon;
            return <SettingsLink key={tool.href} {...tool} icon={Icon} />;
          })}
        </div>
      </section>
      {adminTools.length ? (
        <section className="mt-10" aria-labelledby="admin-tools-heading">
          <div>
            <p className="eyebrow">Administration</p>
            <h2 id="admin-tools-heading" className="mt-2 text-xl font-semibold tracking-tight">
              Manage the installation
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              Restricted tools stay grouped here and only appear for profiles that can use them.
            </p>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {adminTools.map((tool) => {
              const Icon = tool.icon;
              return <SettingsLink key={tool.href} {...tool} icon={Icon} />;
            })}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function SettingsLink({
  href,
  label,
  description,
  icon: Icon,
}: {
  href: string;
  label: string;
  description: string;
  icon: typeof Route;
}) {
  return (
    <Link
      href={href as never}
      className="group flex items-start gap-3 rounded-lg border bg-card p-4 transition-colors hover:bg-muted/50"
    >
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-accent/10 text-accent">
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium group-hover:text-accent">{label}</span>
        <span className="mt-1 block text-xs leading-5 text-muted-foreground">{description}</span>
      </span>
      <ArrowRight
        className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
        aria-hidden="true"
      />
    </Link>
  );
}
