import type {
  CreateCurriculumInput,
  CreateDomainInput,
  CreateGradeInput,
  CreateLearningObjectiveInput,
  CreateSubjectInput,
  CurriculumExplorer,
  CurriculumGradeMappingInput,
  CurriculumGradeRecord,
  CurriculumRecord,
  CurriculumSubjectMappingInput,
  CurriculumSubjectRecord,
  DomainRecord,
  GradeExplorer,
  GradeLearningObjectiveMappingInput,
  GradeLearningObjectiveRecord,
  GradeRecord,
  GradeSubjectDomainMappingInput,
  GradeSubjectDomainRecord,
  GradeSubjectMappingInput,
  GradeSubjectRecord,
  LearningObjectiveRecord,
  SubjectDomainMappingInput,
  SubjectDomainRecord,
  SubjectExplorer,
  SubjectRecord,
  UpdateCurriculumInput,
  UpdateDomainInput,
  UpdateGradeInput,
  UpdateLearningObjectiveInput,
  UpdateSubjectInput,
} from "@/domain/curriculum/types";

export interface CurriculumRepository {
  listCurricula(options?: { includeArchived?: boolean }): Promise<readonly CurriculumRecord[]>;
  getCurriculum(id: string): Promise<CurriculumRecord | null>;
  getCurriculumExplorer(id: string): Promise<CurriculumExplorer | null>;
  createCurriculum(input: CreateCurriculumInput): Promise<CurriculumRecord>;
  updateCurriculum(id: string, input: UpdateCurriculumInput): Promise<CurriculumRecord>;
  archiveCurriculum(id: string, isArchived: boolean): Promise<void>;

  listGrades(options?: { includeArchived?: boolean }): Promise<readonly GradeRecord[]>;
  getGrade(id: string): Promise<GradeRecord | null>;
  getGradeExplorer(curriculumId: string, gradeId: string): Promise<GradeExplorer | null>;
  createGrade(input: CreateGradeInput): Promise<GradeRecord>;
  updateGrade(id: string, input: UpdateGradeInput): Promise<GradeRecord>;
  archiveGrade(id: string, isArchived: boolean): Promise<void>;

  listSubjects(options?: { includeArchived?: boolean }): Promise<readonly SubjectRecord[]>;
  getSubject(id: string): Promise<SubjectRecord | null>;
  getSubjectExplorer(subjectId: string, curriculumId?: string): Promise<SubjectExplorer | null>;
  createSubject(input: CreateSubjectInput): Promise<SubjectRecord>;
  updateSubject(id: string, input: UpdateSubjectInput): Promise<SubjectRecord>;
  archiveSubject(id: string, isArchived: boolean): Promise<void>;

  listDomains(options?: {
    subjectId?: string;
    includeArchived?: boolean;
  }): Promise<readonly DomainRecord[]>;
  getDomain(id: string): Promise<DomainRecord | null>;
  createDomain(input: CreateDomainInput): Promise<DomainRecord>;
  updateDomain(id: string, input: UpdateDomainInput): Promise<DomainRecord>;
  archiveDomain(id: string, isArchived: boolean): Promise<void>;

  listCurriculumGrades(curriculumId: string): Promise<readonly CurriculumGradeRecord[]>;
  saveCurriculumGrade(input: CurriculumGradeMappingInput): Promise<CurriculumGradeRecord>;
  listCurriculumSubjects(curriculumId: string): Promise<readonly CurriculumSubjectRecord[]>;
  saveCurriculumSubject(input: CurriculumSubjectMappingInput): Promise<CurriculumSubjectRecord>;
  listGradeSubjects(curriculumId: string, gradeId: string): Promise<readonly GradeSubjectRecord[]>;
  saveGradeSubject(input: GradeSubjectMappingInput): Promise<GradeSubjectRecord>;
  listSubjectDomains(subjectId: string): Promise<readonly SubjectDomainRecord[]>;
  saveSubjectDomain(input: SubjectDomainMappingInput): Promise<SubjectDomainRecord>;
  listGradeSubjectDomains(
    curriculumId: string,
    gradeId: string,
    subjectId: string,
  ): Promise<readonly GradeSubjectDomainRecord[]>;
  saveGradeSubjectDomain(input: GradeSubjectDomainMappingInput): Promise<GradeSubjectDomainRecord>;

  listLearningObjectives(options?: {
    curriculumId?: string;
    subjectId?: string;
    gradeId?: string;
    includeArchived?: boolean;
  }): Promise<readonly LearningObjectiveRecord[]>;
  getLearningObjective(id: string): Promise<LearningObjectiveRecord | null>;
  createLearningObjective(input: CreateLearningObjectiveInput): Promise<LearningObjectiveRecord>;
  updateLearningObjective(
    id: string,
    input: UpdateLearningObjectiveInput,
  ): Promise<LearningObjectiveRecord>;
  archiveLearningObjective(id: string, isArchived: boolean): Promise<void>;
  saveGradeLearningObjective(
    input: GradeLearningObjectiveMappingInput,
  ): Promise<GradeLearningObjectiveRecord>;
}
