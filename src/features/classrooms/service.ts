import { randomBytes, randomUUID } from "node:crypto";
import {
  AuthorizationError,
  ConflictError,
  NotFoundError,
  ValidationError,
} from "@/domain/errors/application-error";
import {
  assertSubmissionCanBeCreated,
  normalizeAssignmentText,
  normalizeClassroomDescription,
  normalizeClassroomName,
  normalizeIdList,
  normalizeJoinCode,
  validateAssignmentDates,
  validateAttemptLimit,
  validateGrade,
} from "@/domain/classroom/rules";
import type {
  ClassroomDashboard,
  ClassroomDetail,
  CreateAssignmentInput,
  ReviewSubmissionInput as DomainReviewSubmissionInput,
} from "@/domain/classroom/types";
import type { ClassroomRepository } from "@/domain/ports/classroom-repository";
import type { AuthenticatedPrincipal } from "@/infrastructure/auth/auth-provider";
import { getClassroomRepository } from "@/infrastructure/database/repositories/classroom-repository";
import type {
  AssignmentInput,
  ClassroomInput,
  InvitationInput,
  ReviewSubmissionInput,
} from "@/features/classrooms/schemas";

function isAdministrator(principal: AuthenticatedPrincipal): boolean {
  return principal.roles.includes("administrator");
}

function canCreateClass(principal: AuthenticatedPrincipal): boolean {
  return isAdministrator(principal) || principal.roles.includes("teacher");
}

function randomJoinCode(): string {
  return randomBytes(6).toString("hex").slice(0, 10).toUpperCase();
}

async function requireClassAccess(
  classId: string,
  principal: AuthenticatedPrincipal,
  repository: ClassroomRepository,
  manager = false,
) {
  const access = await repository.getAccess(classId, principal.profileId);
  const elevated = isAdministrator(principal);
  if (!access && !elevated) throw new AuthorizationError("You are not enrolled in this classroom.");
  if (manager && !elevated && !access?.isTeacher && !access?.isOwner) {
    throw new AuthorizationError("Only assigned classroom teachers can manage this class.");
  }
  return { access, elevated };
}

export async function getClassroomDashboard(
  principal: AuthenticatedPrincipal,
  repository: ClassroomRepository = getClassroomRepository(),
): Promise<ClassroomDashboard> {
  return {
    classes: await repository.listClasses(principal.profileId, isAdministrator(principal)),
    resources: await repository.listAssignableResources(),
  };
}

export async function getClassroomDetail(
  classId: string,
  principal: AuthenticatedPrincipal,
  repository: ClassroomRepository = getClassroomRepository(),
): Promise<ClassroomDetail> {
  const { access, elevated } = await requireClassAccess(classId, principal, repository);
  const detail = await repository.getClassroomDetail(classId);
  if (!detail) throw new NotFoundError("Classroom", classId);
  const manager = elevated || Boolean(access?.isTeacher || access?.isOwner);
  if (manager) {
    return { ...detail, analytics: await repository.listClassroomAnalytics(classId) };
  }
  const ownAssignments = detail.assignments
    .filter((assignment) =>
      assignment.targets.some((target) => target.profileId === principal.profileId),
    )
    .map((assignment) => ({
      ...assignment,
      targets: assignment.targets.filter((target) => target.profileId === principal.profileId),
    }));
  return {
    ...detail,
    members: detail.members.filter((member) => member.profileId === principal.profileId),
    invitations: [],
    assignments: ownAssignments,
    submissions: detail.submissions.filter(
      (submission) => submission.profileId === principal.profileId,
    ),
    rubrics: detail.rubrics.filter((rubric) =>
      ownAssignments.some((assignment) => assignment.id === rubric.assignmentId),
    ),
    analytics: null,
  };
}

export async function createClassroom(
  input: ClassroomInput,
  principal: AuthenticatedPrincipal,
  repository: ClassroomRepository = getClassroomRepository(),
) {
  if (!canCreateClass(principal)) {
    throw new AuthorizationError(
      "A teacher or administrator profile is required to create a class.",
    );
  }
  return repository.createClassroom({
    id: randomUUID(),
    name: normalizeClassroomName(input.name),
    description: normalizeClassroomDescription(input.description),
    joinCode: randomJoinCode(),
    subjectIds: normalizeIdList(input.subjectIds, "subjectIds"),
    gradeIds: normalizeIdList(input.gradeIds, "gradeIds"),
    createdByProfileId: principal.profileId,
  });
}

export async function updateClassroom(
  classId: string,
  input: ClassroomInput,
  principal: AuthenticatedPrincipal,
  repository: ClassroomRepository = getClassroomRepository(),
) {
  await requireClassAccess(classId, principal, repository, true);
  return repository.updateClassroom(classId, {
    name: normalizeClassroomName(input.name),
    description: normalizeClassroomDescription(input.description),
    subjectIds: normalizeIdList(input.subjectIds, "subjectIds"),
    gradeIds: normalizeIdList(input.gradeIds, "gradeIds"),
  });
}

export async function joinClassByCode(
  joinCode: string,
  principal: AuthenticatedPrincipal,
  repository: ClassroomRepository = getClassroomRepository(),
) {
  return repository.joinByCode(normalizeJoinCode(joinCode), principal.profileId);
}

export async function createInvitation(
  classId: string,
  input: InvitationInput,
  principal: AuthenticatedPrincipal,
  repository: ClassroomRepository = getClassroomRepository(),
) {
  await requireClassAccess(classId, principal, repository, true);
  if (input.invitedProfileId && !(await repository.getProfile(input.invitedProfileId))) {
    throw new NotFoundError("Profile", input.invitedProfileId);
  }
  return repository.createInvitation({
    id: randomUUID(),
    classId,
    role: input.role,
    code: randomJoinCode(),
    invitedProfileId: input.invitedProfileId,
    invitedByProfileId: principal.profileId,
    expiresAt: input.expiresAt,
  });
}

export async function acceptInvitation(
  invitationId: string,
  principal: AuthenticatedPrincipal,
  repository: ClassroomRepository = getClassroomRepository(),
) {
  return repository.acceptInvitation(invitationId, principal.profileId);
}

export async function acceptInvitationByCode(
  code: string,
  principal: AuthenticatedPrincipal,
  repository: ClassroomRepository = getClassroomRepository(),
) {
  return repository.acceptInvitationByCode(normalizeJoinCode(code), principal.profileId);
}

function normalizeRubric(input: AssignmentInput): CreateAssignmentInput["rubric"] {
  if (!input.rubricTitle?.trim() && !input.rubricCriteria.length) return undefined;
  if (!input.rubricTitle?.trim() || !input.rubricCriteria.length) {
    throw new ValidationError("A rubric needs a title and at least one criterion.", [
      { path: "rubric", message: "Provide both rubric title and criteria." },
    ]);
  }
  return {
    id: randomUUID(),
    title: input.rubricTitle.trim(),
    criteria: input.rubricCriteria,
  };
}

export async function createAssignment(
  classId: string,
  input: AssignmentInput,
  principal: AuthenticatedPrincipal,
  repository: ClassroomRepository = getClassroomRepository(),
) {
  await requireClassAccess(classId, principal, repository, true);
  const resource = await repository.getAssignableResource(input.resourceType, input.resourceId);
  if (!resource) throw new NotFoundError("Published assignment resource", input.resourceId);
  validateAssignmentDates(input.startAt, input.dueAt);
  const attemptLimit = validateAttemptLimit(input.attemptLimit);
  const detail = await repository.getClassroomDetail(classId);
  if (!detail) throw new NotFoundError("Classroom", classId);
  const memberIds = detail.members.map((member) => member.profileId);
  const targetProfileIds = normalizeIdList(input.targetProfileIds, "targetProfileIds");
  const targets = input.targetScope === "class" ? memberIds : targetProfileIds;
  if (!targets.length)
    throw new ConflictError("Add at least one learner target to this assignment.");
  if (
    input.targetScope === "individual" &&
    targets.some((profileId) => !memberIds.includes(profileId))
  ) {
    throw new AuthorizationError("Assignments may target learners enrolled in this class only.");
  }
  return repository.createAssignment({
    id: randomUUID(),
    classId,
    title: normalizeAssignmentText(input.title, "title"),
    instructions: input.instructions.trim(),
    resourceType: input.resourceType,
    resourceId: resource.id,
    resourceTitle: resource.title,
    targetScope: input.targetScope,
    targetProfileIds: targets,
    startAt: input.startAt,
    dueAt: input.dueAt,
    attemptLimit,
    lateSubmissionRule: input.lateSubmissionRule,
    createdByProfileId: principal.profileId,
    rubric: normalizeRubric(input),
  });
}

export async function submitAssignment(
  classId: string,
  assignmentId: string,
  response: string,
  principal: AuthenticatedPrincipal,
  repository: ClassroomRepository = getClassroomRepository(),
) {
  const { access, elevated } = await requireClassAccess(classId, principal, repository);
  if (elevated || access?.isTeacher || access?.isOwner) {
    throw new AuthorizationError("Teachers cannot submit learner work from a classroom account.");
  }
  const assignment = await repository.getAssignment(assignmentId);
  if (!assignment || assignment.classId !== classId)
    throw new NotFoundError("Assignment", assignmentId);
  const detail = await repository.getClassroomDetail(classId);
  if (!detail) throw new NotFoundError("Classroom", classId);
  const target = assignment.targets.find((item) => item.profileId === principal.profileId);
  if (!target) throw new AuthorizationError("This assignment is not assigned to your profile.");
  const existing = detail.submissions
    .filter((item) => item.assignmentId === assignmentId && item.profileId === principal.profileId)
    .sort((left, right) => right.attemptNumber - left.attemptNumber);
  const now = new Date().toISOString();
  const { attemptNumber, isLate } = assertSubmissionCanBeCreated({
    assignmentStatus: assignment.status,
    startAt: assignment.startAt,
    dueAt: assignment.dueAt,
    lateSubmissionRule: assignment.lateSubmissionRule,
    attemptLimit: assignment.attemptLimit,
    existingAttempts: existing.length,
    latestStatus: existing[0]?.status ?? null,
    now,
  });
  const normalizedResponse = response.trim();
  if (!normalizedResponse || normalizedResponse.length > 20000) {
    throw new ValidationError("Submission responses must contain 1 to 20,000 characters.", [
      { path: "response", message: "Enter a bounded written response." },
    ]);
  }
  return repository.createSubmission({
    id: randomUUID(),
    assignmentId,
    profileId: principal.profileId,
    attemptNumber,
    response: normalizedResponse,
    isLate,
    submittedAt: now,
  });
}

export async function reviewSubmission(
  classId: string,
  submissionId: string,
  input: ReviewSubmissionInput,
  principal: AuthenticatedPrincipal,
  repository: ClassroomRepository = getClassroomRepository(),
) {
  await requireClassAccess(classId, principal, repository, true);
  const detail = await repository.getClassroomDetail(classId);
  if (!detail) throw new NotFoundError("Classroom", classId);
  const submission = detail?.submissions.find((item) => item.id === submissionId);
  if (!submission) throw new NotFoundError("Submission", submissionId);
  const assignment = detail.assignments.find((item) => item.id === submission.assignmentId);
  if (!assignment) throw new NotFoundError("Assignment", submission.assignmentId);
  validateGrade(input.grade, input.gradeMax);
  const domainInput: DomainReviewSubmissionInput = {
    status: input.status,
    feedback: input.feedback,
    grade: input.grade,
    gradeMax: input.gradeMax,
    rubricScores: input.rubricScores,
    reviewedByProfileId: principal.profileId,
    reviewedAt: new Date().toISOString(),
  };
  return repository.reviewSubmission(submissionId, domainInput);
}

export async function getClassroomAnalytics(
  classId: string,
  principal: AuthenticatedPrincipal,
  repository: ClassroomRepository = getClassroomRepository(),
) {
  await requireClassAccess(classId, principal, repository, true);
  return repository.listClassroomAnalytics(classId);
}
