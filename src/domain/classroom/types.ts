export const CLASSROOM_MEMBERSHIP_ROLES = ["learner", "teacher"] as const;
export type ClassroomMembershipRole = (typeof CLASSROOM_MEMBERSHIP_ROLES)[number];

export const CLASSROOM_TEACHER_ROLES = ["owner", "teacher"] as const;
export type ClassroomTeacherRole = (typeof CLASSROOM_TEACHER_ROLES)[number];

export const CLASSROOM_MEMBERSHIP_STATUSES = ["active", "left", "removed"] as const;
export type ClassroomMembershipStatus = (typeof CLASSROOM_MEMBERSHIP_STATUSES)[number];

export const ASSIGNABLE_RESOURCE_TYPES = [
  "lesson",
  "course",
  "exercise-set",
  "assessment",
  "simulation",
  "laboratory",
  "roadmap",
] as const;
export type AssignableResourceType = (typeof ASSIGNABLE_RESOURCE_TYPES)[number];

export const ASSIGNMENT_TARGET_SCOPES = ["class", "individual"] as const;
export type AssignmentTargetScope = (typeof ASSIGNMENT_TARGET_SCOPES)[number];

export const ASSIGNMENT_STATUSES = ["draft", "published", "archived"] as const;
export type AssignmentStatus = (typeof ASSIGNMENT_STATUSES)[number];

export const LATE_SUBMISSION_RULES = ["allow", "flag", "forbid"] as const;
export type LateSubmissionRule = (typeof LATE_SUBMISSION_RULES)[number];

export const INVITATION_ROLES = ["learner", "teacher"] as const;
export type InvitationRole = (typeof INVITATION_ROLES)[number];

export const INVITATION_STATUSES = ["pending", "accepted", "declined", "expired"] as const;
export type InvitationStatus = (typeof INVITATION_STATUSES)[number];

export const SUBMISSION_STATUSES = [
  "draft",
  "submitted",
  "returned",
  "resubmission-required",
  "graded",
] as const;
export type SubmissionStatus = (typeof SUBMISSION_STATUSES)[number];

export interface ClassroomRecord {
  id: string;
  name: string;
  description: string;
  joinCode: string;
  subjectIds: readonly string[];
  gradeIds: readonly string[];
  createdByProfileId: string;
  createdAt: string;
  updatedAt: string;
}

export interface ClassroomPerson {
  profileId: string;
  displayName: string;
  avatar: string;
  role: ClassroomMembershipRole | ClassroomTeacherRole;
  joinedAt: string;
  status: ClassroomMembershipStatus;
}

export interface ClassroomAccess {
  classId: string;
  profileId: string;
  isOwner: boolean;
  isTeacher: boolean;
  isMember: boolean;
}

export interface ClassroomListItem extends ClassroomRecord {
  role: ClassroomMembershipRole | ClassroomTeacherRole;
  memberCount: number;
  assignmentCount: number;
}

export interface AssignableResource {
  type: AssignableResourceType;
  id: string;
  title: string;
  description: string;
  status: "published";
}

export interface InvitationRecord {
  id: string;
  classId: string;
  role: InvitationRole;
  code: string;
  invitedProfileId: string | null;
  invitedProfileName: string | null;
  invitedByProfileId: string;
  status: InvitationStatus;
  expiresAt: string | null;
  acceptedByProfileId: string | null;
  acceptedAt: string | null;
  createdAt: string;
}

export interface AssignmentTargetRecord {
  assignmentId: string;
  profileId: string;
  displayName: string;
  status: "not-started" | SubmissionStatus;
  submissionCount: number;
  latestSubmissionId: string | null;
}

export interface AssignmentRecord {
  id: string;
  classId: string;
  title: string;
  instructions: string;
  resourceType: AssignableResourceType;
  resourceId: string;
  resourceTitle: string;
  targetScope: AssignmentTargetScope;
  startAt: string | null;
  dueAt: string | null;
  attemptLimit: number | null;
  lateSubmissionRule: LateSubmissionRule;
  status: AssignmentStatus;
  createdByProfileId: string;
  createdAt: string;
  updatedAt: string;
  targets: readonly AssignmentTargetRecord[];
}

export interface SubmissionRecord {
  id: string;
  assignmentId: string;
  profileId: string;
  displayName: string;
  attemptNumber: number;
  status: SubmissionStatus;
  response: string;
  isLate: boolean;
  submittedAt: string | null;
  returnedAt: string | null;
  grade: number | null;
  gradeMax: number;
  teacherFeedback: string | null;
  rubricScores: Record<string, number>;
  reviewedByProfileId: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GradingRubricRecord {
  id: string;
  assignmentId: string;
  title: string;
  criteria: readonly { id: string; label: string; maxPoints: number }[];
  createdAt: string;
  updatedAt: string;
}

export interface ClassroomAnalyticsLearner {
  profileId: string;
  displayName: string;
  assignedCount: number;
  submittedCount: number;
  gradedCount: number;
  averageGrade: number | null;
  completionRate: number;
}

export interface ClassroomAnalytics {
  classId: string;
  memberCount: number;
  assignmentCount: number;
  submissionCount: number;
  gradedSubmissionCount: number;
  lateSubmissionCount: number;
  averageGrade: number | null;
  completionRate: number;
  learners: readonly ClassroomAnalyticsLearner[];
}

export interface ClassroomDetail {
  classroom: ClassroomRecord;
  teachers: readonly ClassroomPerson[];
  members: readonly ClassroomPerson[];
  invitations: readonly InvitationRecord[];
  assignments: readonly AssignmentRecord[];
  submissions: readonly SubmissionRecord[];
  rubrics: readonly GradingRubricRecord[];
  analytics: ClassroomAnalytics | null;
}

export interface ClassroomDashboard {
  classes: readonly ClassroomListItem[];
  resources: readonly AssignableResource[];
}

export interface CreateClassroomInput {
  id: string;
  name: string;
  description: string;
  joinCode: string;
  subjectIds: readonly string[];
  gradeIds: readonly string[];
  createdByProfileId: string;
}

export interface UpdateClassroomInput {
  name: string;
  description: string;
  subjectIds: readonly string[];
  gradeIds: readonly string[];
}

export interface CreateInvitationInput {
  id: string;
  classId: string;
  role: InvitationRole;
  code: string;
  invitedProfileId: string | null;
  invitedByProfileId: string;
  expiresAt: string | null;
}

export interface CreateAssignmentInput {
  id: string;
  classId: string;
  title: string;
  instructions: string;
  resourceType: AssignableResourceType;
  resourceId: string;
  resourceTitle: string;
  targetScope: AssignmentTargetScope;
  targetProfileIds: readonly string[];
  startAt: string | null;
  dueAt: string | null;
  attemptLimit: number | null;
  lateSubmissionRule: LateSubmissionRule;
  createdByProfileId: string;
  rubric?: {
    id: string;
    title: string;
    criteria: readonly { id: string; label: string; maxPoints: number }[];
  };
}

export interface CreateSubmissionInput {
  id: string;
  assignmentId: string;
  profileId: string;
  attemptNumber: number;
  response: string;
  isLate: boolean;
  submittedAt: string;
}

export interface ReviewSubmissionInput {
  status: "returned" | "resubmission-required" | "graded";
  feedback: string | null;
  grade: number | null;
  gradeMax: number;
  rubricScores: Record<string, number>;
  reviewedByProfileId: string;
  reviewedAt: string;
}
