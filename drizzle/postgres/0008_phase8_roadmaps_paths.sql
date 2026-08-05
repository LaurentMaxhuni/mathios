CREATE TABLE IF NOT EXISTS roadmaps (
  id TEXT PRIMARY KEY NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  goal TEXT NOT NULL DEFAULT '',
  target_grade_id TEXT REFERENCES grades(id) ON DELETE SET NULL,
  target_difficulty TEXT NOT NULL DEFAULT 'balanced' CHECK (target_difficulty IN ('gentle', 'balanced', 'challenging')),
  estimated_duration_minutes INTEGER NOT NULL DEFAULT 0 CHECK (estimated_duration_minutes >= 0),
  cover_image TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  created_by_profile_id TEXT REFERENCES profiles(id) ON DELETE SET NULL,
  current_version_number INTEGER NOT NULL DEFAULT 0 CHECK (current_version_number >= 0),
  published_version_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS roadmaps_status_idx ON roadmaps (status, updated_at);
CREATE INDEX IF NOT EXISTS roadmaps_target_grade_idx ON roadmaps (target_grade_id, status);

CREATE TABLE IF NOT EXISTS roadmap_versions (
  id TEXT PRIMARY KEY NOT NULL,
  roadmap_id TEXT NOT NULL REFERENCES roadmaps(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL CHECK (version_number > 0),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  change_summary TEXT NOT NULL DEFAULT '',
  snapshot TEXT NOT NULL DEFAULT '{}',
  created_by_profile_id TEXT REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  published_at TIMESTAMPTZ,
  UNIQUE (roadmap_id, version_number)
);
CREATE INDEX IF NOT EXISTS roadmap_versions_roadmap_status_idx ON roadmap_versions (roadmap_id, status, version_number);

CREATE TABLE IF NOT EXISTS roadmap_subjects (
  roadmap_id TEXT NOT NULL REFERENCES roadmaps(id) ON DELETE CASCADE,
  subject_id TEXT NOT NULL REFERENCES subjects(id) ON DELETE RESTRICT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (roadmap_id, subject_id)
);
CREATE INDEX IF NOT EXISTS roadmap_subjects_subject_idx ON roadmap_subjects (subject_id, roadmap_id);

CREATE TABLE IF NOT EXISTS roadmap_prerequisites (
  roadmap_id TEXT NOT NULL REFERENCES roadmaps(id) ON DELETE CASCADE,
  prerequisite_roadmap_id TEXT NOT NULL REFERENCES roadmaps(id) ON DELETE RESTRICT,
  is_required BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (roadmap_id, prerequisite_roadmap_id),
  CHECK (roadmap_id <> prerequisite_roadmap_id)
);
CREATE INDEX IF NOT EXISTS roadmap_prerequisites_reverse_idx ON roadmap_prerequisites (prerequisite_roadmap_id, roadmap_id);

CREATE TABLE IF NOT EXISTS roadmap_nodes (
  id TEXT PRIMARY KEY NOT NULL,
  roadmap_version_id TEXT NOT NULL REFERENCES roadmap_versions(id) ON DELETE CASCADE,
  node_key TEXT NOT NULL,
  node_type TEXT NOT NULL CHECK (node_type IN ('concept', 'lesson', 'course', 'module', 'assessment', 'simulation', 'laboratory-activity', 'milestone')),
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  reference_id TEXT,
  reference_title TEXT,
  subject_id TEXT REFERENCES subjects(id) ON DELETE SET NULL,
  is_required BOOLEAN NOT NULL DEFAULT TRUE,
  is_checkpoint BOOLEAN NOT NULL DEFAULT FALSE,
  is_optional_branch BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  estimated_duration_minutes INTEGER NOT NULL DEFAULT 0 CHECK (estimated_duration_minutes >= 0),
  metadata TEXT NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (roadmap_version_id, node_key)
);
CREATE INDEX IF NOT EXISTS roadmap_nodes_version_order_idx ON roadmap_nodes (roadmap_version_id, sort_order, node_key);
CREATE INDEX IF NOT EXISTS roadmap_nodes_reference_idx ON roadmap_nodes (reference_id, node_type);

CREATE TABLE IF NOT EXISTS roadmap_edges (
  id TEXT PRIMARY KEY NOT NULL,
  roadmap_version_id TEXT NOT NULL REFERENCES roadmap_versions(id) ON DELETE CASCADE,
  source_node_id TEXT NOT NULL REFERENCES roadmap_nodes(id) ON DELETE CASCADE,
  target_node_id TEXT NOT NULL REFERENCES roadmap_nodes(id) ON DELETE CASCADE,
  edge_type TEXT NOT NULL DEFAULT 'requires' CHECK (edge_type IN ('requires', 'recommended', 'optional')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (roadmap_version_id, source_node_id, target_node_id)
);
CREATE INDEX IF NOT EXISTS roadmap_edges_version_idx ON roadmap_edges (roadmap_version_id, sort_order, id);
CREATE INDEX IF NOT EXISTS roadmap_edges_target_idx ON roadmap_edges (target_node_id, edge_type);

CREATE TABLE IF NOT EXISTS user_roadmaps (
  id TEXT PRIMARY KEY NOT NULL,
  profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  roadmap_id TEXT NOT NULL REFERENCES roadmaps(id) ON DELETE CASCADE,
  roadmap_version_id TEXT NOT NULL REFERENCES roadmap_versions(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'archived')),
  selected_goal TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (profile_id, roadmap_id)
);
CREATE INDEX IF NOT EXISTS user_roadmaps_profile_status_idx ON user_roadmaps (profile_id, status, updated_at);
CREATE INDEX IF NOT EXISTS user_roadmaps_roadmap_idx ON user_roadmaps (roadmap_id, status);

CREATE TABLE IF NOT EXISTS user_roadmap_progress (
  user_roadmap_id TEXT NOT NULL REFERENCES user_roadmaps(id) ON DELETE CASCADE,
  profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  roadmap_node_id TEXT NOT NULL REFERENCES roadmap_nodes(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'locked' CHECK (status IN ('locked', 'available', 'in-progress', 'completed', 'skipped')),
  completion_percentage INTEGER NOT NULL DEFAULT 0 CHECK (completion_percentage >= 0 AND completion_percentage <= 100),
  unlocked_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_roadmap_id, roadmap_node_id)
);
CREATE INDEX IF NOT EXISTS user_roadmap_progress_profile_status_idx ON user_roadmap_progress (profile_id, status, updated_at);
CREATE INDEX IF NOT EXISTS user_roadmap_progress_node_idx ON user_roadmap_progress (roadmap_node_id, status);

CREATE TABLE IF NOT EXISTS personalized_paths (
  id TEXT PRIMARY KEY NOT NULL,
  profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  roadmap_id TEXT NOT NULL REFERENCES roadmaps(id) ON DELETE CASCADE,
  user_roadmap_id TEXT REFERENCES user_roadmaps(id) ON DELETE CASCADE,
  current_grade_id TEXT REFERENCES grades(id) ON DELETE SET NULL,
  target_grade_id TEXT REFERENCES grades(id) ON DELETE SET NULL,
  selected_goal TEXT,
  weekly_study_time_minutes INTEGER CHECK (weekly_study_time_minutes IS NULL OR weekly_study_time_minutes > 0),
  estimated_duration_minutes INTEGER NOT NULL DEFAULT 0 CHECK (estimated_duration_minutes >= 0),
  estimated_weeks INTEGER CHECK (estimated_weeks IS NULL OR estimated_weeks > 0),
  included_topics TEXT NOT NULL DEFAULT '[]',
  skipped_mastered_topics TEXT NOT NULL DEFAULT '[]',
  missing_prerequisites TEXT NOT NULL DEFAULT '[]',
  path_nodes TEXT NOT NULL DEFAULT '[]',
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS personalized_paths_profile_roadmap_idx ON personalized_paths (profile_id, roadmap_id, generated_at);
