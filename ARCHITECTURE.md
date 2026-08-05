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

Phase 1 adds the identity foundation through the `profiles`, `auth`, `settings`, and `onboarding` feature modules. Phase 2 adds the `curricula` module for reusable curricula, grades, subjects, domains, grade depth, and learning objectives. Phase 3 adds the `courses` feature for reusable course hierarchy, structured lessons, versioned authoring, publishing, and learner progress. Phase 4 adds the `concepts` feature for reusable concept entities, typed graph edges, prerequisite validation, traversal, lesson/objective linkage, and learner/author graph surfaces. Exercises, assessments, and mastery remain outside this phase.

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

Phase 0 creates `app_metadata`, used for migration/seed bookkeeping and future installation metadata. Phase 1 adds the identity tables in `0001_phase1_identity.sql`. Phase 2 adds the educational structure in `0002_phase2_curriculum_structure.sql`, including the supporting `grade_subject_domains` join needed to model domain depth by curriculum and grade. Phase 3 adds the course hierarchy, lesson blocks, assets, version snapshots, and learner progress in `0003_phase3_courses_lessons.sql`. Phase 4 adds concepts and graph links in `0004_phase4_concepts_knowledge_graph.sql`. SQL migrations are checked in per dialect and applied transactionally by `src/infrastructure/database/migrations.ts`. Feature tables are added in their own phases rather than pre-created as placeholders. Required prerequisite cycles are an application-level invariant; self-references, duplicate edges, allowed relationship types, foreign keys, and threshold bounds are also constrained by the Phase 4 migration.

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
