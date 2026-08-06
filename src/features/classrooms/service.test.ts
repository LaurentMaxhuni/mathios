import Database from "better-sqlite3";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { AuthorizationError } from "@/domain/errors/application-error";
import type { AuthenticatedPrincipal } from "@/infrastructure/auth/auth-provider";
import type { DatabaseHandle } from "@/infrastructure/database/client";
import { runSeed } from "@/infrastructure/database/seed";
import { getClassroomRepository } from "@/infrastructure/database/repositories/classroom-repository";
import {
  createAssignment,
  createClassroom,
  getClassroomDetail,
  joinClassByCode,
  reviewSubmission,
  submitAssignment,
} from "@/features/classrooms/service";

function principal(
  profileId: string,
  displayName: string,
  roles: readonly string[],
): AuthenticatedPrincipal {
  return {
    subjectId: profileId,
    userId: `user-${profileId}`,
    profileId,
    displayName,
    roles,
    permissions: [],
  };
}

describe("classroom service", () => {
  it("keeps learner views private while allowing the teacher workflow", async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), "mathios-classroom-service-"));
    const databaseUrl = `file:${path.join(directory, "classroom.db")}`;
    let database: Database.Database | undefined;
    try {
      await runSeed({ provider: "sqlite", databaseUrl });
      database = new Database(path.join(directory, "classroom.db"));
      database.pragma("foreign_keys = ON");
      database.exec(`
        INSERT INTO users (id, identifier) VALUES ('user-service-teacher', 'service-teacher');
        INSERT INTO profiles (id, user_id, display_name) VALUES ('profile-service-teacher', 'user-service-teacher', 'Teacher');
        INSERT INTO users (id, identifier) VALUES ('user-service-learner', 'service-learner');
        INSERT INTO profiles (id, user_id, display_name) VALUES ('profile-service-learner', 'user-service-learner', 'Learner');
      `);
      const handle = {
        provider: "sqlite",
        raw: database,
        db: undefined as never,
      } as unknown as DatabaseHandle;
      const repository = getClassroomRepository(handle);
      const teacher = principal("profile-service-teacher", "Teacher", ["teacher"]);
      const learner = principal("profile-service-learner", "Learner", ["learner"]);

      await expect(
        createClassroom(
          { name: "No access", description: "", subjectIds: [], gradeIds: [] },
          learner,
          repository,
        ),
      ).rejects.toThrow(AuthorizationError);
      const classroom = await createClassroom(
        {
          name: "Service Physics",
          description: "Teacher and learner privacy",
          subjectIds: ["subject-physics"],
          gradeIds: ["grade-8"],
        },
        teacher,
        repository,
      );
      await joinClassByCode(classroom.joinCode, learner, repository);
      const assignment = await createAssignment(
        classroom.id,
        {
          title: "Submit an explanation",
          instructions: "Write two sentences.",
          resourceType: "lesson",
          resourceId: "lesson-constant-acceleration",
          targetScope: "class",
          targetProfileIds: [],
          startAt: null,
          dueAt: null,
          attemptLimit: 2,
          lateSubmissionRule: "flag",
          rubricTitle: "Short rubric",
          rubricCriteria: [{ id: "clarity", label: "Clarity", maxPoints: 5 }],
        },
        teacher,
        repository,
      );
      await expect(
        submitAssignment(classroom.id, assignment.id, "Teacher work", teacher, repository),
      ).rejects.toThrow(AuthorizationError);
      const submission = await submitAssignment(
        classroom.id,
        assignment.id,
        "The evidence supports the model.",
        learner,
        repository,
      );
      expect(submission.status).toBe("submitted");
      const learnerView = await getClassroomDetail(classroom.id, learner, repository);
      expect(learnerView.members).toHaveLength(1);
      expect(learnerView.members[0].profileId).toBe(learner.profileId);
      expect(learnerView.assignments).toHaveLength(1);
      expect(learnerView.invitations).toHaveLength(0);
      expect(learnerView.analytics).toBeNull();

      const teacherView = await getClassroomDetail(classroom.id, teacher, repository);
      expect(teacherView.members).toHaveLength(1);
      expect(teacherView.analytics).toMatchObject({ memberCount: 1, submissionCount: 1 });
      const reviewed = await reviewSubmission(
        classroom.id,
        submission.id,
        {
          status: "graded",
          feedback: "Good work.",
          grade: 4,
          gradeMax: 5,
          rubricScores: { clarity: 4 },
        },
        teacher,
        repository,
      );
      expect(reviewed).toMatchObject({ status: "graded", grade: 4 });
    } finally {
      database?.close();
      await rm(directory, { recursive: true, force: true });
    }
  });
});
