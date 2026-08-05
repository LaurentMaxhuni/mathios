import Link from "next/link";
import { ArrowLeft, Edit3, Network, ShieldCheck } from "lucide-react";
import { redirect } from "next/navigation";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { ErrorState } from "@/components/shared/error-state";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import {
  BulkRelationshipForm,
  ConceptForm,
  RelationshipDeleteForm,
  RelationshipForm,
  ValidateGraphForm,
} from "@/features/concepts/components/concept-forms";
import { canAuthorConcepts, validateConceptGraph } from "@/features/concepts/service";
import { getCurrentSession } from "@/infrastructure/auth/local-auth-provider";
import { getConceptRepository } from "@/infrastructure/database/repositories/concept-repository";
import { getCurriculumRepository } from "@/infrastructure/database/repositories/curriculum-repository";

export default async function ConceptManagementPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  const session = await getCurrentSession().catch(() => null);
  if (!session) redirect("/profiles");
  if (!canAuthorConcepts(session.principal)) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-7 sm:px-6 lg:px-10 lg:py-10">
        <Breadcrumbs current="Concept management" />
        <div className="mt-6">
          <ErrorState
            title="Content author permission required"
            description="Teachers, content creators, and administrators can manage concepts and graph relationships."
          />
        </div>
      </div>
    );
  }
  const { edit } = await searchParams;
  const conceptRepository = getConceptRepository();
  const structureRepository = getCurriculumRepository();
  const [concepts, relationships, subjects, domains, grades, snapshot, selected] =
    await Promise.all([
      conceptRepository.listConcepts({ includeArchived: true }),
      conceptRepository.listRelationships(),
      structureRepository.listSubjects(),
      structureRepository.listDomains(),
      structureRepository.listGrades(),
      conceptRepository.getIntegritySnapshot(),
      edit ? conceptRepository.getConcept(edit) : Promise.resolve(null),
    ]);
  const report = validateConceptGraph(snapshot);
  return (
    <div className="mx-auto w-full max-w-[1500px] px-4 py-7 sm:px-6 lg:px-10 lg:py-10">
      <Breadcrumbs current="Concept management" />
      <div className="mt-6 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <Link
            href="/concepts"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Concept explorer
          </Link>
          <p className="eyebrow mt-5">Content governance · Phase 4</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            Concept and graph studio
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground sm:text-base">
            Author reusable concepts, connect them to lessons and objectives, and keep required
            prerequisite paths acyclic.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/knowledge-graph"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            <Network className="h-4 w-4" aria-hidden="true" /> Preview graph
          </Link>
          <Badge variant="success">
            <ShieldCheck className="mr-1 h-3.5 w-3.5" aria-hidden="true" /> Authoring enabled
          </Badge>
        </div>
      </div>
      <div className="mt-8 grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{selected ? `Edit ${selected.name}` : "Create a concept"}</CardTitle>
              <CardDescription>
                Give the idea a stable identity that can be reused across lessons and curricula.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ConceptForm
                concept={selected ?? undefined}
                subjects={subjects}
                domains={domains}
                grades={grades}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Graph validation</CardTitle>
              <CardDescription>
                Orphaned concepts are reported for review; missing IDs and required cycles block
                authoring mutations.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Metric label="Concepts" value={concepts.length} />
                <Metric label="Edges" value={relationships.length} />
                <Metric label="Orphans" value={report.orphanedConceptIds.length} />
                <Metric label="Cycles" value={report.requiredCycle ? 1 : 0} />
              </div>
              <ValidateGraphForm />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Bulk relationship import</CardTitle>
              <CardDescription>
                Use stable slugs or IDs, one edge per line. The import validates the complete
                required graph as it goes.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <BulkRelationshipForm />
            </CardContent>
          </Card>
        </div>
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Existing concepts</CardTitle>
              <CardDescription>
                Archived concepts remain visible to authors and can be restored without losing
                links.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {concepts.map((concept) => (
                <Link
                  key={concept.id}
                  href={`/concepts/${concept.id}`}
                  className="group flex items-center justify-between gap-4 rounded-xl border p-4 transition hover:border-accent/50 hover:bg-accent/5"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{concept.name}</p>
                      <Badge variant={concept.isArchived ? "warning" : "success"}>
                        {concept.isArchived ? "archived" : concept.difficulty}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {concept.subjectName} · {concept.lessonCount} lessons ·{" "}
                      {concept.relationshipCount} relationships
                    </p>
                  </div>
                  <Edit3
                    className="h-4 w-4 shrink-0 text-muted-foreground transition group-hover:text-accent"
                    aria-hidden="true"
                  />
                </Link>
              ))}
              {!concepts.length ? (
                <p className="text-sm text-muted-foreground">No concepts yet.</p>
              ) : null}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Add a relationship</CardTitle>
              <CardDescription>
                “Source requires target” is the convention for prerequisite edges.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RelationshipForm concepts={concepts.filter((concept) => !concept.isArchived)} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Relationship ledger</CardTitle>
              <CardDescription>Review or remove graph edges individually.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {relationships.map((relationship) => (
                <div
                  key={relationship.id}
                  className="flex items-center justify-between gap-4 rounded-lg border p-3 text-sm"
                >
                  <div className="min-w-0">
                    <p className="font-medium">
                      {relationship.sourceConcept.name}{" "}
                      <span className="mx-1 text-muted-foreground">{relationship.type}</span>{" "}
                      {relationship.targetConcept.name}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {relationship.sourceConcept.subjectId} →{" "}
                      {relationship.targetConcept.subjectId}
                    </p>
                  </div>
                  <RelationshipDeleteForm relationshipId={relationship.id} />
                </div>
              ))}
              {!relationships.length ? (
                <p className="text-sm text-muted-foreground">No relationships yet.</p>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border bg-muted/40 p-3 text-center">
      <p className="text-xl font-semibold">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
