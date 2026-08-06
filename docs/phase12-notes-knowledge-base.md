# Phase 12: Notes, highlights, bookmarks, and personal knowledge base

Phase 12 adds the local personal knowledge layer that sits beside the structured learning system.
All user-created rows are profile-scoped and can be exported later without coupling notes to one
content provider.

## Scope and storage

Migration `0012_phase12_notes_knowledge_base.sql` adds:

- `folders` and `tags` for personal organization;
- `notes` for Markdown/LaTeX bodies, pinning, archiving, and folder placement;
- `note_links` for polymorphic links to existing subject, grade, course, module, lesson, concept,
  question, simulation, assessment, and laboratory records;
- `note_tags` for note taxonomy;
- `note_backlinks` for internal note-to-note relationships;
- `highlights` for selected text plus source type, resource identifier, and source location; and
- `bookmarks` for lessons, concepts, exercises, simulations, roadmaps, and notes.

SQLite and PostgreSQL migrations keep the same constraints and indexes. Platform references remain
metadata rather than polymorphic foreign keys; the notes service checks the referenced table before
persisting a link or bookmark. Foreign keys protect profile, note, folder, tag, and highlight
relationships. Deleting a note removes its links/backlinks and note bookmark.

## Domain and safety

`src/domain/notes` tokenizes a deliberately bounded Markdown subset: headings, paragraphs, lists,
code blocks, links, images, emphasis, inline code, and inline/block LaTeX. Raw HTML is never
inserted into the preview. URLs are limited to internal paths, HTTP(S), and safe image data URLs.
The map projection is deterministic so the same notes, links, backlinks, and bookmarks produce the
same nodes and edges.

## API and workspace

The `/api/notes` routes provide note CRUD, note-local search, folders, resource links, and internal
backlinks. `/api/highlights` and `/api/bookmarks` provide source-preserving capture and removal.
`/api/knowledge-map` returns the personal map. The `/notes` workspace combines the note editor,
autosave, Markdown preview, folder/tag filters, connection panels, bookmark/highlight capture, and
the map view. The workspace exposes IDs for platform resources so it can be used from any existing
content page while Phase 13 owns global discovery and indexing.

## Seed and verification

Phase 12 does not seed learner notes, folders, tags, bookmarks, or highlights: those are private
personal data. The general seed remains idempotent and updates the installation marker to
`phase-12`; it can be rerun before or after profiles exist.

Coverage includes Markdown safety, tag normalization, map determinism, migration bookkeeping, and
profile-scoped repository persistence. Browser coverage exercises note creation, autosave, search,
resource linking, bookmarks, highlights, and map rendering.
