import type {
  AssignableResource,
  AssignmentRecord,
  ClassroomAccess,
  ClassroomAnalytics,
  ClassroomDetail,
  ClassroomListItem,
  ClassroomRecord,
  CreateAssignmentInput,
  CreateClassroomInput,
  CreateInvitationInput,
  CreateSubmissionInput,
  InvitationRecord,
  ReviewSubmissionInput,
  SubmissionRecord,
  UpdateClassroomInput,
} from "@/domain/classroom/types";

export interface ClassroomRepository {
  listClasses(profileId: string, includeAll?: boolean): Promise<readonly ClassroomListItem[]>;
  getClassroom(classId: string): Promise<ClassroomRecord | null>;
  getAccess(classId: string, profileId: string): Promise<ClassroomAccess | null>;
  getClassroomDetail(classId: string): Promise<ClassroomDetail | null>;
  listAssignableResources(): Promise<readonly AssignableResource[]>;
  getAssignableResource(
    type: AssignableResource["type"],
    id: string,
  ): Promise<AssignableResource | null>;
  getProfile(
    profileId: string,
  ): Promise<{ id: string; displayName: string; avatar: string } | null>;
  createClassroom(input: CreateClassroomInput): Promise<ClassroomRecord>;
  updateClassroom(classId: string, input: UpdateClassroomInput): Promise<ClassroomRecord>;
  joinClassroom(classId: string, profileId: string): Promise<void>;
  addTeacher(classId: string, profileId: string, role: "owner" | "teacher"): Promise<void>;
  createInvitation(input: CreateInvitationInput): Promise<InvitationRecord>;
  listInvitations(classId: string): Promise<readonly InvitationRecord[]>;
  acceptInvitation(invitationId: string, profileId: string): Promise<InvitationRecord>;
  acceptInvitationByCode(code: string, profileId: string): Promise<InvitationRecord>;
  joinByCode(joinCode: string, profileId: string): Promise<ClassroomRecord>;
  createAssignment(input: CreateAssignmentInput): Promise<AssignmentRecord>;
  getAssignment(assignmentId: string): Promise<AssignmentRecord | null>;
  createSubmission(input: CreateSubmissionInput): Promise<SubmissionRecord>;
  reviewSubmission(submissionId: string, input: ReviewSubmissionInput): Promise<SubmissionRecord>;
  listClassroomAnalytics(classId: string): Promise<ClassroomAnalytics>;
}
