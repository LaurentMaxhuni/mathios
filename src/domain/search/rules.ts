import type {
  SearchDocument,
  SearchDocumentMetadata,
  SearchQuery,
  SearchResult,
} from "@/domain/search/types";

const MAX_QUERY_LENGTH = 200;
const MAX_RESULT_LIMIT = 100;

export function normalizeSearchText(value: string): string {
  return value
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_QUERY_LENGTH);
}

export function searchTokens(value: string): readonly string[] {
  return normalizeSearchText(value)
    .toLocaleLowerCase()
    .split(/\s+/)
    .map((token) => token.replace(/[^\p{L}\p{N}_-]/gu, ""))
    .filter((token) => token.length > 0);
}

export function normalizeSearchQuery(query: SearchQuery): SearchQuery {
  return {
    ...query,
    text: normalizeSearchText(query.text),
    types: query.types?.filter(Boolean),
    subjectIds: query.subjectIds?.filter(Boolean),
    gradeIds: query.gradeIds?.filter(Boolean),
    curriculumIds: query.curriculumIds?.filter(Boolean),
    difficulties: query.difficulties?.filter(Boolean),
    masteryStates: query.masteryStates?.filter(Boolean),
    publicationStatuses: query.publicationStatuses?.filter(Boolean),
    limit: Math.min(MAX_RESULT_LIMIT, Math.max(1, Math.floor(query.limit ?? 20))),
  };
}

function hasAnyValue(values: readonly string[] | undefined, candidates: unknown): boolean {
  if (!values?.length) return true;
  if (!Array.isArray(candidates)) return false;
  return values.some((value) => candidates.includes(value));
}

export function matchesSearchFilters(document: SearchDocument, query: SearchQuery): boolean {
  const metadata = document.metadata ?? {};
  if (query.types?.length && !query.types.includes(document.type)) return false;
  if (!hasAnyValue(query.subjectIds, metadata.subjectIds)) return false;
  if (!hasAnyValue(query.gradeIds, metadata.gradeIds)) return false;
  if (!hasAnyValue(query.curriculumIds, metadata.curriculumIds)) return false;
  if (query.difficulties?.length && !query.difficulties.includes(metadata.difficulty as never))
    return false;
  if (query.masteryStates?.length && !query.masteryStates.includes(metadata.masteryState as never))
    return false;
  if (
    query.publicationStatuses?.length &&
    !query.publicationStatuses.includes(metadata.publicationStatus as never)
  )
    return false;
  return true;
}

export function isSearchDocumentVisible(
  document: SearchDocument,
  query: Pick<SearchQuery, "profileId" | "includeUnpublished">,
): boolean {
  if (document.profileId && document.profileId !== query.profileId) return false;
  const status = document.metadata?.publicationStatus;
  if (document.profileId) return true;
  if (!status || status === "published") return true;
  return query.includeUnpublished === true;
}

export function scoreSearchDocument(document: SearchDocument, text: string): number {
  const tokens = searchTokens(text);
  if (!tokens.length) return 0;
  const title = document.title.toLocaleLowerCase();
  const content = document.content.toLocaleLowerCase();
  const phrase = normalizeSearchText(text).toLocaleLowerCase();
  let score = title === phrase ? 80 : title.includes(phrase) ? 45 : 0;
  for (const token of tokens) {
    score += countOccurrences(title, token) * 14;
    score += countOccurrences(content, token) * 2;
  }
  return score;
}

export function buildSearchHighlights(document: SearchDocument, text: string): readonly string[] {
  const normalized = normalizeSearchText(text).toLocaleLowerCase();
  if (!normalized) return [];
  const haystack = `${document.title} ${document.content}`.toLocaleLowerCase();
  const matchAt = haystack.indexOf(normalized);
  if (matchAt < 0) {
    const token = searchTokens(text)[0];
    const tokenAt = token ? haystack.indexOf(token) : -1;
    if (tokenAt < 0) return [];
    return [snippet(document.content, Math.max(0, tokenAt - document.title.length))];
  }
  if (matchAt < document.title.length) return [document.title];
  return [snippet(document.content, matchAt - document.title.length)];
}

export function sortSearchResults(results: readonly SearchResult[]): readonly SearchResult[] {
  return [...results].sort(
    (left, right) =>
      right.score - left.score ||
      left.document.title.localeCompare(right.document.title) ||
      left.document.id.localeCompare(right.document.id),
  );
}

function countOccurrences(value: string, term: string): number {
  if (!term) return 0;
  let count = 0;
  let from = 0;
  while (from < value.length) {
    const index = value.indexOf(term, from);
    if (index < 0) break;
    count += 1;
    from = index + term.length;
  }
  return count;
}

function snippet(value: string, center: number): string {
  const clean = value.replace(/\s+/g, " ").trim();
  if (clean.length <= 180) return clean;
  const start = Math.max(0, Math.min(clean.length - 180, center - 70));
  const prefix = start > 0 ? "…" : "";
  const end = start + 180;
  const suffix = end < clean.length ? "…" : "";
  return `${prefix}${clean.slice(start, end)}${suffix}`;
}

export function metadataArray(
  metadata: SearchDocumentMetadata | undefined,
  key: "subjectIds" | "gradeIds" | "curriculumIds",
): readonly string[] {
  const value = metadata?.[key];
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}
