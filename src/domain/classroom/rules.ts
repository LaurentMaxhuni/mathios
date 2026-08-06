import { ConflictError, ValidationError } from "@/domain/errors/application-error";
import {
  ASSIGNABLE_RESOURCE_TYPES,
  ASSIGNMENT_STATUSES,
  ASSIGNMENT_TARGET_SCOPES,
  CLASSROOM_MEMBERSHIP_ROLES,
  CLASSROOM_MEMBERSHIP_STATUSES,
  CLASSROOM_TEACHER_ROLES,
  INVITATION_ROLES,
  INVITATION_STATUSES,
  LATE_SUBMISSION_RULES,
  SUBMISSION_STATUSES,
  type AssignableResourceType,
  type AssignmentTargetScope,
  type ClassroomMembershipRole,
  type ClassroomMembershipStatus,
  type LateSubmissionRule,
  type SubmissionStatus,
} from "@/domain/classroom/types";

export const CLASSROOM_LIMITS = {
  name: 120,
  description: 2000,
  joinCode: 12,
  assignmentTitle: 160,
  instructions: 8000,
  submissionResponse: 20000,
  maxTargets: 200,
} as const;

export function isAssignableResourceType(value: unknown): value is AssignableResourceType {
  return ASSIGNABLE_RESOURCE_TYPES.includes(value as AssignableResourceType);
}

export function isAssignmentTargetScope(value: unknown): value is AssignmentTargetScope {
  return ASSIGNMENT_TARGET_SCOPES.includes(value as AssignmentTargetScope);
}

export function isLateSubmissionRule(value: unknown): value is LateSubmissionRule {
  return LATE_SUBMISSION_RULES.includes(value as LateSubmissionRule);
}

export function isSubmissionStatus(value: unknown): value is SubmissionStatus {
  return SUBMISSION_STATUSES.includes(value as SubmissionStatus);
}

export function isClassroomMembershipRole(value: unknown): value is ClassroomMembershipRole {
  return CLASSROOM_MEMBERSHIP_ROLES.includes(value as ClassroomMembershipRole);
}

export function isClassroomMembershipStatus(value: unknown): value is ClassroomMembershipStatus {
  return CLASSROOM_MEMBERSHIP_STATUSES.includes(value as ClassroomMembershipStatus);
}

export function normalizeJoinCode(value: string): string {
  const code = value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
  if (code.length < 6 || code.length > CLASSROOM_LIMITS.joinCode) {
    throw new ValidationError("Join codes must contain 6 to 12 letters or numbers.", [
      { path: "joinCode", message: "Use 6 to 12 letters or numbers." },
    ]);
  }
  return code;
}

export function normalizeClassroomName(value: string): string {
  const name = value.trim().replace(/\s+/g, " ");
  if (!name || name.length > CLASSROOM_LIMITS.name) {
    throw new ValidationError("Enter a classroom name within 120 characters.", [
      { path: "name", message: "Classroom name is required and limited to 120 characters." },
    ]);
  }
  return name;
}

export function normalizeClassroomDescription(value: string): string {
  const description = value.trim();
  if (description.length > CLASSROOM_LIMITS.description) {
    throw new ValidationError("Classroom descriptions are limited to 2,000 characters.", [
      { path: "description", message: "Description is too long." },
    ]);
  }
  return description;
}

export function normalizeIdList(values: readonly string[], path: string): string[] {
  const normalized = [...new Set(values.map((value) => value.trim()).filter(Boolean))];
  if (normalized.length > CLASSROOM_LIMITS.maxTargets) {
    throw new ValidationError("Too many classroom targets were supplied.", [
      { path, message: `Use no more than ${CLASSROOM_LIMITS.maxTargets} entries.` },
    ]);
  }
  return normalized;
}

export function normalizeAssignmentText(value: string, path: "title" | "instructions"): string {
  const text = value.trim();
  const limit = path === "title" ? CLASSROOM_LIMITS.assignmentTitle : CLASSROOM_LIMITS.instructions;
  if (!text || text.length > limit) {
    throw new ValidationError(`Assignment ${path} is required and bounded.`, [
      { path, message: `Use 1 to ${limit} characters.` },
    ]);
  }
  return text;
}

export function validateAssignmentDates(startAt: string | null, dueAt: string | null): void {
  const start = startAt ? Date.parse(startAt) : null;
  const due = dueAt ? Date.parse(dueAt) : null;
  if (startAt && !Number.isFinite(start)) {
    throw new ValidationError("The assignment start date is invalid.", [
      { path: "startAt", message: "Use an ISO date and time." },
    ]);
  }
  if (dueAt && !Number.isFinite(due)) {
    throw new ValidationError("The assignment due date is invalid.", [
      { path: "dueAt", message: "Use an ISO date and time." },
    ]);
  }
  if (start !== null && due !== null && due <= start) {
    throw new ValidationError("The due date must be after the start date.", [
      { path: "dueAt", message: "Choose a later due date." },
    ]);
  }
}

export function validateAttemptLimit(value: number | null): number | null {
  if (value === null || value === undefined) return null;
  if (!Number.isInteger(value) || value < 1 || value > 20) {
    throw new ValidationError("Attempt limits must be between 1 and 20.", [
      { path: "attemptLimit", message: "Use a whole number from 1 to 20." },
    ]);
  }
  return value;
}

export function submissionIsLate(submittedAt: string, dueAt: string | null): boolean {
  if (!dueAt) return false;
  const submitted = Date.parse(submittedAt);
  const due = Date.parse(dueAt);
  return Number.isFinite(submitted) && Number.isFinite(due) && submitted > due;
}

export function assertSubmissionCanBeCreated(input: {
  assignmentStatus: (typeof ASSIGNMENT_STATUSES)[number];
  startAt: string | null;
  dueAt: string | null;
  lateSubmissionRule: LateSubmissionRule;
  attemptLimit: number | null;
  existingAttempts: number;
  latestStatus: SubmissionStatus | null;
  now: string;
}): { attemptNumber: number; isLate: boolean } {
  if (input.assignmentStatus !== "published") {
    throw new ConflictError("This assignment is not open for submissions.");
  }
  const now = Date.parse(input.now);
  const start = input.startAt ? Date.parse(input.startAt) : null;
  if (start !== null && Number.isFinite(start) && now < start) {
    throw new ConflictError("This assignment has not opened yet.");
  }
  if (
    input.latestStatus &&
    input.latestStatus !== "resubmission-required" &&
    input.latestStatus !== "draft"
  ) {
    throw new ConflictError("Review the current submission before submitting again.");
  }
  if (input.attemptLimit !== null && input.existingAttempts >= input.attemptLimit) {
    throw new ConflictError("The attempt limit for this assignment has been reached.");
  }
  const isLate = submissionIsLate(input.now, input.dueAt);
  if (isLate && input.lateSubmissionRule === "forbid") {
    throw new ConflictError("Late submissions are not accepted for this assignment.");
  }
  return { attemptNumber: input.existingAttempts + 1, isLate };
}

export function validateGrade(grade: number | null, gradeMax: number): void {
  if (!Number.isFinite(gradeMax) || gradeMax <= 0 || gradeMax > 1000) {
    throw new ValidationError("The grading maximum is invalid.", [
      { path: "gradeMax", message: "Use a positive maximum up to 1,000." },
    ]);
  }
  if (grade !== null && (!Number.isFinite(grade) || grade < 0 || grade > gradeMax)) {
    throw new ValidationError("The grade must be within the grading maximum.", [
      { path: "grade", message: "Use a grade from zero through the maximum." },
    ]);
  }
}

export function validateReviewStatus(
  value: unknown,
): value is "returned" | "resubmission-required" | "graded" {
  return value === "returned" || value === "resubmission-required" || value === "graded";
}

export function validateInvitationRole(value: unknown): value is (typeof INVITATION_ROLES)[number] {
  return INVITATION_ROLES.includes(value as (typeof INVITATION_ROLES)[number]);
}

export function validateInvitationStatus(
  value: unknown,
): value is (typeof INVITATION_STATUSES)[number] {
  return INVITATION_STATUSES.includes(value as (typeof INVITATION_STATUSES)[number]);
}

export function validateTeacherRole(
  value: unknown,
): value is (typeof CLASSROOM_TEACHER_ROLES)[number] {
  return CLASSROOM_TEACHER_ROLES.includes(value as (typeof CLASSROOM_TEACHER_ROLES)[number]);
}
