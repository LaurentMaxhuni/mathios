import { ValidationError } from "@/domain/errors/application-error";
import {
  BOOKMARK_RESOURCE_TYPES,
  HIGHLIGHT_COLORS,
  HIGHLIGHT_SOURCE_TYPES,
  NOTE_RESOURCE_TYPES,
  type BookmarkResourceType,
  type HighlightColor,
  type HighlightSourceType,
  type NoteResourceType,
} from "@/domain/notes/types";

export function slugifyTagName(name: string): string {
  return name
    .trim()
    .toLocaleLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function normalizeTagNames(names: readonly string[]): string[] {
  const normalized = new Map<string, string>();
  for (const rawName of names) {
    const name = rawName.trim().replace(/\s+/g, " ");
    const slug = slugifyTagName(name);
    if (!name || !slug) continue;
    if (name.length > 48) throw new ValidationError("Tag names must be 48 characters or fewer.");
    normalized.set(slug, name);
  }
  if (normalized.size > 20) throw new ValidationError("A note can have at most 20 tags.");
  return [...normalized.values()];
}

export function assertNoteResourceType(value: string): asserts value is NoteResourceType {
  if (!NOTE_RESOURCE_TYPES.includes(value as NoteResourceType)) {
    throw new ValidationError("That note resource type is not supported.");
  }
}

export function assertBookmarkResourceType(value: string): asserts value is BookmarkResourceType {
  if (!BOOKMARK_RESOURCE_TYPES.includes(value as BookmarkResourceType)) {
    throw new ValidationError("That bookmark resource type is not supported.");
  }
}

export function assertHighlightSourceType(value: string): asserts value is HighlightSourceType {
  if (!HIGHLIGHT_SOURCE_TYPES.includes(value as HighlightSourceType)) {
    throw new ValidationError("That highlight source type is not supported.");
  }
}

export function assertHighlightColor(value: string): asserts value is HighlightColor {
  if (!HIGHLIGHT_COLORS.includes(value as HighlightColor)) {
    throw new ValidationError("That highlight color is not supported.");
  }
}

export function validateInternalLink(sourceNoteId: string, targetNoteId: string): void {
  if (!sourceNoteId || !targetNoteId) throw new ValidationError("Both notes are required.");
  if (sourceNoteId === targetNoteId) {
    throw new ValidationError("A note cannot link to itself.");
  }
}

export function sanitizeResourceUrl(value: string): string {
  const url = value.trim();
  if (!url) return "";
  if (url.startsWith("/")) return url;
  if (/^https?:\/\//i.test(url)) return url;
  throw new ValidationError("Resource links must use http(s) or an internal path.");
}

export function matchesNoteSearch(
  note: { title: string; bodyMarkdown: string; tags: readonly { name: string }[] },
  query: string,
): boolean {
  const normalized = query.trim().toLocaleLowerCase();
  if (!normalized) return true;
  return [note.title, note.bodyMarkdown, ...note.tags.map((tag) => tag.name)].some((value) =>
    value.toLocaleLowerCase().includes(normalized),
  );
}

export function resourceHref(resourceType: string, resourceId: string): string | null {
  const routes: Record<string, string> = {
    subject: `/subjects/${encodeURIComponent(resourceId)}`,
    grade: `/grades/${encodeURIComponent(resourceId)}`,
    course: `/courses/${encodeURIComponent(resourceId)}`,
    module: `/courses/modules/${encodeURIComponent(resourceId)}`,
    lesson: `/lessons/${encodeURIComponent(resourceId)}`,
    concept: `/concepts/${encodeURIComponent(resourceId)}`,
    question: `/exercises?questionId=${encodeURIComponent(resourceId)}`,
    simulation: `/simulations/${encodeURIComponent(resourceId)}`,
    assessment: `/assessments/${encodeURIComponent(resourceId)}`,
    laboratory: `/laboratories/${encodeURIComponent(resourceId)}`,
    exercise: `/exercises?exerciseId=${encodeURIComponent(resourceId)}`,
    roadmap: `/roadmaps/${encodeURIComponent(resourceId)}`,
    note: `/notes?noteId=${encodeURIComponent(resourceId)}`,
  };
  return routes[resourceType] ?? null;
}

export function buildPersonalKnowledgeMap(input: {
  notes: readonly { id: string; title: string }[];
  links: readonly {
    id: string;
    noteId: string;
    resourceType: string;
    resourceId: string;
    label: string;
  }[];
  backlinks: readonly {
    id: string;
    sourceNoteId: string;
    targetNoteId: string;
    anchor: string;
  }[];
  bookmarks: readonly {
    id: string;
    resourceType: string;
    resourceId: string;
    title: string;
  }[];
}) {
  const nodes = new Map<
    string,
    {
      id: string;
      label: string;
      kind: "note" | "concept" | "lesson" | "bookmark" | "resource";
      resourceType: string | null;
      resourceId: string | null;
      href: string | null;
      bookmarked: boolean;
    }
  >();
  const edges: Array<{
    id: string;
    sourceId: string;
    targetId: string;
    kind: "resource-link" | "backlink" | "bookmark";
    label: string;
  }> = [];

  for (const note of input.notes) {
    nodes.set(`note:${note.id}`, {
      id: `note:${note.id}`,
      label: note.title || "Untitled note",
      kind: "note",
      resourceType: "note",
      resourceId: note.id,
      href: resourceHref("note", note.id),
      bookmarked: input.bookmarks.some(
        (bookmark) => bookmark.resourceType === "note" && bookmark.resourceId === note.id,
      ),
    });
  }

  function resourceNode(resourceType: string, resourceId: string, label: string) {
    const id = `resource:${resourceType}:${resourceId}`;
    if (!nodes.has(id)) {
      nodes.set(id, {
        id,
        label: label || resourceId,
        kind:
          resourceType === "concept"
            ? "concept"
            : resourceType === "lesson"
              ? "lesson"
              : "resource",
        resourceType,
        resourceId,
        href: resourceHref(resourceType, resourceId),
        bookmarked: false,
      });
    }
    return id;
  }

  for (const link of input.links) {
    const targetId = resourceNode(link.resourceType, link.resourceId, link.label);
    edges.push({
      id: `link:${link.id}`,
      sourceId: `note:${link.noteId}`,
      targetId,
      kind: "resource-link",
      label: link.label || link.resourceType,
    });
  }
  for (const backlink of input.backlinks) {
    edges.push({
      id: `backlink:${backlink.id}`,
      sourceId: `note:${backlink.sourceNoteId}`,
      targetId: `note:${backlink.targetNoteId}`,
      kind: "backlink",
      label: backlink.anchor || "linked note",
    });
  }
  for (const bookmark of input.bookmarks) {
    if (bookmark.resourceType === "note") continue;
    const targetId = resourceNode(bookmark.resourceType, bookmark.resourceId, bookmark.title);
    const node = nodes.get(targetId);
    if (node) node.bookmarked = true;
    const bookmarkNodeId = `bookmark:${bookmark.id}`;
    nodes.set(bookmarkNodeId, {
      id: bookmarkNodeId,
      label: bookmark.title || bookmark.resourceId,
      kind: "bookmark",
      resourceType: bookmark.resourceType,
      resourceId: bookmark.resourceId,
      href: resourceHref(bookmark.resourceType, bookmark.resourceId),
      bookmarked: true,
    });
    edges.push({
      id: `bookmark:${bookmark.id}`,
      sourceId: bookmarkNodeId,
      targetId,
      kind: "bookmark",
      label: "bookmarked",
    });
  }

  const orderedNodes = [...nodes.values()].sort((left, right) =>
    left.label.localeCompare(right.label, undefined, { sensitivity: "base" }),
  );
  const columns = Math.max(1, Math.ceil(Math.sqrt(orderedNodes.length)));
  return {
    nodes: orderedNodes.map((node, index) => ({
      ...node,
      x: 150 + (index % columns) * 250,
      y: 100 + Math.floor(index / columns) * 150,
    })),
    edges: edges.filter((edge) => nodes.has(edge.sourceId) && nodes.has(edge.targetId)),
  };
}
