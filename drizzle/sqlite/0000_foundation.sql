CREATE TABLE IF NOT EXISTS app_metadata (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS app_metadata_updated_at_idx ON app_metadata (updated_at);
