import { z } from "zod";

export const slugSchema = z
  .string()
  .trim()
  .min(2, "Use at least two characters.")
  .max(80, "Keep slugs under 80 characters.")
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers, and single hyphens.");

const descriptionSchema = z.string().trim().max(2000, "Keep descriptions under 2,000 characters.");
const sortOrderSchema = z.coerce.number().int().min(0).max(9999);

export const curriculumSchema = z.object({
  id: z.string().trim().min(1),
  slug: slugSchema,
  name: z.string().trim().min(2).max(120),
  kind: z.enum(["custom", "kosovo", "international"]),
  description: descriptionSchema,
  authority: z.string().trim().max(160).nullable(),
});

export const gradeSchema = z.object({
  id: z.string().trim().min(1),
  slug: slugSchema,
  name: z.string().trim().min(2).max(120),
  shortName: z.string().trim().min(1).max(30),
  description: descriptionSchema,
  sortOrder: sortOrderSchema,
});

export const subjectSchema = z.object({
  id: z.string().trim().min(1),
  slug: slugSchema,
  name: z.string().trim().min(2).max(120),
  description: descriptionSchema,
  icon: z.string().trim().min(2).max(60),
  accent: z.string().trim().min(2).max(60),
  recommendedStudyHours: z.coerce.number().int().min(0).max(10000),
  sortOrder: sortOrderSchema,
});

export const domainSchema = z.object({
  id: z.string().trim().min(1),
  slug: slugSchema,
  name: z.string().trim().min(2).max(120),
  description: descriptionSchema,
  sortOrder: sortOrderSchema,
});

export const curriculumGradeMappingSchema = z.object({
  curriculumId: z.string().trim().min(1),
  gradeId: z.string().trim().min(1),
  sortOrder: sortOrderSchema,
  isAvailable: z.boolean(),
});

export const curriculumSubjectMappingSchema = z.object({
  curriculumId: z.string().trim().min(1),
  subjectId: z.string().trim().min(1),
  isRequired: z.boolean(),
  isAvailable: z.boolean(),
  sortOrder: sortOrderSchema,
});

export const gradeSubjectMappingSchema = z.object({
  curriculumId: z.string().trim().min(1),
  gradeId: z.string().trim().min(1),
  subjectId: z.string().trim().min(1),
  isRequired: z.boolean(),
  isAvailable: z.boolean(),
  sortOrder: sortOrderSchema,
});

export const subjectDomainMappingSchema = z.object({
  subjectId: z.string().trim().min(1),
  domainId: z.string().trim().min(1),
  sortOrder: sortOrderSchema,
});

export const gradeSubjectDomainMappingSchema = z.object({
  curriculumId: z.string().trim().min(1),
  gradeId: z.string().trim().min(1),
  subjectId: z.string().trim().min(1),
  domainId: z.string().trim().min(1),
  isRequired: z.boolean(),
  isAvailable: z.boolean(),
  depth: z.coerce.number().int().min(1).max(5),
  sortOrder: sortOrderSchema,
});

export const learningObjectiveSchema = z.object({
  id: z.string().trim().min(1),
  curriculumId: z.string().trim().min(1),
  subjectId: z.string().trim().min(1),
  domainId: z.string().trim().min(1).nullable(),
  code: z
    .string()
    .trim()
    .min(2)
    .max(60)
    .regex(/^[A-Za-z0-9._-]+$/, "Use letters, numbers, dots, underscores, or hyphens."),
  title: z.string().trim().min(4).max(180),
  description: z.string().trim().min(8).max(2000),
  difficulty: z.enum(["gentle", "balanced", "challenging"]),
  isRequired: z.boolean(),
  sortOrder: sortOrderSchema,
});

export const learningObjectiveUpdateSchema = learningObjectiveSchema.omit({
  id: true,
  curriculumId: true,
});

export const gradeLearningObjectiveMappingSchema = z.object({
  curriculumId: z.string().trim().min(1),
  gradeId: z.string().trim().min(1),
  objectiveId: z.string().trim().min(1),
  isRequired: z.boolean(),
  sortOrder: sortOrderSchema,
});

export type CurriculumInput = z.infer<typeof curriculumSchema>;
export type GradeInput = z.infer<typeof gradeSchema>;
export type SubjectInput = z.infer<typeof subjectSchema>;
export type DomainInput = z.infer<typeof domainSchema>;
export type CurriculumGradeMappingInput = z.infer<typeof curriculumGradeMappingSchema>;
export type CurriculumSubjectMappingInput = z.infer<typeof curriculumSubjectMappingSchema>;
export type GradeSubjectMappingInput = z.infer<typeof gradeSubjectMappingSchema>;
export type SubjectDomainMappingInput = z.infer<typeof subjectDomainMappingSchema>;
export type GradeSubjectDomainMappingInput = z.infer<typeof gradeSubjectDomainMappingSchema>;
export type LearningObjectiveInput = z.infer<typeof learningObjectiveSchema>;
export type LearningObjectiveUpdateInput = z.infer<typeof learningObjectiveUpdateSchema>;
export type GradeLearningObjectiveMappingInput = z.infer<
  typeof gradeLearningObjectiveMappingSchema
>;
