import { randomUUID } from "node:crypto";
import type { TransactionSql } from "postgres";
import { NotFoundError } from "@/domain/errors/application-error";
import { buildPersonalKnowledgeMap } from "@/domain/notes/rules";
import {
  BOOKMARK_RESOURCE_TYPES,
  HIGHLIGHT_COLORS,
  HIGHLIGHT_SOURCE_TYPES,
  NOTE_RESOURCE_TYPES,
  type BookmarkRecord,
  type BookmarkResourceType,
  type FolderRecord,
  type HighlightColor,
  type HighlightRecord,
  type HighlightSourceType,
  type NoteBacklinkRecord,
  type NoteDetail,
  type NoteLinkRecord,
  type NoteRecord,
  type NoteResourceType,
  type PersonalKnowledgeMap,
  type TagRecord,
} from "@/domain/notes/types";
import type { NoteSearchOptions, NotesRepository } from "@/domain/ports/notes-repository";
import { getDatabase, type DatabaseHandle } from "@/infrastructure/database/client";

type DbDate = string | Date | null;
type DbBoolean = boolean | number | string;
type DbRow = Record<string, unknown>;

const asNumber = (value: unknown, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};
const asBoolean = (value: DbBoolean) =>
  value === true || value === 1 || value === "1" || value === "true";
const asIso = (value: DbDate) =>
  value instanceof Date ? value.toISOString() : (value ?? new Date(0).toISOString());

function noteResourceType(value: unknown): NoteResourceType {
  return NOTE_RESOURCE_TYPES.includes(value as NoteResourceType)
    ? (value as NoteResourceType)
    : "lesson";
}

function bookmarkResourceType(value: unknown): BookmarkResourceType {
  return BOOKMARK_RESOURCE_TYPES.includes(value as BookmarkResourceType)
    ? (value as BookmarkResourceType)
    : "note";
}

function highlightSourceType(value: unknown): HighlightSourceType {
  return HIGHLIGHT_SOURCE_TYPES.includes(value as HighlightSourceType)
    ? (value as HighlightSourceType)
    : "lesson-text";
}

function highlightColor(value: unknown): HighlightColor {
  return HIGHLIGHT_COLORS.includes(value as HighlightColor) ? (value as HighlightColor) : "yellow";
}

function mapFolder(row: DbRow): FolderRecord {
  return {
    id: String(row.id),
    profileId: String(row.profile_id),
    name: String(row.name),
    parentFolderId: row.parent_folder_id ? String(row.parent_folder_id) : null,
    sortOrder: asNumber(row.sort_order),
    createdAt: asIso(row.created_at as DbDate),
    updatedAt: asIso(row.updated_at as DbDate),
  };
}

function mapTag(row: DbRow): TagRecord {
  return {
    id: String(row.id),
    profileId: String(row.profile_id),
    name: String(row.name),
    slug: String(row.slug),
    color: row.color ? String(row.color) : null,
    createdAt: asIso(row.created_at as DbDate),
    updatedAt: asIso(row.updated_at as DbDate),
  };
}

function mapNote(row: DbRow, tags: readonly TagRecord[] = []): NoteRecord {
  return {
    id: String(row.id),
    profileId: String(row.profile_id),
    title: String(row.title),
    bodyMarkdown: String(row.body_markdown ?? ""),
    folderId: row.folder_id ? String(row.folder_id) : null,
    isPinned: asBoolean(row.is_pinned as DbBoolean),
    isArchived: asBoolean(row.is_archived as DbBoolean),
    tags,
    createdAt: asIso(row.created_at as DbDate),
    updatedAt: asIso(row.updated_at as DbDate),
  };
}

function mapLink(row: DbRow): NoteLinkRecord {
  return {
    id: String(row.id),
    profileId: String(row.profile_id),
    noteId: String(row.note_id),
    resourceType: noteResourceType(row.resource_type),
    resourceId: String(row.resource_id),
    label: String(row.label ?? ""),
    sourceLocation: String(row.source_location ?? ""),
    createdAt: asIso(row.created_at as DbDate),
  };
}

function mapBacklink(row: DbRow): NoteBacklinkRecord {
  return {
    id: String(row.id),
    profileId: String(row.profile_id),
    sourceNoteId: String(row.source_note_id),
    sourceNoteTitle: String(row.source_note_title ?? "Untitled note"),
    targetNoteId: String(row.target_note_id),
    targetNoteTitle: String(row.target_note_title ?? "Untitled note"),
    anchor: String(row.anchor ?? ""),
    createdAt: asIso(row.created_at as DbDate),
  };
}

function mapHighlight(row: DbRow): HighlightRecord {
  return {
    id: String(row.id),
    profileId: String(row.profile_id),
    sourceType: highlightSourceType(row.source_type),
    sourceId: String(row.source_id),
    sourceLocation: String(row.source_location ?? ""),
    selectedText: String(row.selected_text),
    noteId: row.note_id ? String(row.note_id) : null,
    color: highlightColor(row.color),
    createdAt: asIso(row.created_at as DbDate),
    updatedAt: asIso(row.updated_at as DbDate),
  };
}

function mapBookmark(row: DbRow): BookmarkRecord {
  return {
    id: String(row.id),
    profileId: String(row.profile_id),
    resourceType: bookmarkResourceType(row.resource_type),
    resourceId: String(row.resource_id),
    title: String(row.title),
    sourceUrl: String(row.source_url ?? ""),
    createdAt: asIso(row.created_at as DbDate),
    updatedAt: asIso(row.updated_at as DbDate),
  };
}

const noteSelect =
  "SELECT n.id, n.profile_id, n.title, n.body_markdown, n.folder_id, n.is_pinned, n.is_archived, n.created_at, n.updated_at FROM notes n";
const folderSelect =
  "SELECT id, profile_id, name, parent_folder_id, sort_order, created_at, updated_at FROM folders";
const tagSelect = "SELECT id, profile_id, name, slug, color, created_at, updated_at FROM tags";
const linkSelect =
  "SELECT id, profile_id, note_id, resource_type, resource_id, label, source_location, created_at FROM note_links";
const highlightSelect =
  "SELECT id, profile_id, source_type, source_id, source_location, selected_text, note_id, color, created_at, updated_at FROM highlights";
const bookmarkSelect =
  "SELECT id, profile_id, resource_type, resource_id, title, source_url, created_at, updated_at FROM bookmarks";

export class SqlNotesRepository implements NotesRepository {
  constructor(private readonly database: DatabaseHandle = getDatabase()) {}

  private async rows<T extends DbRow>(
    sqliteQuery: string,
    postgresQuery: string,
    values: readonly unknown[] = [],
  ): Promise<T[]> {
    if (this.database.provider === "sqlite") {
      return this.database.raw.prepare(sqliteQuery).all(...values) as T[];
    }
    return (await this.database.raw.unsafe(postgresQuery, values as never[])) as T[];
  }

  private async one<T extends DbRow>(
    sqliteQuery: string,
    postgresQuery: string,
    values: readonly unknown[] = [],
  ): Promise<T | undefined> {
    return (await this.rows<T>(sqliteQuery, postgresQuery, values))[0];
  }

  private async execute(
    sqliteQuery: string,
    postgresQuery: string,
    values: readonly unknown[] = [],
  ): Promise<void> {
    if (this.database.provider === "sqlite") this.database.raw.prepare(sqliteQuery).run(...values);
    else await this.database.raw.unsafe(postgresQuery, values as never[]);
  }

  private async tagsForNoteIds(profileId: string, noteIds: readonly string[]) {
    if (!noteIds.length) return new Map<string, TagRecord[]>();
    const sqlitePlaceholders = noteIds.map(() => "?").join(", ");
    const postgresPlaceholders = noteIds.map((_, index) => `$${index + 2}`).join(", ");
    const rows = await this.rows(
      `SELECT nt.note_id, t.id, t.profile_id, t.name, t.slug, t.color, t.created_at, t.updated_at FROM note_tags nt JOIN tags t ON t.id = nt.tag_id WHERE t.profile_id = ? AND nt.note_id IN (${sqlitePlaceholders}) ORDER BY t.name COLLATE NOCASE`,
      `SELECT nt.note_id, t.id, t.profile_id, t.name, t.slug, t.color, t.created_at, t.updated_at FROM note_tags nt JOIN tags t ON t.id = nt.tag_id WHERE t.profile_id = $1 AND nt.note_id IN (${postgresPlaceholders}) ORDER BY t.name`,
      [profileId, ...noteIds],
    );
    const tags = new Map<string, TagRecord[]>();
    for (const row of rows) {
      const noteId = String(row.note_id);
      const values = tags.get(noteId) ?? [];
      values.push(mapTag(row));
      tags.set(noteId, values);
    }
    return tags;
  }

  private async attachTags(profileId: string, rows: readonly DbRow[]): Promise<NoteRecord[]> {
    const tags = await this.tagsForNoteIds(
      profileId,
      rows.map((row) => String(row.id)),
    );
    return rows.map((row) => mapNote(row, tags.get(String(row.id)) ?? []));
  }

  async listNotes(
    profileId: string,
    options: NoteSearchOptions = {},
  ): Promise<readonly NoteRecord[]> {
    const values: unknown[] = [profileId];
    const sqliteConditions = ["n.profile_id = ?"];
    const postgresConditions = ["n.profile_id = $1"];
    const add = (sqlite: string, postgres: string, value: unknown) => {
      values.push(value);
      sqliteConditions.push(sqlite);
      postgresConditions.push(postgres.replace(/\$[A-Z_]+|\$/i, `$${values.length}`));
    };
    if (!options.includeArchived) {
      sqliteConditions.push("n.is_archived = 0");
      postgresConditions.push("n.is_archived = FALSE");
    }
    if (options.folderId) add("n.folder_id = ?", "$FOLDER", options.folderId);
    if (options.tagId)
      add(
        "EXISTS (SELECT 1 FROM note_tags filter_nt WHERE filter_nt.note_id = n.id AND filter_nt.tag_id = ?)",
        "EXISTS (SELECT 1 FROM note_tags filter_nt WHERE filter_nt.note_id = n.id AND filter_nt.tag_id = $TAG)",
        options.tagId,
      );
    if (options.query?.trim()) {
      const query = `%${options.query.trim()}%`;
      add("(LOWER(n.title) LIKE LOWER(?)", "(n.title ILIKE $QUERY", query);
      values.push(query);
      sqliteConditions[sqliteConditions.length - 1] += " OR LOWER(n.body_markdown) LIKE LOWER(?)";
      postgresConditions[postgresConditions.length - 1] +=
        ` OR n.body_markdown ILIKE $${values.length}`;
      values.push(query);
      sqliteConditions[sqliteConditions.length - 1] +=
        " OR EXISTS (SELECT 1 FROM note_tags search_nt JOIN tags search_t ON search_t.id = search_nt.tag_id WHERE search_nt.note_id = n.id AND LOWER(search_t.name) LIKE LOWER(?)))";
      postgresConditions[postgresConditions.length - 1] +=
        ` OR EXISTS (SELECT 1 FROM note_tags search_nt JOIN tags search_t ON search_t.id = search_nt.tag_id WHERE search_nt.note_id = n.id AND search_t.name ILIKE $${values.length}))`;
    }
    const rows = await this.rows(
      `${noteSelect} WHERE ${sqliteConditions.join(" AND ")} ORDER BY n.is_pinned DESC, n.updated_at DESC, n.title COLLATE NOCASE`,
      `${noteSelect} WHERE ${postgresConditions.join(" AND ")} ORDER BY n.is_pinned DESC, n.updated_at DESC, n.title`,
      values,
    );
    return this.attachTags(profileId, rows);
  }

  async getNote(profileId: string, noteId: string): Promise<NoteDetail | null> {
    const row = await this.one(
      `${noteSelect} WHERE n.profile_id = ? AND n.id = ?`,
      `${noteSelect} WHERE n.profile_id = $1 AND n.id = $2`,
      [profileId, noteId],
    );
    if (!row) return null;
    const [note] = await this.attachTags(profileId, [row]);
    const folderRow = note.folderId
      ? await this.one(
          `${folderSelect} WHERE profile_id = ? AND id = ?`,
          `${folderSelect} WHERE profile_id = $1 AND id = $2`,
          [profileId, note.folderId],
        )
      : undefined;
    const links = await this.listNoteLinks(profileId, noteId);
    const backlinks = await this.listBacklinks(profileId, noteId);
    const highlights = await this.listHighlights(profileId, { noteId });
    return {
      ...note,
      folder: folderRow ? mapFolder(folderRow) : null,
      links,
      backlinks,
      highlights,
    };
  }

  private async writeTagsSqlite(
    database: import("better-sqlite3").Database,
    profileId: string,
    noteId: string,
    tagNames: readonly string[],
  ) {
    database.prepare("DELETE FROM note_tags WHERE note_id = ?").run(noteId);
    const upsert = database.prepare(
      "INSERT INTO tags (id, profile_id, name, slug) VALUES (?, ?, ?, ?) ON CONFLICT(profile_id, slug) DO UPDATE SET name = excluded.name, updated_at = CURRENT_TIMESTAMP",
    );
    const find = database.prepare("SELECT id FROM tags WHERE profile_id = ? AND slug = ?");
    const link = database.prepare(
      "INSERT OR IGNORE INTO note_tags (note_id, tag_id) VALUES (?, ?)",
    );
    for (const name of tagNames) {
      const slug = name
        .trim()
        .toLocaleLowerCase()
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 80);
      if (!slug) continue;
      upsert.run(`tag-${randomUUID()}`, profileId, name, slug);
      const tag = find.get(profileId, slug) as { id: string } | undefined;
      if (tag) link.run(noteId, tag.id);
    }
  }

  private async writeTagsPostgres(
    transaction: TransactionSql,
    profileId: string,
    noteId: string,
    tagNames: readonly string[],
  ) {
    await transaction.unsafe("DELETE FROM note_tags WHERE note_id = $1", [noteId]);
    for (const name of tagNames) {
      const slug = name
        .trim()
        .toLocaleLowerCase()
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 80);
      if (!slug) continue;
      await transaction.unsafe(
        "INSERT INTO tags (id, profile_id, name, slug) VALUES ($1, $2, $3, $4) ON CONFLICT (profile_id, slug) DO UPDATE SET name = EXCLUDED.name, updated_at = NOW()",
        [`tag-${randomUUID()}`, profileId, name, slug],
      );
      const tags = (await transaction.unsafe(
        "SELECT id FROM tags WHERE profile_id = $1 AND slug = $2",
        [profileId, slug],
      )) as Array<{ id: string }>;
      if (tags[0])
        await transaction.unsafe(
          "INSERT INTO note_tags (note_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
          [noteId, tags[0].id],
        );
    }
  }

  async createNote(input: {
    id: string;
    profileId: string;
    title: string;
    bodyMarkdown: string;
    folderId: string | null;
    isPinned: boolean;
    isArchived: boolean;
    tagNames: readonly string[];
  }): Promise<NoteDetail> {
    if (this.database.provider === "sqlite") {
      const database = this.database.raw;
      const transaction = database.transaction(() => {
        database
          .prepare(
            "INSERT INTO notes (id, profile_id, title, body_markdown, folder_id, is_pinned, is_archived) VALUES (?, ?, ?, ?, ?, ?, ?)",
          )
          .run(
            input.id,
            input.profileId,
            input.title,
            input.bodyMarkdown,
            input.folderId,
            input.isPinned ? 1 : 0,
            input.isArchived ? 1 : 0,
          );
        this.writeTagsSqlite(database, input.profileId, input.id, input.tagNames);
      });
      transaction();
    } else {
      await this.database.raw.begin(async (transaction) => {
        await transaction.unsafe(
          "INSERT INTO notes (id, profile_id, title, body_markdown, folder_id, is_pinned, is_archived) VALUES ($1, $2, $3, $4, $5, $6, $7)",
          [
            input.id,
            input.profileId,
            input.title,
            input.bodyMarkdown,
            input.folderId,
            input.isPinned,
            input.isArchived,
          ],
        );
        await this.writeTagsPostgres(transaction, input.profileId, input.id, input.tagNames);
      });
    }
    return (await this.getNote(input.profileId, input.id))!;
  }

  async updateNote(
    profileId: string,
    noteId: string,
    input: {
      title: string;
      bodyMarkdown: string;
      folderId: string | null;
      isPinned: boolean;
      isArchived: boolean;
      tagNames: readonly string[];
    },
  ): Promise<NoteDetail> {
    if (this.database.provider === "sqlite") {
      const database = this.database.raw;
      const transaction = database.transaction(() => {
        const result = database
          .prepare(
            "UPDATE notes SET title = ?, body_markdown = ?, folder_id = ?, is_pinned = ?, is_archived = ?, updated_at = CURRENT_TIMESTAMP WHERE profile_id = ? AND id = ?",
          )
          .run(
            input.title,
            input.bodyMarkdown,
            input.folderId,
            input.isPinned ? 1 : 0,
            input.isArchived ? 1 : 0,
            profileId,
            noteId,
          );
        if (result.changes === 0) throw new NotFoundError("Note", noteId);
        this.writeTagsSqlite(database, profileId, noteId, input.tagNames);
      });
      transaction();
    } else {
      await this.database.raw.begin(async (transaction) => {
        const rows = (await transaction.unsafe(
          "UPDATE notes SET title = $1, body_markdown = $2, folder_id = $3, is_pinned = $4, is_archived = $5, updated_at = NOW() WHERE profile_id = $6 AND id = $7 RETURNING id",
          [
            input.title,
            input.bodyMarkdown,
            input.folderId,
            input.isPinned,
            input.isArchived,
            profileId,
            noteId,
          ],
        )) as Array<{ id: string }>;
        if (!rows[0]) throw new NotFoundError("Note", noteId);
        await this.writeTagsPostgres(transaction, profileId, noteId, input.tagNames);
      });
    }
    return (await this.getNote(profileId, noteId))!;
  }

  async deleteNote(profileId: string, noteId: string): Promise<void> {
    await this.execute(
      "DELETE FROM bookmarks WHERE profile_id = ? AND resource_type = 'note' AND resource_id = ?",
      "DELETE FROM bookmarks WHERE profile_id = $1 AND resource_type = 'note' AND resource_id = $2",
      [profileId, noteId],
    );
    await this.execute(
      "DELETE FROM notes WHERE profile_id = ? AND id = ?",
      "DELETE FROM notes WHERE profile_id = $1 AND id = $2",
      [profileId, noteId],
    );
  }

  async listFolders(profileId: string): Promise<readonly FolderRecord[]> {
    const rows = await this.rows(
      `${folderSelect} WHERE profile_id = ? ORDER BY parent_folder_id, sort_order, name COLLATE NOCASE`,
      `${folderSelect} WHERE profile_id = $1 ORDER BY parent_folder_id, sort_order, name`,
      [profileId],
    );
    return rows.map(mapFolder);
  }

  async getFolder(profileId: string, folderId: string): Promise<FolderRecord | null> {
    const row = await this.one(
      `${folderSelect} WHERE profile_id = ? AND id = ?`,
      `${folderSelect} WHERE profile_id = $1 AND id = $2`,
      [profileId, folderId],
    );
    return row ? mapFolder(row) : null;
  }

  async createFolder(input: {
    id: string;
    profileId: string;
    name: string;
    parentFolderId: string | null;
    sortOrder: number;
  }): Promise<FolderRecord> {
    await this.execute(
      "INSERT INTO folders (id, profile_id, name, parent_folder_id, sort_order) VALUES (?, ?, ?, ?, ?)",
      "INSERT INTO folders (id, profile_id, name, parent_folder_id, sort_order) VALUES ($1, $2, $3, $4, $5)",
      [input.id, input.profileId, input.name, input.parentFolderId, input.sortOrder],
    );
    return (await this.getFolder(input.profileId, input.id))!;
  }

  async updateFolder(
    profileId: string,
    folderId: string,
    input: { name: string; parentFolderId: string | null; sortOrder: number },
  ): Promise<FolderRecord> {
    await this.execute(
      "UPDATE folders SET name = ?, parent_folder_id = ?, sort_order = ?, updated_at = CURRENT_TIMESTAMP WHERE profile_id = ? AND id = ?",
      "UPDATE folders SET name = $1, parent_folder_id = $2, sort_order = $3, updated_at = NOW() WHERE profile_id = $4 AND id = $5",
      [input.name, input.parentFolderId, input.sortOrder, profileId, folderId],
    );
    const folder = await this.getFolder(profileId, folderId);
    if (!folder) throw new NotFoundError("Folder", folderId);
    return folder;
  }

  async deleteFolder(profileId: string, folderId: string): Promise<void> {
    await this.execute(
      "DELETE FROM folders WHERE profile_id = ? AND id = ?",
      "DELETE FROM folders WHERE profile_id = $1 AND id = $2",
      [profileId, folderId],
    );
  }

  async listTags(profileId: string): Promise<readonly TagRecord[]> {
    const rows = await this.rows(
      `${tagSelect} WHERE profile_id = ? ORDER BY name COLLATE NOCASE`,
      `${tagSelect} WHERE profile_id = $1 ORDER BY name`,
      [profileId],
    );
    return rows.map(mapTag);
  }

  private async listNoteLinks(
    profileId: string,
    noteId: string,
  ): Promise<readonly NoteLinkRecord[]> {
    const rows = await this.rows(
      `${linkSelect} WHERE profile_id = ? AND note_id = ? ORDER BY created_at, id`,
      `${linkSelect} WHERE profile_id = $1 AND note_id = $2 ORDER BY created_at, id`,
      [profileId, noteId],
    );
    return rows.map(mapLink);
  }

  async createNoteLink(input: {
    id: string;
    profileId: string;
    noteId: string;
    resourceType: NoteResourceType;
    resourceId: string;
    label: string;
    sourceLocation: string;
  }): Promise<NoteLinkRecord> {
    await this.execute(
      "INSERT INTO note_links (id, profile_id, note_id, resource_type, resource_id, label, source_location) VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT(note_id, resource_type, resource_id, source_location) DO UPDATE SET label = excluded.label",
      "INSERT INTO note_links (id, profile_id, note_id, resource_type, resource_id, label, source_location) VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT(note_id, resource_type, resource_id, source_location) DO UPDATE SET label = EXCLUDED.label",
      [
        input.id,
        input.profileId,
        input.noteId,
        input.resourceType,
        input.resourceId,
        input.label,
        input.sourceLocation,
      ],
    );
    const row = await this.one(
      `${linkSelect} WHERE profile_id = ? AND note_id = ? AND resource_type = ? AND resource_id = ? AND source_location = ?`,
      `${linkSelect} WHERE profile_id = $1 AND note_id = $2 AND resource_type = $3 AND resource_id = $4 AND source_location = $5`,
      [input.profileId, input.noteId, input.resourceType, input.resourceId, input.sourceLocation],
    );
    if (!row) throw new NotFoundError("Note link", input.resourceId);
    return mapLink(row);
  }

  async deleteNoteLink(profileId: string, noteId: string, linkId: string): Promise<void> {
    await this.execute(
      "DELETE FROM note_links WHERE profile_id = ? AND note_id = ? AND id = ?",
      "DELETE FROM note_links WHERE profile_id = $1 AND note_id = $2 AND id = $3",
      [profileId, noteId, linkId],
    );
  }

  private async listBacklinks(
    profileId: string,
    noteId: string,
  ): Promise<readonly NoteBacklinkRecord[]> {
    const rows = await this.rows(
      `SELECT b.id, b.profile_id, b.source_note_id, source.title AS source_note_title, b.target_note_id, target.title AS target_note_title, b.anchor, b.created_at FROM note_backlinks b JOIN notes source ON source.id = b.source_note_id JOIN notes target ON target.id = b.target_note_id WHERE b.profile_id = ? AND b.target_note_id = ? ORDER BY b.created_at, b.id`,
      `SELECT b.id, b.profile_id, b.source_note_id, source.title AS source_note_title, b.target_note_id, target.title AS target_note_title, b.anchor, b.created_at FROM note_backlinks b JOIN notes source ON source.id = b.source_note_id JOIN notes target ON target.id = b.target_note_id WHERE b.profile_id = $1 AND b.target_note_id = $2 ORDER BY b.created_at, b.id`,
      [profileId, noteId],
    );
    return rows.map(mapBacklink);
  }

  async createBacklink(input: {
    id: string;
    profileId: string;
    sourceNoteId: string;
    targetNoteId: string;
    anchor: string;
  }): Promise<NoteBacklinkRecord> {
    await this.execute(
      "INSERT INTO note_backlinks (id, profile_id, source_note_id, target_note_id, anchor) VALUES (?, ?, ?, ?, ?) ON CONFLICT(source_note_id, target_note_id, anchor) DO NOTHING",
      "INSERT INTO note_backlinks (id, profile_id, source_note_id, target_note_id, anchor) VALUES ($1, $2, $3, $4, $5) ON CONFLICT(source_note_id, target_note_id, anchor) DO NOTHING",
      [input.id, input.profileId, input.sourceNoteId, input.targetNoteId, input.anchor],
    );
    const row = await this.one(
      `SELECT b.id, b.profile_id, b.source_note_id, source.title AS source_note_title, b.target_note_id, target.title AS target_note_title, b.anchor, b.created_at FROM note_backlinks b JOIN notes source ON source.id = b.source_note_id JOIN notes target ON target.id = b.target_note_id WHERE b.profile_id = ? AND b.source_note_id = ? AND b.target_note_id = ? AND b.anchor = ?`,
      `SELECT b.id, b.profile_id, b.source_note_id, source.title AS source_note_title, b.target_note_id, target.title AS target_note_title, b.anchor, b.created_at FROM note_backlinks b JOIN notes source ON source.id = b.source_note_id JOIN notes target ON target.id = b.target_note_id WHERE b.profile_id = $1 AND b.source_note_id = $2 AND b.target_note_id = $3 AND b.anchor = $4`,
      [input.profileId, input.sourceNoteId, input.targetNoteId, input.anchor],
    );
    if (!row) throw new NotFoundError("Note backlink", input.targetNoteId);
    return mapBacklink(row);
  }

  async deleteBacklink(profileId: string, sourceNoteId: string, backlinkId: string): Promise<void> {
    await this.execute(
      "DELETE FROM note_backlinks WHERE profile_id = ? AND source_note_id = ? AND id = ?",
      "DELETE FROM note_backlinks WHERE profile_id = $1 AND source_note_id = $2 AND id = $3",
      [profileId, sourceNoteId, backlinkId],
    );
  }

  async listHighlights(
    profileId: string,
    options: { sourceType?: HighlightSourceType; sourceId?: string; noteId?: string } = {},
  ): Promise<readonly HighlightRecord[]> {
    const values: unknown[] = [profileId];
    const sqliteConditions = ["profile_id = ?"];
    const postgresConditions = ["profile_id = $1"];
    const add = (sqlite: string, postgres: string, value: unknown) => {
      values.push(value);
      sqliteConditions.push(sqlite);
      postgresConditions.push(postgres.replace(/\$[A-Z_]+|\$/i, `$${values.length}`));
    };
    if (options.sourceType) add("source_type = ?", "$SOURCE_TYPE", options.sourceType);
    if (options.sourceId) add("source_id = ?", "$SOURCE_ID", options.sourceId);
    if (options.noteId) add("note_id = ?", "$NOTE_ID", options.noteId);
    const rows = await this.rows(
      `${highlightSelect} WHERE ${sqliteConditions.join(" AND ")} ORDER BY created_at DESC, id DESC`,
      `${highlightSelect} WHERE ${postgresConditions.join(" AND ")} ORDER BY created_at DESC, id DESC`,
      values,
    );
    return rows.map(mapHighlight);
  }

  async createHighlight(input: {
    id: string;
    profileId: string;
    sourceType: HighlightSourceType;
    sourceId: string;
    sourceLocation: string;
    selectedText: string;
    noteId: string | null;
    color: string;
  }): Promise<HighlightRecord> {
    await this.execute(
      "INSERT INTO highlights (id, profile_id, source_type, source_id, source_location, selected_text, note_id, color) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      "INSERT INTO highlights (id, profile_id, source_type, source_id, source_location, selected_text, note_id, color) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
      [
        input.id,
        input.profileId,
        input.sourceType,
        input.sourceId,
        input.sourceLocation,
        input.selectedText,
        input.noteId,
        input.color,
      ],
    );
    const row = await this.one(
      `${highlightSelect} WHERE profile_id = ? AND id = ?`,
      `${highlightSelect} WHERE profile_id = $1 AND id = $2`,
      [input.profileId, input.id],
    );
    if (!row) throw new NotFoundError("Highlight", input.id);
    return mapHighlight(row);
  }

  async deleteHighlight(profileId: string, highlightId: string): Promise<void> {
    await this.execute(
      "DELETE FROM highlights WHERE profile_id = ? AND id = ?",
      "DELETE FROM highlights WHERE profile_id = $1 AND id = $2",
      [profileId, highlightId],
    );
  }

  async listBookmarks(
    profileId: string,
    options: { resourceType?: BookmarkResourceType; resourceId?: string } = {},
  ): Promise<readonly BookmarkRecord[]> {
    const values: unknown[] = [profileId];
    const sqliteConditions = ["profile_id = ?"];
    const postgresConditions = ["profile_id = $1"];
    const add = (sqlite: string, postgres: string, value: unknown) => {
      values.push(value);
      sqliteConditions.push(sqlite);
      postgresConditions.push(postgres.replace(/\$[A-Z_]+|\$/i, `$${values.length}`));
    };
    if (options.resourceType) add("resource_type = ?", "$RESOURCE_TYPE", options.resourceType);
    if (options.resourceId) add("resource_id = ?", "$RESOURCE_ID", options.resourceId);
    const rows = await this.rows(
      `${bookmarkSelect} WHERE ${sqliteConditions.join(" AND ")} ORDER BY created_at DESC, id DESC`,
      `${bookmarkSelect} WHERE ${postgresConditions.join(" AND ")} ORDER BY created_at DESC, id DESC`,
      values,
    );
    return rows.map(mapBookmark);
  }

  async createBookmark(input: {
    id: string;
    profileId: string;
    resourceType: BookmarkResourceType;
    resourceId: string;
    title: string;
    sourceUrl: string;
  }): Promise<BookmarkRecord> {
    await this.execute(
      "INSERT INTO bookmarks (id, profile_id, resource_type, resource_id, title, source_url) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(profile_id, resource_type, resource_id) DO UPDATE SET title = excluded.title, source_url = excluded.source_url, updated_at = CURRENT_TIMESTAMP",
      "INSERT INTO bookmarks (id, profile_id, resource_type, resource_id, title, source_url) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT(profile_id, resource_type, resource_id) DO UPDATE SET title = EXCLUDED.title, source_url = EXCLUDED.source_url, updated_at = NOW()",
      [
        input.id,
        input.profileId,
        input.resourceType,
        input.resourceId,
        input.title,
        input.sourceUrl,
      ],
    );
    const row = await this.one(
      `${bookmarkSelect} WHERE profile_id = ? AND resource_type = ? AND resource_id = ?`,
      `${bookmarkSelect} WHERE profile_id = $1 AND resource_type = $2 AND resource_id = $3`,
      [input.profileId, input.resourceType, input.resourceId],
    );
    if (!row) throw new NotFoundError("Bookmark", input.resourceId);
    return mapBookmark(row);
  }

  async deleteBookmark(
    profileId: string,
    resourceType: BookmarkResourceType,
    resourceId: string,
  ): Promise<void> {
    await this.execute(
      "DELETE FROM bookmarks WHERE profile_id = ? AND resource_type = ? AND resource_id = ?",
      "DELETE FROM bookmarks WHERE profile_id = $1 AND resource_type = $2 AND resource_id = $3",
      [profileId, resourceType, resourceId],
    );
  }

  async resourceExists(resourceType: string, resourceId: string): Promise<boolean> {
    const tableByType: Record<string, string> = {
      subject: "subjects",
      grade: "grades",
      course: "courses",
      module: "modules",
      lesson: "lessons",
      concept: "concepts",
      question: "questions",
      simulation: "simulations",
      assessment: "assessments",
      laboratory: "laboratory_activities",
      exercise: "exercise_sets",
      roadmap: "roadmaps",
    };
    if (resourceType === "exercise") {
      const row = await this.one(
        "SELECT 1 AS present FROM questions WHERE id = ? UNION SELECT 1 AS present FROM exercise_sets WHERE id = ? LIMIT 1",
        "SELECT 1 AS present FROM questions WHERE id = $1 UNION SELECT 1 AS present FROM exercise_sets WHERE id = $2 LIMIT 1",
        [resourceId, resourceId],
      );
      return Boolean(row);
    }
    const table = tableByType[resourceType];
    if (!table) return false;
    const row = await this.one(
      `SELECT 1 AS present FROM ${table} WHERE id = ? LIMIT 1`,
      `SELECT 1 AS present FROM ${table} WHERE id = $1 LIMIT 1`,
      [resourceId],
    );
    return Boolean(row);
  }

  async resourceTitle(resourceType: string, resourceId: string): Promise<string | null> {
    const tableByType: Record<string, { table: string; column: string }> = {
      subject: { table: "subjects", column: "name" },
      grade: { table: "grades", column: "name" },
      course: { table: "courses", column: "title" },
      module: { table: "modules", column: "title" },
      lesson: { table: "lessons", column: "title" },
      concept: { table: "concepts", column: "name" },
      question: { table: "questions", column: "title" },
      simulation: { table: "simulations", column: "title" },
      assessment: { table: "assessments", column: "title" },
      laboratory: { table: "laboratory_activities", column: "title" },
      exercise: { table: "exercise_sets", column: "title" },
      roadmap: { table: "roadmaps", column: "title" },
    };
    const resource = tableByType[resourceType];
    if (!resource) return null;
    const row = await this.one(
      `SELECT ${resource.column} AS title FROM ${resource.table} WHERE id = ? LIMIT 1`,
      `SELECT ${resource.column} AS title FROM ${resource.table} WHERE id = $1 LIMIT 1`,
      [resourceId],
    );
    return row?.title ? String(row.title) : null;
  }

  async getKnowledgeMap(profileId: string): Promise<PersonalKnowledgeMap> {
    const notes = await this.listNotes(profileId, { includeArchived: false });
    const noteIds = notes.map((note) => note.id);
    const links = noteIds.length
      ? await this.rows(
          `SELECT id, profile_id, note_id, resource_type, resource_id, label, source_location, created_at FROM note_links WHERE profile_id = ? AND note_id IN (${noteIds.map(() => "?").join(", ")}) ORDER BY created_at, id`,
          `SELECT id, profile_id, note_id, resource_type, resource_id, label, source_location, created_at FROM note_links WHERE profile_id = $1 AND note_id IN (${noteIds.map((_, index) => `$${index + 2}`).join(", ")}) ORDER BY created_at, id`,
          [profileId, ...noteIds],
        )
      : [];
    const backlinks = noteIds.length
      ? await this.rows(
          `SELECT id, profile_id, source_note_id, target_note_id, anchor, created_at FROM note_backlinks WHERE profile_id = ? AND (source_note_id IN (${noteIds.map(() => "?").join(", ")}) OR target_note_id IN (${noteIds.map(() => "?").join(", ")})) ORDER BY created_at, id`,
          `SELECT id, profile_id, source_note_id, target_note_id, anchor, created_at FROM note_backlinks WHERE profile_id = $1 AND (source_note_id IN (${noteIds.map((_, index) => `$${index + 2}`).join(", ")}) OR target_note_id IN (${noteIds.map((_, index) => `$${index + noteIds.length + 2}`).join(", ")})) ORDER BY created_at, id`,
          [profileId, ...noteIds, ...noteIds],
        )
      : [];
    const bookmarks = await this.listBookmarks(profileId);
    return buildPersonalKnowledgeMap({
      notes,
      links: links.map((row) => ({
        id: String(row.id),
        noteId: String(row.note_id),
        resourceType: String(row.resource_type),
        resourceId: String(row.resource_id),
        label: String(row.label ?? ""),
      })),
      backlinks: backlinks.map((row) => ({
        id: String(row.id),
        sourceNoteId: String(row.source_note_id),
        targetNoteId: String(row.target_note_id),
        anchor: String(row.anchor ?? ""),
      })),
      bookmarks,
    });
  }
}

export function getNotesRepository(database?: DatabaseHandle): NotesRepository {
  return new SqlNotesRepository(database);
}
