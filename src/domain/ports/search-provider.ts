import type {
  RecentSearchRecord,
  SearchDocument,
  SearchFacets,
  SearchHistoryInput,
  SearchQuery,
  SearchResult,
  SearchSuggestion,
} from "@/domain/search/types";

export interface SearchProvider {
  index(document: SearchDocument): Promise<void>;
  remove(id: string): Promise<void>;
  replaceAll(documents: readonly SearchDocument[]): Promise<void>;
  search(query: SearchQuery): Promise<readonly SearchResult[]>;
  suggest(
    profileId: string | null,
    text: string,
    limit?: number,
  ): Promise<readonly SearchSuggestion[]>;
  listFacets(query?: Pick<SearchQuery, "profileId" | "includeUnpublished">): Promise<SearchFacets>;
  recordRecentSearch(profileId: string, input: SearchHistoryInput): Promise<void>;
  listRecentSearches(profileId: string, limit?: number): Promise<readonly RecentSearchRecord[]>;
  clearRecentSearches(profileId: string): Promise<void>;
  clear(): Promise<void>;
}
