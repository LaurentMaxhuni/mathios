import type {
  ConceptApplication,
  ConceptDetail,
  ConceptGradePlacement,
  ConceptIntegritySnapshot,
  ConceptLessonCandidate,
  ConceptLessonLink,
  ConceptListEntry,
  ConceptLearningObjective,
  ConceptMisconception,
  ConceptRecord,
  ConceptRelationship,
  ConceptRelationshipView,
  ConceptListOptions,
  CreateConceptApplicationInput,
  CreateConceptInput,
  CreateConceptMisconceptionInput,
  CreateConceptRelationshipInput,
  KnowledgeGraph,
  KnowledgeGraphOptions,
  UpdateConceptInput,
} from "@/domain/concept/types";

export interface ConceptRepository {
  listConcepts(options?: ConceptListOptions): Promise<readonly ConceptListEntry[]>;
  getSubject(id: string): Promise<{ id: string } | null>;
  getDomain(id: string): Promise<{ id: string; subjectId: string } | null>;
  getConcept(id: string): Promise<ConceptRecord | null>;
  getConceptDetail(
    id: string,
    options?: { includeDraftLessons?: boolean },
  ): Promise<ConceptDetail | null>;
  createConcept(input: CreateConceptInput): Promise<ConceptRecord>;
  updateConcept(id: string, input: UpdateConceptInput): Promise<ConceptRecord>;
  archiveConcept(id: string, isArchived: boolean): Promise<void>;

  listRelationships(options?: {
    conceptId?: string;
    types?: readonly ConceptRelationship["type"][];
  }): Promise<readonly ConceptRelationshipView[]>;
  getRelationship(id: string): Promise<ConceptRelationship | null>;
  createRelationship(input: CreateConceptRelationshipInput): Promise<ConceptRelationship>;
  deleteRelationship(id: string): Promise<void>;

  listLessonLinks(
    conceptId: string,
    options?: { includeDraftLessons?: boolean },
  ): Promise<readonly ConceptLessonLink[]>;
  listLessonCandidates(): Promise<readonly ConceptLessonCandidate[]>;
  saveLessonLink(input: { conceptId: string; lessonId: string; sortOrder: number }): Promise<void>;
  deleteLessonLink(input: { conceptId: string; lessonId: string }): Promise<void>;

  listObjectives(conceptId: string): Promise<readonly ConceptLearningObjective[]>;
  saveObjective(input: Omit<ConceptLearningObjective, "createdAt">): Promise<void>;
  deleteObjective(input: { conceptId: string; objectiveId: string }): Promise<void>;

  listApplications(conceptId: string): Promise<readonly ConceptApplication[]>;
  saveApplication(input: CreateConceptApplicationInput): Promise<ConceptApplication>;
  deleteApplication(id: string): Promise<void>;

  listMisconceptions(conceptId: string): Promise<readonly ConceptMisconception[]>;
  saveMisconception(input: CreateConceptMisconceptionInput): Promise<ConceptMisconception>;
  deleteMisconception(id: string): Promise<void>;

  listGrades(): Promise<readonly ConceptGradePlacement[]>;
  getGraph(options?: KnowledgeGraphOptions): Promise<KnowledgeGraph>;
  getIntegritySnapshot(): Promise<ConceptIntegritySnapshot>;
}
