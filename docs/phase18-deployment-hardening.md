# Phase 18: Deployment hardening and production readiness

Phase 18 keeps Mathios as one modular monolith while making the same application usable in a
local SQLite installation, Docker with PostgreSQL, and a hosted PostgreSQL/object-storage
deployment. The production path is provider-neutral: deployment credentials are parsed once by
`src/lib/env.ts`, then passed to infrastructure adapters.

## Deployment modes

- Development and test default to SQLite and local filesystem storage.
- `APP_ENV=local-production` supports a hardened single-host installation with SQLite or
  PostgreSQL and local storage.
- `APP_ENV=docker` uses the checked-in Compose PostgreSQL service. The database is on the internal
  Compose network and is not published to the host. The image runs runtime migrations before
  starting the standalone Next.js server.
- `APP_ENV=hosted-production` requires PostgreSQL, S3-compatible storage, a non-local public URL,
  and a non-placeholder 48-character session secret. Use a secret manager for all credentials.

## Environment and secrets

Start from `.env.example`. Never commit `.env`, S3 credentials, hosted-auth keys, metrics tokens,
or database URLs containing passwords. Rotate `SESSION_SECRET` and provider credentials through the
deployment secret manager; rotating `SESSION_SECRET` intentionally invalidates local sessions and
the installation-secret-backed backup encryption key.

Important production settings include:

- `DATABASE_POOL_MAX`, `DATABASE_CONNECT_TIMEOUT_SECONDS`, and `DATABASE_IDLE_TIMEOUT_SECONDS`.
- `STORAGE_PROVIDER=s3`, `S3_BUCKET`, `S3_REGION`, optional `S3_ENDPOINT`, and deployment-managed
  `S3_ACCESS_KEY_ID`/`S3_SECRET_ACCESS_KEY` credentials (plus `S3_SESSION_TOKEN` when required).
- `AUTH_MODE=hosted` with `HOSTED_AUTH_SHARED_SECRET` for HS256 or `HOSTED_AUTH_PUBLIC_KEY` for
  RS256. Tokens are accepted only from `Authorization: Bearer` and pass expiry, issuer, and
  audience checks when configured. A hosted subject must have a matching local `users.identifier`.
- `RATE_LIMIT_*`, `AUTH_RATE_LIMIT_*`, `CSRF_PROTECTION_ENABLED`, and `TRUST_PROXY`.
- `ERROR_TRACKING_DSN` and `METRICS_TOKEN` when an external collector or Prometheus scraper is
  used.

## Database operations

The migration runner applies checked-in SQLite or PostgreSQL SQL files transactionally. PostgreSQL
migrations take an advisory lock so two application instances cannot apply the same migration at
the same time. The current migration is
`0018_phase18_deployment_hardening.sql`, which adds append-only `audit_logs` and indexes it by
actor, event, and creation time.

Use the normal commands from the deployment environment:

```powershell
$env:DATABASE_PROVIDER = "postgres"
$env:DATABASE_URL = "postgres://..."
npm run db:migrate
npm run db:seed
```

`npm run db:backup` creates a consistent SQLite backup through SQLite's online backup API or
invokes `pg_dump --format=custom` for PostgreSQL. Store database backups separately from the
application storage bucket, encrypt them at rest, and exercise restore procedures regularly.

For a feasible SQLite-to-PostgreSQL move, create a Phase 15 portable full/content/user-data package
from the source installation, initialize the PostgreSQL target with `db:migrate` and `db:seed`, and
restore the package through `/api/portability/restore` in merge or replace mode. Validate row counts,
foreign-key integrity, uploaded assets, and representative learner/classroom flows before cutover.
SQLite engine-specific FTS indexes are rebuilt by the search service; audit history and backup
artifact files should be transferred through their operational backup process rather than included
in a learner portability package.

## Object storage and uploads

`Storage` remains the application boundary. `LocalFileStorage` is safe-rooted and atomic; the S3
adapter uses a small AWS Signature V4 client that works with AWS S3 and compatible endpoints such
as MinIO or R2. Signed URL requests are exposed through `POST /api/storage/signed-url`. Local
signed URLs resolve through the application download/upload routes; S3 signed URLs go directly to
the configured provider.

Uploads are bounded by `STORAGE_MAX_UPLOAD_BYTES`, normalize and validate relative keys, allow only
known content types, reject traversal, and perform lightweight magic-byte/text checks for ZIP, PDF,
PNG, JPEG, GIF, WebP, and text formats. This is validation, not a malware verdict: deployments that
accept untrusted files should add an asynchronous antivirus/quarantine step before publishing an
asset.

## Security controls

- Security headers and a conservative Content Security Policy are applied globally.
- API mutations made with the local cookie session require a same-origin request; bearer-token
  hosted requests do not rely on cookies. Cross-site fetch metadata is rejected as a fallback.
- API requests receive a bounded request ID and an in-process rate limit. Authentication attempts
  have a separate identifier-based brute-force limit. For multiple application instances, put a
  shared gateway/edge limiter in front of the app; the in-process limiter is not a distributed
  coordination system.
- Local sessions are HttpOnly, `SameSite=Lax`, secure in production, signed with HMAC, rotated at
  the configured interval, and reloaded against current roles/permissions on each request.
- Auth success/failure/logout, storage signing, and future privileged operations can write to the
  append-only audit log. Audit writes are best-effort so a logging outage cannot roll back a
  completed learning operation.
- Database credentials are not exposed by Compose ports or readiness responses. Production
  PostgreSQL should use a private network, TLS where supported, least-privilege credentials, and
  provider-managed backups.

## Health, readiness, and observability

- `GET /api/health` is the database-backed health check and returns `503` when the database is not
  reachable.
- `GET /api/readiness` checks database connectivity, the latest migration, storage access/config,
  and production configuration. It returns `503` until all checks pass.
- `GET /api/metrics` returns JSON or Prometheus text. Set `METRICS_TOKEN` for a scraper; otherwise
  an authenticated administrator with `manage_application_settings` is required.
- Logs are structured JSON through `src/lib/logger.ts`. The error-tracking adapter is no-op by
  default and sends bounded exception context to `ERROR_TRACKING_DSN` when configured.
- `/settings/system` gives administrators a safe readiness view without secrets or connection
  strings.

## Deployment targets

Docker Compose is the reference self-hosted deployment. A Linux host can run the same standalone
image behind TLS termination and a private PostgreSQL/S3 network. A Node-compatible host can run
`npm run build` followed by `npm run start`, with migrations run as a release job. A Vercel-style
frontend deployment is suitable only when the database, S3-compatible storage, hosted auth, and
secret configuration are externalized; local filesystem storage and in-process rate limiting are
not durable across serverless instances.

Before declaring a deployment ready, run migrations, verify `/api/readiness`, create and restore a
backup in a non-production environment, test a signed object URL, verify hosted-auth subject
mapping, confirm the metrics endpoint is protected, and review the audit log retention policy.
