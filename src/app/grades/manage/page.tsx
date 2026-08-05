import Link from "next/link";
import { ArrowLeft, ListOrdered } from "lucide-react";
import { redirect } from "next/navigation";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { ErrorState } from "@/components/shared/error-state";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArchiveButton,
  GradeForm,
  StructureMappingForm,
} from "@/features/curricula/components/management-forms";
import { canManageStructure } from "@/features/curricula/service";
import { getCurrentSession } from "@/infrastructure/auth/local-auth-provider";
import { getCurriculumRepository } from "@/infrastructure/database/repositories/curriculum-repository";

export default async function GradeManagementPage() {
  const session = await getCurrentSession().catch(() => null);
  if (!session) redirect("/profiles");
  if (!canManageStructure(session.principal))
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-7 sm:px-6 lg:px-10 lg:py-10">
        <Breadcrumbs current="Grade management" />
        <div className="mt-6">
          <ErrorState
            title="Structure manager permission required"
            description="Only administrators and content creators can edit grade structure."
          />
        </div>
      </div>
    );
  const repository = getCurriculumRepository();
  const [grades, curricula, subjects, domains] = await Promise.all([
    repository.listGrades({ includeArchived: true }),
    repository.listCurricula(),
    repository.listSubjects(),
    repository.listDomains(),
  ]);
  const objectives = curricula[0]
    ? await repository.listLearningObjectives({ curriculumId: curricula[0].id })
    : [];
  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 py-7 sm:px-6 lg:px-10 lg:py-10">
      <Breadcrumbs current="Grade management" />
      <div className="mt-6">
        <Link
          href="/grades"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Explorer
        </Link>
        <div className="mt-5 flex items-center gap-3">
          <ListOrdered className="h-5 w-5 text-accent" aria-hidden="true" />
          <p className="eyebrow">Content governance</p>
        </div>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Grade management</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
          Grades are configurable records, not hardcoded route branches. Change display order to
          control the progression used in each curriculum.
        </p>
      </div>
      <div className="mt-8 grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <Card>
          <CardHeader>
            <CardTitle>Create grade</CardTitle>
            <CardDescription>
              Add a new progression point such as a local foundation level.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <GradeForm />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Existing grades</CardTitle>
            <CardDescription>
              Use archive to retire a level while preserving its mappings for audit and migration.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {grades.map((grade) => (
              <details key={grade.id} className="group rounded-xl border p-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
                  <span>
                    <span className="font-medium">{grade.name}</span>
                    <span className="ml-2 text-xs text-muted-foreground">
                      order {grade.sortOrder}
                    </span>
                  </span>
                  <span className="flex items-center gap-2">
                    <Badge variant={grade.isArchived ? "warning" : "success"}>
                      {grade.isArchived ? "Archived" : "Active"}
                    </Badge>
                    <span className="text-muted-foreground transition group-open:rotate-180">
                      ⌄
                    </span>
                  </span>
                </summary>
                <div className="mt-5 border-t pt-5">
                  <GradeForm grade={grade} />
                  <div className="mt-4 flex justify-end">
                    <ArchiveButton entity="grade" id={grade.id} isArchived={grade.isArchived} />
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
              <CardTitle>Add a subject to a grade</CardTitle>
              <CardDescription>
                The service requires both curriculum-grade and curriculum-subject availability
                before this mapping can be saved.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <StructureMappingForm
                kind="grade-subject"
                curricula={curricula}
                grades={grades.filter((item) => !item.isArchived)}
                subjects={subjects}
                domains={domains}
                objectives={objectives}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Assign a learning objective</CardTitle>
              <CardDescription>
                Place an existing curriculum objective on a grade after its subject is available.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <StructureMappingForm
                kind="grade-objective"
                curricula={curricula}
                grades={grades.filter((item) => !item.isArchived)}
                subjects={subjects}
                domains={domains}
                objectives={objectives}
              />
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
