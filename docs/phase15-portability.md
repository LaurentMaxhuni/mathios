# Phase 15: Import, export, backup, and restore

Phase 15 makes the local Mathios installation portable without making any source feature table authoritative over another. The portability module snapshots the stable identifiers already used by curricula, courses, lessons, concepts, exercises, assessments, roadmaps, simulations, laboratory activities, notes, planner records, mastery, progress, and analytics.

## Package contract

Packages are JSON documents or ZIP archives with:

- a `mathios-portable` manifest;
- format version and source phase metadata;
- the source database provider;
- deterministic table/row counts and a SHA-256 checksum;
- allowlisted table snapshots with their primary keys;
- optional local storage assets under safe `assets/` paths.

JSON and ZIP are the restore formats. Markdown, CSV, HTML, and PDF are human-readable exports. ZIP files also include the JSON package, a manifest, per-table CSV files, and the rendered exports.

Profile-scoped user-data and settings captures follow foreign-key relationships from the selected profile. Profile secret hashes are intentionally omitted from exports and backups; a restore never replaces an existing profile credential with an exported secret.

## Restore behavior

Restore first validates the package magic, version, phase, table allowlist, column identifiers, asset paths, and checksums. A preview compares stable primary-key identities with the target installation and reports inserts, conflicts, replacements, and asset count.

- Merge inserts missing rows and leaves existing primary-key conflicts unchanged.
- Replace inserts missing rows and updates matching primary-key rows with the package values.

Database writes are ordered by foreign-key dependencies and run in one transaction. Unsafe ZIP paths, unsupported compression, incompatible schemas, invalid checksums, and database constraint failures are rejected without committing a partial database restore. Asset writes are staged before the database transaction and are cleaned up when the transaction fails.

## Backups and automatic policy

Manual backups are stored as ZIP artifacts through the configured `Storage` abstraction. `backup_settings` stores the enabled schedule, scope, retention count, relative storage location, and encryption flag. The local UI evaluates a due schedule when the portability workspace is opened; this keeps the feature usable in a local-first installation without introducing a background daemon. Retention marks older artifacts deleted and removes their storage object.

When encryption is enabled, the ZIP body is wrapped with AES-256-GCM using a key derived from the installation `SESSION_SECRET`. The key is never persisted in the database or sent to the browser, so encrypted backups require the same installation secret to restore.

## API surface

- `POST /api/portability/export` returns JSON, Markdown, CSV, ZIP, HTML, or PDF.
- `GET/POST /api/portability/backups` lists or creates ZIP backup artifacts.
- `GET /api/portability/backups/:backupId/download` downloads a ready artifact.
- `GET/PATCH /api/portability/settings` reads or updates the automatic policy.
- `POST /api/portability/restore` accepts a JSON/ZIP upload, with preview or merge/replace restore mode.

Full/content backup creation and restore use the Phase 1 `run_backups` and `restore_backups` permissions. Profile user-data/settings exports are available to the authenticated current profile; changing the backup policy requires `manage_application_settings`.

## Migration

`0015_phase15_portability.sql` is checked in for SQLite and PostgreSQL. It adds `backup_settings`, `backup_artifacts`, and `restore_runs`. Backup artifact files remain in `Storage`; the database only records their manifest, checksum, location, status, and audit metadata. The migration runner applies it transactionally after Phase 14.
