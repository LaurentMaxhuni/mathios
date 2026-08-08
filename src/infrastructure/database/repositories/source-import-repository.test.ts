import Database from "better-sqlite3";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as sqliteSchema from "@/infrastructure/database/schema/sqlite";
import { runSeed } from "@/infrastructure/database/seed";
import { SourceImportRepository } from "@/infrastructure/database/repositories/source-import-repository";

describe("SourceImportRepository", () => {
  it("persists resumable extraction and generated lesson state", async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), "mathios-source-import-"));
    const filename = path.join(directory, "test.db");
    await runSeed({ provider: "sqlite", databaseUrl: `file:${filename}` });
    const raw = new Database(filename);
    raw.pragma("foreign_keys = ON");
    const repository = new SourceImportRepository({
      provider: "sqlite",
      raw,
      db: drizzle(raw, { schema: sqliteSchema }),
    });
    try {
      const subject = raw.prepare("SELECT id FROM subjects LIMIT 1").get() as { id: string };
      const grade = raw.prepare("SELECT id FROM grades LIMIT 1").get() as { id: string };
      raw
        .prepare("INSERT INTO users (id, identifier, auth_mode) VALUES (?, ?, ?)")
        .run("user-test", "test@example.com", "local-profile");
      raw
        .prepare("INSERT INTO profiles (id, user_id, display_name) VALUES (?, ?, ?)")
        .run("profile-test", "user-test", "Test author");
      const record = await repository.createImport({
        documentId: "document-test",
        jobId: "job-test",
        title: "Test source",
        originalFilename: "source.pdf",
        storageKey: "content-sources/document-test/source.pdf",
        mimeType: "application/pdf",
        byteSize: 500,
        sha256: "a".repeat(64),
        subjectId: subject.id,
        targetGradeId: grade.id,
        difficulty: "balanced",
        lessonSize: "small",
        rightsStatus: "permitted",
        createdByProfileId: "profile-test",
      });
      expect(record.status).toBe("queued");
      await expect(repository.beginExtraction(record.id)).resolves.toBe(true);
      await repository.saveExtraction({
        jobId: record.id,
        documentId: record.documentId,
        pages: [{ pageNumber: 1, text: "Balanced forces have zero net force." }],
        chunks: [
          {
            id: "chunk-test",
            pageStart: 1,
            pageEnd: 1,
            text: "[Page 1]\nBalanced forces have zero net force.",
            contentHash: "b".repeat(64),
            sortOrder: 0,
          },
        ],
      });
      const chunk = await repository.claimNextChunk(record.id);
      expect(chunk).toMatchObject({ id: "chunk-test", pageStart: 1, pageEnd: 1 });
      await repository.completeChunk({
        chunk: chunk!,
        generationId: null,
        lessons: [
          {
            pageStart: 1,
            pageEnd: 1,
            draft: {
              lessonTitle: "Balanced forces",
              lessonSummary: "Understand net force.",
              moduleTitle: "Forces",
              estimatedDurationMinutes: 8,
              sections: [
                {
                  kind: "introduction",
                  title: "Start here",
                  description: "",
                  blocks: [{ type: "paragraph", title: null, text: "Equal forces cancel." }],
                },
              ],
            },
          },
        ],
      });
      await expect(repository.finishIfComplete(record.id)).resolves.toBe(true);
      await expect(repository.getImport(record.id)).resolves.toMatchObject({
        status: "ready",
        totalUnits: 1,
        processedUnits: 1,
        draftCount: 1,
      });
      await expect(repository.getNextUnsavedItem(record.id)).resolves.toMatchObject({
        title: "Balanced forces",
        pageStart: 1,
      });
    } finally {
      raw.close();
      await rm(directory, { recursive: true, force: true });
    }
  });
});
