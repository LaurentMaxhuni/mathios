export interface SearchDocument {
  id: string;
  type: string;
  title: string;
  content: string;
  metadata?: Record<string, string | number | boolean | null>;
}

export interface SearchQuery {
  text: string;
  types?: readonly string[];
  limit?: number;
}

export interface SearchResult {
  document: SearchDocument;
  score: number;
  highlights: readonly string[];
}

export interface SearchProvider {
  index(document: SearchDocument): Promise<void>;
  remove(id: string): Promise<void>;
  search(query: SearchQuery): Promise<readonly SearchResult[]>;
  clear(): Promise<void>;
}
