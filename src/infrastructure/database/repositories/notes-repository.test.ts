import Database from "better-sqlite3";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { DatabaseHandle } from "@/infrastructure/database/client";
import { runSeed } from "@/infrastructure/database/seed";
import { getNotesRepository } from "@/infrastructure/database/repositories/notes-repository";
import {
  createBookmark,
  createFolder,
  createHighlight,
  createInternalLink,
  createNote,
  createResourceLink,
  updateNote,
} from "@/features/notes/service";

describe("notes repository and personal knowledge flow", () => {
  it("keeps notes profile-scoped and persists links, highlights, bookmarks, and map edges", async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), "mathios-notes-"));
    const databaseUrl = `file:${path.join(directory, "notes.db")}`;
    let raw: Database.Database | undefined;
    try {
      await runSeed({ provider: "sqlite", databaseUrl });
      raw = new Database(path.join(directory, "notes.db"));
      raw.pragma("foreign_keys = ON");
      raw
        .prepare("INSERT INTO users (id, identifier) VALUES (?, ?)")
        .run("user-notes", "notes-user");
      raw
        .prepare("INSERT INTO profiles (id, user_id, display_name) VALUES (?, ?, ?)")
        .run("profile-notes", "user-notes", "Notes learner");
      raw
        .prepare("INSERT INTO users (id, identifier) VALUES (?, ?)")
        .run("user-other", "other-user");
      raw
        .prepare("INSERT INTO profiles (id, user_id, display_name) VALUES (?, ?, ?)")
        .run("profile-other", "user-other", "Other learner");
      raw.close();
      raw = undefined;

      raw = new Database(path.join(directory, "notes.db"));
      raw.pragma("foreign_keys = ON");
      const handle = {
        provider: "sqlite",
        raw,
        db: undefined as never,
      } as unknown as DatabaseHandle;
      const repository = getNotesRepository(handle);
      const folder = await createFolder(
        "profile-notes",
        { name: "Mechanics", parentFolderId: null, sortOrder: 0 },
        repository,
      );
      const first = await createNote(
        "profile-notes",
        {
          title: "Constant acceleration",
          bodyMarkdown: "The model is **predictive** and $v=u+at$.",
          folderId: folder.id,
          isPinned: true,
          isArchived: false,
          tagNames: ["Physics", "physics"],
        },
        repository,
      );
      const second = await createNote(
        "profile-notes",
        {
          title: "Review later",
          bodyMarkdown: "Connect this to the first note.",
          folderId: null,
          isPinned: false,
          isArchived: false,
          tagNames: ["review"],
        },
        repository,
      );
      await createResourceLink(
        "profile-notes",
        first.id,
        {
          resourceType: "lesson",
          resourceId: "lesson-constant-acceleration",
          label: "Motion lesson",
          sourceLocation: "section-introduction/block-model",
        },
        repository,
      );
      await createInternalLink("profile-notes", second.id, first.id, "review", repository);
      const bookmark = await createBookmark(
        "profile-notes",
        {
          resourceType: "lesson",
          resourceId: "lesson-constant-acceleration",
          title: "Motion lesson",
          sourceUrl: "/lessons/lesson-constant-acceleration",
        },
        repository,
      );
      await createHighlight(
        "profile-notes",
        {
          sourceType: "formula",
          sourceId: "lesson-constant-acceleration",
          sourceLocation: "section-introduction/block-model",
          selectedText: "v=u+at",
          noteId: first.id,
          color: "yellow",
        },
        repository,
      );
      const updated = await updateNote(
        "profile-notes",
        first.id,
        { bodyMarkdown: "Updated **motion** note.", tagNames: ["Physics", "Exam prep"] },
        repository,
      );

      expect(updated.tags.map((tag) => tag.name)).toEqual(["Exam prep", "Physics"]);
      expect(
        (await repository.listNotes("profile-notes", { query: "motion" })).map((note) => note.id),
      ).toEqual([first.id]);
      const detail = await repository.getNote("profile-notes", first.id);
      expect(detail?.links).toHaveLength(1);
      expect(detail?.highlights).toHaveLength(1);
      expect(await repository.listBookmarks("profile-notes")).toEqual([
        expect.objectContaining({ id: bookmark.id, resourceId: "lesson-constant-acceleration" }),
      ]);
      expect((await repository.getNote("profile-notes", first.id))?.backlinks).toHaveLength(1);
      const map = await repository.getKnowledgeMap("profile-notes");
      expect(map.edges.map((edge) => edge.kind)).toEqual(
        expect.arrayContaining(["resource-link", "backlink", "bookmark"]),
      );
      expect(await repository.listNotes("profile-other")).toHaveLength(0);
    } finally {
      raw?.close();
      await rm(directory, { recursive: true, force: true });
    }
  });
});
