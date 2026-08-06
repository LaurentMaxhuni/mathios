export const SEARCH_DOCUMENT_TYPES = [
  "curriculum",
  "grade",
  "subject",
  "domain",
  "course",
  "module",
  "lesson",
  "concept",
  "question",
  "assessment",
  "simulation",
  "laboratory",
  "roadmap",
  "note",
  "bookmark",
] as const;
export type SearchDocumentType = (typeof SEARCH_DOCUMENT_TYPES)[number];

export const SEARCH_DIFFICULTIES = ["gentle", "balanced", "challenging", "mixed"] as const;
export type SearchDifficulty = (typeof SEARCH_DIFFICULTIES)[number];

export const SEARCH_MASTERY_STATES = [
  "unassessed",
  "not-started",
  "introduced",
  "developing",
  "practiced",
  "proficient",
  "mastered",
  "needs-review",
] as const;
export type SearchMasteryState = (typeof SEARCH_MASTERY_STATES)[number];

export const SEARCH_PUBLICATION_STATUSES = ["published", "draft", "archived", "personal"] as const;
export type SearchPublicationStatus = (typeof SEARCH_PUBLICATION_STATUSES)[number];

export interface SearchDocumentMetadata {
  subjectIds?: readonly string[];
  gradeIds?: readonly string[];
  curriculumIds?: readonly string[];
  difficulty?: SearchDifficulty;
  masteryState?: SearchMasteryState;
  publicationStatus?: SearchPublicationStatus;
  resourceType?: string;
  [key: string]: unknown;
}

export interface SearchDocument {
  id: string;
  type: SearchDocumentType | string;
  resourceId?: string;
  profileId?: string | null;
  title: string;
  content: string;
  href?: string | null;
  updatedAt?: string;
  metadata?: SearchDocumentMetadata;
}

export interface SearchQuery {
  text: string;
  profileId?: string | null;
  types?: readonly string[];
  subjectIds?: readonly string[];
  gradeIds?: readonly string[];
  curriculumIds?: readonly string[];
  difficulties?: readonly SearchDifficulty[];
  masteryStates?: readonly SearchMasteryState[];
  publicationStatuses?: readonly SearchPublicationStatus[];
  includeUnpublished?: boolean;
  limit?: number;
}

export interface SearchResult {
  document: SearchDocument;
  score: number;
  highlights: readonly string[];
}

export interface SearchSuggestion {
  text: string;
  type: SearchDocumentType | string;
  href: string | null;
}

export interface RecentSearchRecord {
  id: string;
  profileId: string;
  query: string;
  filters: Pick<
    SearchQuery,
    | "types"
    | "subjectIds"
    | "gradeIds"
    | "curriculumIds"
    | "difficulties"
    | "masteryStates"
    | "publicationStatuses"
  >;
  createdAt: string;
}

export interface SearchFacetOption {
  value: string;
  label: string;
  count: number;
}

export interface SearchFacets {
  types: readonly SearchFacetOption[];
  subjects: readonly SearchFacetOption[];
  grades: readonly SearchFacetOption[];
  curricula: readonly SearchFacetOption[];
  difficulties: readonly SearchFacetOption[];
  masteryStates: readonly SearchFacetOption[];
  publicationStatuses: readonly SearchFacetOption[];
}

export interface SearchHistoryInput {
  query: string;
  filters?: RecentSearchRecord["filters"];
}
