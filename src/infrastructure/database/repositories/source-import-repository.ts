import { randomUUID } from "node:crypto";
import type { LessonDraft } from "@/features/content-studio/schemas";
import type {
  LessonSize,
  SourceChunkDraft,
  SourceLessonDraft,
} from "@/features/content-studio/source-ingestion";
import { getDatabase, type DatabaseHandle } from "@/infrastructure/database/client";

export type SourceImportStatus = "queued" | "extracting" | "segmenting" | "ready" | "failed";

export interface SourceImportRecord {
  id: string;
  documentId: string;
  title: string;
  originalFilename: string;
  storageKey: string;
  mimeType: string;
  byteSize: number;
  sha256: string;
  subjectId: string;
  targetGradeId: string;
  difficulty: "gentle" | "balanced" | "challenging";
  lessonSize: LessonSize;
  rightsStatus: "unknown" | "permitted" | "restricted";
  pageCount: number | null;
  status: SourceImportStatus;
  totalUnits: number;
  processedUnits: number;
  draftCount: number;
  savedCount: number;
  error: string | null;
  createdByProfileId: string;
  createdAt: string;
  updatedAt: string;
}

export interface ClaimedSourceChunk {
  id: string;
  documentId: string;
  jobId: string;
  pageStart: number;
  pageEnd: number;
  text: string;
  sortOrder: number;
}

export interface SourceImportItemRecord {
  id: string;
  jobId: string;
  title: string;
  pageStart: number;
  pageEnd: number;
  draft: LessonDraft;
  savedLessonId: string | null;
  sortOrder: number;
}

interface ImportRow {
  id: string;
  document_id: string;
  title: string;
  original_filename: string;
  storage_key: string;
  mime_type: string;
  byte_size: number;
  sha256: string;
  subject_id: string;
  target_grade_id: string;
  difficulty: string;
  lesson_size: string;
  rights_status: string;
  page_count: number | null;
  status: string;
  total_units: number;
  processed_units: number;
  draft_count: number;
  saved_count: number;
  error_details: string | null;
  processing_error: string | null;
  created_by_profile_id: string;
  created_at: Date | string;
  updated_at: Date | string;
}

interface ChunkRow {
  id: string;
  document_id: string;
  job_id: string;
  page_start: number;
  page_end: number;
  chunk_text: string;
  sort_order: number;
}

interface ItemRow {
  id: string;
  job_id: string;
  title: string;
  page_start: number;
  page_end: number;
  payload_json: string;
  saved_lesson_id: string | null;
  sort_order: number;
}

const importSelect = `
  SELECT j.id, j.document_id, d.title, d.original_filename, d.storage_key, d.mime_type,
    d.byte_size, d.sha256, d.subject_id, d.target_grade_id, d.difficulty, d.lesson_size,
    d.rights_status, d.page_count, j.status, j.total_units, j.processed_units,
    (SELECT COUNT(*) FROM content_import_items i WHERE i.job_id = j.id) AS draft_count,
    (SELECT COUNT(*) FROM content_import_items i WHERE i.job_id = j.id AND i.saved_lesson_id IS NOT NULL) AS saved_count,
    j.error_details, d.processing_error, d.created_by_profile_id, j.created_at, j.updated_at
  FROM content_import_jobs j
  JOIN source_documents d ON d.id = j.document_id
`;

function iso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : value;
}

function mapImport(row: ImportRow): SourceImportRecord {
  return {
    id: row.id,
    documentId: row.document_id,
    title: row.title,
    originalFilename: row.original_filename,
    storageKey: row.storage_key,
    mimeType: row.mime_type,
    byteSize: Number(row.byte_size),
    sha256: row.sha256,
    subjectId: row.subject_id,
    targetGradeId: row.target_grade_id,
    difficulty: row.difficulty as SourceImportRecord["difficulty"],
    lessonSize: row.lesson_size as LessonSize,
    rightsStatus: row.rights_status as SourceImportRecord["rightsStatus"],
    pageCount: row.page_count === null ? null : Number(row.page_count),
    status: row.status as SourceImportStatus,
    totalUnits: Number(row.total_units),
    processedUnits: Number(row.processed_units),
    draftCount: Number(row.draft_count),
    savedCount: Number(row.saved_count),
    error: row.error_details ?? row.processing_error,
    createdByProfileId: row.created_by_profile_id,
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
  };
}

function mapChunk(row: ChunkRow): ClaimedSourceChunk {
  return {
    id: row.id,
    documentId: row.document_id,
    jobId: row.job_id,
    pageStart: Number(row.page_start),
    pageEnd: Number(row.page_end),
    text: row.chunk_text,
    sortOrder: Number(row.sort_order),
  };
}

export class SourceImportRepository {
  constructor(private readonly database: DatabaseHandle = getDatabase()) {}

  async createImport(input: {
    documentId: string;
    jobId: string;
    title: string;
    originalFilename: string;
    storageKey: string;
    mimeType: string;
    byteSize: number;
    sha256: string;
    subjectId: string;
    targetGradeId: string;
    difficulty: SourceImportRecord["difficulty"];
    lessonSize: LessonSize;
    rightsStatus: SourceImportRecord["rightsStatus"];
    createdByProfileId: string;
  }): Promise<SourceImportRecord> {
    if (this.database.provider === "sqlite") {
      const database = this.database.raw;
      database.transaction(() => {
        database
          .prepare(
            `INSERT INTO source_documents
          (id, title, original_filename, storage_key, mime_type, byte_size, sha256, subject_id, target_grade_id, difficulty, lesson_size, rights_status, created_by_profile_id)
          VALUES (@documentId, @title, @originalFilename, @storageKey, @mimeType, @byteSize, @sha256, @subjectId, @targetGradeId, @difficulty, @lessonSize, @rightsStatus, @createdByProfileId)`,
          )
          .run(input);
        database
          .prepare(
            "INSERT INTO content_import_jobs (id, document_id, status) VALUES (?, ?, 'queued')",
          )
          .run(input.jobId, input.documentId);
      })();
    } else {
      await this.database.raw.begin(async (transaction) => {
        await transaction`INSERT INTO source_documents
          (id, title, original_filename, storage_key, mime_type, byte_size, sha256, subject_id, target_grade_id, difficulty, lesson_size, rights_status, created_by_profile_id)
          VALUES (${input.documentId}, ${input.title}, ${input.originalFilename}, ${input.storageKey}, ${input.mimeType}, ${input.byteSize}, ${input.sha256}, ${input.subjectId}, ${input.targetGradeId}, ${input.difficulty}, ${input.lessonSize}, ${input.rightsStatus}, ${input.createdByProfileId})`;
        await transaction`INSERT INTO content_import_jobs (id, document_id, status)
          VALUES (${input.jobId}, ${input.documentId}, 'queued')`;
      });
    }
    return (await this.getImport(input.jobId))!;
  }

  async listImports(profileId: string): Promise<readonly SourceImportRecord[]> {
    const rows =
      this.database.provider === "sqlite"
        ? (this.database.raw
            .prepare(
              `${importSelect} WHERE d.created_by_profile_id = ? ORDER BY j.created_at DESC LIMIT 20`,
            )
            .all(profileId) as ImportRow[])
        : await this.database.raw<
            ImportRow[]
          >`${this.database.raw.unsafe(importSelect)} WHERE d.created_by_profile_id = ${profileId} ORDER BY j.created_at DESC LIMIT 20`;
    return rows.map(mapImport);
  }

  async getImport(jobId: string): Promise<SourceImportRecord | null> {
    const rows =
      this.database.provider === "sqlite"
        ? (this.database.raw.prepare(`${importSelect} WHERE j.id = ?`).all(jobId) as ImportRow[])
        : await this.database.raw<
            ImportRow[]
          >`${this.database.raw.unsafe(importSelect)} WHERE j.id = ${jobId}`;
    return rows[0] ? mapImport(rows[0]) : null;
  }

  async beginExtraction(jobId: string): Promise<boolean> {
    if (this.database.provider === "sqlite") {
      const result = this.database.raw
        .prepare(
          `UPDATE content_import_jobs SET status = 'extracting', error_details = NULL, started_at = COALESCE(started_at, CURRENT_TIMESTAMP), updated_at = CURRENT_TIMESTAMP WHERE id = ? AND status IN ('queued', 'failed')`,
        )
        .run(jobId);
      if (result.changes)
        this.database.raw
          .prepare(
            `UPDATE source_documents SET processing_status = 'extracting', processing_error = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = (SELECT document_id FROM content_import_jobs WHERE id = ?)`,
          )
          .run(jobId);
      return result.changes === 1;
    }
    const rows = await this.database.raw<
      { document_id: string }[]
    >`UPDATE content_import_jobs SET status = 'extracting', error_details = NULL, started_at = COALESCE(started_at, NOW()), updated_at = NOW() WHERE id = ${jobId} AND status IN ('queued', 'failed') RETURNING document_id`;
    if (rows[0])
      await this.database
        .raw`UPDATE source_documents SET processing_status = 'extracting', processing_error = NULL, updated_at = NOW() WHERE id = ${rows[0].document_id}`;
    return Boolean(rows[0]);
  }

  async saveExtraction(input: {
    jobId: string;
    documentId: string;
    pages: readonly { pageNumber: number; text: string }[];
    chunks: readonly SourceChunkDraft[];
  }): Promise<void> {
    if (this.database.provider === "sqlite") {
      const database = this.database.raw;
      database.transaction(() => {
        database.prepare("DELETE FROM content_import_items WHERE job_id = ?").run(input.jobId);
        database.prepare("DELETE FROM source_chunks WHERE job_id = ?").run(input.jobId);
        database
          .prepare("DELETE FROM source_document_pages WHERE document_id = ?")
          .run(input.documentId);
        const pageInsert = database.prepare(
          `INSERT INTO source_document_pages (document_id, page_number, extracted_text, character_count) VALUES (?, ?, ?, ?)`,
        );
        for (const page of input.pages)
          pageInsert.run(input.documentId, page.pageNumber, page.text, page.text.length);
        const chunkInsert = database.prepare(
          `INSERT INTO source_chunks (id, document_id, job_id, page_start, page_end, chunk_text, character_count, content_hash, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        );
        for (const chunk of input.chunks)
          chunkInsert.run(
            chunk.id,
            input.documentId,
            input.jobId,
            chunk.pageStart,
            chunk.pageEnd,
            chunk.text,
            chunk.text.length,
            chunk.contentHash,
            chunk.sortOrder,
          );
        database
          .prepare(
            `UPDATE source_documents SET page_count = ?, extraction_method = 'pdf-text', processing_status = 'segmenting', processing_error = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
          )
          .run(input.pages.length, input.documentId);
        database
          .prepare(
            `UPDATE content_import_jobs SET status = 'segmenting', total_units = ?, processed_units = 0, error_details = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
          )
          .run(input.chunks.length, input.jobId);
      })();
      return;
    }
    await this.database.raw.begin(async (transaction) => {
      await transaction`DELETE FROM content_import_items WHERE job_id = ${input.jobId}`;
      await transaction`DELETE FROM source_chunks WHERE job_id = ${input.jobId}`;
      await transaction`DELETE FROM source_document_pages WHERE document_id = ${input.documentId}`;
      for (const page of input.pages)
        await transaction`INSERT INTO source_document_pages (document_id, page_number, extracted_text, character_count) VALUES (${input.documentId}, ${page.pageNumber}, ${page.text}, ${page.text.length})`;
      for (const chunk of input.chunks)
        await transaction`INSERT INTO source_chunks (id, document_id, job_id, page_start, page_end, chunk_text, character_count, content_hash, sort_order) VALUES (${chunk.id}, ${input.documentId}, ${input.jobId}, ${chunk.pageStart}, ${chunk.pageEnd}, ${chunk.text}, ${chunk.text.length}, ${chunk.contentHash}, ${chunk.sortOrder})`;
      await transaction`UPDATE source_documents SET page_count = ${input.pages.length}, extraction_method = 'pdf-text', processing_status = 'segmenting', processing_error = NULL, updated_at = NOW() WHERE id = ${input.documentId}`;
      await transaction`UPDATE content_import_jobs SET status = 'segmenting', total_units = ${input.chunks.length}, processed_units = 0, error_details = NULL, updated_at = NOW() WHERE id = ${input.jobId}`;
    });
  }

  async claimNextChunk(jobId: string): Promise<ClaimedSourceChunk | null> {
    if (this.database.provider === "sqlite") {
      const database = this.database.raw;
      return database.transaction(() => {
        const row = database
          .prepare(
            `SELECT id, document_id, job_id, page_start, page_end, chunk_text, sort_order FROM source_chunks WHERE job_id = ? AND status = 'pending' ORDER BY sort_order LIMIT 1`,
          )
          .get(jobId) as ChunkRow | undefined;
        if (!row) return null;
        const updated = database
          .prepare(
            `UPDATE source_chunks SET status = 'processing', processing_error = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND status = 'pending'`,
          )
          .run(row.id);
        return updated.changes ? mapChunk(row) : null;
      })();
    }
    const rows = await this.database.raw<ChunkRow[]>`WITH candidate AS (
      SELECT id FROM source_chunks WHERE job_id = ${jobId} AND status = 'pending' ORDER BY sort_order FOR UPDATE SKIP LOCKED LIMIT 1
    ) UPDATE source_chunks c SET status = 'processing', processing_error = NULL, updated_at = NOW() FROM candidate WHERE c.id = candidate.id
    RETURNING c.id, c.document_id, c.job_id, c.page_start, c.page_end, c.chunk_text, c.sort_order`;
    return rows[0] ? mapChunk(rows[0]) : null;
  }

  async completeChunk(input: {
    chunk: ClaimedSourceChunk;
    generationId: string | null;
    lessons: readonly SourceLessonDraft[];
  }): Promise<void> {
    const items = input.lessons.map((lesson, index) => ({
      id: randomUUID(),
      stableKey: `${input.chunk.sortOrder}:${index}:${lesson.pageStart}-${lesson.pageEnd}`,
      title: lesson.draft.lessonTitle,
      pageStart: lesson.pageStart,
      pageEnd: lesson.pageEnd,
      payload: JSON.stringify(lesson.draft),
      sortOrder: input.chunk.sortOrder * 10 + index,
    }));
    if (this.database.provider === "sqlite") {
      const database = this.database.raw;
      database.transaction(() => {
        const insert = database.prepare(
          `INSERT INTO content_import_items (id, job_id, chunk_id, stable_entity_key, title, page_start, page_end, payload_json, generation_id, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(job_id, stable_entity_key) DO UPDATE SET title = excluded.title, page_start = excluded.page_start, page_end = excluded.page_end, payload_json = excluded.payload_json, generation_id = excluded.generation_id, updated_at = CURRENT_TIMESTAMP`,
        );
        for (const item of items)
          insert.run(
            item.id,
            input.chunk.jobId,
            input.chunk.id,
            item.stableKey,
            item.title,
            item.pageStart,
            item.pageEnd,
            item.payload,
            input.generationId,
            item.sortOrder,
          );
        database
          .prepare(
            `UPDATE source_chunks SET status = 'ready', processing_error = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
          )
          .run(input.chunk.id);
        database
          .prepare(
            `UPDATE content_import_jobs SET processed_units = (SELECT COUNT(*) FROM source_chunks WHERE job_id = ? AND status = 'ready'), error_details = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
          )
          .run(input.chunk.jobId, input.chunk.jobId);
      })();
      return;
    }
    await this.database.raw.begin(async (transaction) => {
      for (const item of items)
        await transaction`INSERT INTO content_import_items (id, job_id, chunk_id, stable_entity_key, title, page_start, page_end, payload_json, generation_id, sort_order) VALUES (${item.id}, ${input.chunk.jobId}, ${input.chunk.id}, ${item.stableKey}, ${item.title}, ${item.pageStart}, ${item.pageEnd}, ${item.payload}, ${input.generationId}, ${item.sortOrder}) ON CONFLICT (job_id, stable_entity_key) DO UPDATE SET title = EXCLUDED.title, page_start = EXCLUDED.page_start, page_end = EXCLUDED.page_end, payload_json = EXCLUDED.payload_json, generation_id = EXCLUDED.generation_id, updated_at = NOW()`;
      await transaction`UPDATE source_chunks SET status = 'ready', processing_error = NULL, updated_at = NOW() WHERE id = ${input.chunk.id}`;
      await transaction`UPDATE content_import_jobs SET processed_units = (SELECT COUNT(*) FROM source_chunks WHERE job_id = ${input.chunk.jobId} AND status = 'ready'), error_details = NULL, updated_at = NOW() WHERE id = ${input.chunk.jobId}`;
    });
  }

  async releaseChunk(chunkId: string, message: string): Promise<void> {
    const bounded = message.slice(0, 1000);
    if (this.database.provider === "sqlite") {
      this.database.raw
        .prepare(
          `UPDATE source_chunks SET status = 'pending', processing_error = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        )
        .run(bounded, chunkId);
      this.database.raw
        .prepare(
          `UPDATE content_import_jobs SET error_details = ?, updated_at = CURRENT_TIMESTAMP WHERE id = (SELECT job_id FROM source_chunks WHERE id = ?)`,
        )
        .run(bounded, chunkId);
    } else {
      const rows = await this.database.raw<
        { job_id: string }[]
      >`UPDATE source_chunks SET status = 'pending', processing_error = ${bounded}, updated_at = NOW() WHERE id = ${chunkId} RETURNING job_id`;
      if (rows[0])
        await this.database
          .raw`UPDATE content_import_jobs SET error_details = ${bounded}, updated_at = NOW() WHERE id = ${rows[0].job_id}`;
    }
  }

  async finishIfComplete(jobId: string): Promise<boolean> {
    if (this.database.provider === "sqlite") {
      const database = this.database.raw;
      const remaining = database
        .prepare(
          `SELECT COUNT(*) AS count FROM source_chunks WHERE job_id = ? AND status <> 'ready'`,
        )
        .get(jobId) as { count: number };
      if (remaining.count) return false;
      database.transaction(() => {
        database
          .prepare(
            `UPDATE content_import_jobs SET status = 'ready', processed_units = total_units, error_details = NULL, finished_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
          )
          .run(jobId);
        database
          .prepare(
            `UPDATE source_documents SET processing_status = 'ready', processing_error = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = (SELECT document_id FROM content_import_jobs WHERE id = ?)`,
          )
          .run(jobId);
      })();
      return true;
    }
    const rows = await this.database.raw<
      { count: number }[]
    >`SELECT COUNT(*)::int AS count FROM source_chunks WHERE job_id = ${jobId} AND status <> 'ready'`;
    if (rows[0]?.count) return false;
    await this.database.raw.begin(async (transaction) => {
      await transaction`UPDATE content_import_jobs SET status = 'ready', processed_units = total_units, error_details = NULL, finished_at = NOW(), updated_at = NOW() WHERE id = ${jobId}`;
      await transaction`UPDATE source_documents SET processing_status = 'ready', processing_error = NULL, updated_at = NOW() WHERE id = (SELECT document_id FROM content_import_jobs WHERE id = ${jobId})`;
    });
    return true;
  }

  async failImport(jobId: string, message: string): Promise<void> {
    const bounded = message.slice(0, 2000);
    if (this.database.provider === "sqlite") {
      const database = this.database.raw;
      database.transaction(() => {
        database
          .prepare(
            `UPDATE content_import_jobs SET status = 'failed', error_details = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
          )
          .run(bounded, jobId);
        database
          .prepare(
            `UPDATE source_documents SET processing_status = 'failed', processing_error = ?, updated_at = CURRENT_TIMESTAMP WHERE id = (SELECT document_id FROM content_import_jobs WHERE id = ?)`,
          )
          .run(bounded, jobId);
      })();
    } else {
      await this.database.raw.begin(async (transaction) => {
        await transaction`UPDATE content_import_jobs SET status = 'failed', error_details = ${bounded}, updated_at = NOW() WHERE id = ${jobId}`;
        await transaction`UPDATE source_documents SET processing_status = 'failed', processing_error = ${bounded}, updated_at = NOW() WHERE id = (SELECT document_id FROM content_import_jobs WHERE id = ${jobId})`;
      });
    }
  }

  async getNextUnsavedItem(jobId: string): Promise<SourceImportItemRecord | null> {
    const query = `SELECT id, job_id, title, page_start, page_end, payload_json, saved_lesson_id, sort_order FROM content_import_items WHERE job_id = ? AND saved_lesson_id IS NULL ORDER BY sort_order LIMIT 1`;
    const rows =
      this.database.provider === "sqlite"
        ? (this.database.raw.prepare(query).all(jobId) as ItemRow[])
        : await this.database.raw<
            ItemRow[]
          >`SELECT id, job_id, title, page_start, page_end, payload_json, saved_lesson_id, sort_order FROM content_import_items WHERE job_id = ${jobId} AND saved_lesson_id IS NULL ORDER BY sort_order LIMIT 1`;
    const row = rows[0];
    if (!row) return null;
    return {
      id: row.id,
      jobId: row.job_id,
      title: row.title,
      pageStart: Number(row.page_start),
      pageEnd: Number(row.page_end),
      draft: JSON.parse(row.payload_json) as LessonDraft,
      savedLessonId: row.saved_lesson_id,
      sortOrder: Number(row.sort_order),
    };
  }

  async markItemSaved(itemId: string, lessonId: string): Promise<void> {
    if (this.database.provider === "sqlite")
      this.database.raw
        .prepare(
          `UPDATE content_import_items SET saved_lesson_id = ?, status = 'saved', updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        )
        .run(lessonId, itemId);
    else
      await this.database
        .raw`UPDATE content_import_items SET saved_lesson_id = ${lessonId}, status = 'saved', updated_at = NOW() WHERE id = ${itemId}`;
  }
}

export function getSourceImportRepository(database?: DatabaseHandle): SourceImportRepository {
  return new SourceImportRepository(database);
}
