import Link from "next/link";
import { ArrowLeft, Settings2 } from "lucide-react";
import { redirect } from "next/navigation";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { ErrorState } from "@/components/shared/error-state";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArchiveButton,
  CurriculumForm,
  LearningObjectiveForm,
  StructureMappingForm,
} from "@/features/curricula/components/management-forms";
import { canManageStructure } from "@/features/curricula/service";
import { getCurrentSession } from "@/infrastructure/auth/local-auth-provider";
import { getCurriculumRepository } from "@/infrastructure/database/repositories/curriculum-repository";

export default async function CurriculumManagementPage() {
  const session = await getCurrentSession().catch(() => null);
  if (!session) redirect("/profiles");
  if (!canManageStructure(session.principal)) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-7 sm:px-6 lg:px-10 lg:py-10">
        <Breadcrumbs current="Curriculum management" />
        <div className="mt-6">
          <ErrorState
            title="Structure manager permission required"
            description="Only administrators and content creators can edit curriculum structure."
          />
        </div>
      </div>
    );
  }
  const repository = getCurriculumRepository();
  const [curricula, grades, subjects, domains] = await Promise.all([
    repository.listCurricula({ includeArchived: true }),
    repository.listGrades(),
    repository.listSubjects(),
    repository.listDomains(),
  ]);
  const objectives = curricula[0]
    ? await repository.listLearningObjectives({ curriculumId: curricula[0].id })
    : [];
  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 py-7 sm:px-6 lg:px-10 lg:py-10">
      <Breadcrumbs current="Curriculum management" />
      <div className="mt-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <Link
            href="/curricula"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Explorer
          </Link>
          <p className="eyebrow mt-5">Content governance</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Curriculum management</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
            Define the top-level learning contexts, attach grades and subjects, and create
            curriculum-specific objectives. Later content phases will consume these stable
            identifiers.
          </p>
        </div>
        <Badge variant="success">
          <Settings2 className="mr-1 h-3.5 w-3.5" aria-hidden="true" /> Structure editor
        </Badge>
      </div>
      <div className="mt-8 grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <Card>
          <CardHeader>
            <CardTitle>Create curriculum</CardTitle>
            <CardDescription>
              Use a custom structure for local content or label a published framework.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CurriculumForm />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Existing curricula</CardTitle>
            <CardDescription>
              Archive structures without deleting the reusable records they contain.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {curricula.map((curriculum) => (
              <details
                key={curriculum.id}
                className="group rounded-xl border p-4"
                open={!curriculum.isArchived && curricula.length === 1}
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
                  <span>
                    <span className="font-medium">{curriculum.name}</span>
                    <span className="ml-2 text-xs text-muted-foreground">{curriculum.slug}</span>
                  </span>
                  <span className="flex items-center gap-2">
                    <Badge variant={curriculum.isArchived ? "warning" : "success"}>
                      {curriculum.isArchived ? "Archived" : "Active"}
                    </Badge>
                    <span className="text-muted-foreground transition group-open:rotate-180">
                      ⌄
                    </span>
                  </span>
                </summary>
                <div className="mt-5 border-t pt-5">
                  <CurriculumForm curriculum={curriculum} />
                  <div className="mt-4 flex justify-end">
                    <ArchiveButton
                      entity="curriculum"
                      id={curriculum.id}
                      isArchived={curriculum.isArchived}
                    />
                  </div>
                </div>
              </details>
            ))}
            {!curricula.length ? (
              <p className="text-sm text-muted-foreground">No curricula yet.</p>
            ) : null}
          </CardContent>
        </Card>
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Attach a grade</CardTitle>
            <CardDescription>
              Grades can be reused by multiple curricula and reordered independently here.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <StructureMappingForm
              kind="curriculum-grade"
              curricula={curricula.filter((item) => !item.isArchived)}
              grades={grades}
              subjects={subjects}
              domains={domains}
              objectives={objectives}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Attach a subject</CardTitle>
            <CardDescription>
              Choose whether a subject is required or optional at curriculum level.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <StructureMappingForm
              kind="curriculum-subject"
              curricula={curricula.filter((item) => !item.isArchived)}
              grades={grades}
              subjects={subjects}
              domains={domains}
              objectives={objectives}
            />
          </CardContent>
        </Card>
      </div>
      {curricula[0] ? (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Curriculum objective</CardTitle>
            <CardDescription>
              Objectives are scoped to a curriculum and subject, then assigned to one or more
              grades.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <LearningObjectiveForm
              curriculumId={curricula[0].id}
              subjects={subjects}
              domains={domains}
            />
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
