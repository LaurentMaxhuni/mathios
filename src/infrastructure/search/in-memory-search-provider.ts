import type {
  SearchDocument,
  SearchProvider,
  SearchQuery,
  SearchResult,
} from "@/infrastructure/search/search-provider";

/** Small deterministic adapter for development and tests; a real index is introduced in Phase 13. */
export class InMemorySearchProvider implements SearchProvider {
  private readonly documents = new Map<string, SearchDocument>();

  async index(document: SearchDocument): Promise<void> {
    this.documents.set(document.id, document);
  }

  async remove(id: string): Promise<void> {
    this.documents.delete(id);
  }

  async search(query: SearchQuery): Promise<readonly SearchResult[]> {
    const normalizedQuery = query.text.trim().toLocaleLowerCase();
    if (!normalizedQuery) return [];

    const allowedTypes = query.types ? new Set(query.types) : null;
    const limit = query.limit ?? 20;

    return [...this.documents.values()]
      .filter((document) => !allowedTypes || allowedTypes.has(document.type))
      .map((document) => {
        const haystack = `${document.title} ${document.content}`.toLocaleLowerCase();
        const occurrences = haystack.split(normalizedQuery).length - 1;
        return {
          document,
          score: occurrences > 0 ? occurrences : 0,
          highlights: occurrences > 0 ? [document.title] : [],
        };
      })
      .filter((result) => result.score > 0)
      .sort(
        (left, right) =>
          right.score - left.score || left.document.title.localeCompare(right.document.title),
      )
      .slice(0, limit);
  }

  async clear(): Promise<void> {
    this.documents.clear();
  }
}
