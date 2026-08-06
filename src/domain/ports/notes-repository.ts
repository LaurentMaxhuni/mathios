import type {
  BookmarkRecord,
  BookmarkResourceType,
  FolderRecord,
  HighlightRecord,
  HighlightSourceType,
  NoteBacklinkRecord,
  NoteDetail,
  NoteLinkRecord,
  NoteRecord,
  NoteResourceType,
  PersonalKnowledgeMap,
  TagRecord,
} from "@/domain/notes/types";

export interface NoteSearchOptions {
  query?: string;
  folderId?: string;
  tagId?: string;
  includeArchived?: boolean;
}

export interface NotesRepository {
  listNotes(profileId: string, options?: NoteSearchOptions): Promise<readonly NoteRecord[]>;
  getNote(profileId: string, noteId: string): Promise<NoteDetail | null>;
  createNote(input: {
    id: string;
    profileId: string;
    title: string;
    bodyMarkdown: string;
    folderId: string | null;
    isPinned: boolean;
    isArchived: boolean;
    tagNames: readonly string[];
  }): Promise<NoteDetail>;
  updateNote(
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
  ): Promise<NoteDetail>;
  deleteNote(profileId: string, noteId: string): Promise<void>;

  listFolders(profileId: string): Promise<readonly FolderRecord[]>;
  getFolder(profileId: string, folderId: string): Promise<FolderRecord | null>;
  createFolder(input: {
    id: string;
    profileId: string;
    name: string;
    parentFolderId: string | null;
    sortOrder: number;
  }): Promise<FolderRecord>;
  updateFolder(
    profileId: string,
    folderId: string,
    input: { name: string; parentFolderId: string | null; sortOrder: number },
  ): Promise<FolderRecord>;
  deleteFolder(profileId: string, folderId: string): Promise<void>;

  listTags(profileId: string): Promise<readonly TagRecord[]>;
  createNoteLink(input: {
    id: string;
    profileId: string;
    noteId: string;
    resourceType: NoteResourceType;
    resourceId: string;
    label: string;
    sourceLocation: string;
  }): Promise<NoteLinkRecord>;
  deleteNoteLink(profileId: string, noteId: string, linkId: string): Promise<void>;
  createBacklink(input: {
    id: string;
    profileId: string;
    sourceNoteId: string;
    targetNoteId: string;
    anchor: string;
  }): Promise<NoteBacklinkRecord>;
  deleteBacklink(profileId: string, sourceNoteId: string, backlinkId: string): Promise<void>;

  listHighlights(
    profileId: string,
    options?: { sourceType?: HighlightSourceType; sourceId?: string; noteId?: string },
  ): Promise<readonly HighlightRecord[]>;
  createHighlight(input: {
    id: string;
    profileId: string;
    sourceType: HighlightSourceType;
    sourceId: string;
    sourceLocation: string;
    selectedText: string;
    noteId: string | null;
    color: string;
  }): Promise<HighlightRecord>;
  deleteHighlight(profileId: string, highlightId: string): Promise<void>;

  listBookmarks(
    profileId: string,
    options?: { resourceType?: BookmarkResourceType; resourceId?: string },
  ): Promise<readonly BookmarkRecord[]>;
  createBookmark(input: {
    id: string;
    profileId: string;
    resourceType: BookmarkResourceType;
    resourceId: string;
    title: string;
    sourceUrl: string;
  }): Promise<BookmarkRecord>;
  deleteBookmark(
    profileId: string,
    resourceType: BookmarkResourceType,
    resourceId: string,
  ): Promise<void>;
  resourceExists(resourceType: string, resourceId: string): Promise<boolean>;
  resourceTitle(resourceType: string, resourceId: string): Promise<string | null>;
  getKnowledgeMap(profileId: string): Promise<PersonalKnowledgeMap>;
}
