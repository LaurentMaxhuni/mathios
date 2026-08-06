import { redirect } from "next/navigation";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { hasPermission } from "@/features/auth/authorization";
import { getCurrentSession } from "@/infrastructure/auth/local-auth-provider";
import { getReadinessReport } from "@/server/health";

export const dynamic = "force-dynamic";

export default async function SystemDiagnosticsPage() {
  const session = await getCurrentSession().catch(() => null);
  if (!session) redirect("/profiles");
  if (!hasPermission(session.principal, "manage_application_settings")) redirect("/settings");

  const report = await getReadinessReport();
  const checks = Object.entries(report.checks);
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-7 sm:px-6 lg:px-10 lg:py-10">
      <Breadcrumbs current="System diagnostics" />
      <div className="mt-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">Operations</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">System diagnostics</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
          A safe, deployment-facing view of the database, migration, storage, and runtime
          configuration checks. Secrets and connection strings are never displayed here.
        </p>
      </div>
      <Card className="mt-7">
        <CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
          <div>
            <CardTitle>Readiness</CardTitle>
            <CardDescription>Checked {report.timestamp}</CardDescription>
          </div>
          <Badge variant={report.status === "ready" ? "success" : "warning"}>
            {report.status === "ready" ? "Ready" : "Needs attention"}
          </Badge>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Database provider
              </dt>
              <dd className="mt-1 text-sm font-medium">{report.details.databaseProvider}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Storage provider
              </dt>
              <dd className="mt-1 text-sm font-medium">{report.details.storageProvider}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Latest migration
              </dt>
              <dd className="mt-1 break-all font-mono text-xs">
                {report.details.latestMigration ?? "Not available"}
              </dd>
            </div>
          </dl>
          <div className="mt-7 divide-y rounded-lg border">
            {checks.map(([name, status]) => (
              <div key={name} className="flex items-center justify-between gap-4 px-4 py-3">
                <span className="text-sm capitalize">{name}</span>
                <Badge variant={status === "ok" ? "success" : "warning"}>{status}</Badge>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Response latency: {report.latencyMs} ms
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
