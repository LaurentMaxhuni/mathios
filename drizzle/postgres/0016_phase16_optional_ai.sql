CREATE TABLE IF NOT EXISTS ai_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  mode TEXT NOT NULL DEFAULT 'disabled' CHECK (mode IN ('disabled', 'local', 'remote', 'hybrid')),
  local_base_url TEXT NOT NULL DEFAULT 'http://127.0.0.1:11434',
  local_model TEXT NOT NULL DEFAULT 'llama3.2',
  remote_base_url TEXT NOT NULL DEFAULT 'https://api.openai.com/v1',
  remote_model TEXT NOT NULL DEFAULT 'gpt-4o-mini',
  remote_api_key_ciphertext TEXT,
  max_tokens INTEGER NOT NULL DEFAULT 800 CHECK (max_tokens BETWEEN 128 AND 4096),
  temperature DOUBLE PRECISION NOT NULL DEFAULT 0.2 CHECK (temperature BETWEEN 0 AND 2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO ai_settings (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS ai_generations (
  id TEXT PRIMARY KEY NOT NULL,
  profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  task TEXT NOT NULL,
  mode TEXT NOT NULL CHECK (mode IN ('disabled', 'local', 'remote', 'hybrid')),
  provider TEXT NOT NULL CHECK (provider IN ('disabled', 'local', 'remote')),
  model TEXT NOT NULL,
  instruction TEXT NOT NULL,
  grounding_json TEXT NOT NULL DEFAULT '[]',
  output_text TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'generated' CHECK (status IN ('generated', 'approved', 'rejected')),
  reviewed_by_profile_id TEXT REFERENCES profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ai_generations_profile_created_idx
  ON ai_generations(profile_id, created_at);
CREATE INDEX IF NOT EXISTS ai_generations_status_idx
  ON ai_generations(status, created_at);
