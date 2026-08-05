# Phase 4: Concepts and the knowledge graph

Phase 4 adds reusable concepts independently of lesson content. A concept is anchored to a
subject, optionally to a subject domain, and to an inclusive grade range. Curriculum membership is
derived from linked learning objectives and linked lessons; course membership is derived through the
existing `lesson -> module -> course` hierarchy. This keeps concepts reusable across curricula and
prevents a concept from being owned by one course.

## Relationship semantics

Edges use `source_concept_id -> target_concept_id`. The `requires` relationship therefore reads:

> source requires target

Prerequisite traversal follows outgoing `requires` edges; descendants follow those edges in reverse.
`unlocks` is an explicit non-blocking edge from the concept that unlocks to the concept it opens.
All supported relationship types are listed in `src/domain/concept/types.ts` and checked by the
database migration and Zod schemas.

Required prerequisite cycles are rejected in the application service before insertion. The database
also prevents self-references, duplicate `(source, target, type)` triples, and references to missing
concepts. The management screen reports orphaned concepts, missing IDs, duplicate keys, and any
required cycle for content review.

## Storage

The `0004_phase4_concepts_knowledge_graph.sql` migration is checked in for SQLite and PostgreSQL.
It creates `concepts`, `lesson_concepts`, `concept_relationships`, `concept_learning_objectives`,
`concept_applications`, and `concept_misconceptions`. `SqlConceptRepository` implements the
`ConceptRepository` port with explicit SQLite/PostgreSQL queries and a deterministic layered graph
read model.

## Screens and API

- `/concepts` — learner and author concept explorer
- `/concepts/[conceptId]` — concept detail, prerequisites, unlocks, linked lessons, applications,
  misconceptions, objectives, and derived curriculum/course linkage
- `/knowledge-graph` — interactive SVG graph with pan, zoom, minimap, fullscreen mode, search,
  subject/grade/domain/difficulty/relationship/mastery-state filters, and path highlighting
- `/concepts/manage` — concept CRUD, relationship authoring, bulk import, validation, and orphan review

Server actions live in `src/features/concepts/actions.ts`. The API surfaces are:

- `GET/POST /api/concepts`
- `GET/PATCH /api/concepts/:conceptId`
- `GET/POST /api/concepts/:conceptId/relationships`
- `GET /api/knowledge-graph`

Mutations require `edit_content` and a teacher, content-creator, or administrator role. Learner
responses expose only active concepts and published lesson/course links; authorized authors may
inspect draft links.

## Mastery boundary

Phase 4 stores each concept's authored `mastery_threshold` and exposes an `unassessed` state so the
graph has a stable filter contract. It does not create mastery records or infer mastery from lesson
completion. Mastery tracking remains Phase 7 work.

## Seed data and verification

The seed includes motion, ratio, algebra, astronomy, biology, and chemistry concepts, prerequisite
and cross-subject edges, lesson/objective links, applications, and misconceptions. Seed version is
`phase-4` and remains idempotent. Run the full verification set with:

```text
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e
```
