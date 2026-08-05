export const CONCEPT_DIFFICULTIES = ["gentle", "balanced", "challenging"] as const;
export type ConceptDifficulty = (typeof CONCEPT_DIFFICULTIES)[number];

export const CONCEPT_RELATIONSHIP_TYPES = [
  "requires",
  "recommended-before",
  "unlocks",
  "related-to",
  "builds-upon",
  "applies-in",
  "used-by",
  "cross-subject-connection",
  "grade-level-extension",
  "advanced-extension",
  "alternative-explanation",
] as const;
export type ConceptRelationshipType = (typeof CONCEPT_RELATIONSHIP_TYPES)[number];

export type ConceptMasteryState = "unassessed";

export interface ConceptRecord {
  id: string;
  slug: string;
  name: string;
  description: string;
  subjectId: string;
  domainId: string | null;
  gradeMinId: string | null;
  gradeMaxId: string | null;
  difficulty: ConceptDifficulty;
  masteryThreshold: number;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ConceptListEntry extends ConceptRecord {
  subjectName: string;
  subjectSlug: string;
  domainName: string | null;
  relationshipCount: number;
  lessonCount: number;
  objectiveCount: number;
  prerequisiteCount: number;
  masteryState: ConceptMasteryState;
}

export interface ConceptRelationship {
  id: string;
  sourceConceptId: string;
  targetConceptId: string;
  type: ConceptRelationshipType;
  createdAt: string;
  updatedAt: string;
}

export interface ConceptRelationshipView extends ConceptRelationship {
  sourceConcept: Pick<ConceptRecord, "id" | "slug" | "name" | "subjectId">;
  targetConcept: Pick<ConceptRecord, "id" | "slug" | "name" | "subjectId">;
}

export interface ConceptLearningObjective {
  conceptId: string;
  objectiveId: string;
  sortOrder: number;
  createdAt: string;
}

export interface ConceptApplication {
  id: string;
  conceptId: string;
  title: string;
  description: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface ConceptMisconception {
  id: string;
  conceptId: string;
  misconception: string;
  correction: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface ConceptLessonLink {
  lessonId: string;
  conceptId: string;
  sortOrder: number;
  lessonTitle: string;
  lessonSlug: string;
  lessonStatus: "draft" | "published" | "archived";
  moduleId: string;
  moduleTitle: string;
  courseId: string;
  courseTitle: string;
  courseStatus: "draft" | "published" | "archived";
  createdAt: string;
}

export interface ConceptLessonCandidate {
  lessonId: string;
  lessonTitle: string;
  lessonSlug: string;
  lessonStatus: "draft" | "published" | "archived";
  moduleId: string;
  moduleTitle: string;
  courseId: string;
  courseTitle: string;
  courseStatus: "draft" | "published" | "archived";
}

export interface ConceptGradePlacement {
  id: string;
  name: string;
  shortName: string;
  sortOrder: number;
}

export interface ConceptDetail {
  concept: ConceptRecord;
  subjectName: string;
  subjectSlug: string;
  domainName: string | null;
  grades: readonly ConceptGradePlacement[];
  prerequisites: readonly ConceptRelationshipView[];
  unlocks: readonly ConceptRelationshipView[];
  relationships: readonly ConceptRelationshipView[];
  objectives: readonly ConceptLearningObjective[];
  applications: readonly ConceptApplication[];
  misconceptions: readonly ConceptMisconception[];
  lessons: readonly ConceptLessonLink[];
  curriculumIds: readonly string[];
  courseIds: readonly string[];
  exerciseReferences: readonly string[];
  simulationReferences: readonly string[];
  masteryState: ConceptMasteryState;
}

export interface KnowledgeGraphNode extends ConceptListEntry {
  x: number;
  y: number;
  locked: boolean;
}

export interface KnowledgeGraphEdge extends ConceptRelationship {
  sourceName: string;
  targetName: string;
}

export interface KnowledgeGraph {
  nodes: readonly KnowledgeGraphNode[];
  edges: readonly KnowledgeGraphEdge[];
  orphanedConceptIds: readonly string[];
  requiredCycle: readonly string[] | null;
}

export interface ConceptListOptions {
  search?: string;
  subjectId?: string;
  domainId?: string;
  gradeId?: string;
  difficulty?: ConceptDifficulty;
  includeArchived?: boolean;
}

export interface KnowledgeGraphOptions extends ConceptListOptions {
  relationshipTypes?: readonly ConceptRelationshipType[];
  masteryState?: ConceptMasteryState | "all";
}

export interface CreateConceptInput {
  id: string;
  slug: string;
  name: string;
  description: string;
  subjectId: string;
  domainId: string | null;
  gradeMinId: string | null;
  gradeMaxId: string | null;
  difficulty: ConceptDifficulty;
  masteryThreshold: number;
}

export type UpdateConceptInput = Omit<CreateConceptInput, "id">;

export interface CreateConceptRelationshipInput {
  id: string;
  sourceConceptId: string;
  targetConceptId: string;
  type: ConceptRelationshipType;
}

export interface CreateConceptApplicationInput {
  id: string;
  conceptId: string;
  title: string;
  description: string;
  sortOrder: number;
}

export interface CreateConceptMisconceptionInput {
  id: string;
  conceptId: string;
  misconception: string;
  correction: string;
  sortOrder: number;
}

export interface ConceptIntegrityReport {
  orphanedConceptIds: readonly string[];
  missingConceptIds: readonly string[];
  duplicateRelationshipKeys: readonly string[];
  requiredCycle: readonly string[] | null;
}

export interface ConceptIntegritySnapshot {
  concepts: readonly Pick<ConceptRecord, "id">[];
  relationships: readonly Pick<
    ConceptRelationship,
    "sourceConceptId" | "targetConceptId" | "type"
  >[];
  lessonLinks: readonly Pick<ConceptLessonLink, "conceptId">[];
  objectiveLinks: readonly Pick<ConceptLearningObjective, "conceptId">[];
}
