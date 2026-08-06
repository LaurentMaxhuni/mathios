"use client";

import Link from "next/link";
import {
  ArrowLeft,
  Award,
  BookOpen,
  ClipboardCheck,
  Clock3,
  KeyRound,
  MessageSquareText,
  RotateCcw,
  Send,
  UserPlus,
  UsersRound,
} from "lucide-react";
import { useState } from "react";
import type {
  AssignableResource,
  AssignmentRecord,
  ClassroomDetail,
  SubmissionRecord,
} from "@/domain/classroom/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

interface Props {
  classId: string;
  initialDetail: ClassroomDetail;
  resources: readonly AssignableResource[];
}

interface ReviewDraft {
  status: "returned" | "resubmission-required" | "graded";
  grade: string;
  feedback: string;
}

async function errorMessage(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { message?: string };
    return body.message ?? `Request failed (${response.status}).`;
  } catch {
    return `Request failed (${response.status}).`;
  }
}

function formatDate(value: string | null): string {
  if (!value) return "No date set";
  return new Date(value).toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
}

function toIso(value: string): string | null {
  return value ? new Date(value).toISOString() : null;
}

function statusVariant(status: string): "success" | "warning" | "outline" {
  if (status === "graded" || status === "published") return "success";
  if (status === "resubmission-required" || status === "returned") return "warning";
  return "outline";
}

function parseRubricCriteria(
  value: string,
): Array<{ id: string; label: string; maxPoints: number }> {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const [label = `Criterion ${index + 1}`, points = "1"] = line
        .split("|")
        .map((item) => item.trim());
      return { id: `criterion-${index + 1}`, label, maxPoints: Number(points) || 1 };
    });
}

function targetStatus(assignment: AssignmentRecord, profileId: string): string {
  return (
    assignment.targets.find((target) => target.profileId === profileId)?.status ?? "not-started"
  );
}

export function ClassroomDetailWorkspace({ classId, initialDetail, resources }: Props) {
  const [detail, setDetail] = useState(initialDetail);
  const [assignmentTitle, setAssignmentTitle] = useState("");
  const [assignmentInstructions, setAssignmentInstructions] = useState("");
  const [resourceKey, setResourceKey] = useState(
    resources[0] ? `${resources[0].type}:${resources[0].id}` : "",
  );
  const [targetScope, setTargetScope] = useState<"class" | "individual">("class");
  const [targetProfileIds, setTargetProfileIds] = useState("");
  const [startAt, setStartAt] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [attemptLimit, setAttemptLimit] = useState("");
  const [lateSubmissionRule, setLateSubmissionRule] = useState<"allow" | "flag" | "forbid">("flag");
  const [rubricTitle, setRubricTitle] = useState("");
  const [rubricCriteria, setRubricCriteria] = useState("");
  const [inviteRole, setInviteRole] = useState<"learner" | "teacher">("learner");
  const [inviteProfileId, setInviteProfileId] = useState("");
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [reviews, setReviews] = useState<Record<string, ReviewDraft>>({});
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const canManage = detail.analytics !== null;

  async function refresh(): Promise<void> {
    const response = await fetch(`/api/classrooms/${classId}`, { cache: "no-store" });
    if (!response.ok) throw new Error(await errorMessage(response));
    setDetail((await response.json()) as ClassroomDetail);
  }

  function selectedResource(): AssignableResource | undefined {
    const [type, id] = resourceKey.split(":");
    return resources.find((resource) => resource.type === type && resource.id === id);
  }

  async function createAssignment(): Promise<void> {
    const resource = selectedResource();
    if (!resource) {
      setNotice("Choose a published resource first.");
      return;
    }
    setBusy("assignment");
    setNotice(null);
    try {
      const response = await fetch(`/api/classrooms/${classId}/assignments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: assignmentTitle,
          instructions: assignmentInstructions,
          resourceType: resource.type,
          resourceId: resource.id,
          targetScope,
          targetProfileIds: targetProfileIds
            .split(",")
            .map((value) => value.trim())
            .filter(Boolean),
          startAt: toIso(startAt),
          dueAt: toIso(dueAt),
          attemptLimit: attemptLimit ? Number(attemptLimit) : null,
          lateSubmissionRule,
          rubricTitle,
          rubricCriteria: parseRubricCriteria(rubricCriteria),
        }),
      });
      if (!response.ok) throw new Error(await errorMessage(response));
      setAssignmentTitle("");
      setAssignmentInstructions("");
      setTargetProfileIds("");
      setRubricTitle("");
      setRubricCriteria("");
      await refresh();
      setNotice("Assignment published to the selected learners.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Assignment could not be created.");
    } finally {
      setBusy(null);
    }
  }

  async function createInvitation(): Promise<void> {
    setBusy("invite");
    setNotice(null);
    try {
      const response = await fetch(`/api/classrooms/${classId}/invitations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: inviteRole,
          invitedProfileId: inviteProfileId.trim() || null,
        }),
      });
      if (!response.ok) throw new Error(await errorMessage(response));
      const invitation = (await response.json()) as { code: string };
      setInviteProfileId("");
      await refresh();
      setNotice(`Invitation created. Share code ${invitation.code}.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Invitation could not be created.");
    } finally {
      setBusy(null);
    }
  }

  async function submit(assignment: AssignmentRecord): Promise<void> {
    setBusy(`submit-${assignment.id}`);
    setNotice(null);
    try {
      const response = await fetch(
        `/api/classrooms/${classId}/assignments/${assignment.id}/submissions`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ response: responses[assignment.id] ?? "" }),
        },
      );
      if (!response.ok) throw new Error(await errorMessage(response));
      setResponses((current) => ({ ...current, [assignment.id]: "" }));
      await refresh();
      setNotice("Work submitted. Your teacher can now return feedback or a grade.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Submission could not be sent.");
    } finally {
      setBusy(null);
    }
  }

  async function review(submission: SubmissionRecord): Promise<void> {
    const draft = reviews[submission.id] ?? { status: "graded" as const, grade: "", feedback: "" };
    setBusy(`review-${submission.id}`);
    setNotice(null);
    try {
      const response = await fetch(
        `/api/classrooms/${classId}/assignments/${submission.assignmentId}/submissions/${submission.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: draft.status,
            grade: draft.grade === "" ? null : Number(draft.grade),
            gradeMax: 100,
            feedback: draft.feedback || null,
            rubricScores: {},
          }),
        },
      );
      if (!response.ok) throw new Error(await errorMessage(response));
      await refresh();
      setNotice("Feedback saved and the submission status was updated.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Feedback could not be saved.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-8">
      <section className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <Link
            href={"/classrooms" as never}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to classrooms
          </Link>
          <p className="eyebrow mt-6">Shared learning room</p>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight">{detail.classroom.name}</h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            {detail.classroom.description || "A focused Mathios classroom."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={canManage ? "success" : "outline"}>
            {canManage ? "Teacher access" : "Learner access"}
          </Badge>
          <Badge variant="outline">
            <KeyRound className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
            {detail.classroom.joinCode}
          </Badge>
        </div>
      </section>

      {notice ? (
        <div className="rounded-lg border border-accent/30 bg-accent/10 p-3 text-sm" role="status">
          {notice}
        </div>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={UsersRound} label="Learners" value={`${detail.members.length}`} />
        <MetricCard
          icon={ClipboardCheck}
          label="Assignments"
          value={`${detail.assignments.length}`}
        />
        <MetricCard icon={Send} label="Submissions" value={`${detail.submissions.length}`} />
        <MetricCard
          icon={Award}
          label="Average grade"
          value={
            detail.analytics?.averageGrade === null || detail.analytics?.averageGrade === undefined
              ? "—"
              : `${Math.round(detail.analytics.averageGrade * 100)}%`
          }
        />
      </section>

      {canManage ? (
        <section className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardCheck className="h-5 w-5 text-accent" aria-hidden="true" />
                Create an assignment
              </CardTitle>
              <CardDescription>
                Assign any published Mathios lesson, course, exercise set, assessment, simulation,
                laboratory, or roadmap.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <label className="block space-y-2 text-sm font-medium">
                Assignment title
                <Input
                  value={assignmentTitle}
                  onChange={(event) => setAssignmentTitle(event.target.value)}
                  placeholder="Explain motion in your own words"
                />
              </label>
              <label className="block space-y-2 text-sm font-medium">
                Instructions
                <textarea
                  value={assignmentInstructions}
                  onChange={(event) => setAssignmentInstructions(event.target.value)}
                  className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  placeholder="What should learners hand in?"
                />
              </label>
              <label className="block space-y-2 text-sm font-medium">
                Published resource
                <select
                  value={resourceKey}
                  onChange={(event) => setResourceKey(event.target.value)}
                  className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {resources.map((resource) => (
                    <option
                      key={`${resource.type}:${resource.id}`}
                      value={`${resource.type}:${resource.id}`}
                    >
                      {resource.type} · {resource.title}
                    </option>
                  ))}
                </select>
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-2 text-sm font-medium">
                  Target group
                  <select
                    value={targetScope}
                    onChange={(event) =>
                      setTargetScope(event.target.value as "class" | "individual")
                    }
                    className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="class">Entire class</option>
                    <option value="individual">Selected learners</option>
                  </select>
                </label>
                <label className="space-y-2 text-sm font-medium">
                  Attempt limit
                  <Input
                    type="number"
                    min={1}
                    max={20}
                    value={attemptLimit}
                    onChange={(event) => setAttemptLimit(event.target.value)}
                    placeholder="Unlimited"
                  />
                </label>
              </div>
              {targetScope === "individual" ? (
                <label className="block space-y-2 text-sm font-medium">
                  Learner profile IDs
                  <Input
                    value={targetProfileIds}
                    onChange={(event) => setTargetProfileIds(event.target.value)}
                    placeholder="Comma-separated profile IDs"
                  />
                  <span className="block text-xs font-normal text-muted-foreground">
                    Choose from the roster below.
                  </span>
                </label>
              ) : null}
              <div className="grid gap-3 sm:grid-cols-3">
                <label className="space-y-2 text-sm font-medium">
                  Opens
                  <Input
                    type="datetime-local"
                    value={startAt}
                    onChange={(event) => setStartAt(event.target.value)}
                  />
                </label>
                <label className="space-y-2 text-sm font-medium">
                  Due
                  <Input
                    type="datetime-local"
                    value={dueAt}
                    onChange={(event) => setDueAt(event.target.value)}
                  />
                </label>
                <label className="space-y-2 text-sm font-medium">
                  Late work
                  <select
                    value={lateSubmissionRule}
                    onChange={(event) =>
                      setLateSubmissionRule(event.target.value as "allow" | "flag" | "forbid")
                    }
                    className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="flag">Accept and flag</option>
                    <option value="allow">Accept normally</option>
                    <option value="forbid">Do not accept</option>
                  </select>
                </label>
              </div>
              <div className="rounded-lg border bg-muted/30 p-4">
                <p className="text-sm font-medium">Optional rubric</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  One criterion per line: label | max points
                </p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <Input
                    value={rubricTitle}
                    onChange={(event) => setRubricTitle(event.target.value)}
                    placeholder="Lab report rubric"
                  />
                  <textarea
                    value={rubricCriteria}
                    onChange={(event) => setRubricCriteria(event.target.value)}
                    className="min-h-20 rounded-md border border-input bg-background px-3 py-2 text-sm"
                    placeholder="Evidence | 4\nReasoning | 4"
                  />
                </div>
              </div>
              <Button
                type="button"
                onClick={() => void createAssignment()}
                disabled={!assignmentTitle.trim() || !resources.length || busy !== null}
              >
                <ClipboardCheck className="h-4 w-4" aria-hidden="true" />
                {busy === "assignment" ? "Publishing…" : "Publish assignment"}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-accent" aria-hidden="true" />
                Invite people
              </CardTitle>
              <CardDescription>
                Use a targeted local-profile invitation or share the classroom join code.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <label className="space-y-2 text-sm font-medium">
                Invite as
                <select
                  value={inviteRole}
                  onChange={(event) => setInviteRole(event.target.value as "learner" | "teacher")}
                  className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="learner">Learner</option>
                  <option value="teacher">Teacher</option>
                </select>
              </label>
              <label className="space-y-2 text-sm font-medium">
                Profile ID (optional)
                <Input
                  value={inviteProfileId}
                  onChange={(event) => setInviteProfileId(event.target.value)}
                  placeholder="Leave blank for a shareable code"
                />
              </label>
              <Button
                type="button"
                variant="outline"
                onClick={() => void createInvitation()}
                disabled={busy !== null}
              >
                <UserPlus className="h-4 w-4" aria-hidden="true" />
                {busy === "invite" ? "Creating…" : "Create invitation"}
              </Button>
              <div className="rounded-lg border bg-muted/30 p-3 text-sm">
                <span className="font-medium">Class join code</span>
                <code className="ml-2 rounded bg-background px-2 py-1 text-accent">
                  {detail.classroom.joinCode}
                </code>
              </div>
              {detail.invitations.length ? (
                <div className="space-y-2">
                  {detail.invitations.slice(0, 5).map((invitation) => (
                    <div
                      key={invitation.id}
                      className="flex items-center justify-between gap-3 rounded-lg border p-3 text-sm"
                    >
                      <div>
                        <p className="font-medium">
                          {invitation.role} · <code>{invitation.code}</code>
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {invitation.invitedProfileName ?? "Shareable invitation"}
                        </p>
                      </div>
                      <Badge variant={statusVariant(invitation.status)}>{invitation.status}</Badge>
                    </div>
                  ))}
                </div>
              ) : null}
            </CardContent>
          </Card>
        </section>
      ) : null}

      <section className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UsersRound className="h-5 w-5 text-accent" aria-hidden="true" />
              Roster
            </CardTitle>
            <CardDescription>
              {canManage
                ? "Class teachers and enrolled learners."
                : "Your class teachers and your learner profile."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {detail.teachers.map((teacher) => (
              <PersonRow
                key={`teacher-${teacher.profileId}`}
                name={teacher.displayName}
                detail={`${teacher.role} · ${teacher.profileId}`}
                badge={teacher.role}
              />
            ))}
            {detail.members.map((member) => (
              <PersonRow
                key={`member-${member.profileId}`}
                name={member.displayName}
                detail={`learner · ${member.profileId}`}
                badge="learner"
              />
            ))}
            {!detail.teachers.length && !detail.members.length ? (
              <p className="text-sm text-muted-foreground">No roster entries yet.</p>
            ) : null}
          </CardContent>
        </Card>

        {detail.analytics ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5 text-accent" aria-hidden="true" />
                Classroom analytics
              </CardTitle>
              <CardDescription>
                Assignment completion and grading signals from this classroom only.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {detail.analytics.learners.length ? (
                detail.analytics.learners.map((learner) => (
                  <div key={learner.profileId} className="rounded-lg border p-3">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-medium">{learner.displayName}</span>
                      <Badge
                        variant={
                          learner.averageGrade !== null && learner.averageGrade >= 0.6
                            ? "success"
                            : "warning"
                        }
                      >
                        {learner.averageGrade === null
                          ? "No grade"
                          : `${Math.round(learner.averageGrade * 100)}%`}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {learner.submittedCount}/{learner.assignedCount} submitted ·{" "}
                      {learner.gradedCount} graded · {Math.round(learner.completionRate * 100)}%
                      complete
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  Analytics will appear after learners join and receive work.
                </p>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Learning context</CardTitle>
              <CardDescription>
                Assignments stay connected to your personal Mathios progress.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Only work assigned to your profile is visible here. Returned feedback and
                resubmission requests remain with the assignment history.
              </p>
            </CardContent>
          </Card>
        )}
      </section>

      <section>
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Work queue</p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight">Assignments</h2>
          </div>
          <span className="text-xs text-muted-foreground">
            {detail.assignments.length} visible assignments
          </span>
        </div>
        <div className="space-y-4">
          {detail.assignments.map((assignment) => {
            const assignmentSubmissions = detail.submissions.filter(
              (submission) => submission.assignmentId === assignment.id,
            );
            const ownStatus = targetStatus(assignment, detail.members[0]?.profileId ?? "");
            return (
              <AssignmentCard
                key={assignment.id}
                assignment={assignment}
                submissions={assignmentSubmissions}
                canManage={canManage}
                ownStatus={ownStatus}
                response={responses[assignment.id] ?? ""}
                busy={busy}
                onResponseChange={(value) =>
                  setResponses((current) => ({ ...current, [assignment.id]: value }))
                }
                onSubmit={() => void submit(assignment)}
                reviews={reviews}
                setReview={(submissionId, draft) =>
                  setReviews((current) => ({ ...current, [submissionId]: draft }))
                }
                onReview={(submission) => void review(submission)}
              />
            );
          })}
          {!detail.assignments.length ? (
            <Card>
              <CardContent className="p-10 text-center">
                <BookOpen className="mx-auto h-8 w-8 text-accent" aria-hidden="true" />
                <p className="mt-3 font-medium">No assignments visible yet.</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Teachers can publish a lesson, practice set, assessment, simulation, laboratory,
                  or roadmap here.
                </p>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </section>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof UsersRound;
  label: string;
  value: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-5">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-accent/10 text-accent">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-semibold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function PersonRow({ name, detail, badge }: { name: string; detail: string; badge: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{name}</p>
        <p className="truncate text-xs text-muted-foreground">{detail}</p>
      </div>
      <Badge variant={badge === "learner" ? "outline" : "success"}>{badge}</Badge>
    </div>
  );
}

function AssignmentCard({
  assignment,
  submissions,
  canManage,
  ownStatus,
  response,
  busy,
  onResponseChange,
  onSubmit,
  reviews,
  setReview,
  onReview,
}: {
  assignment: AssignmentRecord;
  submissions: readonly SubmissionRecord[];
  canManage: boolean;
  ownStatus: string;
  response: string;
  busy: string | null;
  onResponseChange: (value: string) => void;
  onSubmit: () => void;
  reviews: Record<string, ReviewDraft>;
  setReview: (submissionId: string, draft: ReviewDraft) => void;
  onReview: (submission: SubmissionRecord) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle>{assignment.title}</CardTitle>
              <Badge variant={statusVariant(assignment.status)}>{assignment.status}</Badge>
            </div>
            <CardDescription className="mt-2">
              {assignment.resourceType} · {assignment.resourceTitle}
            </CardDescription>
          </div>
          <div className="text-left text-xs text-muted-foreground sm:text-right">
            <p>
              <Clock3 className="mr-1 inline h-3.5 w-3.5" aria-hidden="true" />
              {assignment.dueAt ? `Due ${formatDate(assignment.dueAt)}` : "No due date"}
            </p>
            <p className="mt-1">
              {assignment.targets.length} target{assignment.targets.length === 1 ? "" : "s"} ·{" "}
              {assignment.lateSubmissionRule} late work
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="whitespace-pre-wrap text-sm text-muted-foreground">
          {assignment.instructions ||
            "Complete the linked Mathios resource and submit a written response."}
        </p>
        {canManage ? (
          <div className="space-y-3">
            {assignment.targets.map((target) => (
              <div
                key={target.profileId}
                className="flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="text-sm font-medium">{target.displayName}</p>
                  <p className="text-xs text-muted-foreground">
                    {target.profileId} · {target.submissionCount} attempt
                    {target.submissionCount === 1 ? "" : "s"}
                  </p>
                </div>
                <Badge variant={statusVariant(target.status)}>{target.status}</Badge>
              </div>
            ))}
            {submissions.map((submission) => {
              const draft = reviews[submission.id] ?? {
                status:
                  submission.status === "resubmission-required"
                    ? ("resubmission-required" as const)
                    : ("graded" as const),
                grade: submission.grade === null ? "" : String(submission.grade),
                feedback: submission.teacherFeedback ?? "",
              };
              return (
                <div key={submission.id} className="rounded-lg border bg-muted/20 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium">
                        {submission.displayName} · attempt {submission.attemptNumber}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Submitted {formatDate(submission.submittedAt)}
                        {submission.isLate ? " · late" : ""}
                      </p>
                    </div>
                    <Badge variant={statusVariant(submission.status)}>{submission.status}</Badge>
                  </div>
                  <p className="mt-3 whitespace-pre-wrap text-sm">{submission.response}</p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-[auto_auto_1fr_auto] sm:items-end">
                    <label className="space-y-2 text-xs font-medium">
                      Status
                      <select
                        value={draft.status}
                        onChange={(event) =>
                          setReview(submission.id, {
                            ...draft,
                            status: event.target.value as ReviewDraft["status"],
                          })
                        }
                        className="mt-1 flex h-9 rounded-md border border-input bg-background px-2 text-sm"
                      >
                        <option value="graded">Graded</option>
                        <option value="returned">Returned</option>
                        <option value="resubmission-required">Request resubmission</option>
                      </select>
                    </label>
                    <label className="space-y-2 text-xs font-medium">
                      Grade
                      <Input
                        className="mt-1 h-9 w-20"
                        type="number"
                        min={0}
                        max={100}
                        value={draft.grade}
                        onChange={(event) =>
                          setReview(submission.id, { ...draft, grade: event.target.value })
                        }
                      />
                    </label>
                    <label className="space-y-2 text-xs font-medium">
                      Feedback
                      <textarea
                        value={draft.feedback}
                        onChange={(event) =>
                          setReview(submission.id, { ...draft, feedback: event.target.value })
                        }
                        className="mt-1 min-h-9 w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm"
                        placeholder="A useful next step"
                      />
                    </label>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => onReview(submission)}
                      disabled={busy !== null}
                    >
                      <MessageSquareText className="h-4 w-4" aria-hidden="true" />
                      {busy === `review-${submission.id}` ? "Saving…" : "Save feedback"}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={statusVariant(ownStatus)}>{ownStatus}</Badge>
              {assignment.attemptLimit ? (
                <span className="text-xs text-muted-foreground">
                  {assignment.attemptLimit} attempt limit
                </span>
              ) : (
                <span className="text-xs text-muted-foreground">Attempts available as needed</span>
              )}
            </div>
            <textarea
              value={response}
              onChange={(event) => onResponseChange(event.target.value)}
              className="mt-3 min-h-28 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              placeholder="Write your response for the teacher…"
            />
            <div className="mt-3 flex items-center gap-2">
              <Button type="button" onClick={onSubmit} disabled={!response.trim() || busy !== null}>
                <Send className="h-4 w-4" aria-hidden="true" />
                {busy?.startsWith("submit-") ? "Submitting…" : "Submit work"}
              </Button>
              {submissions.length ? (
                <span className="text-xs text-muted-foreground">
                  {submissions.length} previous attempt{submissions.length === 1 ? "" : "s"}
                </span>
              ) : null}
            </div>
            {submissions.map((submission) => (
              <div key={submission.id} className="mt-4 rounded-lg border bg-muted/20 p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium">Attempt {submission.attemptNumber}</span>
                  <Badge variant={statusVariant(submission.status)}>{submission.status}</Badge>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm">{submission.response}</p>
                {submission.teacherFeedback ? (
                  <div className="mt-3 border-l-2 border-accent pl-3 text-sm">
                    <p className="font-medium">Teacher feedback</p>
                    <p className="mt-1 whitespace-pre-wrap text-muted-foreground">
                      {submission.teacherFeedback}
                    </p>
                  </div>
                ) : null}
                {submission.grade !== null ? (
                  <p className="mt-2 text-sm font-medium">
                    Grade: {submission.grade}/{submission.gradeMax}
                  </p>
                ) : null}
                {submission.status === "resubmission-required" ? (
                  <p className="mt-2 flex items-center gap-1 text-xs text-accent">
                    <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />A resubmission is
                    requested.
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
