import Link from "next/link";
import { ArrowRight, BookOpenCheck, FlaskConical } from "lucide-react";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getLaboratoryRepository } from "@/infrastructure/database/repositories/laboratory-repository";
import { listLaboratoryActivities } from "@/features/laboratory/service";

export default async function LaboratoriesPage() {
  const activities = await listLaboratoryActivities(getLaboratoryRepository());
  return (
    <div className="mx-auto w-full max-w-[1500px] px-4 py-7 sm:px-6 lg:px-10 lg:py-10">
      <Breadcrumbs current="Virtual laboratory" />
      <div className="mt-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Evidence in motion</p>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight">Virtual laboratory</h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Run a simulation, follow a real-world method, record observations, and turn your
            measurements into a scientific report.
          </p>
        </div>
        <Badge variant="outline">{activities.length} activities</Badge>
      </div>
      <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {activities.map((activity) => (
          <Link key={activity.id} href={`/laboratories/${activity.id}` as never} className="group">
            <Card className="h-full transition-colors group-hover:border-accent">
              <CardHeader>
                <div className="flex items-center justify-between gap-3">
                  <Badge variant="outline">{activity.subjectName}</Badge>
                  <FlaskConical className="h-5 w-5 text-accent" aria-hidden="true" />
                </div>
                <CardTitle className="mt-3">{activity.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  <Badge variant={activity.mode === "real-world" ? "outline" : "success"}>
                    {activity.mode}
                  </Badge>
                  <Badge variant="outline">{activity.estimatedDurationMinutes} min</Badge>
                </div>
                <p className="mt-4 text-sm leading-6 text-muted-foreground">
                  {activity.description}
                </p>
                <span className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-accent">
                  Open laboratory{" "}
                  <ArrowRight
                    className="h-4 w-4 transition-transform group-hover:translate-x-1"
                    aria-hidden="true"
                  />
                </span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
      <Card className="mt-8 border-accent/20 bg-accent/5">
        <CardContent className="flex flex-wrap items-center gap-4 p-5">
          <BookOpenCheck className="h-5 w-5 text-accent" aria-hidden="true" />
          <p className="text-sm text-muted-foreground">
            Each activity keeps procedure, raw data, uncertainty, graphing, questions, and report
            writing in one reproducible workspace.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
