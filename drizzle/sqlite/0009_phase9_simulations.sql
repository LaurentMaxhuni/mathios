CREATE TABLE IF NOT EXISTS simulations (
  id TEXT PRIMARY KEY NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  subject_id TEXT NOT NULL REFERENCES subjects(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  estimated_duration_minutes INTEGER NOT NULL DEFAULT 0 CHECK (estimated_duration_minutes >= 0),
  current_version_number INTEGER NOT NULL DEFAULT 0 CHECK (current_version_number >= 0),
  published_version_id TEXT,
  created_by_profile_id TEXT REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS simulations_subject_status_idx ON simulations (subject_id, status, title);

CREATE TABLE IF NOT EXISTS simulation_versions (
  id TEXT PRIMARY KEY NOT NULL,
  simulation_id TEXT NOT NULL REFERENCES simulations(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL CHECK (version_number > 0),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  definition TEXT NOT NULL DEFAULT '{}',
  change_summary TEXT NOT NULL DEFAULT '',
  created_by_profile_id TEXT REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  published_at TEXT,
  UNIQUE (simulation_id, version_number)
);
CREATE INDEX IF NOT EXISTS simulation_versions_status_idx ON simulation_versions (simulation_id, status, version_number);

CREATE TABLE IF NOT EXISTS simulation_inputs (
  simulation_version_id TEXT NOT NULL REFERENCES simulation_versions(id) ON DELETE CASCADE,
  input_key TEXT NOT NULL,
  label TEXT NOT NULL,
  input_type TEXT NOT NULL CHECK (input_type IN ('number', 'range', 'toggle', 'select')),
  configuration TEXT NOT NULL DEFAULT '{}',
  sort_order INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (simulation_version_id, input_key)
);

CREATE TABLE IF NOT EXISTS simulation_presets (
  id TEXT PRIMARY KEY NOT NULL,
  simulation_id TEXT NOT NULL REFERENCES simulations(id) ON DELETE CASCADE,
  profile_id TEXT REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  "values" TEXT NOT NULL DEFAULT '{}',
  is_default INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (simulation_id, profile_id, name)
);
CREATE INDEX IF NOT EXISTS simulation_presets_lookup_idx ON simulation_presets (simulation_id, profile_id, is_default);

CREATE TABLE IF NOT EXISTS lesson_simulations (
  lesson_id TEXT NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  simulation_id TEXT NOT NULL REFERENCES simulations(id) ON DELETE CASCADE,
  instructions TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_required INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (lesson_id, simulation_id)
);

CREATE TABLE IF NOT EXISTS user_simulation_sessions (
  id TEXT PRIMARY KEY NOT NULL,
  profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  simulation_id TEXT NOT NULL REFERENCES simulations(id) ON DELETE RESTRICT,
  simulation_version_id TEXT NOT NULL REFERENCES simulation_versions(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'abandoned')),
  inputs TEXT NOT NULL DEFAULT '{}',
  state TEXT NOT NULL DEFAULT '{}',
  elapsed_seconds INTEGER NOT NULL DEFAULT 0 CHECK (elapsed_seconds >= 0),
  started_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  paused_at TEXT,
  completed_at TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS user_simulation_sessions_profile_idx ON user_simulation_sessions (profile_id, simulation_id, updated_at);

CREATE TABLE IF NOT EXISTS simulation_results (
  id TEXT PRIMARY KEY NOT NULL,
  session_id TEXT NOT NULL REFERENCES user_simulation_sessions(id) ON DELETE CASCADE,
  profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  simulation_id TEXT NOT NULL REFERENCES simulations(id) ON DELETE RESTRICT,
  result TEXT NOT NULL DEFAULT '{}',
  completion_percentage INTEGER NOT NULL DEFAULT 0 CHECK (completion_percentage >= 0 AND completion_percentage <= 100),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS simulation_results_profile_idx ON simulation_results (profile_id, simulation_id, created_at);
