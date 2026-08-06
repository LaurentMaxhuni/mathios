import { describe, expect, it } from "vitest";
import { ConflictError, ValidationError } from "@/domain/errors/application-error";
import {
  assertSubmissionCanBeCreated,
  normalizeJoinCode,
  submissionIsLate,
  validateAssignmentDates,
  validateGrade,
} from "@/domain/classroom/rules";

describe("classroom domain rules", () => {
  it("normalizes join codes and rejects malformed dates", () => {
    expect(normalizeJoinCode(" ab-12 cd ")).toBe("AB12CD");
    expect(() => normalizeJoinCode("short")).toThrow(ValidationError);
    expect(() =>
      validateAssignmentDates("2026-08-10T10:00:00.000Z", "2026-08-10T09:00:00.000Z"),
    ).toThrow("after the start");
  });

  it("enforces late-submission, review, and grading boundaries", () => {
    expect(submissionIsLate("2026-08-12T10:00:00.000Z", "2026-08-12T09:00:00.000Z")).toBe(true);
    expect(
      assertSubmissionCanBeCreated({
        assignmentStatus: "published",
        startAt: null,
        dueAt: "2026-08-12T09:00:00.000Z",
        lateSubmissionRule: "flag",
        attemptLimit: 2,
        existingAttempts: 1,
        latestStatus: "resubmission-required",
        now: "2026-08-12T10:00:00.000Z",
      }),
    ).toEqual({ attemptNumber: 2, isLate: true });
    expect(() =>
      assertSubmissionCanBeCreated({
        assignmentStatus: "published",
        startAt: null,
        dueAt: null,
        lateSubmissionRule: "allow",
        attemptLimit: 1,
        existingAttempts: 1,
        latestStatus: "submitted",
        now: "2026-08-12T10:00:00.000Z",
      }),
    ).toThrow(ConflictError);
    expect(() => validateGrade(101, 100)).toThrow(ValidationError);
  });
});
