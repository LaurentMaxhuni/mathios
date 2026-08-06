export const NOTE_RESOURCE_TYPES = [
  "subject",
  "grade",
  "course",
  "module",
  "lesson",
  "concept",
  "question",
  "simulation",
  "assessment",
  "laboratory",
] as const;
export type NoteResourceType = (typeof NOTE_RESOURCE_TYPES)[number];

export const BOOKMARK_RESOURCE_TYPES = [
  "lesson",
  "concept",
  "exercise",
  "simulation",
  "roadmap",
  "note",
] as const;
export type BookmarkResourceType = (typeof BOOKMARK_RESOURCE_TYPES)[number];

export const HIGHLIGHT_SOURCE_TYPES = [
  "lesson-text",
  "definition",
  "formula",
  "example",
  "question-solution",
] as const;
export type HighlightSourceType = (typeof HIGHLIGHT_SOURCE_TYPES)[number];

export const HIGHLIGHT_COLORS = ["yellow", "blue", "green", "pink"] as const;
export type HighlightColor = (typeof HIGHLIGHT_COLORS)[number];

export interface FolderRecord {
  id: string;
  profileId: string;
  name: string;
  parentFolderId: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface TagRecord {
  id: string;
  profileId: string;
  name: string;
  slug: string;
  color: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NoteRecord {
  id: string;
  profileId: string;
  title: string;
  bodyMarkdown: string;
  folderId: string | null;
  isPinned: boolean;
  isArchived: boolean;
  tags: readonly TagRecord[];
  createdAt: string;
  updatedAt: string;
}

export interface NoteLinkRecord {
  id: string;
  profileId: string;
  noteId: string;
  resourceType: NoteResourceType;
  resourceId: string;
  label: string;
  sourceLocation: string;
  createdAt: string;
}

export interface NoteBacklinkRecord {
  id: string;
  profileId: string;
  sourceNoteId: string;
  sourceNoteTitle: string;
  targetNoteId: string;
  targetNoteTitle: string;
  anchor: string;
  createdAt: string;
}

export interface HighlightRecord {
  id: string;
  profileId: string;
  sourceType: HighlightSourceType;
  sourceId: string;
  sourceLocation: string;
  selectedText: string;
  noteId: string | null;
  color: HighlightColor;
  createdAt: string;
  updatedAt: string;
}

export interface BookmarkRecord {
  id: string;
  profileId: string;
  resourceType: BookmarkResourceType;
  resourceId: string;
  title: string;
  sourceUrl: string;
  createdAt: string;
  updatedAt: string;
}

export interface NoteDetail extends NoteRecord {
  folder: FolderRecord | null;
  links: readonly NoteLinkRecord[];
  backlinks: readonly NoteBacklinkRecord[];
  highlights: readonly HighlightRecord[];
}

export interface PersonalKnowledgeMapNode {
  id: string;
  label: string;
  kind: "note" | "concept" | "lesson" | "bookmark" | "resource";
  resourceType: string | null;
  resourceId: string | null;
  href: string | null;
  bookmarked: boolean;
  x: number;
  y: number;
}

export interface PersonalKnowledgeMapEdge {
  id: string;
  sourceId: string;
  targetId: string;
  kind: "resource-link" | "backlink" | "bookmark";
  label: string;
}

export interface PersonalKnowledgeMap {
  nodes: readonly PersonalKnowledgeMapNode[];
  edges: readonly PersonalKnowledgeMapEdge[];
}

export interface NotesDashboard {
  notes: readonly NoteRecord[];
  folders: readonly FolderRecord[];
  tags: readonly TagRecord[];
  bookmarks: readonly BookmarkRecord[];
  highlights: readonly HighlightRecord[];
}
