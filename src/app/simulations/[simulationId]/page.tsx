import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { RouteLoading } from "@/components/shared/route-loading";
import { getCurrentSession } from "@/infrastructure/auth/local-auth-provider";
import { getSimulationRepository } from "@/infrastructure/database/repositories/simulation-repository";
import { getSimulation } from "@/features/simulations/service";

const SimulationPlayer = dynamic(
  () =>
    import("@/features/simulations/components/simulation-player").then(
      (module) => module.SimulationPlayer,
    ),
  { loading: () => <RouteLoading label="Loading simulation player" /> },
);

export default async function SimulationPage({
  params,
}: {
  params: Promise<{ simulationId: string }>;
}) {
  const session = await getCurrentSession().catch(() => null);
  if (!session) redirect("/profiles");
  const { simulationId } = await params;
  const detail = await getSimulation(simulationId, getSimulationRepository(), {
    profileId: session.principal.profileId,
  });
  if (!detail) notFound();
  const definition = detail.version.definition;
  const clientDefinition = {
    id: definition.id,
    slug: definition.slug,
    title: definition.title,
    inputs: definition.inputs,
    outputs: definition.outputs,
    guidedTasks: definition.guidedTasks,
  };
  return (
    <div className="mx-auto w-full max-w-[1500px] px-4 py-7 sm:px-6 lg:px-10 lg:py-10">
      <Breadcrumbs current={detail.simulation.title} />
      <div className="mt-6">
        <Link
          href={"/simulations" as never}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Simulation catalog
        </Link>
        <div className="mt-5 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="flex gap-2">
              <Badge variant="outline">{detail.simulation.subjectName}</Badge>
              <Badge variant="success">{detail.simulation.estimatedDurationMinutes} min</Badge>
            </div>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight">
              {detail.simulation.title}
            </h1>
            <p className="mt-3 max-w-3xl text-muted-foreground">{detail.simulation.description}</p>
          </div>
        </div>
      </div>
      <div className="mt-8">
        <SimulationPlayer
          simulationId={detail.simulation.id}
          definition={clientDefinition}
          presets={detail.presets.map((preset) => ({
            id: preset.id,
            name: preset.name,
            values: preset.values,
          }))}
        />
      </div>
      {detail.lessonLinks.length ? (
        <Card className="mt-6">
          <CardContent className="p-5">
            <p className="text-sm font-semibold">Used in lessons</p>
            {detail.lessonLinks.map((link) => (
              <Link
                key={link.lessonId}
                className="mt-2 block text-sm text-accent hover:underline"
                href={`/lessons/${link.lessonId}` as never}
              >
                {link.lessonTitle}
                {link.instructions ? ` · ${link.instructions}` : ""}
              </Link>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
