"use client";

import Link from "next/link";
import { ArrowRight, KeyRound, School, ShieldCheck, UserPlus, UsersRound } from "lucide-react";
import { useState } from "react";
import type { ClassroomDashboard } from "@/domain/classroom/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

interface Props {
  initialDashboard: ClassroomDashboard;
  canCreateClass: boolean;
}

async function errorMessage(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { message?: string };
    return body.message ?? `Request failed (${response.status}).`;
  } catch {
    return `Request failed (${response.status}).`;
  }
}

export function ClassroomDashboardWorkspace({ initialDashboard, canCreateClass }: Props) {
  const [dashboard, setDashboard] = useState(initialDashboard);
  const [className, setClassName] = useState("");
  const [description, setDescription] = useState("");
  const [subjectIds, setSubjectIds] = useState("subject-physics");
  const [gradeIds, setGradeIds] = useState("grade-8");
  const [joinCode, setJoinCode] = useState("");
  const [invitationCode, setInvitationCode] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function refresh(): Promise<void> {
    const response = await fetch("/api/classrooms", { cache: "no-store" });
    if (!response.ok) throw new Error(await errorMessage(response));
    setDashboard((await response.json()) as ClassroomDashboard);
  }

  async function createClass(): Promise<void> {
    setBusy("create");
    setNotice(null);
    try {
      const response = await fetch("/api/classrooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: className,
          description,
          subjectIds: subjectIds
            .split(",")
            .map((value) => value.trim())
            .filter(Boolean),
          gradeIds: gradeIds
            .split(",")
            .map((value) => value.trim())
            .filter(Boolean),
        }),
      });
      if (!response.ok) throw new Error(await errorMessage(response));
      setClassName("");
      setDescription("");
      await refresh();
      setNotice("Classroom created. Share its join code from the class workspace.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Classroom could not be created.");
    } finally {
      setBusy(null);
    }
  }

  async function joinClass(): Promise<void> {
    setBusy("join");
    setNotice(null);
    try {
      const response = await fetch("/api/classrooms/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ joinCode }),
      });
      if (!response.ok) throw new Error(await errorMessage(response));
      const joined = (await response.json()) as { id: string; name: string };
      setJoinCode("");
      await refresh();
      setNotice(`You joined ${joined.name}.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "The join code could not be used.");
    } finally {
      setBusy(null);
    }
  }

  async function acceptInvitation(): Promise<void> {
    setBusy("invitation");
    setNotice(null);
    try {
      const response = await fetch("/api/classrooms/invitations/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: invitationCode }),
      });
      if (!response.ok) throw new Error(await errorMessage(response));
      setInvitationCode("");
      await refresh();
      setNotice("Invitation accepted. The classroom is now connected to your profile.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "The invitation code could not be used.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-2xl border bg-card p-6 shadow-soft sm:p-8">
        <div className="absolute right-0 top-0 h-48 w-48 rounded-full bg-accent/10 blur-3xl" />
        <div className="relative flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <p className="eyebrow">Phase 17 · shared learning</p>
            <h1 className="mt-2 text-4xl font-semibold tracking-tight">Classroom command center</h1>
            <p className="mt-3 max-w-2xl text-muted-foreground">
              Build a class, bring learners into a focused room, and keep assignments, submissions,
              feedback, and progress in one accountable loop.
            </p>
          </div>
          <Badge variant="outline" className="w-fit">
            <UsersRound className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
            {dashboard.classes.length} accessible classes
          </Badge>
        </div>
      </section>

      {notice ? (
        <div className="rounded-lg border border-accent/30 bg-accent/10 p-3 text-sm" role="status">
          {notice}
        </div>
      ) : null}

      <section className="grid gap-4 lg:grid-cols-2">
        {canCreateClass ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <School className="h-5 w-5 text-accent" aria-hidden="true" />
                Start a classroom
              </CardTitle>
              <CardDescription>
                The creator becomes the owner. Subject and grade IDs keep this local-first flow
                compatible with the existing curriculum structure.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <label className="block space-y-2 text-sm font-medium">
                Class name
                <Input
                  value={className}
                  onChange={(event) => setClassName(event.target.value)}
                  placeholder="Physics · Grade 8"
                />
              </label>
              <label className="block space-y-2 text-sm font-medium">
                Description
                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  placeholder="A short promise for this group."
                />
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-2 text-sm font-medium">
                  Subject IDs
                  <Input
                    value={subjectIds}
                    onChange={(event) => setSubjectIds(event.target.value)}
                  />
                </label>
                <label className="space-y-2 text-sm font-medium">
                  Grade IDs
                  <Input value={gradeIds} onChange={(event) => setGradeIds(event.target.value)} />
                </label>
              </div>
              <Button
                type="button"
                onClick={() => void createClass()}
                disabled={!className.trim() || busy !== null}
              >
                <School className="h-4 w-4" aria-hidden="true" />
                {busy === "create" ? "Creating…" : "Create classroom"}
              </Button>
            </CardContent>
          </Card>
        ) : null}

        <Card className={canCreateClass ? "" : "lg:col-span-2"}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-accent" aria-hidden="true" />
              Join with a code
            </CardTitle>
            <CardDescription>
              A teacher can share a six-to-twelve character class code. Joining only exposes the
              assignments targeted to your profile.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <label className="block space-y-2 text-sm font-medium">
              Classroom join code
              <Input
                value={joinCode}
                onChange={(event) => setJoinCode(event.target.value)}
                placeholder="A1B2C3D4"
              />
            </label>
            <Button
              type="button"
              variant="outline"
              onClick={() => void joinClass()}
              disabled={!joinCode.trim() || busy !== null}
            >
              <UserPlus className="h-4 w-4" aria-hidden="true" />
              {busy === "join" ? "Joining…" : "Join classroom"}
            </Button>
            <div className="border-t pt-4">
              <label className="block space-y-2 text-sm font-medium">
                Invitation code
                <Input
                  value={invitationCode}
                  onChange={(event) => setInvitationCode(event.target.value)}
                  placeholder="A targeted invitation code"
                />
              </label>
              <Button
                type="button"
                variant="ghost"
                className="mt-3"
                onClick={() => void acceptInvitation()}
                disabled={!invitationCode.trim() || busy !== null}
              >
                <UserPlus className="h-4 w-4" aria-hidden="true" />
                {busy === "invitation" ? "Accepting…" : "Accept invitation"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>

      <section>
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Your rooms</p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight">Active classrooms</h2>
          </div>
          <span className="text-xs text-muted-foreground">
            {dashboard.resources.length} published resources ready to assign
          </span>
        </div>
        {dashboard.classes.length ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {dashboard.classes.map((classroom) => (
              <Link
                key={classroom.id}
                href={`/classrooms/${classroom.id}` as never}
                className="group"
              >
                <Card className="h-full transition-transform group-hover:-translate-y-0.5 group-hover:border-accent/50">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <CardTitle>{classroom.name}</CardTitle>
                        <CardDescription className="mt-2 line-clamp-2">
                          {classroom.description || "A focused Mathios learning room."}
                        </CardDescription>
                      </div>
                      <Badge variant={classroom.role === "learner" ? "outline" : "success"}>
                        {classroom.role}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>{classroom.memberCount} learners</span>
                      <span>{classroom.assignmentCount} assignments</span>
                    </div>
                    <div className="mt-5 flex items-center gap-2 text-sm font-medium text-accent">
                      Open classroom{" "}
                      <ArrowRight
                        className="h-4 w-4 transition-transform group-hover:translate-x-1"
                        aria-hidden="true"
                      />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
              <ShieldCheck className="h-8 w-8 text-accent" aria-hidden="true" />
              <p className="font-medium">No classrooms are connected yet.</p>
              <p className="max-w-md text-sm text-muted-foreground">
                Create the first room or use a teacher’s join code. Core personal learning stays
                available even when you do not join a class.
              </p>
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  );
}
