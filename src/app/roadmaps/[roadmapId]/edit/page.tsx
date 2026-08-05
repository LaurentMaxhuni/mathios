import Link from "next/link";
import { ArrowLeft, CheckCircle2, Link2, ShieldCheck } from "lucide-react";
import type { ComponentProps } from "react";
import { redirect, notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { ErrorState } from "@/components/shared/error-state";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import {
  DeleteRoadmapEdgeForm,
  DeleteRoadmapPrerequisiteForm,
  DeleteRoadmapSubjectForm,
  RoadmapEdgeForm,
  RoadmapForm,
  RoadmapNodeForm,
  RoadmapPrerequisiteForm,
  RoadmapStatusForm,
  RoadmapSubjectForm,
} from "@/features/roadmaps/components/roadmap-forms";
import { RoadmapNodeList } from "@/features/roadmaps/components/roadmap-node-list";
import { canAuthorRoadmaps } from "@/features/roadmaps/service";
import { getCurrentSession } from "@/infrastructure/auth/local-auth-provider";
import { getRoadmapRepository } from "@/infrastructure/database/repositories/roadmap-repository";
import { getCurriculumRepository } from "@/infrastructure/database/repositories/curriculum-repository";

export default async function RoadmapEditPage({
  params,
}: {
  params: Promise<{ roadmapId: string }>;
}) {
  const session = await getCurrentSession().catch(() => null);
  if (!session) redirect("/profiles");
  if (!canAuthorRoadmaps(session.principal))
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-7 sm:px-6 lg:px-10 lg:py-10">
        <Breadcrumbs current="Roadmap editor" />
        <div className="mt-6">
          <ErrorState
            title="Content author permission required"
            description="This editor is restricted to roadmap authors."
          />
        </div>
      </div>
    );
  const { roadmapId } = await params;
  const repository = getRoadmapRepository();
  const detail = await repository.getRoadmap(roadmapId, { includeDraft: true });
  if (!detail) notFound();
  const curriculum = getCurriculumRepository();
  const [subjects, grades, roadmaps] = await Promise.all([
    curriculum.listSubjects(),
    curriculum.listGrades(),
    repository.listRoadmaps({ includeDraft: true, includeArchived: true }),
  ]);
  return (
    <div className="mx-auto w-full max-w-[1600px] px-4 py-7 sm:px-6 lg:px-10 lg:py-10">
      <Breadcrumbs current={`Edit ${detail.roadmap.title}`} />
      <div className="mt-6 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <RoadmapLink
            href="/roadmaps/manage"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Roadmap studio
          </RoadmapLink>
          <p className="eyebrow mt-5">
            Version {detail.version.versionNumber} Â· {detail.version.status}
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            {detail.roadmap.title}
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
            Edit the current draft, connect nodes, and validate before publishing.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="success">
            <ShieldCheck className="mr-1 h-3.5 w-3.5" aria-hidden="true" /> Authoring enabled
          </Badge>
          <RoadmapStatusForm roadmap={detail.roadmap} versionStatus={detail.version.status} />
          <RoadmapLink
            href={`/roadmaps/${roadmapId}`}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            Preview learner route
          </RoadmapLink>
        </div>
      </div>
      <div className="mt-8 grid gap-6 xl:grid-cols-[0.75fr_1.25fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Roadmap identity</CardTitle>
              <CardDescription>
                Goals and target level are used by personalized ordering.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RoadmapForm roadmap={detail.roadmap} grades={grades} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Subjects</CardTitle>
              <CardDescription>Declare the subject lens a learner should expect.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <RoadmapSubjectForm roadmapId={roadmapId} subjects={subjects} />
              <div className="space-y-2">
                {detail.subjects.map((subject) => (
                  <div
                    key={subject.subjectId}
                    className="flex items-center justify-between rounded-lg border p-3 text-sm"
                  >
                    <span>{subject.subjectName}</span>
                    <DeleteRoadmapSubjectForm roadmapId={roadmapId} subjectId={subject.subjectId} />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Roadmap prerequisites</CardTitle>
              <CardDescription>
                Connect this path to an earlier path without creating a self-dependency.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <RoadmapPrerequisiteForm roadmapId={roadmapId} roadmaps={roadmaps} />
              {detail.prerequisites.map((item) => (
                <div
                  key={item.prerequisiteRoadmapId}
                  className="flex items-center justify-between rounded-lg border p-3 text-sm"
                >
                  <span>{item.prerequisiteTitle}</span>
                  <DeleteRoadmapPrerequisiteForm
                    roadmapId={roadmapId}
                    prerequisiteRoadmapId={item.prerequisiteRoadmapId}
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Graph validation</CardTitle>
              <CardDescription>
                Required edges are checked for cycles, missing nodes, duplicate keys, and missing
                reusable references.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Metric label="Nodes" value={detail.nodes.length} />
                <Metric label="Edges" value={detail.edges.length} />
                <Metric label="Errors" value={detail.integrity.errors.length} />
                <Metric label="Warnings" value={detail.integrity.warnings.length} />
              </div>
              {detail.integrity.valid ? (
                <p className="mt-4 flex items-center gap-2 text-sm text-accent">
                  <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> Graph is publishable.
                </p>
              ) : (
                <div className="mt-4 space-y-2 text-sm text-destructive">
                  {detail.integrity.errors.map((issue) => (
                    <p key={`${issue.code}-${issue.nodeId ?? issue.edgeId ?? "graph"}`}>
                      {issue.message}
                    </p>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Add or edit a node</CardTitle>
              <CardDescription>
                Drag nodes to reorder the learner route; the order is saved to the current version
                and stays keyboard-editable through the node forms.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RoadmapNodeForm
                roadmap={detail.roadmap}
                version={detail.version}
                subjects={subjects}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Nodes in this version</CardTitle>
              <CardDescription>
                Required nodes form the core route; optional branches remain available as
                enrichment.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RoadmapNodeList
                roadmapId={roadmapId}
                roadmapVersionId={detail.version.id}
                nodes={detail.nodes}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>
                <Link2 className="mr-2 inline h-5 w-5 text-accent" aria-hidden="true" />
                Connect nodes
              </CardTitle>
              <CardDescription>
                Source unlocks target for required edges. Recommended and optional edges are
                advisory branches.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <RoadmapEdgeForm detail={detail} />
              {detail.edges.map((edge) => (
                <div
                  key={edge.id}
                  className="flex items-center justify-between gap-4 rounded-lg border p-3 text-sm"
                >
                  <span>
                    {detail.nodes.find((node) => node.id === edge.sourceNodeId)?.title ??
                      edge.sourceNodeId}{" "}
                    <strong className="mx-1 text-accent">{edge.type}</strong>{" "}
                    {detail.nodes.find((node) => node.id === edge.targetNodeId)?.title ??
                      edge.targetNodeId}
                  </span>
                  <DeleteRoadmapEdgeForm roadmapId={roadmapId} edgeId={edge.id} />
                </div>
              ))}
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

function RoadmapLink(props: Omit<ComponentProps<typeof Link>, "href"> & { href: string }) {
  const { href, ...rest } = props;
  return <Link {...rest} href={href as never} />;
}
