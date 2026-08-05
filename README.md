# Mathios

Mathios is a local-first science learning platform. The repository is being built incrementally from the phases in [PROJECT_PLAN.md](PROJECT_PLAN.md). The current implementation includes Phase 0 and Phase 1: local profiles, authentication, roles, settings, and onboarding. Learning-content structures intentionally remain out of scope until Phase 2.

## Quick start

```powershell
npm install
Copy-Item .env.example .env
npm run db:setup
npm run dev
```

Open <http://localhost:3000>. The health endpoint is available at <http://localhost:3000/api/health>.

On first launch, create a local profile. The first profile receives the learner and administrator roles. Later profiles can be created by an administrator and start with the learner role. A profile PIN/password is optional and is hashed locally with Node's `scrypt` implementation.

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

SQLite is the default for offline development. The migration runner applies checked-in SQL files from `drizzle/sqlite`. PostgreSQL compatibility is kept in parallel migrations under `drizzle/postgres`. Phase 1 adds the identity tables in `0001_phase1_identity.sql`; `npm run db:seed` also installs the canonical roles and permissions. Set `DATABASE_PROVIDER=postgres` and a PostgreSQL connection URL to use the PostgreSQL path.

`AUTH_MODE=local-profile` is the default local profile selector. `AUTH_MODE=local-credential` uses the same provider-neutral local adapter and secret hash storage, leaving room for a dedicated credential UX later. `AUTH_MODE=hosted` is recognized by configuration but intentionally fails closed until a hosted provider is introduced in a later phase. Local sessions use an HttpOnly, signed cookie and do not require network access.

## Project boundaries

The application follows the modular-monolith conventions documented in [ARCHITECTURE.md](ARCHITECTURE.md). Domain modules should depend on ports and application services, not on database drivers or framework details. Phase-specific entities are introduced only when their phase begins. Phase 1 owns `src/features/profiles`, `src/features/auth`, `src/features/settings`, and `src/features/onboarding`; these modules depend on the identity repository port rather than importing database drivers directly.
