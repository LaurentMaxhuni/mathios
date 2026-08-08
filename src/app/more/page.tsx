import Link from "next/link";
import {
  ArrowRight,
  Bot,
  CalendarDays,
  FlaskConical,
  GitBranch,
  Search,
  Settings2,
  StickyNote,
} from "lucide-react";
import { redirect } from "next/navigation";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { canAuthorCourses } from "@/features/courses/service";
import { getCurrentSession } from "@/infrastructure/auth/local-auth-provider";

const tools = [
  ["/simulations", "Simulations", "Try a model and see the idea move.", FlaskConical],
  ["/laboratories", "Laboratories", "Measure, observe, and write up what you find.", FlaskConical],
  ["/notes", "Notes", "Keep a personal layer beside the lessons.", StickyNote],
  ["/planner", "Planner", "Shape a weekly rhythm when you need more structure.", CalendarDays],
  ["/roadmaps", "Roadmaps", "Follow a longer path across connected ideas.", GitBranch],
  ["/search", "Search", "Find a subject, concept, lesson, or tool.", Search],
  ["/ai", "AI help", "Ask for a hint or a different explanation.", Bot],
  ["/settings", "Settings", "Adjust your daily goal and accessibility preferences.", Settings2],
] as const;

export default async function MorePage() {
  const session = await getCurrentSession().catch(() => null);
  if (!session) redirect("/profiles");
  const canManage =
    canAuthorCourses(session.principal) || session.principal.permissions.includes("manage_users");
  return (
    <div className="mx-auto w-full max-w-[1280px] px-4 py-7 sm:px-6 lg:px-10 lg:py-10">
      <Breadcrumbs current="More" />
      <header className="mt-6">
        <p className="eyebrow">More</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
          Tools for when you want them.
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
          Today, Learn, Practice, and Progress keep the daily loop clear. These surfaces are here
          when you want to go deeper.
        </p>
      </header>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tools.map(([href, label, description, Icon]) => (
          <Link key={href} href={href} className="group">
            <Card className="h-full transition hover:-translate-y-0.5 hover:border-accent/50">
              <CardContent className="flex items-start gap-3 pt-5">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-accent/10 text-accent">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <span>
                  <span className="block font-semibold">{label}</span>
                  <span className="mt-1 block text-sm leading-6 text-muted-foreground">
                    {description}
                  </span>
                  <ArrowRight
                    className="mt-3 h-4 w-4 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-accent"
                    aria-hidden="true"
                  />
                </span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
      {canManage ? (
        <section
          className="mt-10 rounded-2xl border border-dashed p-5"
          aria-labelledby="manage-heading"
        >
          <p className="eyebrow">Authorized entry point</p>
          <h2 id="manage-heading" className="mt-2 text-xl font-semibold">
            Manage content
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Authoring and administrative tools stay out of the learner loop.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href="/courses/manage"
              className="text-sm font-medium text-accent hover:underline"
            >
              Course editor
            </Link>
            <Link
              href="/content-studio"
              className="text-sm font-medium text-accent hover:underline"
            >
              Content studio
            </Link>
            <Link
              href="/settings/roles"
              className="text-sm font-medium text-accent hover:underline"
            >
              Roles
            </Link>
          </div>
        </section>
      ) : null}
    </div>
  );
}
