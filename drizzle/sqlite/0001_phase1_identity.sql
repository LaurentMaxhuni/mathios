CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY NOT NULL,
  identifier TEXT NOT NULL,
  auth_mode TEXT NOT NULL DEFAULT 'local-profile' CHECK (auth_mode IN ('neon-auth', 'local-profile', 'local-credential', 'hosted')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS users_identifier_idx ON users (identifier);

CREATE TABLE IF NOT EXISTS profiles (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  avatar TEXT NOT NULL DEFAULT 'orbit',
  preferred_theme TEXT NOT NULL DEFAULT 'system' CHECK (preferred_theme IN ('system', 'light', 'dark')),
  preferred_language TEXT NOT NULL DEFAULT 'en',
  current_curriculum TEXT,
  current_grade TEXT,
  target_grade TEXT,
  secret_hash TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS profiles_user_idx ON profiles (user_id);
CREATE INDEX IF NOT EXISTS profiles_display_name_idx ON profiles (display_name COLLATE NOCASE);

CREATE TABLE IF NOT EXISTS roles (
  id TEXT PRIMARY KEY NOT NULL,
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  is_system INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS roles_slug_idx ON roles (slug);

CREATE TABLE IF NOT EXISTS permissions (
  id TEXT PRIMARY KEY NOT NULL,
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS permissions_slug_idx ON permissions (slug);

CREATE TABLE IF NOT EXISTS user_roles (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id TEXT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, role_id)
);

CREATE INDEX IF NOT EXISTS user_roles_role_idx ON user_roles (role_id);

CREATE TABLE IF NOT EXISTS role_permissions (
  role_id TEXT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id TEXT NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (role_id, permission_id)
);

CREATE INDEX IF NOT EXISTS role_permissions_permission_idx ON role_permissions (permission_id);

CREATE TABLE IF NOT EXISTS user_settings (
  profile_id TEXT PRIMARY KEY NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  theme TEXT NOT NULL DEFAULT 'system' CHECK (theme IN ('system', 'light', 'dark')),
  reduced_motion INTEGER NOT NULL DEFAULT 0,
  text_size TEXT NOT NULL DEFAULT 'medium' CHECK (text_size IN ('small', 'medium', 'large')),
  default_grade TEXT,
  default_curriculum TEXT,
  preferred_subjects TEXT NOT NULL DEFAULT '[]',
  study_session_duration INTEGER NOT NULL DEFAULT 25 CHECK (study_session_duration BETWEEN 5 AND 180),
  week_start_day INTEGER NOT NULL DEFAULT 1 CHECK (week_start_day BETWEEN 0 AND 6),
  formula_rendering TEXT NOT NULL DEFAULT 'accessible' CHECK (formula_rendering IN ('rendered', 'accessible', 'plain')),
  accessibility_preferences TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS onboarding_responses (
  profile_id TEXT PRIMARY KEY NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  curriculum TEXT,
  current_grade TEXT,
  target_grade TEXT,
  subjects TEXT NOT NULL DEFAULT '[]',
  learning_goals TEXT NOT NULL DEFAULT '[]',
  weekly_study_time_minutes INTEGER,
  preferred_study_days TEXT NOT NULL DEFAULT '[]',
  difficulty_preference TEXT CHECK (difficulty_preference IN ('gentle', 'balanced', 'challenging')),
  skipped INTEGER NOT NULL DEFAULT 0,
  completed_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS onboarding_responses_updated_at_idx ON onboarding_responses (updated_at);
