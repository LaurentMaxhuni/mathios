export type CurriculumKind = "custom" | "kosovo" | "international";
export type StructureDifficulty = "gentle" | "balanced" | "challenging";

export interface CurriculumRecord {
  id: string;
  slug: string;
  name: string;
  kind: CurriculumKind;
  description: string;
  authority: string | null;
  isSystem: boolean;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface GradeRecord {
  id: string;
  slug: string;
  name: string;
  shortName: string;
  description: string;
  sortOrder: number;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CurriculumGradeRecord {
  curriculumId: string;
  gradeId: string;
  sortOrder: number;
  isAvailable: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SubjectRecord {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon: string;
  accent: string;
  recommendedStudyHours: number;
  sortOrder: number;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CurriculumSubjectRecord {
  curriculumId: string;
  subjectId: string;
  isRequired: boolean;
  isAvailable: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface GradeSubjectRecord {
  curriculumId: string;
  gradeId: string;
  subjectId: string;
  isRequired: boolean;
  isAvailable: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface DomainRecord {
  id: string;
  slug: string;
  name: string;
  description: string;
  sortOrder: number;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SubjectDomainRecord {
  subjectId: string;
  domainId: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface GradeSubjectDomainRecord {
  curriculumId: string;
  gradeId: string;
  subjectId: string;
  domainId: string;
  isRequired: boolean;
  isAvailable: boolean;
  depth: number;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface LearningObjectiveRecord {
  id: string;
  curriculumId: string;
  subjectId: string;
  domainId: string | null;
  code: string;
  title: string;
  description: string;
  difficulty: StructureDifficulty;
  isRequired: boolean;
  sortOrder: number;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface GradeLearningObjectiveRecord {
  curriculumId: string;
  gradeId: string;
  objectiveId: string;
  isRequired: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface CurriculumGradePlacement extends CurriculumGradeRecord {
  grade: GradeRecord;
}

export interface CurriculumSubjectPlacement extends CurriculumSubjectRecord {
  subject: SubjectRecord;
  gradeCount: number;
}

export interface GradeSubjectDomainPlacement extends GradeSubjectDomainRecord {
  domain: DomainRecord;
}

export interface GradeSubjectPlacement extends GradeSubjectRecord {
  subject: SubjectRecord;
  domains: readonly GradeSubjectDomainPlacement[];
  objectiveCount: number;
}

export interface SubjectDomainPlacement extends SubjectDomainRecord {
  domain: DomainRecord;
}

export interface SubjectGradePlacement extends GradeSubjectRecord {
  grade: GradeRecord;
  domains: readonly GradeSubjectDomainPlacement[];
}

export interface CurriculumExplorer {
  curriculum: CurriculumRecord;
  grades: readonly CurriculumGradePlacement[];
  subjects: readonly CurriculumSubjectPlacement[];
  objectiveCount: number;
}

export interface GradeExplorer {
  curriculum: CurriculumRecord;
  grade: GradeRecord;
  subjects: readonly GradeSubjectPlacement[];
  objectives: readonly LearningObjectiveRecord[];
}

export interface SubjectExplorer {
  subject: SubjectRecord;
  domains: readonly SubjectDomainPlacement[];
  curricula: readonly CurriculumSubjectRecord[];
  grades: readonly SubjectGradePlacement[];
  objectives: readonly LearningObjectiveRecord[];
}

export interface CreateCurriculumInput {
  id: string;
  slug: string;
  name: string;
  kind: CurriculumKind;
  description: string;
  authority: string | null;
  isSystem?: boolean;
}

export interface UpdateCurriculumInput {
  slug: string;
  name: string;
  kind: CurriculumKind;
  description: string;
  authority: string | null;
}

export interface CreateGradeInput {
  id: string;
  slug: string;
  name: string;
  shortName: string;
  description: string;
  sortOrder: number;
}

export interface UpdateGradeInput {
  slug: string;
  name: string;
  shortName: string;
  description: string;
  sortOrder: number;
}

export interface CreateSubjectInput {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon: string;
  accent: string;
  recommendedStudyHours: number;
  sortOrder: number;
}

export interface UpdateSubjectInput {
  slug: string;
  name: string;
  description: string;
  icon: string;
  accent: string;
  recommendedStudyHours: number;
  sortOrder: number;
}

export interface CreateDomainInput {
  id: string;
  slug: string;
  name: string;
  description: string;
  sortOrder: number;
}

export interface UpdateDomainInput {
  slug: string;
  name: string;
  description: string;
  sortOrder: number;
}

export interface CurriculumGradeMappingInput {
  curriculumId: string;
  gradeId: string;
  sortOrder: number;
  isAvailable: boolean;
}

export interface CurriculumSubjectMappingInput {
  curriculumId: string;
  subjectId: string;
  isRequired: boolean;
  isAvailable: boolean;
  sortOrder: number;
}

export interface GradeSubjectMappingInput {
  curriculumId: string;
  gradeId: string;
  subjectId: string;
  isRequired: boolean;
  isAvailable: boolean;
  sortOrder: number;
}

export interface SubjectDomainMappingInput {
  subjectId: string;
  domainId: string;
  sortOrder: number;
}

export interface GradeSubjectDomainMappingInput {
  curriculumId: string;
  gradeId: string;
  subjectId: string;
  domainId: string;
  isRequired: boolean;
  isAvailable: boolean;
  depth: number;
  sortOrder: number;
}

export interface CreateLearningObjectiveInput {
  id: string;
  curriculumId: string;
  subjectId: string;
  domainId: string | null;
  code: string;
  title: string;
  description: string;
  difficulty: StructureDifficulty;
  isRequired: boolean;
  sortOrder: number;
}

export interface UpdateLearningObjectiveInput {
  subjectId: string;
  domainId: string | null;
  code: string;
  title: string;
  description: string;
  difficulty: StructureDifficulty;
  isRequired: boolean;
  sortOrder: number;
}

export interface GradeLearningObjectiveMappingInput {
  curriculumId: string;
  gradeId: string;
  objectiveId: string;
  isRequired: boolean;
  sortOrder: number;
}
