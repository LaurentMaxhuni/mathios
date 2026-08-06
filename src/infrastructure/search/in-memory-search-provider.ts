import type {
  RecentSearchRecord,
  SearchDocument,
  SearchFacets,
  SearchHistoryInput,
  SearchProvider,
  SearchQuery,
  SearchResult,
  SearchSuggestion,
} from "@/infrastructure/search/search-provider";
import {
  buildSearchHighlights,
  isSearchDocumentVisible,
  matchesSearchFilters,
  normalizeSearchQuery,
  scoreSearchDocument,
  sortSearchResults,
} from "@/domain/search/rules";
import { SEARCH_DOCUMENT_TYPES } from "@/domain/search/types";

/** Small deterministic adapter for development and tests. */
export class InMemorySearchProvider implements SearchProvider {
  private readonly documents = new Map<string, SearchDocument>();
  private readonly recent = new Map<string, Map<string, RecentSearchRecord>>();

  async index(document: SearchDocument): Promise<void> {
    this.documents.set(document.id, document);
  }

  async remove(id: string): Promise<void> {
    this.documents.delete(id);
  }

  async replaceAll(documents: readonly SearchDocument[]): Promise<void> {
    this.documents.clear();
    for (const document of documents) this.documents.set(document.id, document);
  }

  async search(query: SearchQuery): Promise<readonly SearchResult[]> {
    const normalizedQuery = normalizeSearchQuery(query);
    if (!normalizedQuery.text) return [];
    const results = [...this.documents.values()]
      .filter((document) => isSearchDocumentVisible(document, normalizedQuery))
      .filter((document) => matchesSearchFilters(document, normalizedQuery))
      .map((document) => ({
        document,
        score: scoreSearchDocument(document, normalizedQuery.text),
        highlights: buildSearchHighlights(document, normalizedQuery.text),
      }))
      .filter((result) => result.score > 0);
    return sortSearchResults(results).slice(0, normalizedQuery.limit);
  }

  async suggest(
    profileId: string | null,
    text: string,
    limit = 8,
  ): Promise<readonly SearchSuggestion[]> {
    const normalized = text.trim().toLocaleLowerCase();
    if (!normalized) return [];
    return [...this.documents.values()]
      .filter((document) => isSearchDocumentVisible(document, { profileId }))
      .filter((document) => document.title.toLocaleLowerCase().includes(normalized))
      .sort((left, right) => left.title.localeCompare(right.title))
      .slice(0, limit)
      .map((document) => ({
        text: document.title,
        type: document.type,
        href: document.href ?? null,
      }));
  }

  async listFacets(
    query: Pick<SearchQuery, "profileId" | "includeUnpublished"> = {},
  ): Promise<SearchFacets> {
    const documents = [...this.documents.values()].filter((document) =>
      isSearchDocumentVisible(document, query),
    );
    const options = (values: readonly string[]) => {
      const counts = new Map<string, number>();
      for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
      return [...counts.entries()]
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([value, count]) => ({ value, label: humanize(value), count }));
    };
    const metadataOptions = (
      key:
        | "subjectIds"
        | "gradeIds"
        | "curriculumIds"
        | "difficulty"
        | "masteryState"
        | "publicationStatus",
    ) =>
      options(
        documents.flatMap((document) => {
          const value = document.metadata?.[key];
          return Array.isArray(value)
            ? value.filter((item): item is string => typeof item === "string")
            : typeof value === "string"
              ? [value]
              : [];
        }),
      );
    return {
      types: options(documents.map((document) => document.type)).filter((item) =>
        SEARCH_DOCUMENT_TYPES.includes(item.value as (typeof SEARCH_DOCUMENT_TYPES)[number]),
      ),
      subjects: metadataOptions("subjectIds"),
      grades: metadataOptions("gradeIds"),
      curricula: metadataOptions("curriculumIds"),
      difficulties: metadataOptions("difficulty"),
      masteryStates: metadataOptions("masteryState"),
      publicationStatuses: metadataOptions("publicationStatus"),
    };
  }

  async recordRecentSearch(profileId: string, input: SearchHistoryInput): Promise<void> {
    const query = input.query.trim();
    if (!query) return;
    const profileRecent = this.recent.get(profileId) ?? new Map<string, RecentSearchRecord>();
    profileRecent.set(query.toLocaleLowerCase(), {
      id: `recent-${profileId}-${query.toLocaleLowerCase()}`,
      profileId,
      query,
      filters: input.filters ?? {},
      createdAt: new Date().toISOString(),
    });
    this.recent.set(profileId, profileRecent);
  }

  async listRecentSearches(profileId: string, limit = 8): Promise<readonly RecentSearchRecord[]> {
    return [...(this.recent.get(profileId)?.values() ?? [])]
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
      .slice(0, limit);
  }

  async clearRecentSearches(profileId: string): Promise<void> {
    this.recent.delete(profileId);
  }

  async clear(): Promise<void> {
    this.documents.clear();
  }
}

function humanize(value: string): string {
  return value.replace(/[-_]/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}
