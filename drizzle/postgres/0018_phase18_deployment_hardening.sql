CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY NOT NULL,
  actor_profile_id TEXT REFERENCES profiles(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  resource_type TEXT,
  resource_id TEXT,
  ip_address TEXT,
  user_agent TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS audit_logs_actor_idx ON audit_logs (actor_profile_id, created_at);
CREATE INDEX IF NOT EXISTS audit_logs_event_idx ON audit_logs (event_type, created_at);
CREATE INDEX IF NOT EXISTS audit_logs_created_idx ON audit_logs (created_at);
