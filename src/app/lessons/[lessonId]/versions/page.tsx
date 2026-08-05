import Link from "next/link";
import { ArrowLeft, History } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { VersionRestoreForm } from "@/features/courses/components/version-restore-form";
import { canAuthorCourses } from "@/features/courses/service";
import { getCurrentSession } from "@/infrastructure/auth/local-auth-provider";
import { getCourseRepository } from "@/infrastructure/database/repositories/course-repository";

export default async function LessonVersionsPage({
  params,
}: {
  params: Promise<{ lessonId: string }>;
}) {
  const { lessonId } = await params;
  const session = await getCurrentSession().catch(() => null);
  if (!session) redirect("/profiles");
  if (!canAuthorCourses(session.principal)) redirect(`/lessons/${lessonId}`);
  const repository = getCourseRepository();
  const data = await repository.getLessonEditor(lessonId);
  if (!data) notFound();
  return (
    <div className="mx-auto w-full max-w-[1000px] px-4 py-7 sm:px-6 lg:px-10 lg:py-10">
      <Breadcrumbs current="Version history" />
      <div className="mt-6">
        <Link
          href={`/lessons/${lessonId}/edit`}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Lesson editor
        </Link>
        <div className="mt-5 flex items-center gap-3">
          <History className="h-6 w-6 text-accent" aria-hidden="true" />
          <div>
            <p className="eyebrow">Version history</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight">{data.lesson.title}</h1>
          </div>
        </div>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
          Every publish creates a durable snapshot. Restoring a previous version creates a new draft
          so the published reader remains stable.
        </p>
      </div>
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>{data.versions.length} saved versions</CardTitle>
          <CardDescription>
            Drafts can be edited; published and archived snapshots can be restored.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.versions.map((version) => (
            <div
              key={version.id}
              className="flex flex-col justify-between gap-4 rounded-xl border p-4 sm:flex-row sm:items-center"
            >
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    variant={
                      version.status === "published"
                        ? "success"
                        : version.status === "draft"
                          ? "warning"
                          : "outline"
                    }
                  >
                    v{version.versionNumber} · {version.status}
                  </Badge>
                  {version.publishedAt ? (
                    <span className="text-xs text-muted-foreground">
                      Published {new Date(version.publishedAt).toLocaleDateString()}
                    </span>
                  ) : null}
                </div>
                <p className="mt-2 text-sm font-medium">
                  {version.changeSummary || "No change summary"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Created {new Date(version.createdAt).toLocaleString()}
                </p>
              </div>
              <VersionRestoreForm
                lessonId={lessonId}
                versionId={version.id}
                disabled={version.status === "draft"}
              />
            </div>
          ))}
          {!data.versions.length ? (
            <p className="text-sm text-muted-foreground">No versions yet.</p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
