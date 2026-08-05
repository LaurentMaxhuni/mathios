import Link from "next/link";
import { ArrowRight, FlaskConical } from "lucide-react";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSimulationRepository } from "@/infrastructure/database/repositories/simulation-repository";
import { listSimulations } from "@/features/simulations/service";

export default async function SimulationsPage() {
  const simulations = await listSimulations(getSimulationRepository());
  return (
    <div className="mx-auto w-full max-w-[1500px] px-4 py-7 sm:px-6 lg:px-10 lg:py-10">
      <Breadcrumbs current="Simulations" />
      <div className="mt-7 flex items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Interactive science</p>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight">Simulations</h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Change variables, watch a model evolve, and keep the result with your learning history.
          </p>
        </div>
        <Badge variant="outline">{simulations.length} models</Badge>
      </div>
      <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {simulations.map((simulation) => (
          <Link
            href={`/simulations/${simulation.id}` as never}
            key={simulation.id}
            className="group"
          >
            <Card className="h-full transition-colors group-hover:border-accent">
              <CardHeader>
                <div className="flex items-center justify-between gap-3">
                  <Badge variant="outline">{simulation.subjectName}</Badge>
                  <FlaskConical className="h-5 w-5 text-accent" aria-hidden="true" />
                </div>
                <CardTitle className="mt-3">{simulation.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-6 text-muted-foreground">{simulation.description}</p>
                <p className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-accent">
                  Open model{" "}
                  <ArrowRight
                    className="h-4 w-4 transition-transform group-hover:translate-x-1"
                    aria-hidden="true"
                  />
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
