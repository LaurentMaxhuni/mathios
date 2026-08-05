import { randomUUID } from "node:crypto";
import {
  AuthorizationError,
  NotFoundError,
  ValidationError,
} from "@/domain/errors/application-error";
import {
  assertConceptRange,
  assertNoRequiredPrerequisiteCycle,
  assertValidConceptRelationship,
  buildConceptIntegrityReport,
  relationshipKey,
} from "@/domain/concept/rules";
import type {
  ConceptDetail,
  ConceptIntegrityReport,
  ConceptListEntry,
  ConceptRecord,
  ConceptRelationship,
  ConceptRelationshipView,
  ConceptRelationshipType,
  CreateConceptInput,
  KnowledgeGraph,
  KnowledgeGraphOptions,
  UpdateConceptInput,
} from "@/domain/concept/types";
import type { ConceptRepository } from "@/domain/ports/concept-repository";
import type { AuthSession, AuthenticatedPrincipal } from "@/infrastructure/auth/auth-provider";
import { requirePermission } from "@/features/auth/authorization";

const editorRoles = new Set(["administrator", "content-creator", "teacher"]);

export function requireConceptEditor(session: AuthSession | null): AuthenticatedPrincipal {
  const principal = requirePermission(session, "edit_content");
  if (!principal.roles.some((role) => editorRoles.has(role))) {
    throw new AuthorizationError(
      "Only teachers, content creators, and administrators can manage concepts.",
    );
  }
  return principal;
}

export function canAuthorConcepts(principal: AuthenticatedPrincipal | null | undefined): boolean {
  return Boolean(
    principal?.permissions.includes("edit_content") &&
    principal.roles.some((role) => editorRoles.has(role)),
  );
}

function idFor(prefix: string): string {
  return `${prefix}-${randomUUID()}`;
}

function ensure<T>(value: T | null, resource: string, id: string): T {
  if (!value) throw new NotFoundError(resource, id);
  return value;
}

function ensureActiveConcept(value: ConceptRecord | null, id: string): ConceptRecord {
  const concept = ensure(value, "Concept", id);
  if (concept.isArchived)
    throw new ValidationError("Archived concepts cannot be edited or linked.");
  return concept;
}

function plainRelationship(relationship: ConceptRelationshipView): ConceptRelationship {
  return {
    id: relationship.id,
    sourceConceptId: relationship.sourceConceptId,
    targetConceptId: relationship.targetConceptId,
    type: relationship.type,
    createdAt: relationship.createdAt,
    updatedAt: relationship.updatedAt,
  };
}

async function validateConceptPlacement(
  input: Pick<UpdateConceptInput, "subjectId" | "domainId" | "gradeMinId" | "gradeMaxId">,
  repository: ConceptRepository,
): Promise<void> {
  if (!(await repository.getSubject(input.subjectId))) {
    throw new NotFoundError("Subject", input.subjectId);
  }
  if (input.domainId) {
    const domain = await repository.getDomain(input.domainId);
    if (!domain) throw new NotFoundError("Domain", input.domainId);
    if (domain.subjectId !== input.subjectId) {
      throw new ValidationError("The selected domain belongs to a different subject.");
    }
  }
  assertConceptRange(input, await repository.listGrades());
}

export function newConceptId(prefix: string): string {
  return idFor(prefix);
}

export async function createConcept(
  input: Omit<CreateConceptInput, "id"> & { id?: string },
  repository: ConceptRepository,
): Promise<ConceptRecord> {
  if (input.domainId && input.domainId === input.subjectId) {
    throw new ValidationError("Choose a domain ID, not the subject ID.");
  }
  await validateConceptPlacement(input, repository);
  return repository.createConcept({ ...input, id: input.id ?? idFor("concept") });
}

export async function updateConcept(
  id: string,
  input: UpdateConceptInput,
  repository: ConceptRepository,
): Promise<ConceptRecord> {
  ensureActiveConcept(await repository.getConcept(id), id);
  await validateConceptPlacement(input, repository);
  return repository.updateConcept(id, input);
}

export async function archiveConcept(
  id: string,
  isArchived: boolean,
  repository: ConceptRepository,
): Promise<void> {
  ensure(await repository.getConcept(id), "Concept", id);
  return repository.archiveConcept(id, isArchived);
}

export async function saveConceptRelationship(
  input: {
    id?: string;
    sourceConceptId: string;
    targetConceptId: string;
    type: ConceptRelationshipType;
  },
  repository: ConceptRepository,
): Promise<ConceptRelationship> {
  assertValidConceptRelationship(input);
  ensureActiveConcept(await repository.getConcept(input.sourceConceptId), input.sourceConceptId);
  ensureActiveConcept(await repository.getConcept(input.targetConceptId), input.targetConceptId);
  const relationships = await repository.listRelationships();
  const existing = relationships.find(
    (relationship) =>
      relationshipKey(relationship) === relationshipKey(input) && relationship.id !== input.id,
  );
  if (existing) throw new ValidationError("That concept relationship already exists.");
  const plainRelationships = relationships
    .filter((relationship) => relationship.id !== input.id)
    .map(plainRelationship);
  assertNoRequiredPrerequisiteCycle([...plainRelationships, input]);
  if (input.id) {
    const current = await repository.getRelationship(input.id);
    if (!current) throw new NotFoundError("Concept relationship", input.id);
    await repository.deleteRelationship(input.id);
  }
  return repository.createRelationship({ ...input, id: input.id ?? idFor("concept-edge") });
}

export async function deleteConceptRelationship(
  id: string,
  repository: ConceptRepository,
): Promise<void> {
  return repository.deleteRelationship(id);
}

export async function saveLessonConcept(
  input: { conceptId: string; lessonId: string; sortOrder: number },
  repository: ConceptRepository,
): Promise<void> {
  ensureActiveConcept(await repository.getConcept(input.conceptId), input.conceptId);
  const lesson = (await repository.listLessonCandidates()).find(
    (candidate) => candidate.lessonId === input.lessonId,
  );
  if (!lesson) throw new NotFoundError("Lesson", input.lessonId);
  return repository.saveLessonLink(input);
}

export async function deleteLessonConcept(
  input: { conceptId: string; lessonId: string },
  repository: ConceptRepository,
): Promise<void> {
  ensure(await repository.getConcept(input.conceptId), "Concept", input.conceptId);
  return repository.deleteLessonLink(input);
}

export async function saveConceptObjective(
  input: { conceptId: string; objectiveId: string; sortOrder: number },
  repository: ConceptRepository,
): Promise<void> {
  ensureActiveConcept(await repository.getConcept(input.conceptId), input.conceptId);
  return repository.saveObjective(input);
}

export async function saveConceptApplication(
  input: {
    id?: string;
    conceptId: string;
    title: string;
    description: string;
    sortOrder: number;
  },
  repository: ConceptRepository,
) {
  ensureActiveConcept(await repository.getConcept(input.conceptId), input.conceptId);
  return repository.saveApplication({ ...input, id: input.id ?? idFor("application") });
}

export async function saveConceptMisconception(
  input: {
    id?: string;
    conceptId: string;
    misconception: string;
    correction: string;
    sortOrder: number;
  },
  repository: ConceptRepository,
) {
  ensureActiveConcept(await repository.getConcept(input.conceptId), input.conceptId);
  return repository.saveMisconception({ ...input, id: input.id ?? idFor("misconception") });
}

export async function getConceptDetail(
  id: string,
  repository: ConceptRepository,
  options: { includeDraftLessons?: boolean } = {},
): Promise<ConceptDetail> {
  return ensure(await repository.getConceptDetail(id, options), "Concept", id);
}

export function validateConceptGraph(
  snapshot: Parameters<typeof buildConceptIntegrityReport>[0],
): ConceptIntegrityReport {
  return buildConceptIntegrityReport(snapshot);
}

export async function getKnowledgeGraph(
  options: KnowledgeGraphOptions,
  repository: ConceptRepository,
): Promise<KnowledgeGraph> {
  return repository.getGraph(options);
}

export interface BulkRelationshipRow {
  sourceConceptId: string;
  targetConceptId: string;
  type: ConceptRelationshipType;
}

export async function bulkImportRelationships(
  rows: readonly BulkRelationshipRow[],
  repository: ConceptRepository,
): Promise<number> {
  if (!rows.length) throw new ValidationError("Add at least one relationship row.");
  const existing = await repository.listRelationships();
  const candidateEdges: ConceptRelationship[] = existing.map(plainRelationship);
  const existingKeys = new Set(candidateEdges.map(relationshipKey));
  const pending: BulkRelationshipRow[] = [];
  for (const row of rows) {
    assertValidConceptRelationship(row);
    ensureActiveConcept(await repository.getConcept(row.sourceConceptId), row.sourceConceptId);
    ensureActiveConcept(await repository.getConcept(row.targetConceptId), row.targetConceptId);
    const key = relationshipKey(row);
    if (existingKeys.has(key)) continue;
    existingKeys.add(key);
    candidateEdges.push({ ...row, id: idFor("concept-edge"), createdAt: "", updatedAt: "" });
    assertNoRequiredPrerequisiteCycle(candidateEdges);
    pending.push(row);
  }
  for (const row of pending) {
    await repository.createRelationship({ ...row, id: idFor("concept-edge") });
  }
  return pending.length;
}

export function parseBulkRelationshipRows(
  value: string,
  concepts: readonly ConceptListEntry[],
): BulkRelationshipRow[] {
  const bySlug = new Map(concepts.map((concept) => [concept.slug, concept.id]));
  const byId = new Map(concepts.map((concept) => [concept.id, concept.id]));
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const parts = line.split(",").map((part) => part.trim());
      if (parts.length !== 3) {
        throw new ValidationError(`Relationship row ${index + 1} must be source,type,target.`);
      }
      const [source, type, target] = parts;
      const sourceConceptId = byId.get(source) ?? bySlug.get(source);
      const targetConceptId = byId.get(target) ?? bySlug.get(target);
      if (!sourceConceptId || !targetConceptId) {
        throw new ValidationError(`Relationship row ${index + 1} references an unknown concept.`);
      }
      assertValidConceptRelationship({ sourceConceptId, targetConceptId, type });
      return { sourceConceptId, targetConceptId, type: type as ConceptRelationshipType };
    });
}
