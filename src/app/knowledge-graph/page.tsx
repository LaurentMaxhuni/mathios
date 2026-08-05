import Link from "next/link";
import { ArrowLeft, Network } from "lucide-react";
import { redirect } from "next/navigation";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { KnowledgeGraphView } from "@/features/concepts/components/knowledge-graph";
import { canAuthorConcepts } from "@/features/concepts/service";
import { getCurrentSession } from "@/infrastructure/auth/local-auth-provider";
import { getConceptRepository } from "@/infrastructure/database/repositories/concept-repository";
import { getCurriculumRepository } from "@/infrastructure/database/repositories/curriculum-repository";

export default async function KnowledgeGraphPage() {
  const session = await getCurrentSession().catch(() => null);
  if (!session) redirect("/profiles");
  const author = canAuthorConcepts(session.principal);
  const [graph, subjects, domains, grades] = await Promise.all([
    getConceptRepository().getGraph({ includeArchived: author }),
    getCurriculumRepository().listSubjects(),
    getCurriculumRepository().listDomains(),
    getCurriculumRepository().listGrades(),
  ]);
  return (
    <div className="mx-auto w-full max-w-[1600px] px-4 py-7 sm:px-6 lg:px-10 lg:py-10">
      <Breadcrumbs current="Knowledge graph" />
      <div className="mt-6 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <Link
            href="/concepts"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Concept explorer
          </Link>
          <p className="eyebrow mt-5">Graph studio · Phase 4</p>
          <h1 className="mt-2 flex items-center gap-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            <Network className="h-8 w-8 text-accent" aria-hidden="true" /> The knowledge graph
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground sm:text-base">
            Pan through the concept network, filter the curriculum lens, and select a node to see
            its prerequisite and descendant paths. A node with required prerequisites is visibly
            locked until its path is understood.
          </p>
        </div>
        {author ? (
          <Link
            href="/concepts/manage"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            Manage graph
          </Link>
        ) : null}
      </div>
      <Card className="mt-8 overflow-hidden">
        <CardContent className="p-4 sm:p-6">
          <KnowledgeGraphView graph={graph} subjects={subjects} domains={domains} grades={grades} />
        </CardContent>
      </Card>
    </div>
  );
}
