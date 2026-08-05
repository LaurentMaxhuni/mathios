import { randomUUID } from "node:crypto";
import {
  AuthorizationError,
  ConflictError,
  NotFoundError,
  ValidationError,
} from "@/domain/errors/application-error";
import type { CurriculumRepository } from "@/domain/ports/curriculum-repository";
import type {
  CreateCurriculumInput,
  CreateDomainInput,
  CreateGradeInput,
  CreateLearningObjectiveInput,
  CreateSubjectInput,
  CurriculumRecord,
  DomainRecord,
  GradeRecord,
  LearningObjectiveRecord,
  SubjectRecord,
  UpdateCurriculumInput,
  UpdateDomainInput,
  UpdateGradeInput,
  UpdateLearningObjectiveInput,
  UpdateSubjectInput,
} from "@/domain/curriculum/types";
import type { AuthSession, AuthenticatedPrincipal } from "@/infrastructure/auth/auth-provider";
import { requirePermission } from "@/features/auth/authorization";

const structureManagerRoles = new Set(["administrator", "content-creator"]);

export function requireStructureManager(session: AuthSession | null): AuthenticatedPrincipal {
  const principal = requirePermission(session, "edit_content");
  if (!principal.roles.some((role) => structureManagerRoles.has(role))) {
    throw new AuthorizationError(
      "Only administrators and content creators can manage curriculum structure.",
    );
  }
  return principal;
}

export function canManageStructure(principal: AuthenticatedPrincipal | null | undefined): boolean {
  return Boolean(
    principal?.permissions.includes("edit_content") &&
    principal.roles.some((role) => structureManagerRoles.has(role)),
  );
}

function idFor(prefix: string): string {
  return `${prefix}-${randomUUID()}`;
}

function ensureRecord<T>(record: T | null, resource: string, id: string): T {
  if (!record) throw new NotFoundError(resource, id);
  return record;
}

function ensureActive(record: { isArchived: boolean } | null, resource: string, id: string) {
  const active = ensureRecord(record, resource, id);
  if (active.isArchived) {
    throw new ConflictError(`${resource} '${id}' is archived and cannot be used in a new mapping.`);
  }
}

export function newStructureId(prefix: string): string {
  return idFor(prefix);
}

export async function createCurriculum(
  input: Omit<CreateCurriculumInput, "id"> & { id?: string },
  repository: CurriculumRepository,
): Promise<CurriculumRecord> {
  return repository.createCurriculum({ ...input, id: input.id ?? idFor("curriculum") });
}

export async function updateCurriculum(
  id: string,
  input: UpdateCurriculumInput,
  repository: CurriculumRepository,
): Promise<CurriculumRecord> {
  ensureRecord(await repository.getCurriculum(id), "Curriculum", id);
  return repository.updateCurriculum(id, input);
}

export async function archiveCurriculum(
  id: string,
  isArchived: boolean,
  repository: CurriculumRepository,
): Promise<void> {
  ensureRecord(await repository.getCurriculum(id), "Curriculum", id);
  await repository.archiveCurriculum(id, isArchived);
}

export async function createGrade(
  input: Omit<CreateGradeInput, "id"> & { id?: string },
  repository: CurriculumRepository,
): Promise<GradeRecord> {
  return repository.createGrade({ ...input, id: input.id ?? idFor("grade") });
}

export async function updateGrade(
  id: string,
  input: UpdateGradeInput,
  repository: CurriculumRepository,
): Promise<GradeRecord> {
  ensureRecord(await repository.getGrade(id), "Grade", id);
  return repository.updateGrade(id, input);
}

export async function archiveGrade(
  id: string,
  isArchived: boolean,
  repository: CurriculumRepository,
): Promise<void> {
  ensureRecord(await repository.getGrade(id), "Grade", id);
  await repository.archiveGrade(id, isArchived);
}

export async function createSubject(
  input: Omit<CreateSubjectInput, "id"> & { id?: string },
  repository: CurriculumRepository,
): Promise<SubjectRecord> {
  return repository.createSubject({ ...input, id: input.id ?? idFor("subject") });
}

export async function updateSubject(
  id: string,
  input: UpdateSubjectInput,
  repository: CurriculumRepository,
): Promise<SubjectRecord> {
  ensureRecord(await repository.getSubject(id), "Subject", id);
  return repository.updateSubject(id, input);
}

export async function archiveSubject(
  id: string,
  isArchived: boolean,
  repository: CurriculumRepository,
): Promise<void> {
  ensureRecord(await repository.getSubject(id), "Subject", id);
  await repository.archiveSubject(id, isArchived);
}

export async function createDomain(
  input: Omit<CreateDomainInput, "id"> & { id?: string },
  repository: CurriculumRepository,
): Promise<DomainRecord> {
  return repository.createDomain({ ...input, id: input.id ?? idFor("domain") });
}

export async function updateDomain(
  id: string,
  input: UpdateDomainInput,
  repository: CurriculumRepository,
): Promise<DomainRecord> {
  ensureRecord(await repository.getDomain(id), "Domain", id);
  return repository.updateDomain(id, input);
}

export async function archiveDomain(
  id: string,
  isArchived: boolean,
  repository: CurriculumRepository,
): Promise<void> {
  ensureRecord(await repository.getDomain(id), "Domain", id);
  await repository.archiveDomain(id, isArchived);
}

export async function saveCurriculumGrade(
  input: Parameters<CurriculumRepository["saveCurriculumGrade"]>[0],
  repository: CurriculumRepository,
) {
  ensureActive(
    await repository.getCurriculum(input.curriculumId),
    "Curriculum",
    input.curriculumId,
  );
  ensureActive(await repository.getGrade(input.gradeId), "Grade", input.gradeId);
  return repository.saveCurriculumGrade(input);
}

export async function saveCurriculumSubject(
  input: Parameters<CurriculumRepository["saveCurriculumSubject"]>[0],
  repository: CurriculumRepository,
) {
  ensureActive(
    await repository.getCurriculum(input.curriculumId),
    "Curriculum",
    input.curriculumId,
  );
  ensureActive(await repository.getSubject(input.subjectId), "Subject", input.subjectId);
  return repository.saveCurriculumSubject(input);
}

export async function saveGradeSubject(
  input: Parameters<CurriculumRepository["saveGradeSubject"]>[0],
  repository: CurriculumRepository,
) {
  ensureActive(
    await repository.getCurriculum(input.curriculumId),
    "Curriculum",
    input.curriculumId,
  );
  ensureActive(await repository.getGrade(input.gradeId), "Grade", input.gradeId);
  ensureActive(await repository.getSubject(input.subjectId), "Subject", input.subjectId);
  const curriculumGrades = await repository.listCurriculumGrades(input.curriculumId);
  if (
    !curriculumGrades.some((mapping) => mapping.gradeId === input.gradeId && mapping.isAvailable)
  ) {
    throw new ValidationError("Add this grade to the curriculum before adding subjects to it.");
  }
  const curriculumSubjects = await repository.listCurriculumSubjects(input.curriculumId);
  if (
    !curriculumSubjects.some(
      (mapping) => mapping.subjectId === input.subjectId && mapping.isAvailable,
    )
  ) {
    throw new ValidationError("Add this subject to the curriculum before adding it to a grade.");
  }
  return repository.saveGradeSubject(input);
}

export async function saveSubjectDomain(
  input: Parameters<CurriculumRepository["saveSubjectDomain"]>[0],
  repository: CurriculumRepository,
) {
  ensureActive(await repository.getSubject(input.subjectId), "Subject", input.subjectId);
  ensureActive(await repository.getDomain(input.domainId), "Domain", input.domainId);
  return repository.saveSubjectDomain(input);
}

export async function saveGradeSubjectDomain(
  input: Parameters<CurriculumRepository["saveGradeSubjectDomain"]>[0],
  repository: CurriculumRepository,
) {
  if (input.depth < 1 || input.depth > 5) {
    throw new ValidationError("Domain depth must be between 1 and 5.");
  }
  ensureActive(
    await repository.getCurriculum(input.curriculumId),
    "Curriculum",
    input.curriculumId,
  );
  ensureActive(await repository.getGrade(input.gradeId), "Grade", input.gradeId);
  ensureActive(await repository.getSubject(input.subjectId), "Subject", input.subjectId);
  ensureActive(await repository.getDomain(input.domainId), "Domain", input.domainId);
  const gradeSubjects = await repository.listGradeSubjects(input.curriculumId, input.gradeId);
  if (
    !gradeSubjects.some((mapping) => mapping.subjectId === input.subjectId && mapping.isAvailable)
  ) {
    throw new ValidationError("Add this subject to the grade before assigning domain depth.");
  }
  const subjectDomains = await repository.listSubjectDomains(input.subjectId);
  if (!subjectDomains.some((mapping) => mapping.domainId === input.domainId)) {
    throw new ValidationError("Add this domain to the subject before assigning grade depth.");
  }
  return repository.saveGradeSubjectDomain(input);
}

export async function createLearningObjective(
  input: Omit<CreateLearningObjectiveInput, "id"> & { id?: string },
  repository: CurriculumRepository,
): Promise<LearningObjectiveRecord> {
  ensureActive(
    await repository.getCurriculum(input.curriculumId),
    "Curriculum",
    input.curriculumId,
  );
  ensureActive(await repository.getSubject(input.subjectId), "Subject", input.subjectId);
  if (input.domainId) {
    ensureActive(await repository.getDomain(input.domainId), "Domain", input.domainId);
    const domains = await repository.listSubjectDomains(input.subjectId);
    if (!domains.some((mapping) => mapping.domainId === input.domainId)) {
      throw new ValidationError("The objective domain must belong to its subject.");
    }
  }
  return repository.createLearningObjective({ ...input, id: input.id ?? idFor("objective") });
}

export async function updateLearningObjective(
  id: string,
  input: UpdateLearningObjectiveInput,
  repository: CurriculumRepository,
): Promise<LearningObjectiveRecord> {
  const current = ensureRecord(await repository.getLearningObjective(id), "Learning objective", id);
  ensureActive(
    await repository.getCurriculum(current.curriculumId),
    "Curriculum",
    current.curriculumId,
  );
  ensureActive(await repository.getSubject(input.subjectId), "Subject", input.subjectId);
  if (input.domainId) {
    ensureActive(await repository.getDomain(input.domainId), "Domain", input.domainId);
    const domains = await repository.listSubjectDomains(input.subjectId);
    if (!domains.some((mapping) => mapping.domainId === input.domainId)) {
      throw new ValidationError("The objective domain must belong to its subject.");
    }
  }
  return repository.updateLearningObjective(id, input);
}

export async function archiveLearningObjective(
  id: string,
  isArchived: boolean,
  repository: CurriculumRepository,
): Promise<void> {
  ensureRecord(await repository.getLearningObjective(id), "Learning objective", id);
  await repository.archiveLearningObjective(id, isArchived);
}

export async function saveGradeLearningObjective(
  input: Parameters<CurriculumRepository["saveGradeLearningObjective"]>[0],
  repository: CurriculumRepository,
) {
  ensureActive(
    await repository.getCurriculum(input.curriculumId),
    "Curriculum",
    input.curriculumId,
  );
  ensureActive(await repository.getGrade(input.gradeId), "Grade", input.gradeId);
  const objective = ensureRecord(
    await repository.getLearningObjective(input.objectiveId),
    "Learning objective",
    input.objectiveId,
  );
  if (objective.curriculumId !== input.curriculumId) {
    throw new ValidationError("The objective and grade must belong to the same curriculum.");
  }
  const subjects = await repository.listGradeSubjects(input.curriculumId, input.gradeId);
  if (
    !subjects.some((mapping) => mapping.subjectId === objective.subjectId && mapping.isAvailable)
  ) {
    throw new ValidationError(
      "Add the objective subject to the grade before assigning its objective.",
    );
  }
  return repository.saveGradeLearningObjective(input);
}
