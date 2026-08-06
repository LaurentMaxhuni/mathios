import type { AuthenticatedPrincipal } from "@/infrastructure/auth/auth-provider";
import { getMasteryRepository } from "@/infrastructure/database/repositories/mastery-repository";
import { getDatabase } from "@/infrastructure/database/client";
import { SqlSearchProvider } from "@/infrastructure/search/sql-search-provider";
import { ensureSearchIndex } from "@/infrastructure/search/platform-search-index";
import { normalizeSearchQuery } from "@/domain/search/rules";
import type {
  RecentSearchRecord,
  SearchFacets,
  SearchHistoryInput,
  SearchQuery,
  SearchResult,
  SearchSuggestion,
} from "@/domain/search/types";
import type { SearchProvider } from "@/domain/ports/search-provider";

export interface SearchPageData {
  query: SearchQuery;
  results: readonly SearchResult[];
  suggestions: readonly SearchSuggestion[];
  recentSearches: readonly RecentSearchRecord[];
  facets: SearchFacets;
}

export async function searchPlatform(
  profileId: string,
  query: SearchQuery,
  principal?: AuthenticatedPrincipal | null,
  provider: SearchProvider = new SqlSearchProvider(),
): Promise<SearchPageData> {
  const normalized = normalizeSearchQuery(query);
  if (provider instanceof SqlSearchProvider) await ensureSearchIndex(getDatabase(), provider);
  const includeUnpublished = canViewUnpublished(principal);
  const providerQuery = { ...normalized, profileId, includeUnpublished, masteryStates: undefined };
  let results = await provider.search(providerQuery);

  if (normalized.masteryStates?.length) {
    const masteryRows = await getMasteryRepository().listMastery(profileId);
    const masteryByConcept = new Map(masteryRows.map((row) => [row.conceptId, row.state]));
    const allowedStates = new Set(normalized.masteryStates);
    results = results.filter((result) => {
      if (result.document.type !== "concept") return false;
      const state = masteryByConcept.get(result.document.resourceId ?? "") ?? "unassessed";
      return allowedStates.has(state);
    });
  }

  if (normalized.text) {
    const filters: SearchHistoryInput["filters"] = {
      types: normalized.types,
      subjectIds: normalized.subjectIds,
      gradeIds: normalized.gradeIds,
      curriculumIds: normalized.curriculumIds,
      difficulties: normalized.difficulties,
      masteryStates: normalized.masteryStates,
      publicationStatuses: normalized.publicationStatuses,
    };
    await provider.recordRecentSearch(profileId, { query: normalized.text, filters });
  }

  const [suggestions, recentSearches, facets] = await Promise.all([
    provider.suggest(profileId, normalized.text),
    provider.listRecentSearches(profileId),
    provider.listFacets({ profileId, includeUnpublished }),
  ]);
  return { query: normalized, results, suggestions, recentSearches, facets };
}

export async function searchSuggestions(
  profileId: string,
  text: string,
  provider: SearchProvider = new SqlSearchProvider(),
): Promise<readonly SearchSuggestion[]> {
  if (provider instanceof SqlSearchProvider) await ensureSearchIndex(getDatabase(), provider);
  return provider.suggest(profileId, text);
}

export async function recentSearches(
  profileId: string,
  provider: SearchProvider = new SqlSearchProvider(),
): Promise<readonly RecentSearchRecord[]> {
  return provider.listRecentSearches(profileId);
}

export async function clearRecentSearches(
  profileId: string,
  provider: SearchProvider = new SqlSearchProvider(),
): Promise<void> {
  await provider.clearRecentSearches(profileId);
}

export function canViewUnpublished(principal: AuthenticatedPrincipal | null | undefined): boolean {
  return Boolean(
    principal?.permissions.includes("edit_content") ||
    principal?.permissions.includes("publish_content"),
  );
}
