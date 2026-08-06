CREATE TABLE IF NOT EXISTS backup_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  enabled BOOLEAN NOT NULL DEFAULT FALSE,
  schedule TEXT NOT NULL DEFAULT 'weekly' CHECK (schedule IN ('daily', 'weekly', 'monthly')),
  backup_type TEXT NOT NULL DEFAULT 'full' CHECK (backup_type IN ('full', 'content', 'user-data', 'settings')),
  retention_count INTEGER NOT NULL DEFAULT 5 CHECK (retention_count BETWEEN 1 AND 100),
  location TEXT NOT NULL DEFAULT 'backups',
  encryption_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  last_run_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
INSERT INTO backup_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS backup_artifacts (
  id TEXT PRIMARY KEY NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('full', 'content', 'user-data', 'settings')),
  format TEXT NOT NULL CHECK (format IN ('json', 'markdown', 'csv', 'zip', 'html', 'pdf')),
  storage_key TEXT NOT NULL UNIQUE,
  file_name TEXT NOT NULL,
  content_type TEXT NOT NULL,
  byte_size INTEGER NOT NULL CHECK (byte_size >= 0),
  checksum TEXT NOT NULL,
  manifest_json TEXT NOT NULL DEFAULT '{}',
  encryption_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'ready' CHECK (status IN ('ready', 'failed', 'deleted')),
  created_by_profile_id TEXT REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  error_message TEXT
);
CREATE INDEX IF NOT EXISTS backup_artifacts_created_idx ON backup_artifacts (created_at DESC, status);
CREATE INDEX IF NOT EXISTS backup_artifacts_kind_idx ON backup_artifacts (kind, created_at DESC);

CREATE TABLE IF NOT EXISTS restore_runs (
  id TEXT PRIMARY KEY NOT NULL,
  backup_id TEXT REFERENCES backup_artifacts(id) ON DELETE SET NULL,
  profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  source_file_name TEXT,
  mode TEXT NOT NULL CHECK (mode IN ('merge', 'replace')),
  status TEXT NOT NULL CHECK (status IN ('previewed', 'completed', 'failed')),
  package_checksum TEXT NOT NULL,
  conflict_count INTEGER NOT NULL DEFAULT 0 CHECK (conflict_count >= 0),
  inserted_count INTEGER NOT NULL DEFAULT 0 CHECK (inserted_count >= 0),
  updated_count INTEGER NOT NULL DEFAULT 0 CHECK (updated_count >= 0),
  preview_json TEXT NOT NULL DEFAULT '{}',
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  error_message TEXT
);
CREATE INDEX IF NOT EXISTS restore_runs_profile_started_idx ON restore_runs (profile_id, started_at DESC);
