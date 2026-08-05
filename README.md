# Mathios

Mathios is a local-first science learning platform. The repository is being built incrementally from the phases in [PROJECT_PLAN.md](PROJECT_PLAN.md). The current implementation is Phase 0: a runnable application foundation with no learning-content features enabled yet.

## Quick start

```powershell
npm install
Copy-Item .env.example .env
npm run db:setup
npm run dev
```

Open <http://localhost:3000>. The health endpoint is available at <http://localhost:3000/api/health>.

## Verification

```powershell
npm run lint
npm run typecheck
npm test
npm run build
```

Playwright is configured for the browser smoke test. Install its browser once with `npx playwright install chromium`, then run `npm run test:e2e`.

## Docker

The Compose file starts the standalone Next.js server with PostgreSQL and a persistent local storage volume:

```powershell
docker compose up --build
```

The app health check is available at <http://localhost:3000/api/health>. The local migration and seed commands remain the canonical database setup commands; set `DATABASE_PROVIDER=postgres` and `DATABASE_URL=postgres://mathios:mathios@localhost:5432/mathios` in the invoking environment when running them against the Compose database.

## Database

SQLite is the default for offline development. The migration runner applies checked-in SQL files from `drizzle/sqlite`. PostgreSQL compatibility is kept in a parallel `drizzle/postgres` migration and uses the same application metadata contract. Set `DATABASE_PROVIDER=postgres` and a PostgreSQL connection URL to use it.

## Project boundaries

The application follows the modular-monolith conventions documented in [ARCHITECTURE.md](ARCHITECTURE.md). Domain modules should depend on ports and application services, not on database drivers or framework details. Phase-specific entities are introduced only when their phase begins.
