# Mathios

Phase 4 adds the concept explorer and knowledge graph at `/concepts` and `/knowledge-graph`: creators can author reusable concepts, prerequisite relationships, lesson/objective links, applications, and misconceptions, while learners can trace what each concept requires and unlocks.

Mathios is a local-first science learning platform. The repository is being built incrementally from the phases in [PROJECT_PLAN.md](PROJECT_PLAN.md). The current implementation includes Phase 0 through Phase 16: local profiles, curriculum and course structure, authoring and progress, concepts and mastery, assessments, roadmaps, simulations, virtual laboratories, a deterministic study planner, a profile-scoped personal knowledge base, local global search, portable backups, and optional grounded local/remote AI.

## Quick start

```powershell
npm install
Copy-Item .env.example .env
npm run db:setup
npm run dev
```

Open <http://localhost:3000>. The health endpoint is available at <http://localhost:3000/api/health>.

On first launch, create a local profile. The first profile receives the learner and administrator roles. Later profiles can be created by an administrator and start with the learner role. A profile PIN/password is optional and is hashed locally with Node's `scrypt` implementation. `db:seed` installs the three reference curricula, ten grade levels, five subjects, representative domains, mappings, and curriculum-specific learning objectives.

## Verification

```powershell
npm run lint
npm run format:check
npm run typecheck
npm test
npm run build
```

Playwright is configured for the health and local-profile smoke tests. Install its browser once with `npx playwright install chromium`, then run `npm run test:e2e`. The e2e runner creates a temporary seeded SQLite database so browser tests do not change the developer database.

## Docker

The Compose file starts the standalone Next.js server with PostgreSQL and a persistent local storage volume:

```powershell
docker compose up --build
```

The app health check is available at <http://localhost:3000/api/health>. The local migration and seed commands remain the canonical database setup commands; set `DATABASE_PROVIDER=postgres` and `DATABASE_URL=postgres://mathios:mathios@localhost:5432/mathios` in the invoking environment when running them against the Compose database.

## Database

SQLite is the default for offline development. The migration runner applies checked-in SQL files from `drizzle/sqlite`. PostgreSQL compatibility is kept in parallel migrations under `drizzle/postgres`. Phase 1 adds the identity tables in `0001_phase1_identity.sql`; Phase 2 adds the educational structure in `0002_phase2_curriculum_structure.sql`; Phase 3 adds courses, modules, lessons, structured blocks, versions, and progress in `0003_phase3_courses_lessons.sql`; Phase 4 adds concepts and graph links in `0004_phase4_concepts_knowledge_graph.sql`. `npm run db:seed` installs canonical roles, permissions, curriculum reference data, idempotent Phase 3 course content, and Phase 4 graph data. Set `DATABASE_PROVIDER=postgres` and a PostgreSQL connection URL to use the PostgreSQL path.

`AUTH_MODE=local-profile` is the default local profile selector. `AUTH_MODE=local-credential` uses the same provider-neutral local adapter and secret hash storage, leaving room for a dedicated credential UX later. `AUTH_MODE=hosted` is recognized by configuration but intentionally fails closed until a hosted provider is introduced in a later phase. Local sessions use an HttpOnly, signed cookie and do not require network access.

The study planner is available at `/planner`. It can generate a goal-backed schedule from published roadmaps, courses, grades, subjects, assessments, and concepts. The planner stores date-only sessions, keeps recurring availability separate from one-off exceptions, warns when a target is unrealistic, and carries completed lesson/roadmap work back into the existing progress records. See [the Phase 11 notes](docs/phase11-study-planner.md) for the domain and persistence contract.

The personal knowledge base is available at `/notes`. It stores profile-scoped Markdown/LaTeX notes, tags, folders, source-preserving highlights, bookmarks, internal backlinks, and a deterministic personal concept map. Global discovery is available at `/search`; it uses SQLite FTS5 locally, keeps personal records profile-scoped, and supports type, subject, grade, curriculum, difficulty, mastery, and publication filters. See [the Phase 12 notes](docs/phase12-notes-knowledge-base.md) and [the Phase 13 notes](docs/phase13-global-search.md) for the domain and persistence contracts.

The optional AI studio is available at `/ai`. It is disabled by default, supports Ollama-compatible local models, OpenAI-compatible remote APIs, and hybrid local-first routing, and keeps provider keys server-side. Generated responses are grounded in bounded lesson, concept, grade, mastery, and learner context; they are labeled and reviewable without changing authoritative content. See [the Phase 16 notes](docs/phase16-optional-ai.md).

## Project boundaries

The application follows the modular-monolith conventions documented in [ARCHITECTURE.md](ARCHITECTURE.md). Domain modules should depend on ports and application services, not on database drivers or framework details. Phase-specific entities are introduced only when their phase begins. Phase 1 owns identity, Phase 2 owns curriculum structure, Phase 3 owns courses and lessons, Phase 4 owns concepts, Phase 5 owns exercises, Phase 6 owns assessments, Phase 7 owns mastery, Phase 8 owns roadmaps, Phase 9 owns simulations, Phase 10 owns laboratories, Phase 11 owns `src/features/planner`, `src/domain/planner`, and its planner repository port, Phase 12 owns `src/features/notes`, `src/domain/notes`, and its notes repository port, Phase 13 owns `src/features/search`, `src/domain/search`, and the provider-backed search index, Phase 15 owns `src/features/portability`, and Phase 16 owns `src/features/ai`, `src/domain/ai`, its provider/repository ports, and provider adapters. These modules depend on repository ports rather than importing database drivers directly.

## Phase 2 workspace

Browse the structure from the sidebar or directly at `/curricula`, `/grades`, and `/subjects`. Curriculum, grade, subject, and domain dashboards show availability, required/optional placement, domain depth, and learning objectives. Administrators and content creators can use `/curricula/manage`, `/grades/manage`, `/subjects/manage`, and `/domains/manage` to edit the structure. Teachers retain their Phase 1 content-edit permission but do not receive structural management access unless they also hold the administrator or content-creator role.

## Phase 3 workspace

Browse published courses at `/courses`. Authorized authors can use `/courses/manage`, course editors, `/lessons/:lessonId/edit`, preview, and version history to build a Curriculum -> Grade -> Subject -> Course -> Module -> Lesson sequence. Lesson blocks support accessible formulas, rich content references, autosave, immutable published snapshots, restore-as-draft, and profile-scoped progress.

## Phase 4 workspace

Browse reusable concepts at `/concepts` and inspect their prerequisite and cross-subject connections at `/knowledge-graph`. Authorized authors can use `/concepts/manage` and the concept detail editor to maintain concept metadata, lesson and objective links, applications, misconceptions, and validated relationships. Required-prerequisite cycles are rejected, and graph traversal remains available through the concept API and server actions.
