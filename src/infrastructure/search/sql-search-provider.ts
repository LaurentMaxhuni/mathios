import { createHash } from "node:crypto";
import { getDatabase, type DatabaseHandle } from "@/infrastructure/database/client";
import {
  buildSearchHighlights,
  isSearchDocumentVisible,
  matchesSearchFilters,
  normalizeSearchQuery,
  scoreSearchDocument,
  searchTokens,
  sortSearchResults,
} from "@/domain/search/rules";
import type {
  RecentSearchRecord,
  SearchDocument,
  SearchFacets,
  SearchHistoryInput,
  SearchQuery,
  SearchResult,
  SearchSuggestion,
} from "@/domain/search/types";
import type { SearchProvider } from "@/domain/ports/search-provider";

type DbRow = Record<string, unknown>;
type SqlExecutor = { unsafe(query: string, values?: readonly unknown[]): Promise<unknown> };

export class SqlSearchProvider implements SearchProvider {
  constructor(private readonly database: DatabaseHandle = getDatabase()) {}

  async index(document: SearchDocument): Promise<void> {
    const database = this.database;
    if (database.provider === "sqlite") {
      this.sqliteUpsert(database.raw, document);
      return;
    }
    await this.postgresUpsert(database.raw, document);
  }

  async remove(id: string): Promise<void> {
    const database = this.database;
    if (database.provider === "sqlite") {
      database.raw.prepare("DELETE FROM search_documents WHERE id = ?").run(id);
      return;
    }
    await database.raw.unsafe("DELETE FROM search_documents WHERE id = $1", [id]);
  }

  async replaceAll(documents: readonly SearchDocument[]): Promise<void> {
    const database = this.database;
    if (database.provider === "sqlite") {
      const replace = database.raw.transaction(() => {
        database.raw.exec("DELETE FROM search_documents");
        for (const document of documents) this.sqliteUpsert(database.raw, document);
      });
      replace();
      return;
    }

    await database.raw.begin(async (transaction) => {
      await transaction.unsafe("DELETE FROM search_documents");
      for (const document of documents) await this.postgresUpsert(transaction, document);
    });
  }

  async search(query: SearchQuery): Promise<readonly SearchResult[]> {
    const normalizedQuery = normalizeSearchQuery(query);
    if (!normalizedQuery.text || !searchTokens(normalizedQuery.text).length) return [];
    const database = this.database;
    const rows =
      database.provider === "sqlite"
        ? this.sqliteCandidates(normalizedQuery)
        : await this.postgresCandidates(normalizedQuery);
    const results = rows
      .map(mapDocument)
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
    const normalized = text.trim().slice(0, 200);
    if (!normalized) return [];
    const pattern = `%${normalized.toLocaleLowerCase()}%`;
    const database = this.database;
    const rows =
      database.provider === "sqlite"
        ? (database.raw
            .prepare(
              `SELECT d.id, d.resource_type, d.resource_id, d.profile_id, d.title, d.href,
                      d.metadata_json, d.updated_at
               FROM search_documents d
               WHERE (d.profile_id IS NULL OR d.profile_id = ?)
                 AND LOWER(d.title) LIKE ?
               ORDER BY d.title COLLATE NOCASE, d.updated_at DESC LIMIT ?`,
            )
            .all(profileId, pattern, limit) as DbRow[])
        : ((await database.raw.unsafe(
            `SELECT d.id, d.resource_type, d.resource_id, d.profile_id, d.title, d.href,
                    d.metadata_json, d.updated_at
             FROM search_documents d
             WHERE (d.profile_id IS NULL OR d.profile_id = $1)
               AND d.title ILIKE $2
             ORDER BY d.title, d.updated_at DESC LIMIT $3`,
            [profileId, pattern, limit],
          )) as DbRow[]);
    return rows
      .map(mapDocument)
      .filter((document) => isSearchDocumentVisible(document, { profileId }))
      .map((document) => ({
        text: document.title,
        type: document.type,
        href: document.href ?? null,
      }));
  }

  async listFacets(
    query: Pick<SearchQuery, "profileId" | "includeUnpublished"> = {},
  ): Promise<SearchFacets> {
    const database = this.database;
    const rows =
      database.provider === "sqlite"
        ? (database.raw
            .prepare("SELECT resource_type, profile_id, metadata_json FROM search_documents")
            .all() as DbRow[])
        : ((await database.raw.unsafe(
            "SELECT resource_type, profile_id, metadata_json FROM search_documents",
          )) as DbRow[]);
    const documents = rows
      .map(mapFacetDocument)
      .filter((document) => isSearchDocumentVisible(document, query));
    return {
      types: countSimple(
        documents.map((document) => document.type),
        humanize,
      ),
      subjects: countMetadata(documents, "subjectIds", "subjectLabels"),
      grades: countMetadata(documents, "gradeIds", "gradeLabels"),
      curricula: countMetadata(documents, "curriculumIds", "curriculumLabels"),
      difficulties: countSimple(
        documents.flatMap((document) =>
          typeof document.metadata?.difficulty === "string" ? [document.metadata.difficulty] : [],
        ),
        humanize,
      ),
      masteryStates: countSimple(
        documents.flatMap((document) =>
          typeof document.metadata?.masteryState === "string"
            ? [document.metadata.masteryState]
            : [],
        ),
        humanize,
      ),
      publicationStatuses: countSimple(
        documents.flatMap((document) =>
          typeof document.metadata?.publicationStatus === "string"
            ? [document.metadata.publicationStatus]
            : [],
        ),
        humanize,
      ),
    };
  }

  async recordRecentSearch(profileId: string, input: SearchHistoryInput): Promise<void> {
    const query = input.query.trim().slice(0, 200);
    if (!query) return;
    const id = `search-${createHash("sha256").update(`${profileId}:${query.toLocaleLowerCase()}`).digest("hex").slice(0, 32)}`;
    const filtersJson = JSON.stringify(input.filters ?? {});
    const database = this.database;
    if (database.provider === "sqlite") {
      database.raw
        .prepare(
          `INSERT INTO search_recent_queries (id, profile_id, query, filters_json)
           VALUES (?, ?, ?, ?)
           ON CONFLICT (id) DO UPDATE SET query = excluded.query, filters_json = excluded.filters_json, created_at = CURRENT_TIMESTAMP`,
        )
        .run(id, profileId, query, filtersJson);
      database.raw
        .prepare(
          `DELETE FROM search_recent_queries
           WHERE profile_id = ? AND id NOT IN (
             SELECT id FROM search_recent_queries WHERE profile_id = ? ORDER BY created_at DESC LIMIT 12
           )`,
        )
        .run(profileId, profileId);
      return;
    }
    await database.raw.unsafe(
      `INSERT INTO search_recent_queries (id, profile_id, query, filters_json)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (id) DO UPDATE SET query = EXCLUDED.query, filters_json = EXCLUDED.filters_json, created_at = NOW()`,
      [id, profileId, query, filtersJson],
    );
    await database.raw.unsafe(
      `DELETE FROM search_recent_queries
       WHERE profile_id = $1 AND id NOT IN (
         SELECT id FROM search_recent_queries WHERE profile_id = $1 ORDER BY created_at DESC LIMIT 12
       )`,
      [profileId],
    );
  }

  async listRecentSearches(profileId: string, limit = 8): Promise<readonly RecentSearchRecord[]> {
    const database = this.database;
    const rows =
      database.provider === "sqlite"
        ? (database.raw
            .prepare(
              "SELECT id, profile_id, query, filters_json, created_at FROM search_recent_queries WHERE profile_id = ? ORDER BY created_at DESC, id DESC LIMIT ?",
            )
            .all(profileId, limit) as DbRow[])
        : ((await database.raw.unsafe(
            "SELECT id, profile_id, query, filters_json, created_at FROM search_recent_queries WHERE profile_id = $1 ORDER BY created_at DESC, id DESC LIMIT $2",
            [profileId, limit],
          )) as DbRow[]);
    return rows.map((row) => ({
      id: String(row.id),
      profileId: String(row.profile_id),
      query: String(row.query),
      filters: parseFilters(row.filters_json),
      createdAt: toIso(row.created_at),
    }));
  }

  async clearRecentSearches(profileId: string): Promise<void> {
    const database = this.database;
    if (database.provider === "sqlite") {
      database.raw.prepare("DELETE FROM search_recent_queries WHERE profile_id = ?").run(profileId);
      return;
    }
    await database.raw.unsafe("DELETE FROM search_recent_queries WHERE profile_id = $1", [
      profileId,
    ]);
  }

  async clear(): Promise<void> {
    const database = this.database;
    if (database.provider === "sqlite") {
      database.raw.exec("DELETE FROM search_documents");
      return;
    }
    await database.raw.unsafe("DELETE FROM search_documents");
  }

  private sqliteUpsert(
    database: import("better-sqlite3").Database,
    document: SearchDocument,
  ): void {
    database
      .prepare(
        `INSERT INTO search_documents
          (id, resource_type, resource_id, profile_id, title, content, href, metadata_json, updated_at)
         VALUES (@id, @resourceType, @resourceId, @profileId, @title, @content, @href, @metadataJson, @updatedAt)
         ON CONFLICT (id) DO UPDATE SET resource_type = excluded.resource_type,
           resource_id = excluded.resource_id, profile_id = excluded.profile_id, title = excluded.title,
           content = excluded.content, href = excluded.href, metadata_json = excluded.metadata_json,
           updated_at = excluded.updated_at`,
      )
      .run(toDbDocument(document));
  }

  private async postgresUpsert(database: SqlExecutor, document: SearchDocument): Promise<void> {
    const value = toDbDocument(document);
    await database.unsafe(
      `INSERT INTO search_documents
        (id, resource_type, resource_id, profile_id, title, content, href, metadata_json, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (id) DO UPDATE SET resource_type = EXCLUDED.resource_type,
         resource_id = EXCLUDED.resource_id, profile_id = EXCLUDED.profile_id, title = EXCLUDED.title,
         content = EXCLUDED.content, href = EXCLUDED.href, metadata_json = EXCLUDED.metadata_json,
         updated_at = EXCLUDED.updated_at`,
      [
        value.id,
        value.resourceType,
        value.resourceId,
        value.profileId,
        value.title,
        value.content,
        value.href,
        value.metadataJson,
        value.updatedAt,
      ],
    );
  }

  private sqliteCandidates(query: SearchQuery): DbRow[] {
    const database = this.database;
    if (database.provider !== "sqlite") throw new Error("SQLite search is unavailable.");
    const match = searchTokens(query.text)
      .map((token) => `"${token.replaceAll('"', '""')}"*`)
      .join(" AND ");
    const candidateLimit = Math.min(1000, Math.max(100, (query.limit ?? 20) * 10));
    try {
      return database.raw
        .prepare(
          `SELECT d.* FROM search_documents_fts f
           JOIN search_documents d ON d.id = f.id
           WHERE f MATCH ? AND (d.profile_id IS NULL OR d.profile_id = ?)
           ORDER BY d.updated_at DESC LIMIT ?`,
        )
        .all(match, query.profileId ?? null, candidateLimit) as DbRow[];
    } catch {
      const tokens = searchTokens(query.text);
      const conditions = tokens
        .map(() => "LOWER(d.title || ' ' || d.content) LIKE ?")
        .join(" AND ");
      return database.raw
        .prepare(
          `SELECT d.* FROM search_documents d
           WHERE (d.profile_id IS NULL OR d.profile_id = ?) AND ${conditions}
           ORDER BY d.updated_at DESC LIMIT ?`,
        )
        .all(
          query.profileId ?? null,
          ...tokens.map((token) => `%${token}%`),
          candidateLimit,
        ) as DbRow[];
    }
  }

  private async postgresCandidates(query: SearchQuery): Promise<DbRow[]> {
    const database = this.database;
    if (database.provider !== "postgres") throw new Error("PostgreSQL search is unavailable.");
    const candidateLimit = Math.min(1000, Math.max(100, (query.limit ?? 20) * 10));
    return (await database.raw.unsafe(
      `SELECT d.* FROM search_documents d
       WHERE d.search_vector @@ plainto_tsquery('simple', $1)
         AND (d.profile_id IS NULL OR d.profile_id = $2)
       ORDER BY ts_rank_cd(d.search_vector, plainto_tsquery('simple', $1)) DESC, d.updated_at DESC
       LIMIT $3`,
      [query.text, query.profileId ?? null, candidateLimit],
    )) as DbRow[];
  }
}

function toDbDocument(document: SearchDocument) {
  return {
    id: document.id,
    resourceType: document.type,
    resourceId: document.resourceId ?? document.id,
    profileId: document.profileId ?? null,
    title: document.title,
    content: document.content,
    href: document.href ?? null,
    metadataJson: JSON.stringify(document.metadata ?? {}),
    updatedAt: document.updatedAt ?? new Date().toISOString(),
  };
}

function mapDocument(row: DbRow): SearchDocument {
  return {
    id: String(row.id),
    type: String(row.resource_type),
    resourceId: String(row.resource_id),
    profileId: row.profile_id ? String(row.profile_id) : null,
    title: String(row.title),
    content: String(row.content ?? ""),
    href: row.href ? String(row.href) : null,
    metadata: parseMetadata(row.metadata_json),
    updatedAt: toIso(row.updated_at),
  };
}

function mapFacetDocument(row: DbRow): SearchDocument {
  return {
    id: "facet",
    type: String(row.resource_type),
    resourceId: "facet",
    profileId: row.profile_id ? String(row.profile_id) : null,
    title: "",
    content: "",
    href: null,
    metadata: parseMetadata(row.metadata_json),
    updatedAt: new Date(0).toISOString(),
  };
}

function parseMetadata(value: unknown): Record<string, unknown> {
  if (typeof value !== "string") return {};
  try {
    const parsed: unknown = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

function parseFilters(value: unknown): RecentSearchRecord["filters"] {
  if (typeof value !== "string") return {};
  try {
    const parsed: unknown = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as RecentSearchRecord["filters"])
      : {};
  } catch {
    return {};
  }
}

function toIso(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  return String(value ?? new Date(0).toISOString());
}

function countSimple(values: readonly string[], label: (value: string) => string) {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return [...counts.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([value, count]) => ({ value, label: label(value), count }));
}

function countMetadata(
  documents: readonly SearchDocument[],
  valuesKey: "subjectIds" | "gradeIds" | "curriculumIds",
  labelsKey: "subjectLabels" | "gradeLabels" | "curriculumLabels",
) {
  const counts = new Map<string, number>();
  const labels = new Map<string, string>();
  for (const document of documents) {
    const values = document.metadata?.[valuesKey];
    const names = document.metadata?.[labelsKey];
    if (!Array.isArray(values)) continue;
    if (names && typeof names === "object" && !Array.isArray(names)) {
      for (const [key, value] of Object.entries(names))
        if (typeof value === "string") labels.set(key, value);
    }
    for (const value of values)
      if (typeof value === "string") counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort(([left], [right]) => (labels.get(left) ?? left).localeCompare(labels.get(right) ?? right))
    .map(([value, count]) => ({ value, label: labels.get(value) ?? humanize(value), count }));
}

function humanize(value: string): string {
  return value.replace(/[-_]/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}
