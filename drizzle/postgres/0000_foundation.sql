CREATE TABLE IF NOT EXISTS app_metadata (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS app_metadata_updated_at_idx ON app_metadata (updated_at);
