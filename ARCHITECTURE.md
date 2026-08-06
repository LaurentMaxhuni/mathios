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

Planned modules are `auth`, `profiles`, `curricula`, `grades`, `subjects`, `courses`, `lessons`, `concepts`, `roadmaps`, `assessments`, `mastery`, `simulations`, `notes`, `planner`, `search`, `analytics`, `portability`, `ai`, `classrooms`, and `settings`. A module may expose public application contracts, but its internal schemas, queries, mutations, and repositories stay inside the module.

Phase 1 adds the identity foundation through the `profiles`, `auth`, `settings`, and `onboarding` feature modules. Phase 2 adds the `curricula` module for reusable curricula, grades, subjects, domains, grade depth, and learning objectives. Phase 3 adds the `courses` feature for reusable course hierarchy, structured lessons, versioned authoring, publishing, and learner progress. Phase 4 adds the `concepts` feature for reusable concept entities, typed graph edges, prerequisite validation, traversal, lesson/objective linkage, and learner/author graph surfaces. Phase 5 adds reusable questions, exercise sets, answer validation, and deterministic question templates. Phase 6 adds assessments, timed and untimed attempts, section/concept results, diagnostic analysis, and placement recommendations. Phase 7 adds evidence-backed concept mastery, historical snapshots, review signals, and deterministic learning recommendations. Phase 8 adds versioned interdisciplinary roadmaps, learner enrollment/progress, dependency validation, and deterministic personalized paths that use mastery and diagnostic context. Phase 9 adds trusted interactive simulations, and Phase 10 adds virtual laboratory execution and scientific reports. Phase 11 adds the profile-scoped study planner, goals, deterministic scheduling, calendar exceptions, adaptive catch-up, and progress propagation. Phase 12 adds profile-scoped Markdown/LaTeX notes, source-preserving highlights, bookmarks, tags, folders, internal backlinks, and a deterministic personal knowledge map. Phase 13 adds the profile-aware global search and content-discovery surface. Phase 14 adds local learner and teacher analytics over existing learning activity, mastery, assessment, planner, notes, and content records. Phase 15 adds the `portability` feature for deterministic content/user-data/settings packages, ZIP backup artifacts, checksums, safe restore previews, merge/replace restore, retention, and installation-secret-backed encryption. Phase 16 adds the optional `ai` feature for disabled/local/remote/hybrid provider routing, grounded labeled generation, secure configuration, and creator review without replacing authoritative content. Phase 17 adds the `classrooms` feature for teacher-owned classes, learner enrollment, invitations and join codes, resource assignments, submissions, rubrics, feedback, resubmission, and classroom analytics. Phase 18 adds deployment hardening: PostgreSQL pooling and migration operations, S3-compatible storage and signed URLs, hosted JWT authentication, security middleware, audit logging, health/readiness checks, metrics, error tracking, and production deployment guidance.

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

Phase 0 creates `app_metadata`, used for migration/seed bookkeeping and future installation metadata. Phase 1 adds the identity tables in `0001_phase1_identity.sql`. Phase 2 adds the educational structure in `0002_phase2_curriculum_structure.sql`, including the supporting `grade_subject_domains` join needed to model domain depth by curriculum and grade. Phase 3 adds the course hierarchy, lesson blocks, assets, version snapshots, and learner progress in `0003_phase3_courses_lessons.sql`. Phase 4 adds concepts and graph links in `0004_phase4_concepts_knowledge_graph.sql`. Phase 5 adds question, version, answer, template, exercise-set, and practice-attempt tables in `0005_phase5_exercises_questions.sql`. Phase 6 adds assessment definitions, pools, attempts, section results, diagnostic results, placement results, and the shared assessment-answer parent in `0006_phase6_assessments.sql`. Phase 7 adds current mastery, evidence events, historical snapshots, configurable rule records, recommendations, and dismissals in `0007_phase7_mastery_recommendations.sql`. Phase 8 adds roadmaps in `0008_phase8_roadmaps_personalized_paths.sql`, Phase 9 adds simulations in `0009_phase9_interactive_simulations.sql`, Phase 10 adds laboratories in `0010_phase10_laboratory.sql`, Phase 11 adds the planner tables in `0011_phase11_study_planner.sql`, Phase 12 adds the notes knowledge-base tables in `0012_phase12_notes_knowledge_base.sql`, Phase 13 adds the searchable document store, recent-query history, SQLite FTS5 table, PostgreSQL text-search vector, and source-revision triggers in `0013_phase13_global_search.sql`, Phase 14 adds analytics read models in `0014_phase14_analytics.sql`, Phase 15 adds backup policy, artifact metadata, and restore audit rows in `0015_phase15_portability.sql`, Phase 16 adds encrypted provider settings and profile-scoped generation/review records in `0016_phase16_optional_ai.sql`, Phase 17 adds classes, memberships, teacher assignments, invitations, assignments, targets, submissions, rubrics, and feedback in `0017_phase17_classrooms.sql`, and Phase 18 adds append-only audit events in `0018_phase18_deployment_hardening.sql`. SQL migrations are checked in per dialect and applied transactionally by `src/infrastructure/database/migrations.ts`, with a PostgreSQL advisory lock for concurrent release jobs. Feature tables are added in their own phases rather than pre-created as placeholders. Required prerequisite cycles are an application-level invariant; self-references, duplicate edges, allowed relationship types, foreign keys, and threshold bounds are also constrained by the phase migrations.

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
adds the eight Phase 12 tables and indexes.

## Phase 13 dependency direction

The `search` feature owns query schemas, visibility-aware search orchestration, global search routes,
recent-search behavior, suggestions, and the discovery workspace. `src/domain/search` contains
framework-independent document metadata, normalization, ranking, filtering, and safe snippets;
`src/domain/ports/search-provider.ts` defines the provider seam. The SQLite FTS5 and PostgreSQL
adapters live in `src/infrastructure/search`, while `platform-search-index.ts` projects existing
curriculum, course, lesson, concept, exercise, assessment, simulation, laboratory, roadmap, note,
and bookmark records into indexed documents. Publication visibility is enforced at query time, and
profile-scoped records retain their profile boundary in the index. Analytics remains a separate read model and does not replace search indexing.

## Phase 14 dependency direction

The `analytics` feature owns range validation, event/session recording contracts, derived learner and teacher metrics, analytics dashboards, and authorization-aware API routes. `src/domain/analytics` contains framework-independent aggregation rules for accuracy, streaks, consistency, mastery trends, concept difficulty, support signals, and question discrimination. `src/domain/ports/analytics-repository.ts` defines the persistence seam, while `src/infrastructure/database/repositories/analytics-repository.ts` assembles profile-scoped source data from the existing course, exercise, assessment, mastery, planner, roadmap, and notes tables.

Migration `0014_phase14_analytics.sql` adds `learning_sessions`, `activity_events`, `analytics_snapshots`, `learner_metrics`, and `content_metrics` for both SQLite and PostgreSQL. Events are local-only, profile-scoped, deduplicated where a source operation has a stable identity, and recorded best-effort after the owning operation succeeds. Learner reads always use the current session profile; teacher reads require `view_analytics`. Derived metrics are persisted as rebuildable snapshots, so analytics never becomes an authoritative replacement for source progress or mastery tables. Phase 14 behavior and privacy/operational risks are documented in `docs/phase14-analytics.md`.

## Phase 15 dependency direction

The `portability` feature owns package scope selection, deterministic manifests, JSON/Markdown/CSV/HTML/PDF/ZIP rendering, backup retention, restore previews, conflict policy, and authorization-aware routes. `src/domain/portability` contains framework-independent package types, allowlisted table scopes, canonical serialization, compatibility checks, restore planning, schedule decisions, and safe path rules. `src/domain/ports/portability-repository.ts` defines the persistence seam; `src/infrastructure/database/repositories/portability-repository.ts` implements provider-specific table introspection, profile-scoped capture, dependency-ordered upserts, backup metadata, and transactional restore for SQLite and PostgreSQL. The feature uses the existing `Storage` abstraction for ZIP artifacts and local assets. Backup metadata is excluded from portable snapshots to prevent recursive artifacts; `backup_settings` is included only in full/settings scopes. Phase 15 behavior, encryption, migration, and local schedule behavior are documented in `docs/phase15-portability.md`.

## Phase 16 dependency direction

The `ai` feature owns provider configuration, grounded generation requests, output labeling, generation history, and creator review routes and screens. `src/domain/ai` contains provider-neutral modes/tasks, bounded grounding, URL and token limits, prompt safety instructions, and output contracts. `src/domain/ports/ai-provider.ts` and `src/domain/ports/ai-repository.ts` define the seams; `src/infrastructure/ai` implements disabled, Ollama-compatible local, OpenAI-compatible remote, and local-first hybrid adapters. Remote API keys are encrypted with the installation session secret and never serialized to the browser. Generated responses are profile-scoped review records; approval never mutates official or creator-authored content. Phase 16 behavior and operational safeguards are documented in `docs/phase16-optional-ai.md`.

## Phase 17 dependency direction

The `classrooms` feature owns classroom setup, enrollment, invitations, resource assignment, learner submissions, teacher feedback, rubric capture, resubmission, and teacher-facing analytics. `src/domain/classroom` contains framework-independent classroom records, bounded input rules, assignment timing and attempt rules, late-submission decisions, and review invariants. `src/domain/ports/classroom-repository.ts` defines the persistence seam, while `src/infrastructure/database/repositories/classroom-repository.ts` implements explicit SQLite and PostgreSQL queries over the Phase 17 tables.

Class-specific access is resolved from `class_teachers` and active `class_members` rows. Administrators retain global classroom visibility; teachers can manage only classrooms where they are owners or assigned teachers; learners receive only their own membership, targeted assignments, submissions, and rubric data. The existing local profile flow remains the default and requires no classroom setup. Assignments reference already-published platform resources by typed metadata, so classroom work does not duplicate or mutate authoritative lesson, course, exercise, assessment, simulation, laboratory, or roadmap content. Phase 17 behavior and privacy boundaries are documented in `docs/phase17-classrooms.md`.

## Phase 18 dependency direction

Deployment hardening stays in cross-cutting infrastructure rather than creating a later product
feature. `src/domain/storage` owns framework-free storage-key and upload-validation rules;
`src/infrastructure/storage` implements local and S3-compatible adapters plus signed URL support.
`src/infrastructure/auth/hosted-jwt.ts` verifies provider-neutral hosted bearer tokens before the
existing identity repository resolves permissions. `src/server/security.ts`, `src/server/rate-limit.ts`,
`src/server/audit.ts`, `src/server/health.ts`, and `src/server/metrics.ts` compose request security,
operational diagnostics, and observability without importing React or database drivers into the
domain. See `docs/phase18-deployment-hardening.md` for the deployment contract and operational
risks.

## Phase 19 dependency direction

Phase 19 remains cross-cutting quality infrastructure. `src/lib/focus.ts` owns the small browser
focusable-element primitive used by the shell and dialog components; accessibility preference
synchronization remains in the layout layer, while route loading boundaries remain in the app layer.
Feature components own their own semantic alternatives and loading/error/status states. Search and
simulation request cancellation stay at their browser client boundaries, and the search provider
continues to own SQLite/PostgreSQL-specific projections so domain search contracts do not change.

No Phase 19 migration or seed data is required. The audit and its verification contract are documented
in `docs/phase19-accessibility-performance-quality.md`.
