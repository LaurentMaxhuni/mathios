import { z } from "zod";
import {
  ASSIGNABLE_RESOURCE_TYPES,
  ASSIGNMENT_TARGET_SCOPES,
  INVITATION_ROLES,
  LATE_SUBMISSION_RULES,
} from "@/domain/classroom/types";

const idList = z.array(z.string().trim().min(1).max(120)).max(200).default([]);
const optionalDate = z.string().datetime({ offset: true }).nullable().optional().default(null);

export const classroomSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(2000).default(""),
  subjectIds: idList,
  gradeIds: idList,
});

export const joinClassroomSchema = z.object({
  joinCode: z.string().trim().min(6).max(12),
});

export const acceptInvitationSchema = z.object({
  code: z.string().trim().min(6).max(12),
});

export const invitationSchema = z.object({
  role: z.enum(INVITATION_ROLES),
  invitedProfileId: z.string().trim().min(1).max(120).nullable().optional().default(null),
  expiresAt: optionalDate,
});

const rubricCriteriaSchema = z.object({
  id: z.string().trim().min(1).max(80),
  label: z.string().trim().min(1).max(200),
  maxPoints: z.number().finite().positive().max(1000),
});

export const assignmentSchema = z.object({
  title: z.string().trim().min(1).max(160),
  instructions: z.string().trim().max(8000).default(""),
  resourceType: z.enum(ASSIGNABLE_RESOURCE_TYPES),
  resourceId: z.string().trim().min(1).max(120),
  targetScope: z.enum(ASSIGNMENT_TARGET_SCOPES).default("class"),
  targetProfileIds: idList,
  startAt: optionalDate,
  dueAt: optionalDate,
  attemptLimit: z.number().int().min(1).max(20).nullable().optional().default(null),
  lateSubmissionRule: z.enum(LATE_SUBMISSION_RULES).default("flag"),
  rubricTitle: z.string().trim().max(160).optional().default(""),
  rubricCriteria: z.array(rubricCriteriaSchema).max(30).optional().default([]),
});

export const submissionSchema = z.object({
  response: z.string().trim().min(1).max(20000),
});

export const reviewSubmissionSchema = z.object({
  status: z.enum(["returned", "resubmission-required", "graded"]),
  feedback: z.string().trim().max(8000).nullable().optional().default(null),
  grade: z.number().finite().min(0).max(1000).nullable().optional().default(null),
  gradeMax: z.number().finite().positive().max(1000).default(100),
  rubricScores: z.record(z.string().max(80), z.number().finite().min(0).max(1000)).default({}),
});

export type ClassroomInput = z.infer<typeof classroomSchema>;
export type InvitationInput = z.infer<typeof invitationSchema>;
export type AssignmentInput = z.infer<typeof assignmentSchema>;
export type SubmissionInput = z.infer<typeof submissionSchema>;
export type ReviewSubmissionInput = z.infer<typeof reviewSubmissionSchema>;
