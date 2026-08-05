# Mathios architecture

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

Phase 1 adds the identity foundation through the `profiles`, `auth`, `settings`, and `onboarding` feature modules. Users, profiles, roles, permissions, and their local preferences are persisted locally. Curriculum, grade, subject, learning-content, and progress entities remain intentionally absent until their planned phases.

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

Phase 0 creates `app_metadata`, used for migration/seed bookkeeping and future installation metadata. Phase 1 adds the identity tables in `0001_phase1_identity.sql`. SQL migrations are checked in per dialect and applied transactionally by `src/infrastructure/database/migrations.ts`. Feature tables are added in their own phases rather than pre-created as placeholders.
