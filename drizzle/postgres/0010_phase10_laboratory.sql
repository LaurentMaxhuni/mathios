CREATE TABLE IF NOT EXISTS laboratory_activities (
  id TEXT PRIMARY KEY NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  subject_id TEXT NOT NULL REFERENCES subjects(id) ON DELETE RESTRICT,
  mode TEXT NOT NULL DEFAULT 'real-world' CHECK (mode IN ('simulated', 'real-world', 'hybrid')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  objective TEXT NOT NULL DEFAULT '',
  theory TEXT NOT NULL DEFAULT '',
  materials TEXT NOT NULL DEFAULT '[]',
  safety_notes TEXT NOT NULL DEFAULT '[]',
  analysis_prompt TEXT NOT NULL DEFAULT '',
  graphing_instructions TEXT NOT NULL DEFAULT '',
  questions TEXT NOT NULL DEFAULT '[]',
  conclusion_prompt TEXT NOT NULL DEFAULT '',
  extension_activity TEXT NOT NULL DEFAULT '',
  simulation_id TEXT REFERENCES simulations(id) ON DELETE SET NULL,
  estimated_duration_minutes INTEGER NOT NULL DEFAULT 0 CHECK (estimated_duration_minutes >= 0),
  created_by_profile_id TEXT REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  published_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS laboratory_activities_subject_status_idx ON laboratory_activities (subject_id, status, title);
CREATE INDEX IF NOT EXISTS laboratory_activities_mode_idx ON laboratory_activities (mode, status, title);

CREATE TABLE IF NOT EXISTS laboratory_steps (
  id TEXT PRIMARY KEY NOT NULL,
  activity_id TEXT NOT NULL REFERENCES laboratory_activities(id) ON DELETE CASCADE,
  step_type TEXT NOT NULL DEFAULT 'procedure' CHECK (step_type IN ('setup', 'procedure', 'observation', 'analysis', 'conclusion', 'extension')),
  title TEXT NOT NULL,
  instructions TEXT NOT NULL DEFAULT '',
  expected_observation TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0 CHECK (sort_order >= 0),
  is_required BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (activity_id, sort_order, id)
);
CREATE INDEX IF NOT EXISTS laboratory_steps_activity_idx ON laboratory_steps (activity_id, sort_order);

CREATE TABLE IF NOT EXISTS laboratory_variables (
  id TEXT PRIMARY KEY NOT NULL,
  activity_id TEXT NOT NULL REFERENCES laboratory_activities(id) ON DELETE CASCADE,
  variable_key TEXT NOT NULL,
  label TEXT NOT NULL,
  symbol TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT 'measured' CHECK (role IN ('independent', 'dependent', 'controlled', 'measured')),
  data_type TEXT NOT NULL DEFAULT 'number' CHECK (data_type IN ('number', 'text', 'boolean')),
  unit TEXT,
  description TEXT NOT NULL DEFAULT '',
  default_value TEXT,
  min_value DOUBLE PRECISION,
  max_value DOUBLE PRECISION,
  uncertainty DOUBLE PRECISION CHECK (uncertainty IS NULL OR uncertainty >= 0),
  significant_figures INTEGER CHECK (significant_figures IS NULL OR significant_figures BETWEEN 1 AND 12),
  theoretical_value DOUBLE PRECISION,
  configuration TEXT NOT NULL DEFAULT '{}',
  sort_order INTEGER NOT NULL DEFAULT 0 CHECK (sort_order >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (activity_id, variable_key)
);
CREATE INDEX IF NOT EXISTS laboratory_variables_activity_idx ON laboratory_variables (activity_id, role, sort_order);

CREATE TABLE IF NOT EXISTS laboratory_sessions (
  id TEXT PRIMARY KEY NOT NULL,
  profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  activity_id TEXT NOT NULL REFERENCES laboratory_activities(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'abandoned')),
  mode TEXT NOT NULL CHECK (mode IN ('simulated', 'real-world', 'hybrid')),
  simulation_session_id TEXT REFERENCES user_simulation_sessions(id) ON DELETE SET NULL,
  inputs TEXT NOT NULL DEFAULT '{}',
  state TEXT NOT NULL DEFAULT '{}',
  elapsed_seconds INTEGER NOT NULL DEFAULT 0 CHECK (elapsed_seconds >= 0),
  completion_percentage INTEGER NOT NULL DEFAULT 0 CHECK (completion_percentage BETWEEN 0 AND 100),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS laboratory_sessions_profile_activity_idx ON laboratory_sessions (profile_id, activity_id, updated_at);
CREATE INDEX IF NOT EXISTS laboratory_sessions_status_idx ON laboratory_sessions (profile_id, status, updated_at);

CREATE TABLE IF NOT EXISTS laboratory_observations (
  id TEXT PRIMARY KEY NOT NULL,
  session_id TEXT NOT NULL REFERENCES laboratory_sessions(id) ON DELETE CASCADE,
  step_id TEXT REFERENCES laboratory_steps(id) ON DELETE SET NULL,
  prompt TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sort_order INTEGER NOT NULL DEFAULT 0 CHECK (sort_order >= 0),
  metadata TEXT NOT NULL DEFAULT '{}'
);
CREATE INDEX IF NOT EXISTS laboratory_observations_session_idx ON laboratory_observations (session_id, sort_order, recorded_at);

CREATE TABLE IF NOT EXISTS laboratory_measurements (
  id TEXT PRIMARY KEY NOT NULL,
  session_id TEXT NOT NULL REFERENCES laboratory_sessions(id) ON DELETE CASCADE,
  variable_id TEXT NOT NULL REFERENCES laboratory_variables(id) ON DELETE CASCADE,
  observation_id TEXT REFERENCES laboratory_observations(id) ON DELETE SET NULL,
  row_index INTEGER NOT NULL CHECK (row_index >= 0),
  numeric_value DOUBLE PRECISION,
  text_value TEXT,
  unit TEXT,
  uncertainty DOUBLE PRECISION CHECK (uncertainty IS NULL OR uncertainty >= 0),
  significant_figures INTEGER CHECK (significant_figures IS NULL OR significant_figures BETWEEN 1 AND 12),
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'simulation', 'calculated')),
  notes TEXT NOT NULL DEFAULT '',
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (numeric_value IS NOT NULL OR text_value IS NOT NULL),
  UNIQUE (session_id, variable_id, row_index)
);
CREATE INDEX IF NOT EXISTS laboratory_measurements_session_idx ON laboratory_measurements (session_id, row_index, variable_id);

CREATE TABLE IF NOT EXISTS laboratory_reports (
  id TEXT PRIMARY KEY NOT NULL,
  session_id TEXT NOT NULL UNIQUE REFERENCES laboratory_sessions(id) ON DELETE CASCADE,
  profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'returned', 'graded')),
  title TEXT NOT NULL DEFAULT '',
  abstract TEXT NOT NULL DEFAULT '',
  sections TEXT NOT NULL DEFAULT '[]',
  tables TEXT NOT NULL DEFAULT '[]',
  charts TEXT NOT NULL DEFAULT '[]',
  formulas TEXT NOT NULL DEFAULT '[]',
  images TEXT NOT NULL DEFAULT '[]',
  conclusion TEXT NOT NULL DEFAULT '',
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS laboratory_reports_profile_status_idx ON laboratory_reports (profile_id, status, updated_at);

CREATE TABLE IF NOT EXISTS laboratory_feedback (
  id TEXT PRIMARY KEY NOT NULL,
  report_id TEXT NOT NULL REFERENCES laboratory_reports(id) ON DELETE CASCADE,
  author_profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  rubric TEXT NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS laboratory_feedback_report_idx ON laboratory_feedback (report_id, created_at);
