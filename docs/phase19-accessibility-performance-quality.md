# Phase 19 — Accessibility, performance, and quality audit

Phase 19 is a cross-cutting quality pass over the completed Mathios product surface. It does not
introduce a new product area or a new persistence model.

## Accessibility

- The authenticated shell exposes a keyboard-operable skip link, a stable main-content target, a
  mobile-navigation focus trap, Escape-to-close behavior, focus restoration, and mobile inertness
  while the navigation drawer is closed.
- Global focus-visible treatment follows the saved accessibility preference. Reduced motion,
  contrast, underline, and screen-reader optimization preferences continue to be synchronized from
  the profile settings surface.
- Dialogs use unique labelled-by and described-by IDs, modal semantics, focus containment, Escape
  handling, and trigger-focus restoration.
- Loading, error, progress, search, simulation, formula-copy, analytics, lesson, graph, map, table,
  and tab-panel states expose status, progress, selection, or structural semantics where the UI
  previously relied only on visual styling.
- Knowledge graphs and personal maps include a text list alternative. Structured lesson tables use
  captions and header scopes, while unsupported table payloads remain visibly available as bounded
  JSON for authoring diagnostics.

## Performance and resilience

- Large workspace components are loaded on demand for notes, planner, knowledge graph, lessons,
  simulations, analytics, and teacher analytics routes.
- Search and simulation frame requests cancel stale work and ignore late responses. Suggestions use
  a bounded in-memory cache and the suggestions endpoint is explicitly non-cacheable for private
  profile queries.
- Search suggestion and facet queries project only the columns required for those views instead of
  loading full indexed document content.
- Planner calendar grouping is computed once per view, and long result lists use content visibility
  hints so off-screen cards do not compete for initial rendering time.

## Data, migrations, and seed

No Phase 19 tables, indexes, seed records, or migration are required. The search query projections
are compatible with the existing SQLite FTS5 and PostgreSQL providers, and migration
`0018_phase18_deployment_hardening.sql` remains the latest migration.

## Verification

The phase is complete when the repository passes formatting, lint, typecheck, unit tests, production
build, and the Playwright browser suite. The Phase 19 browser checks cover shell skip navigation,
mobile drawer focus behavior, duplicate-ID detection, and the semantic discovery surfaces.

Known limits are documented rather than hidden: this pass does not add a third-party automated WCAG
scanner, and SVG graph interaction still offers the text list alternative instead of requiring every
visual gesture to be reproduced through a pointer-equivalent control.
