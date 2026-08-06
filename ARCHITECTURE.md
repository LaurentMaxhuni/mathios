# Mathios architecture

Phase 3 uses `src/features/courses` and `src/domain/course` for the course/module/lesson hierarchy. Draft lesson rows are captured into `lesson_versions`; learner readers resolve only the published snapshot, so authoring changes cannot leak into published content. The course repository keeps this contract compatible with SQLite and PostgreSQL.

Mathios is a modular monolith. A single Next.js application hosts the presentation, application, domain, and infrastructure layers while keeping feature boundaries explicit. This keeps local/offline use simple and leaves room for a hosted deployment later.

## Layers

```text
src/app                 Presentation routes, layouts, route handlers
src/components          Shared UI, layout, and accessible primitives
src/features            Feature modules; each owns UI, schemas, services, and ports
src/application         Cross-feature use-case contracts when needed
src/domain              Framework-independent entities, errors, and ports
src/infrastructure      Database, storage, auth, search, and AI adapters
src/lib                 Environment, logging, utilities, and cross-cutting helpers
src/server               Server-only composition and health helpers
src/types                Shared transport and configuration types
```

The dependency direction is inward:

```text
Presentation -> Application -> Domain <- Infrastructure adapters
```

The domain does not import Next.js, React, Drizzle, filesystem APIs, or provider SDKs. Infrastructure implements domain/application ports. Routes and server actions compose a use case and translate typed errors into an HTTP response or a user-facing state.

## Feature-module boundaries

Planned modules are `auth`, `profiles`, `curricula`, `grades`, `subjects`, `courses`, `lessons`, `concepts`, `roadmaps`, `assessments`, `mastery`, `simulations`, `notes`, `planner`, `analytics`, and `settings`. A module may expose public application contracts, but its internal schemas, queries, mutations, and repositories stay inside the module.

Phase 1 adds the identity foundation through the `profiles`, `auth`, `settings`, and `onboarding` feature modules. Phase 2 adds the `curricula` module for reusable curricula, grades, subjects, domains, grade depth, and learning objectives. Phase 3 adds the `courses` feature for reusable course hierarchy, structured lessons, versioned authoring, publishing, and learner progress. Phase 4 adds the `concepts` feature for reusable concept entities, typed graph edges, prerequisite validation, traversal, lesson/objective linkage, and learner/author graph surfaces. Phase 5 adds reusable questions, exercise sets, answer validation, and deterministic question templates. Phase 6 adds assessments, timed and untimed attempts, section/concept results, diagnostic analysis, and placement recommendations. Phase 7 adds evidence-backed concept mastery, historical snapshots, review signals, and deterministic learning recommendations. Phase 8 adds versioned interdisciplinary roadmaps, learner enrollment/progress, dependency validation, and deterministic personalized paths that use mastery and diagnostic context. Phase 9 adds trusted interactive simulations, and Phase 10 adds virtual laboratory execution and scientific reports. Phase 11 adds the profile-scoped study planner, goals, deterministic scheduling, calendar exceptions, adaptive catch-up, and progress propagation. Phase 12 adds profile-scoped Markdown/LaTeX notes, source-preserving highlights, bookmarks, tags, folders, internal backlinks, and a deterministic personal knowledge map. Global search and analytics remain later-phase work.

## Abstractions

- `AuthProvider` isolates local, credential, and future hosted authentication modes.
- `SearchProvider` isolates local indexing from a future remote or specialized index.
- `AIProvider` keeps AI optional and disabled by default.
- `Storage` supports local filesystem storage now and an S3-compatible adapter later.
- `Repository` is the persistence seam for feature modules; Drizzle schemas remain in infrastructure.
- `ApplicationError` subclasses provide stable error codes and safe serialization.

Phase 1 uses a signed, HttpOnly local session cookie rather than a session table. The cookie contains only a profile identifier and an issued-at timestamp; the server reloads roles and permissions from the repository on every request. Profile PINs/passwords are stored as salted `scrypt` hashes and never returned to the frontend.

## Runtime environments

`src/lib/env.ts` is the only application-level environment parser. Runtime code imports the validated `env` object instead of reading `process.env` directly. Development and test default to SQLite and local filesystem storage. Docker can run PostgreSQL through Compose, while the same schema contract remains available for a hosted deployment.

## Data and migrations

Phase 0 creates `app_metadata`, used for migration/seed bookkeeping and future installation metadata. Phase 1 adds the identity tables in `0001_phase1_identity.sql`. Phase 2 adds the educational structure in `0002_phase2_curriculum_structure.sql`, including the supporting `grade_subject_domains` join needed to model domain depth by curriculum and grade. Phase 3 adds the course hierarchy, lesson blocks, assets, version snapshots, and learner progress in `0003_phase3_courses_lessons.sql`. Phase 4 adds concepts and graph links in `0004_phase4_concepts_knowledge_graph.sql`. Phase 5 adds question, version, answer, template, exercise-set, and practice-attempt tables in `0005_phase5_exercises_questions.sql`. Phase 6 adds assessment definitions, pools, attempts, section results, diagnostic results, placement results, and the shared assessment-answer parent in `0006_phase6_assessments.sql`. Phase 7 adds current mastery, evidence events, historical snapshots, configurable rule records, recommendations, and dismissals in `0007_phase7_mastery_recommendations.sql`. Phase 8 adds roadmaps in `0008_phase8_roadmaps_personalized_paths.sql`, Phase 9 adds simulations in `0009_phase9_interactive_simulations.sql`, Phase 10 adds laboratories in `0010_phase10_laboratory.sql`, Phase 11 adds the planner tables in `0011_phase11_study_planner.sql`, and Phase 12 adds the notes knowledge-base tables in `0012_phase12_notes_knowledge_base.sql`. SQL migrations are checked in per dialect and applied transactionally by `src/infrastructure/database/migrations.ts`. Feature tables are added in their own phases rather than pre-created as placeholders. Required prerequisite cycles are an application-level invariant; self-references, duplicate edges, allowed relationship types, foreign keys, and threshold bounds are also constrained by the phase migrations.

## Phase 2 dependency direction

The `curricula` feature owns input schemas, authorization-aware services, server actions, management forms, and explorer-facing read models. `src/domain/curriculum` contains framework-independent records and `src/domain/ports/curriculum-repository.ts` defines the persistence contract. `src/infrastructure/database/repositories/curriculum-repository.ts` implements that contract with explicit SQLite and PostgreSQL queries. Subjects and domains are independent records; curriculum and grade join tables determine availability, required/optional status, ordering, and depth. Learning objectives belong to a curriculum and subject, then `grade_learning_objectives` places them at specific grades.

## Phase 3 dependency direction

The `courses` feature owns authoring schemas, authorization-aware server actions, lesson editor/reader screens, formula accessibility, version and publication workflow, and progress mutations. `src/domain/course` contains framework-independent hierarchy, block, version, and progress records; `src/domain/ports/course-repository.ts` defines persistence behavior. `src/infrastructure/database/repositories/course-repository.ts` implements explicit SQLite and PostgreSQL queries. Draft lesson edits remain in authoring rows and are captured into immutable JSON snapshots; readers resolve only a published lesson snapshot inside a published course.

## Phase 4 dependency direction

The `concepts` feature owns concept schemas, graph filters, authoring actions, detail/explorer/graph
surfaces, relationship import, and authorization. `src/domain/concept` contains framework-
independent concept types, validation, traversal, integrity reporting, and deterministic layout.
`src/domain/ports/concept-repository.ts` defines the persistence contract and
`src/infrastructure/database/repositories/concept-repository.ts` implements it with explicit
SQLite/PostgreSQL queries. Learner concept details include published lesson/course links only;
authors may inspect draft links. Relationship direction and validation rules are documented in
`docs/phase4-concepts-knowledge-graph.md`.

## Phase 5 dependency direction

The exercises feature owns question and exercise-set schemas, authoring actions, learner attempt
flows, validation previews, publication, and reusable practice surfaces. src/domain/exercise
contains framework-independent question records, safe expression parsing, answer validation,
partial-credit scoring, and deterministic template generation. src/domain/ports/exercise-repository.ts
defines persistence behavior, and src/infrastructure/database/repositories/exercise-repository.ts
implements it with explicit SQLite/PostgreSQL queries. Learner reads are sanitized by the service
layer so answer specifications, correct option flags, and solutions are not serialized to the
frontend. Phase 5 exercise data and flows are documented in
docs/phase5-exercises-answer-validation.md.

## Phase 6 dependency direction

The assessments feature owns assessment schemas, authoring forms, publication invariants, learner attempt and
resume flows, feedback visibility, result presentation, diagnostics, and placement output. `src/domain/assessment`
contains framework-independent assessment records, seeded pool selection, scoring summaries, section/concept
aggregation, mistake grouping, and explainable readiness recommendations. `src/domain/ports/assessment-repository.ts`
defines persistence behavior, and `src/infrastructure/database/repositories/assessment-repository.ts` implements it
with explicit SQLite/PostgreSQL queries. The service composes the Phase 5 exercise validator while sanitizing
question instances before they reach the browser. Phase 6 assessment data and flows are documented in
`docs/phase6-assessments-diagnostics-placement.md`.

## Phase 7 dependency direction

The mastery feature owns deterministic mastery computation, evidence normalization, recommendation generation, review signals, dashboard/detail views, and dismissal actions. `src/domain/mastery` contains framework-independent states, configurable scoring safeguards, explainable score breakdowns, and recommendation rules. `src/domain/ports/mastery-repository.ts` defines the persistence and evidence-extraction contract, and `src/infrastructure/database/repositories/mastery-repository.ts` implements it with explicit SQLite/PostgreSQL queries and transactional current-plus-snapshot writes. Lesson, exercise, and assessment completion flows emit evidence through the optional mastery seam after their own persistence succeeds. Phase 7 data and flows are documented in `docs/phase7-mastery-recommendations.md`; analytics and AI recommendation behavior remain later-phase work.

## Phase 8 dependency direction

The roadmaps feature owns roadmap authoring, versioning, graph validation, learner enrollment and progress, and personalized path presentation. `src/domain/roadmap` contains framework-independent node/edge types, cycle detection, deterministic topological ordering, progress aggregation, and path explanations. `src/domain/ports/roadmap-repository.ts` defines the persistence seam, while `src/infrastructure/database/repositories/roadmap-repository.ts` implements explicit SQLite/PostgreSQL reads, writes, version forks, progress locks, and learning-context extraction. The service composes existing curriculum, course, concept, assessment, identity, mastery, and diagnostic data without importing framework code into the domain. Phase 8 behavior is documented in `docs/phase8-roadmaps-personalized-paths.md`; simulations, laboratory execution, and study planning have their own phase boundaries and repository ports.

## Phase 9 dependency direction

The `simulations` feature owns catalog/detail reads, session/result mutations, presets, lesson links, and the player UI. `src/domain/simulation` contains trusted framework-free definitions, input validation, deterministic stepping, frame generation, guided-task completion, and the registry. `src/domain/ports/simulation-repository.ts` defines persistence behavior, while `src/infrastructure/database/repositories/simulation-repository.ts` implements explicit SQLite/PostgreSQL queries. The browser receives public metadata only; frame calculations use the trusted registry endpoint, and persisted inputs/state are validated before writes. Phase 9 behavior is documented in `docs/phase9-interactive-simulations.md`.

## Phase 10 dependency direction

The `laboratory` feature owns activity authoring, learner sessions, observation and measurement
entry, simulation-data import, analysis summaries, report editing, feedback, and exports.
`src/domain/laboratory` contains framework-independent activity/session/report types, unit
normalization, significant-figure handling, uncertainty, regression, graph pairing, theory
comparison, completion rules, and report submission invariants. `src/domain/ports/laboratory-
repository.ts` defines persistence behavior, while
`src/infrastructure/database/repositories/laboratory-repository.ts` implements explicit
SQLite/PostgreSQL queries.

Stored activity configuration is bounded metadata. Simulation data is generated only by the
trusted Phase 9 registry; database-provided configuration never becomes executable code. Learner
session and report reads are profile-scoped. Report HTML escapes user content and the PDF exporter
serializes a deterministic text/data representation without evaluating formulas or embedding
untrusted markup.

Migration `0010_phase10_laboratory.sql` adds the eight laboratory tables and indexes. Seed data
adds seven published activities spanning motion, pendulum gravity, Ohm's law, gas laws, enzyme
activity, planetary periods, and LED Planck-constant estimation.

## Phase 11 dependency direction

The `planner` feature owns goal schemas, scheduling services, progress propagation, API routes,
and the month/week/agenda workspace. `src/domain/planner` contains framework-independent
date-only scheduling, availability and exception handling, conflict detection, and catch-up
rules. `src/domain/ports/planner-repository.ts` defines the persistence seam, while
`src/infrastructure/database/repositories/study-planner-repository.ts` implements explicit
SQLite/PostgreSQL queries. Planner completion calls the existing course and roadmap ports; it
does not duplicate lesson or roadmap progress tables. Migration `0011_phase11_study_planner.sql`
adds the seven planner tables and indexes. Planner behavior is documented in
`docs/phase11-study-planner.md`.

## Phase 12 dependency direction

The `notes` feature owns profile-scoped note editing, tags, folders, source links, highlights,
bookmarks, internal backlinks, note-local search, and the personal knowledge-map surface.
`src/domain/notes` contains framework-independent records, safe Markdown/LaTeX tokenization,
resource-reference validation, backlink rules, search matching, and deterministic map projection.
`src/domain/ports/notes-repository.ts` defines persistence behavior, while
`src/infrastructure/database/repositories/notes-repository.ts` implements explicit
SQLite/PostgreSQL queries. Platform resources remain polymorphic metadata because the linked
features already own their tables; the service validates resource identifiers before creating
links or bookmarks. Note bodies never render raw HTML, and image/link URLs are restricted to
internal paths, HTTP(S), or safe image data URLs. Migration `0012_phase12_notes_knowledge_base.sql`
adds the eight Phase 12 tables and indexes. Global search indexing remains Phase 13.
