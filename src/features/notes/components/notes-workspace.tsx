"use client";

import * as React from "react";
import {
  Archive,
  Bookmark,
  Check,
  FilePlus2,
  FolderPlus,
  Highlighter,
  Link2,
  Loader2,
  Map,
  Pin,
  Save,
  Search,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { MarkdownPreview } from "@/features/notes/components/markdown-preview";
import { KnowledgeMapView } from "@/features/notes/components/knowledge-map";
import type {
  BookmarkRecord,
  HighlightRecord,
  NoteDetail,
  NoteRecord,
  NotesDashboard,
  PersonalKnowledgeMap,
} from "@/domain/notes/types";

type Draft = {
  title: string;
  bodyMarkdown: string;
  folderId: string | null;
  isPinned: boolean;
  isArchived: boolean;
  tagNames: string;
};

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  const body = (await response.json().catch(() => ({}))) as { message?: string } & T;
  if (!response.ok) throw new Error(body.message ?? "The knowledge base request failed.");
  return body;
}

function draftFromNote(note: NoteDetail | null): Draft {
  return note
    ? {
        title: note.title,
        bodyMarkdown: note.bodyMarkdown,
        folderId: note.folderId,
        isPinned: note.isPinned,
        isArchived: note.isArchived,
        tagNames: note.tags.map((tag) => tag.name).join(", "),
      }
    : {
        title: "Untitled note",
        bodyMarkdown: "",
        folderId: null,
        isPinned: false,
        isArchived: false,
        tagNames: "",
      };
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(
    new Date(value),
  );
}

export function NotesWorkspace({
  initialDashboard,
  initialMap,
}: {
  initialDashboard: NotesDashboard;
  initialMap: PersonalKnowledgeMap;
}) {
  const [notes, setNotes] = React.useState<readonly NoteRecord[]>(initialDashboard.notes);
  const [folders, setFolders] = React.useState(initialDashboard.folders);
  const [tags, setTags] = React.useState(initialDashboard.tags);
  const [bookmarks, setBookmarks] = React.useState<readonly BookmarkRecord[]>(
    initialDashboard.bookmarks,
  );
  const [highlights, setHighlights] = React.useState<readonly HighlightRecord[]>(
    initialDashboard.highlights,
  );
  const [map, setMap] = React.useState(initialMap);
  const [selectedId, setSelectedId] = React.useState<string | null>(
    initialDashboard.notes[0]?.id ?? null,
  );
  const [selectedNote, setSelectedNote] = React.useState<NoteDetail | null>(null);
  const [draft, setDraft] = React.useState<Draft>(draftFromNote(null));
  const [query, setQuery] = React.useState("");
  const [folderFilter, setFolderFilter] = React.useState("all");
  const [tagFilter, setTagFilter] = React.useState("all");
  const [preview, setPreview] = React.useState(false);
  const [showMap, setShowMap] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [status, setStatus] = React.useState("");
  const [error, setError] = React.useState("");
  const [folderName, setFolderName] = React.useState("");
  const [resourceForm, setResourceForm] = React.useState({
    resourceType: "lesson",
    resourceId: "",
    label: "",
    sourceLocation: "",
  });
  const [noteLinkTarget, setNoteLinkTarget] = React.useState("");
  const [bookmarkForm, setBookmarkForm] = React.useState({
    resourceType: "lesson",
    resourceId: "",
    title: "",
    sourceUrl: "",
  });
  const [highlightForm, setHighlightForm] = React.useState({
    sourceType: "lesson-text",
    sourceId: "",
    sourceLocation: "",
    selectedText: "",
    color: "yellow",
  });
  const autosaveTimer = React.useRef<number | null>(null);

  const refresh = React.useCallback(
    async (filters: { query?: string; folderId?: string; tagId?: string } = {}) => {
      const params = new URLSearchParams();
      if (filters.query) params.set("query", filters.query);
      if (filters.folderId && filters.folderId !== "all") params.set("folderId", filters.folderId);
      if (filters.tagId && filters.tagId !== "all") params.set("tagId", filters.tagId);
      const dashboard = await requestJson<NotesDashboard>(`/api/notes?${params.toString()}`);
      setNotes(dashboard.notes);
      setFolders(dashboard.folders);
      setTags(dashboard.tags);
      setBookmarks(dashboard.bookmarks);
      setHighlights(dashboard.highlights);
      setMap(await requestJson<PersonalKnowledgeMap>("/api/knowledge-map"));
    },
    [],
  );

  const loadNote = React.useCallback(async (noteId: string | null) => {
    if (autosaveTimer.current) window.clearTimeout(autosaveTimer.current);
    setSelectedId(noteId);
    setPreview(false);
    setError("");
    if (!noteId) {
      setSelectedNote(null);
      setDraft(draftFromNote(null));
      return;
    }
    try {
      const note = await requestJson<NoteDetail>(`/api/notes/${noteId}`);
      setSelectedNote(note);
      setDraft(draftFromNote(note));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The note could not be loaded.");
    }
  }, []);

  React.useEffect(() => {
    if (selectedId) void loadNote(selectedId);
  }, [loadNote, selectedId]);

  function updateDraft(patch: Partial<Draft>, autosave = true) {
    const next = { ...draft, ...patch };
    setDraft(next);
    setStatus("");
    if (autosave && selectedId) {
      if (autosaveTimer.current) window.clearTimeout(autosaveTimer.current);
      autosaveTimer.current = window.setTimeout(
        () => void persistNote(next, selectedId, true),
        850,
      );
    }
  }

  async function persistNote(value: Draft, noteId: string | null, quiet = false) {
    setBusy(true);
    if (!quiet) setStatus("");
    setError("");
    try {
      const payload = {
        title: value.title,
        bodyMarkdown: value.bodyMarkdown,
        folderId: value.folderId,
        isPinned: value.isPinned,
        isArchived: value.isArchived,
        tagNames: value.tagNames
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
      };
      const note = noteId
        ? await requestJson<NoteDetail>(`/api/notes/${noteId}`, {
            method: "PATCH",
            body: JSON.stringify(payload),
          })
        : await requestJson<NoteDetail>("/api/notes", {
            method: "POST",
            body: JSON.stringify(payload),
          });
      setSelectedId(note.id);
      setSelectedNote(note);
      setDraft(draftFromNote(note));
      setStatus(quiet ? "Autosaved" : "Note saved.");
      await refresh({ query, folderId: folderFilter, tagId: tagFilter });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The note could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  async function createNewNote() {
    await loadNote(null);
    setStatus("Draft ready. Save it when you have a title and a thought.");
  }

  async function createFolder(event: React.FormEvent) {
    event.preventDefault();
    if (!folderName.trim()) return;
    try {
      const folder = await requestJson<{ id: string }>("/api/notes/folders", {
        method: "POST",
        body: JSON.stringify({ name: folderName, parentFolderId: null, sortOrder: folders.length }),
      });
      setFolderName("");
      setStatus("Folder created.");
      await refresh({ query, folderId: folderFilter, tagId: tagFilter });
      if (folder.id) updateDraft({ folderId: folder.id }, false);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The folder could not be created.");
    }
  }

  async function addResourceLink(event: React.FormEvent) {
    event.preventDefault();
    if (!selectedId) return setError("Save the note before adding a link.");
    try {
      await requestJson(`/api/notes/${selectedId}/links`, {
        method: "POST",
        body: JSON.stringify({ kind: "resource", ...resourceForm }),
      });
      setResourceForm({ ...resourceForm, resourceId: "", label: "", sourceLocation: "" });
      setStatus("Learning resource linked.");
      await loadNote(selectedId);
      await refresh({ query, folderId: folderFilter, tagId: tagFilter });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The resource could not be linked.");
    }
  }

  async function addNoteLink(event: React.FormEvent) {
    event.preventDefault();
    if (!selectedId || !noteLinkTarget) return;
    try {
      await requestJson(`/api/notes/${selectedId}/links`, {
        method: "POST",
        body: JSON.stringify({ kind: "note", targetNoteId: noteLinkTarget, anchor: "" }),
      });
      setNoteLinkTarget("");
      setStatus("Internal note link added.");
      await loadNote(selectedId);
      await refresh({ query, folderId: folderFilter, tagId: tagFilter });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The note link could not be added.");
    }
  }

  async function addBookmark(event: React.FormEvent) {
    event.preventDefault();
    try {
      const bookmark = await requestJson<BookmarkRecord>("/api/bookmarks", {
        method: "POST",
        body: JSON.stringify(bookmarkForm),
      });
      setBookmarks((current) => [
        bookmark,
        ...current.filter(
          (item) =>
            !(
              item.resourceType === bookmark.resourceType && item.resourceId === bookmark.resourceId
            ),
        ),
      ]);
      setBookmarkForm({ ...bookmarkForm, resourceId: "", title: "", sourceUrl: "" });
      setStatus("Bookmark saved.");
      await refresh({ query, folderId: folderFilter, tagId: tagFilter });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The bookmark could not be saved.");
    }
  }

  async function removeBookmark(bookmark: BookmarkRecord) {
    await requestJson(`/api/bookmarks`, {
      method: "DELETE",
      body: JSON.stringify({
        resourceType: bookmark.resourceType,
        resourceId: bookmark.resourceId,
      }),
    });
    setBookmarks((current) => current.filter((item) => item.id !== bookmark.id));
    setStatus("Bookmark removed.");
    await refresh({ query, folderId: folderFilter, tagId: tagFilter });
  }

  async function addHighlight(event: React.FormEvent) {
    event.preventDefault();
    try {
      const highlight = await requestJson<HighlightRecord>("/api/highlights", {
        method: "POST",
        body: JSON.stringify({ ...highlightForm, noteId: selectedId }),
      });
      setHighlights((current) => [highlight, ...current]);
      setHighlightForm({ ...highlightForm, sourceId: "", sourceLocation: "", selectedText: "" });
      setStatus("Highlight captured.");
      await refresh({ query, folderId: folderFilter, tagId: tagFilter });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The highlight could not be captured.");
    }
  }

  async function removeHighlight(highlight: HighlightRecord) {
    await requestJson("/api/highlights", {
      method: "DELETE",
      body: JSON.stringify({ id: highlight.id }),
    });
    setHighlights((current) => current.filter((item) => item.id !== highlight.id));
    setStatus("Highlight removed.");
  }

  const visibleNotes = React.useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    return notes.filter((note) => {
      const matchesQuery =
        !normalizedQuery ||
        `${note.title} ${note.bodyMarkdown} ${note.tags.map((tag) => tag.name).join(" ")}`
          .toLocaleLowerCase()
          .includes(normalizedQuery);
      const matchesFolder = folderFilter === "all" || note.folderId === folderFilter;
      const matchesTag = tagFilter === "all" || note.tags.some((tag) => tag.id === tagFilter);
      return matchesQuery && matchesFolder && matchesTag;
    });
  }, [folderFilter, notes, query, tagFilter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
        <div>
          <p className="eyebrow">Phase 12 · local-first knowledge</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-5xl">
            Personal knowledge base
          </h1>
          <p className="mt-3 max-w-3xl text-base leading-7 text-muted-foreground">
            Keep the ideas that matter close to the lessons, concepts, and experiments that made
            them click.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={() => setShowMap((value) => !value)}>
            <Map className="h-4 w-4" aria-hidden="true" /> {showMap ? "Hide map" : "Open map"}
          </Button>
          <Button type="button" onClick={() => void createNewNote()}>
            <FilePlus2 className="h-4 w-4" aria-hidden="true" /> New note
          </Button>
        </div>
      </div>

      {error ? (
        <p
          className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
          role="alert"
        >
          {error}
        </p>
      ) : null}
      {status ? (
        <p className="rounded-lg border border-accent/30 bg-accent/10 p-3 text-sm" role="status">
          {status}
        </p>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[16rem_minmax(0,1fr)_20rem]">
        <aside className="space-y-4">
          <Card>
            <CardHeader className="p-4">
              <CardTitle className="text-sm">Your notes</CardTitle>
              <CardDescription>
                {notes.length} active notes · {tags.length} tags
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 p-4 pt-0">
              <div className="relative">
                <Search
                  className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground"
                  aria-hidden="true"
                />
                <Input
                  aria-label="Search notes"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search notes"
                  className="pl-9"
                />
              </div>
              <select
                aria-label="Filter by folder"
                className="field-select"
                value={folderFilter}
                onChange={(event) => setFolderFilter(event.target.value)}
              >
                <option value="all">All folders</option>
                {folders.map((folder) => (
                  <option key={folder.id} value={folder.id}>
                    {folder.name}
                  </option>
                ))}
              </select>
              <select
                aria-label="Filter by tag"
                className="field-select"
                value={tagFilter}
                onChange={(event) => setTagFilter(event.target.value)}
              >
                <option value="all">All tags</option>
                {tags.map((tag) => (
                  <option key={tag.id} value={tag.id}>
                    {tag.name}
                  </option>
                ))}
              </select>
              <div
                className="max-h-[31rem] space-y-1 overflow-y-auto pr-1"
                role="listbox"
                aria-label="Notes"
                aria-busy={busy}
              >
                {visibleNotes.map((note) => (
                  <button
                    key={note.id}
                    type="button"
                    role="option"
                    aria-selected={selectedId === note.id}
                    onClick={() => void loadNote(note.id)}
                    className={`content-visibility-auto w-full rounded-lg border px-3 py-3 text-left transition ${selectedId === note.id ? "border-accent bg-accent/10" : "border-transparent hover:border-border hover:bg-muted/60"}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="line-clamp-2 text-sm font-medium">{note.title}</span>
                      {note.isPinned ? (
                        <Pin className="h-3.5 w-3.5 shrink-0 text-accent" aria-label="Pinned" />
                      ) : null}
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
                      {note.bodyMarkdown || "Empty note"}
                    </p>
                    <p className="mt-2 text-[0.68rem] text-muted-foreground">
                      {formatDate(note.updatedAt)}
                    </p>
                  </button>
                ))}
                {!visibleNotes.length ? (
                  <p className="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">
                    No notes match that view.
                  </p>
                ) : null}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="p-4">
              <CardTitle className="text-sm">
                <FolderPlus className="mr-1 inline h-4 w-4 text-accent" aria-hidden="true" /> New
                folder
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <form onSubmit={createFolder} className="flex gap-2">
                <Input
                  aria-label="New folder name"
                  value={folderName}
                  onChange={(event) => setFolderName(event.target.value)}
                  placeholder="e.g. Mechanics"
                />
                <Button type="submit" size="icon" aria-label="Create folder">
                  <Check className="h-4 w-4" aria-hidden="true" />
                </Button>
              </form>
            </CardContent>
          </Card>
        </aside>

        <section className="space-y-5">
          <Card>
            <CardHeader className="p-5 pb-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle>{selectedId ? "Edit note" : "New note"}</CardTitle>
                  <CardDescription className="mt-1">
                    Markdown, LaTeX, links, and images are kept in one portable note.
                  </CardDescription>
                </div>
                {busy ? (
                  <Loader2 className="h-4 w-4 animate-spin text-accent" aria-label="Saving" />
                ) : (
                  <Save className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4 p-5 pt-0">
              <div>
                <label htmlFor="note-title" className="field-label">
                  Note title
                </label>
                <Input
                  id="note-title"
                  value={draft.title}
                  onChange={(event) => updateDraft({ title: event.target.value })}
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="note-folder" className="field-label">
                    Folder
                  </label>
                  <select
                    id="note-folder"
                    className="field-select"
                    value={draft.folderId ?? ""}
                    onChange={(event) => updateDraft({ folderId: event.target.value || null })}
                  >
                    <option value="">No folder</option>
                    {folders.map((folder) => (
                      <option key={folder.id} value={folder.id}>
                        {folder.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="note-tags" className="field-label">
                    Tags
                  </label>
                  <Input
                    id="note-tags"
                    value={draft.tagNames}
                    onChange={(event) => updateDraft({ tagNames: event.target.value })}
                    placeholder="motion, review"
                  />
                </div>
              </div>
              <div className="flex flex-wrap gap-4 text-sm">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={draft.isPinned}
                    onChange={(event) => updateDraft({ isPinned: event.target.checked })}
                  />{" "}
                  <Pin className="h-4 w-4 text-accent" aria-hidden="true" /> Pin note
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={draft.isArchived}
                    onChange={(event) => updateDraft({ isArchived: event.target.checked })}
                  />{" "}
                  <Archive className="h-4 w-4 text-muted-foreground" aria-hidden="true" /> Archive
                </label>
              </div>
              <div>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <label htmlFor="note-body" className="field-label mb-0">
                    Note body (Markdown)
                  </label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setPreview((value) => !value)}
                  >
                    {preview ? "Edit Markdown" : "Preview note"}
                  </Button>
                </div>
                {preview ? (
                  <div className="min-h-56 rounded-lg border bg-background p-4">
                    <MarkdownPreview markdown={draft.bodyMarkdown} />
                  </div>
                ) : (
                  <textarea
                    id="note-body"
                    aria-label="Note body (Markdown)"
                    value={draft.bodyMarkdown}
                    onChange={(event) => updateDraft({ bodyMarkdown: event.target.value })}
                    className="min-h-56 w-full rounded-md border border-input bg-background px-3 py-3 font-mono text-sm leading-6 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    placeholder={
                      "# A useful idea\n\nUse **Markdown**, $F=ma$, and ![images](/images/example.png)."
                    }
                  />
                )}
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <Button
                  type="button"
                  onClick={() => void persistNote(draft, selectedId)}
                  disabled={busy}
                >
                  <Save className="h-4 w-4" aria-hidden="true" /> Save note
                </Button>
                <span className="text-xs text-muted-foreground">
                  {selectedId
                    ? "Autosaves after a short pause."
                    : "A new note is created when you save."}
                </span>
              </div>
            </CardContent>
          </Card>

          {selectedNote ? (
            <>
              <Card>
                <CardHeader className="p-5 pb-3">
                  <CardTitle className="text-base">
                    <Link2 className="mr-1 inline h-4 w-4 text-accent" aria-hidden="true" /> Connect
                    this note
                  </CardTitle>
                  <CardDescription>
                    Link it to a lesson, concept, exercise, or another note.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 p-5 pt-0 md:grid-cols-2">
                  <form onSubmit={addResourceLink} className="space-y-2">
                    <label className="field-label" htmlFor="resource-type">
                      Learning resource
                    </label>
                    <select
                      id="resource-type"
                      className="field-select"
                      value={resourceForm.resourceType}
                      onChange={(event) =>
                        setResourceForm({ ...resourceForm, resourceType: event.target.value })
                      }
                    >
                      <option value="lesson">Lesson</option>
                      <option value="concept">Concept</option>
                      <option value="course">Course</option>
                      <option value="module">Module</option>
                      <option value="question">Question</option>
                      <option value="simulation">Simulation</option>
                      <option value="assessment">Assessment</option>
                      <option value="laboratory">Laboratory activity</option>
                      <option value="subject">Subject</option>
                      <option value="grade">Grade</option>
                    </select>
                    <Input
                      aria-label="Resource id"
                      value={resourceForm.resourceId}
                      onChange={(event) =>
                        setResourceForm({ ...resourceForm, resourceId: event.target.value })
                      }
                      placeholder="Resource id"
                      required
                    />
                    <Input
                      aria-label="Resource label"
                      value={resourceForm.label}
                      onChange={(event) =>
                        setResourceForm({ ...resourceForm, label: event.target.value })
                      }
                      placeholder="Label (optional)"
                    />
                    <Input
                      aria-label="Source location"
                      value={resourceForm.sourceLocation}
                      onChange={(event) =>
                        setResourceForm({ ...resourceForm, sourceLocation: event.target.value })
                      }
                      placeholder="Source location (optional)"
                    />
                    <Button type="submit" size="sm">
                      Add resource link
                    </Button>
                  </form>
                  <form onSubmit={addNoteLink} className="space-y-2">
                    <label className="field-label" htmlFor="note-link-target">
                      Internal note link
                    </label>
                    <select
                      id="note-link-target"
                      className="field-select"
                      value={noteLinkTarget}
                      onChange={(event) => setNoteLinkTarget(event.target.value)}
                    >
                      <option value="">Choose another note</option>
                      {notes
                        .filter((note) => note.id !== selectedId)
                        .map((note) => (
                          <option key={note.id} value={note.id}>
                            {note.title}
                          </option>
                        ))}
                    </select>
                    <Button type="submit" size="sm" variant="outline" disabled={!noteLinkTarget}>
                      Link note to note
                    </Button>
                  </form>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="p-5 pb-3">
                  <CardTitle className="text-base">Rendered note</CardTitle>
                  <CardDescription>
                    Safe preview keeps raw HTML and unsafe URLs out of your personal content.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-5 pt-0">
                  <MarkdownPreview markdown={selectedNote.bodyMarkdown} />
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="p-10 text-center text-sm text-muted-foreground">
                <FilePlus2 className="mx-auto h-8 w-8 text-accent" aria-hidden="true" />
                <p className="mt-3 font-medium text-foreground">
                  Start a note for the idea you want to keep.
                </p>
                <p className="mt-1">
                  Write in Markdown, add a formula, then connect it to the learning graph.
                </p>
              </CardContent>
            </Card>
          )}
        </section>

        <aside className="space-y-5">
          <Card>
            <CardHeader className="p-4">
              <CardTitle className="text-sm">
                <Bookmark className="mr-1 inline h-4 w-4 text-accent" aria-hidden="true" /> Bookmark
                a resource
              </CardTitle>
              <CardDescription>
                Lessons, concepts, exercises, simulations, roadmaps, or notes.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 p-4 pt-0">
              <form onSubmit={addBookmark} className="space-y-2">
                <select
                  aria-label="Bookmark type"
                  className="field-select"
                  value={bookmarkForm.resourceType}
                  onChange={(event) =>
                    setBookmarkForm({ ...bookmarkForm, resourceType: event.target.value })
                  }
                >
                  <option value="lesson">Lesson</option>
                  <option value="concept">Concept</option>
                  <option value="exercise">Exercise</option>
                  <option value="simulation">Simulation</option>
                  <option value="roadmap">Roadmap</option>
                  <option value="note">Note</option>
                </select>
                <Input
                  aria-label="Bookmark resource id"
                  value={bookmarkForm.resourceId}
                  onChange={(event) =>
                    setBookmarkForm({ ...bookmarkForm, resourceId: event.target.value })
                  }
                  placeholder="Resource id"
                  required
                />
                <Input
                  aria-label="Bookmark title"
                  value={bookmarkForm.title}
                  onChange={(event) =>
                    setBookmarkForm({ ...bookmarkForm, title: event.target.value })
                  }
                  placeholder="Title (optional)"
                />
                <Input
                  aria-label="Bookmark URL"
                  value={bookmarkForm.sourceUrl}
                  onChange={(event) =>
                    setBookmarkForm({ ...bookmarkForm, sourceUrl: event.target.value })
                  }
                  placeholder="URL (optional)"
                />
                <Button type="submit" size="sm">
                  <Bookmark className="h-4 w-4" aria-hidden="true" /> Save bookmark
                </Button>
              </form>
              <div className="space-y-2 pt-2">
                {bookmarks.slice(0, 5).map((bookmark) => (
                  <div
                    key={bookmark.id}
                    className="flex items-center justify-between gap-2 rounded-lg border p-2 text-xs"
                  >
                    <span className="min-w-0 truncate">{bookmark.title}</span>
                    <button
                      type="button"
                      aria-label={`Remove bookmark ${bookmark.title}`}
                      onClick={() => void removeBookmark(bookmark)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </div>
                ))}
                {!bookmarks.length ? (
                  <p className="text-xs text-muted-foreground">No bookmarks yet.</p>
                ) : null}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="p-4">
              <CardTitle className="text-sm">
                <Highlighter className="mr-1 inline h-4 w-4 text-accent" aria-hidden="true" />{" "}
                Capture a highlight
              </CardTitle>
              <CardDescription>
                Keep the exact source location beside the words that clicked.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 p-4 pt-0">
              <form onSubmit={addHighlight} className="space-y-2">
                <select
                  aria-label="Highlight type"
                  className="field-select"
                  value={highlightForm.sourceType}
                  onChange={(event) =>
                    setHighlightForm({ ...highlightForm, sourceType: event.target.value })
                  }
                >
                  <option value="lesson-text">Lesson text</option>
                  <option value="definition">Definition</option>
                  <option value="formula">Formula</option>
                  <option value="example">Example</option>
                  <option value="question-solution">Question solution</option>
                </select>
                <Input
                  aria-label="Highlight source id"
                  value={highlightForm.sourceId}
                  onChange={(event) =>
                    setHighlightForm({ ...highlightForm, sourceId: event.target.value })
                  }
                  placeholder="Source id"
                  required
                />
                <Input
                  aria-label="Highlight source location"
                  value={highlightForm.sourceLocation}
                  onChange={(event) =>
                    setHighlightForm({ ...highlightForm, sourceLocation: event.target.value })
                  }
                  placeholder="Block or page location"
                />
                <textarea
                  aria-label="Highlighted text"
                  value={highlightForm.selectedText}
                  onChange={(event) =>
                    setHighlightForm({ ...highlightForm, selectedText: event.target.value })
                  }
                  className="min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  placeholder="Paste the highlighted text"
                  required
                />
                <select
                  aria-label="Highlight color"
                  className="field-select"
                  value={highlightForm.color}
                  onChange={(event) =>
                    setHighlightForm({ ...highlightForm, color: event.target.value })
                  }
                >
                  <option value="yellow">Yellow</option>
                  <option value="blue">Blue</option>
                  <option value="green">Green</option>
                  <option value="pink">Pink</option>
                </select>
                <Button type="submit" size="sm">
                  <Highlighter className="h-4 w-4" aria-hidden="true" /> Save highlight
                </Button>
              </form>
              <div className="space-y-2 pt-2">
                {highlights.slice(0, 4).map((highlight) => (
                  <div key={highlight.id} className="rounded-lg border p-2 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <Badge variant="outline">{highlight.sourceType}</Badge>
                      <button
                        type="button"
                        aria-label="Remove highlight"
                        onClick={() => void removeHighlight(highlight)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    </div>
                    <p className="mt-1 line-clamp-3">“{highlight.selectedText}”</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          {selectedNote ? (
            <Card>
              <CardHeader className="p-4">
                <CardTitle className="text-sm">Connections</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 p-4 pt-0">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    Outgoing links
                  </p>
                  {selectedNote.links.length ? (
                    selectedNote.links.map((link) => (
                      <p key={link.id} className="mt-1 text-xs">
                        {link.label}{" "}
                        <span className="text-muted-foreground">· {link.resourceType}</span>
                      </p>
                    ))
                  ) : (
                    <p className="mt-1 text-xs text-muted-foreground">
                      No learning resources linked.
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    Backlinks
                  </p>
                  {selectedNote.backlinks.length ? (
                    selectedNote.backlinks.map((link) => (
                      <p key={link.id} className="mt-1 text-xs">
                        {link.sourceNoteTitle}
                      </p>
                    ))
                  ) : (
                    <p className="mt-1 text-xs text-muted-foreground">No notes link here yet.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : null}
        </aside>
      </div>

      {showMap ? (
        <Card>
          <CardContent className="p-5">
            <KnowledgeMapView map={map} />
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
