import { randomUUID } from "node:crypto";
import { NotFoundError, ValidationError } from "@/domain/errors/application-error";
import {
  assertBookmarkResourceType,
  assertHighlightColor,
  assertHighlightSourceType,
  assertNoteResourceType,
  normalizeTagNames,
  sanitizeResourceUrl,
  validateInternalLink,
} from "@/domain/notes/rules";
import type {
  BookmarkRecord,
  FolderRecord,
  HighlightRecord,
  NoteBacklinkRecord,
  NoteDetail,
  NoteLinkRecord,
  NoteRecord,
  NotesDashboard,
  PersonalKnowledgeMap,
} from "@/domain/notes/types";
import type { NoteSearchOptions, NotesRepository } from "@/domain/ports/notes-repository";

function idFor(prefix: string): string {
  return `${prefix}-${randomUUID()}`;
}

function cleanTitle(value: string): string {
  const title = value.trim();
  if (!title) throw new ValidationError("A note needs a title.");
  return title;
}

async function ensureFolder(
  profileId: string,
  folderId: string | null,
  repository: NotesRepository,
): Promise<void> {
  if (folderId && !(await repository.getFolder(profileId, folderId))) {
    throw new NotFoundError("Folder", folderId);
  }
}

async function ensureFolderParent(
  profileId: string,
  folderId: string | null,
  parentFolderId: string | null,
  repository: NotesRepository,
): Promise<void> {
  if (!parentFolderId) return;
  const parent = await repository.getFolder(profileId, parentFolderId);
  if (!parent) throw new NotFoundError("Parent folder", parentFolderId);
  if (!folderId) return;
  const seen = new Set<string>([folderId]);
  let current: FolderRecord | null = parent;
  while (current) {
    if (seen.has(current.id)) throw new ValidationError("Folders cannot contain themselves.");
    seen.add(current.id);
    current = current.parentFolderId
      ? await repository.getFolder(profileId, current.parentFolderId)
      : null;
  }
}

export async function listNotes(
  profileId: string,
  options: NoteSearchOptions,
  repository: NotesRepository,
): Promise<readonly NoteRecord[]> {
  return repository.listNotes(profileId, options);
}

export async function getNote(
  profileId: string,
  noteId: string,
  repository: NotesRepository,
): Promise<NoteDetail> {
  const note = await repository.getNote(profileId, noteId);
  if (!note) throw new NotFoundError("Note", noteId);
  return note;
}

export async function createNote(
  profileId: string,
  input: {
    title: string;
    bodyMarkdown: string;
    folderId: string | null;
    isPinned: boolean;
    isArchived: boolean;
    tagNames: readonly string[];
  },
  repository: NotesRepository,
): Promise<NoteDetail> {
  await ensureFolder(profileId, input.folderId, repository);
  return repository.createNote({
    ...input,
    id: idFor("note"),
    profileId,
    title: cleanTitle(input.title),
    tagNames: normalizeTagNames(input.tagNames),
  });
}

export async function updateNote(
  profileId: string,
  noteId: string,
  input: {
    title?: string;
    bodyMarkdown?: string;
    folderId?: string | null;
    isPinned?: boolean;
    isArchived?: boolean;
    tagNames?: readonly string[];
  },
  repository: NotesRepository,
): Promise<NoteDetail> {
  const current = await getNote(profileId, noteId, repository);
  const folderId = input.folderId === undefined ? current.folderId : input.folderId;
  await ensureFolder(profileId, folderId, repository);
  return repository.updateNote(profileId, noteId, {
    title: cleanTitle(input.title ?? current.title),
    bodyMarkdown: input.bodyMarkdown ?? current.bodyMarkdown,
    folderId,
    isPinned: input.isPinned ?? current.isPinned,
    isArchived: input.isArchived ?? current.isArchived,
    tagNames: normalizeTagNames(input.tagNames ?? current.tags.map((tag) => tag.name)),
  });
}

export async function deleteNote(
  profileId: string,
  noteId: string,
  repository: NotesRepository,
): Promise<void> {
  await getNote(profileId, noteId, repository);
  await repository.deleteNote(profileId, noteId);
}

export async function createFolder(
  profileId: string,
  input: { name: string; parentFolderId: string | null; sortOrder: number },
  repository: NotesRepository,
): Promise<FolderRecord> {
  const name = input.name.trim();
  if (!name) throw new ValidationError("A folder needs a name.");
  await ensureFolderParent(profileId, null, input.parentFolderId, repository);
  return repository.createFolder({ ...input, id: idFor("folder"), profileId, name });
}

export async function updateFolder(
  profileId: string,
  folderId: string,
  input: { name?: string; parentFolderId?: string | null; sortOrder?: number },
  repository: NotesRepository,
): Promise<FolderRecord> {
  const current = await repository.getFolder(profileId, folderId);
  if (!current) throw new NotFoundError("Folder", folderId);
  const parentFolderId =
    input.parentFolderId === undefined ? current.parentFolderId : input.parentFolderId;
  await ensureFolderParent(profileId, folderId, parentFolderId, repository);
  return repository.updateFolder(profileId, folderId, {
    name: cleanTitle(input.name ?? current.name),
    parentFolderId,
    sortOrder: input.sortOrder ?? current.sortOrder,
  });
}

export async function deleteFolder(
  profileId: string,
  folderId: string,
  repository: NotesRepository,
): Promise<void> {
  if (!(await repository.getFolder(profileId, folderId)))
    throw new NotFoundError("Folder", folderId);
  await repository.deleteFolder(profileId, folderId);
}

export async function createResourceLink(
  profileId: string,
  noteId: string,
  input: {
    resourceType: string;
    resourceId: string;
    label: string;
    sourceLocation: string;
  },
  repository: NotesRepository,
): Promise<NoteLinkRecord> {
  await getNote(profileId, noteId, repository);
  assertNoteResourceType(input.resourceType);
  if (!(await repository.resourceExists(input.resourceType, input.resourceId))) {
    throw new NotFoundError("Learning resource", input.resourceId);
  }
  const title =
    input.label.trim() ||
    (await repository.resourceTitle(input.resourceType, input.resourceId)) ||
    input.resourceId;
  return repository.createNoteLink({
    id: idFor("note-link"),
    profileId,
    noteId,
    resourceType: input.resourceType,
    resourceId: input.resourceId,
    label: title,
    sourceLocation: input.sourceLocation.trim(),
  });
}

export async function createInternalLink(
  profileId: string,
  noteId: string,
  targetNoteId: string,
  anchor: string,
  repository: NotesRepository,
): Promise<NoteBacklinkRecord> {
  await getNote(profileId, noteId, repository);
  await getNote(profileId, targetNoteId, repository);
  validateInternalLink(noteId, targetNoteId);
  return repository.createBacklink({
    id: idFor("note-backlink"),
    profileId,
    sourceNoteId: noteId,
    targetNoteId,
    anchor: anchor.trim(),
  });
}

export async function createHighlight(
  profileId: string,
  input: {
    sourceType: string;
    sourceId: string;
    sourceLocation: string;
    selectedText: string;
    noteId: string | null;
    color: string;
  },
  repository: NotesRepository,
): Promise<HighlightRecord> {
  assertHighlightSourceType(input.sourceType);
  assertHighlightColor(input.color);
  if (input.noteId) await getNote(profileId, input.noteId, repository);
  return repository.createHighlight({
    id: idFor("highlight"),
    profileId,
    sourceType: input.sourceType,
    sourceId: input.sourceId,
    sourceLocation: input.sourceLocation.trim(),
    selectedText: input.selectedText.trim(),
    noteId: input.noteId,
    color: input.color,
  });
}

export async function createBookmark(
  profileId: string,
  input: {
    resourceType: string;
    resourceId: string;
    title: string;
    sourceUrl: string;
  },
  repository: NotesRepository,
): Promise<BookmarkRecord> {
  assertBookmarkResourceType(input.resourceType);
  if (input.resourceType === "note") await getNote(profileId, input.resourceId, repository);
  else if (!(await repository.resourceExists(input.resourceType, input.resourceId))) {
    throw new NotFoundError("Bookmark resource", input.resourceId);
  }
  const title =
    input.title.trim() ||
    (await repository.resourceTitle(input.resourceType, input.resourceId)) ||
    input.resourceId;
  return repository.createBookmark({
    id: idFor("bookmark"),
    profileId,
    resourceType: input.resourceType,
    resourceId: input.resourceId,
    title,
    sourceUrl: sanitizeResourceUrl(input.sourceUrl),
  });
}

export async function getNotesDashboard(
  profileId: string,
  repository: NotesRepository,
  options: NoteSearchOptions = {},
): Promise<NotesDashboard> {
  const [notes, folders, tags, bookmarks, highlights] = await Promise.all([
    repository.listNotes(profileId, options),
    repository.listFolders(profileId),
    repository.listTags(profileId),
    repository.listBookmarks(profileId),
    repository.listHighlights(profileId),
  ]);
  return { notes, folders, tags, bookmarks, highlights };
}

export function getPersonalKnowledgeMap(
  profileId: string,
  repository: NotesRepository,
): Promise<PersonalKnowledgeMap> {
  return repository.getKnowledgeMap(profileId);
}

export { idFor as newNoteId };
