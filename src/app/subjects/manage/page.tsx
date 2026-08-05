import Link from "next/link";
import { ArrowLeft, Beaker } from "lucide-react";
import { redirect } from "next/navigation";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { ErrorState } from "@/components/shared/error-state";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArchiveButton,
  LearningObjectiveForm,
  StructureMappingForm,
  SubjectForm,
} from "@/features/curricula/components/management-forms";
import { canManageStructure } from "@/features/curricula/service";
import { getCurrentSession } from "@/infrastructure/auth/local-auth-provider";
import { getCurriculumRepository } from "@/infrastructure/database/repositories/curriculum-repository";

export default async function SubjectManagementPage() {
  const session = await getCurrentSession().catch(() => null);
  if (!session) redirect("/profiles");
  if (!canManageStructure(session.principal))
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-7 sm:px-6 lg:px-10 lg:py-10">
        <Breadcrumbs current="Subject management" />
        <div className="mt-6">
          <ErrorState
            title="Structure manager permission required"
            description="Only administrators and content creators can edit subject structure."
          />
        </div>
      </div>
    );
  const repository = getCurriculumRepository();
  const [subjects, curricula, domains, grades] = await Promise.all([
    repository.listSubjects({ includeArchived: true }),
    repository.listCurricula(),
    repository.listDomains(),
    repository.listGrades(),
  ]);
  const objectives = curricula[0]
    ? await repository.listLearningObjectives({ curriculumId: curricula[0].id })
    : [];
  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 py-7 sm:px-6 lg:px-10 lg:py-10">
      <Breadcrumbs current="Subject management" />
      <div className="mt-6">
        <Link
          href="/subjects"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Explorer
        </Link>
        <div className="mt-5 flex items-center gap-3">
          <Beaker className="h-5 w-5 text-accent" aria-hidden="true" />
          <p className="eyebrow">Content governance</p>
        </div>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Subject management</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
          Keep subjects reusable. Curriculum and grade mappings decide where they appear; domain
          mappings decide what their structure contains.
        </p>
      </div>
      <div className="mt-8 grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <Card>
          <CardHeader>
            <CardTitle>Create subject</CardTitle>
            <CardDescription>
              Define the stable subject record once, then reuse it across curricula.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SubjectForm />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Existing subjects</CardTitle>
            <CardDescription>
              Accent tokens connect the structure to the shared subject color system.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {subjects.map((subject) => (
              <details key={subject.id} className="group rounded-xl border p-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
                  <span>
                    <span className="font-medium">{subject.name}</span>
                    <span className="ml-2 text-xs text-muted-foreground">{subject.slug}</span>
                  </span>
                  <span className="flex items-center gap-2">
                    <Badge variant={subject.isArchived ? "warning" : "success"}>
                      {subject.isArchived ? "Archived" : "Active"}
                    </Badge>
                    <span className="text-muted-foreground transition group-open:rotate-180">
                      ⌄
                    </span>
                  </span>
                </summary>
                <div className="mt-5 border-t pt-5">
                  <SubjectForm subject={subject} />
                  <div className="mt-4 flex justify-end">
                    <ArchiveButton
                      entity="subject"
                      id={subject.id}
                      isArchived={subject.isArchived}
                    />
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
              <CardTitle>Attach a domain</CardTitle>
              <CardDescription>
                Domains can be reused under a subject only after an explicit mapping.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <StructureMappingForm
                kind="subject-domain"
                curricula={curricula}
                grades={grades}
                subjects={subjects.filter((item) => !item.isArchived)}
                domains={domains}
                objectives={objectives}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Create an objective</CardTitle>
              <CardDescription>
                Objectives inherit curriculum context and may optionally point to a domain.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <LearningObjectiveForm
                curriculumId={curricula[0].id}
                subjects={subjects.filter((item) => !item.isArchived)}
                domains={domains}
              />
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
