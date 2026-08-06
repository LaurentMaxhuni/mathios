import Database from "better-sqlite3";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { DatabaseHandle } from "@/infrastructure/database/client";
import { runSeed } from "@/infrastructure/database/seed";
import { getClassroomRepository } from "@/infrastructure/database/repositories/classroom-repository";

async function createRepository() {
  const directory = await mkdtemp(path.join(os.tmpdir(), "mathios-classroom-repository-"));
  const databaseUrl = `file:${path.join(directory, "classroom.db")}`;
  await runSeed({ provider: "sqlite", databaseUrl });
  const database = new Database(path.join(directory, "classroom.db"));
  database.pragma("foreign_keys = ON");
  database.exec(`
    INSERT INTO users (id, identifier) VALUES ('user-classroom-teacher', 'classroom-teacher');
    INSERT INTO profiles (id, user_id, display_name) VALUES ('profile-classroom-teacher', 'user-classroom-teacher', 'Teacher');
    INSERT INTO users (id, identifier) VALUES ('user-classroom-learner', 'classroom-learner');
    INSERT INTO profiles (id, user_id, display_name) VALUES ('profile-classroom-learner', 'user-classroom-learner', 'Learner');
    INSERT INTO users (id, identifier) VALUES ('user-classroom-guest', 'classroom-guest');
    INSERT INTO profiles (id, user_id, display_name) VALUES ('profile-classroom-guest', 'user-classroom-guest', 'Guest');
  `);
  const handle = {
    provider: "sqlite",
    raw: database,
    db: undefined as never,
  } as unknown as DatabaseHandle;
  return { directory, database, repository: getClassroomRepository(handle) };
}

describe("classroom repository", () => {
  it("persists a complete classroom assignment lifecycle", async () => {
    const { directory, database, repository } = await createRepository();
    try {
      const classroom = await repository.createClassroom({
        id: "classroom-repository",
        name: "Repository Physics",
        description: "Persistence coverage",
        joinCode: "REPO17",
        subjectIds: ["subject-physics"],
        gradeIds: ["grade-8"],
        createdByProfileId: "profile-classroom-teacher",
      });
      await repository.joinClassroom(classroom.id, "profile-classroom-learner");
      expect(await repository.listClasses("profile-classroom-learner")).toHaveLength(1);
      expect(await repository.getAccess(classroom.id, "profile-classroom-learner")).toMatchObject({
        isMember: true,
        isTeacher: false,
      });

      const resource = await repository.getAssignableResource(
        "lesson",
        "lesson-constant-acceleration",
      );
      expect(resource).toMatchObject({ type: "lesson", status: "published" });
      const assignment = await repository.createAssignment({
        id: "assignment-repository",
        classId: classroom.id,
        title: "Explain the result",
        instructions: "Describe what the evidence shows.",
        resourceType: "lesson",
        resourceId: "lesson-constant-acceleration",
        resourceTitle: resource!.title,
        targetScope: "individual",
        targetProfileIds: ["profile-classroom-learner"],
        startAt: null,
        dueAt: null,
        attemptLimit: 2,
        lateSubmissionRule: "flag",
        createdByProfileId: "profile-classroom-teacher",
        rubric: {
          id: "rubric-repository",
          title: "Evidence rubric",
          criteria: [{ id: "evidence", label: "Evidence", maxPoints: 4 }],
        },
      });
      expect(assignment.targets).toMatchObject([
        { profileId: "profile-classroom-learner", status: "not-started" },
      ]);

      const submission = await repository.createSubmission({
        id: "submission-repository",
        assignmentId: assignment.id,
        profileId: "profile-classroom-learner",
        attemptNumber: 1,
        response: "The evidence shows a steady change in velocity.",
        isLate: false,
        submittedAt: "2026-08-06T10:00:00.000Z",
      });
      expect(submission).toMatchObject({ status: "submitted", attemptNumber: 1 });

      const reviewed = await repository.reviewSubmission(submission.id, {
        status: "graded",
        feedback: "Clear explanation.",
        grade: 3,
        gradeMax: 4,
        rubricScores: { evidence: 3 },
        reviewedByProfileId: "profile-classroom-teacher",
        reviewedAt: "2026-08-06T11:00:00.000Z",
      });
      expect(reviewed).toMatchObject({
        status: "graded",
        grade: 3,
        teacherFeedback: "Clear explanation.",
      });

      const analytics = await repository.listClassroomAnalytics(classroom.id);
      expect(analytics).toMatchObject({
        memberCount: 1,
        assignmentCount: 1,
        submissionCount: 1,
        gradedSubmissionCount: 1,
      });
      expect(analytics.averageGrade).toBe(0.75);
      expect(analytics.learners[0]).toMatchObject({
        profileId: "profile-classroom-learner",
        assignedCount: 1,
        submittedCount: 1,
        gradedCount: 1,
      });

      const invitation = await repository.createInvitation({
        id: "invitation-repository",
        classId: classroom.id,
        role: "learner",
        code: "INVITE17",
        invitedProfileId: "profile-classroom-guest",
        invitedByProfileId: "profile-classroom-teacher",
        expiresAt: null,
      });
      expect(invitation.status).toBe("pending");
      await expect(
        repository.acceptInvitationByCode("INVITE17", "profile-classroom-guest"),
      ).resolves.toMatchObject({
        status: "accepted",
        acceptedByProfileId: "profile-classroom-guest",
      });
      await expect(
        repository.getAccess(classroom.id, "profile-classroom-guest"),
      ).resolves.toMatchObject({
        isMember: true,
      });
    } finally {
      database.close();
      await rm(directory, { recursive: true, force: true });
    }
  });
});
