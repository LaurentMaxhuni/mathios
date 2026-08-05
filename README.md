# Mathios

Phase 3 adds the course catalog and content studio at `/courses`: creators can build modules and structured lessons, save draft snapshots, preview and publish versions, and learners can read published lessons and save progress.

Mathios is a local-first science learning platform. The repository is being built incrementally from the phases in [PROJECT_PLAN.md](PROJECT_PLAN.md). The current implementation includes Phase 0 through Phase 3: local profiles, authentication, roles, settings, onboarding, curriculum structure, course hierarchy, structured lesson authoring, publishing, and learner progress.

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

SQLite is the default for offline development. The migration runner applies checked-in SQL files from `drizzle/sqlite`. PostgreSQL compatibility is kept in parallel migrations under `drizzle/postgres`. Phase 1 adds the identity tables in `0001_phase1_identity.sql`; Phase 2 adds the educational structure in `0002_phase2_curriculum_structure.sql`; Phase 3 adds courses, modules, lessons, structured blocks, versions, and progress in `0003_phase3_courses_lessons.sql`. `npm run db:seed` installs canonical roles, permissions, curriculum reference data, and idempotent Phase 3 course content. Set `DATABASE_PROVIDER=postgres` and a PostgreSQL connection URL to use the PostgreSQL path.

`AUTH_MODE=local-profile` is the default local profile selector. `AUTH_MODE=local-credential` uses the same provider-neutral local adapter and secret hash storage, leaving room for a dedicated credential UX later. `AUTH_MODE=hosted` is recognized by configuration but intentionally fails closed until a hosted provider is introduced in a later phase. Local sessions use an HttpOnly, signed cookie and do not require network access.

## Project boundaries

The application follows the modular-monolith conventions documented in [ARCHITECTURE.md](ARCHITECTURE.md). Domain modules should depend on ports and application services, not on database drivers or framework details. Phase-specific entities are introduced only when their phase begins. Phase 1 owns `src/features/profiles`, `src/features/auth`, `src/features/settings`, and `src/features/onboarding`; Phase 2 owns `src/features/curricula` and its curriculum repository/domain port; Phase 3 owns `src/features/courses`, `src/domain/course`, and its course repository/domain port. These modules depend on repository ports rather than importing database drivers directly.

## Phase 2 workspace

Browse the structure from the sidebar or directly at `/curricula`, `/grades`, and `/subjects`. Curriculum, grade, subject, and domain dashboards show availability, required/optional placement, domain depth, and learning objectives. Administrators and content creators can use `/curricula/manage`, `/grades/manage`, `/subjects/manage`, and `/domains/manage` to edit the structure. Teachers retain their Phase 1 content-edit permission but do not receive structural management access unless they also hold the administrator or content-creator role.

## Phase 3 workspace

Browse published courses at `/courses`. Authorized authors can use `/courses/manage`, course editors, `/lessons/:lessonId/edit`, preview, and version history to build a Curriculum -> Grade -> Subject -> Course -> Module -> Lesson sequence. Lesson blocks support accessible formulas, rich content references, autosave, immutable published snapshots, restore-as-draft, and profile-scoped progress.
