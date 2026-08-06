# Phase 13 — Global search and content discovery

Mathios now has one local-first search surface at `/search` and a provider-neutral search port.
The page searches the reusable educational catalog and the current profile's notes and bookmarks:

- curricula, grades, subjects, and domains
- courses, modules, lessons, concepts, questions, and assessments
- simulations, laboratory activities, and roadmaps
- profile-scoped notes and bookmarks

## Search contract

`src/domain/search` owns query normalization, tokenization, ranking, visibility, filter matching,
and safe highlight snippets. Search documents carry a stable resource type/id, an internal route,
plain-text content, and filter metadata. The domain never imports a database or framework.

`SearchProvider` is exposed through `src/domain/ports/search-provider.ts`. The existing in-memory
adapter remains useful for deterministic tests. The production adapter stores portable document
metadata in `search_documents`, uses SQLite FTS5 locally, and uses PostgreSQL `tsvector`/GIN search
when the hosted database is selected.

## Visibility and indexing

Published platform content is visible to learners. Draft and archived platform content is indexed
for useful author search but is returned only to principals with content-edit or publish permission.
Notes and bookmarks are always profile-scoped; a profile never receives another profile's personal
documents. Search never indexes answer specifications, option correctness, or full question
solutions.

The Phase 13 migration adds a source revision counter and triggers on searchable content tables.
The first search after a mutation rebuilds the local index transactionally, then records the source
revision that was indexed. This keeps edits and publication changes discoverable without coupling
every existing content mutation to the search feature.

Recent queries are stored in `search_recent_queries`, capped to the latest twelve per profile, and
can be cleared from the API. Suggestions use indexed titles and never expose personal titles to a
different profile.

## Routes

- `GET /api/search` — ranked results, filters, suggestions, recent searches, and facets
- `GET /api/search/suggestions?q=...` — title suggestions for the search box
- `GET /api/search/recent` — current profile's recent queries
- `DELETE /api/search/recent` — clear current profile's recent queries

The global header entry opens `/search`; `Ctrl/Cmd+K` and `/` focus the search field. Arrow keys
move through results and Enter opens the active result.
