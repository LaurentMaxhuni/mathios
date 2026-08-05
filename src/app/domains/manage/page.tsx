import Link from "next/link";
import { ArrowLeft, Network } from "lucide-react";
import { redirect } from "next/navigation";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { ErrorState } from "@/components/shared/error-state";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArchiveButton,
  DomainForm,
  StructureMappingForm,
} from "@/features/curricula/components/management-forms";
import { canManageStructure } from "@/features/curricula/service";
import { getCurrentSession } from "@/infrastructure/auth/local-auth-provider";
import { getCurriculumRepository } from "@/infrastructure/database/repositories/curriculum-repository";

export default async function DomainManagementPage() {
  const session = await getCurrentSession().catch(() => null);
  if (!session) redirect("/profiles");
  if (!canManageStructure(session.principal))
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-7 sm:px-6 lg:px-10 lg:py-10">
        <Breadcrumbs current="Domain management" />
        <div className="mt-6">
          <ErrorState
            title="Structure manager permission required"
            description="Only administrators and content creators can edit domain structure."
          />
        </div>
      </div>
    );
  const repository = getCurriculumRepository();
  const [domains, subjects, curricula, grades] = await Promise.all([
    repository.listDomains({ includeArchived: true }),
    repository.listSubjects(),
    repository.listCurricula(),
    repository.listGrades(),
  ]);
  const objectives = curricula[0]
    ? await repository.listLearningObjectives({ curriculumId: curricula[0].id })
    : [];
  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 py-7 sm:px-6 lg:px-10 lg:py-10">
      <Breadcrumbs current="Domain management" />
      <div className="mt-6">
        <Link
          href="/subjects"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Subjects
        </Link>
        <div className="mt-5 flex items-center gap-3">
          <Network className="h-5 w-5 text-accent" aria-hidden="true" />
          <p className="eyebrow">Content governance</p>
        </div>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Domain management</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
          A domain is a durable subject concept such as Algebra or Mechanics. Grade-domain mappings
          add required status and a depth from 1 to 5.
        </p>
      </div>
      <div className="mt-8 grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <Card>
          <CardHeader>
            <CardTitle>Create domain</CardTitle>
            <CardDescription>
              Define a domain independently, then attach it to one or more subjects.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DomainForm />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Existing domains</CardTitle>
            <CardDescription>
              Archive rather than delete domains that have historical mappings.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {domains.map((domain) => (
              <details key={domain.id} className="group rounded-xl border p-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
                  <span>
                    <span className="font-medium">{domain.name}</span>
                    <span className="ml-2 text-xs text-muted-foreground">{domain.slug}</span>
                  </span>
                  <span className="flex items-center gap-2">
                    <Badge variant={domain.isArchived ? "warning" : "success"}>
                      {domain.isArchived ? "Archived" : "Active"}
                    </Badge>
                    <span className="text-muted-foreground transition group-open:rotate-180">
                      ⌄
                    </span>
                  </span>
                </summary>
                <div className="mt-5 border-t pt-5">
                  <DomainForm domain={domain} />
                  <div className="mt-4 flex justify-end">
                    <ArchiveButton entity="domain" id={domain.id} isArchived={domain.isArchived} />
                  </div>
                </div>
              </details>
            ))}
          </CardContent>
        </Card>
      </div>
      {curricula.length ? (
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Attach a domain to a subject</CardTitle>
              <CardDescription>
                The subject-domain link is required before a grade can receive depth.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <StructureMappingForm
                kind="subject-domain"
                curricula={curricula}
                grades={grades}
                subjects={subjects}
                domains={domains.filter((item) => !item.isArchived)}
                objectives={objectives}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Set grade depth</CardTitle>
              <CardDescription>
                Depth 1 is introductory; depth 5 is an advanced or Olympiad-level treatment.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <StructureMappingForm
                kind="grade-domain"
                curricula={curricula}
                grades={grades}
                subjects={subjects}
                domains={domains.filter((item) => !item.isArchived)}
                objectives={objectives}
              />
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
