CREATE TABLE IF NOT EXISTS learning_sessions (
  id TEXT PRIMARY KEY NOT NULL,
  profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  session_type TEXT NOT NULL CHECK (session_type IN ('study', 'lesson', 'exercise', 'assessment', 'simulation', 'laboratory', 'planner')),
  source_type TEXT,
  source_id TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER NOT NULL DEFAULT 0 CHECK (duration_seconds >= 0),
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS learning_sessions_profile_started_idx ON learning_sessions (profile_id, started_at);
CREATE INDEX IF NOT EXISTS learning_sessions_source_idx ON learning_sessions (source_type, source_id, status);

CREATE TABLE IF NOT EXISTS activity_events (
  id TEXT PRIMARY KEY NOT NULL,
  profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('lesson-view', 'lesson-completion', 'question-attempt', 'assessment-submission', 'simulation-session', 'note-creation', 'study-session-completion', 'mastery-change')),
  resource_type TEXT,
  resource_id TEXT,
  subject_id TEXT REFERENCES subjects(id) ON DELETE SET NULL,
  grade_id TEXT REFERENCES grades(id) ON DELETE SET NULL,
  concept_id TEXT REFERENCES concepts(id) ON DELETE SET NULL,
  learning_session_id TEXT REFERENCES learning_sessions(id) ON DELETE SET NULL,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  duration_seconds INTEGER NOT NULL DEFAULT 0 CHECK (duration_seconds >= 0),
  score DOUBLE PRECISION CHECK (score IS NULL OR (score >= 0 AND score <= 1)),
  is_correct INTEGER CHECK (is_correct IS NULL OR is_correct IN (0, 1)),
  hints_used INTEGER NOT NULL DEFAULT 0 CHECK (hints_used >= 0),
  attempt_number INTEGER NOT NULL DEFAULT 1 CHECK (attempt_number > 0),
  response_time_ms INTEGER CHECK (response_time_ms IS NULL OR response_time_ms >= 0),
  dedupe_key TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (profile_id, event_type, dedupe_key)
);
CREATE INDEX IF NOT EXISTS activity_events_profile_occurred_idx ON activity_events (profile_id, occurred_at, event_type);
CREATE INDEX IF NOT EXISTS activity_events_resource_idx ON activity_events (resource_type, resource_id, occurred_at);
CREATE INDEX IF NOT EXISTS activity_events_subject_idx ON activity_events (subject_id, occurred_at);
CREATE INDEX IF NOT EXISTS activity_events_concept_idx ON activity_events (concept_id, occurred_at);

CREATE TABLE IF NOT EXISTS analytics_snapshots (
  id TEXT PRIMARY KEY NOT NULL,
  profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  snapshot_type TEXT NOT NULL CHECK (snapshot_type IN ('daily', 'weekly', 'range')),
  snapshot_date TEXT NOT NULL,
  metrics_json TEXT NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (profile_id, snapshot_type, snapshot_date)
);
CREATE INDEX IF NOT EXISTS analytics_snapshots_profile_date_idx ON analytics_snapshots (profile_id, snapshot_date DESC);

CREATE TABLE IF NOT EXISTS learner_metrics (
  id TEXT PRIMARY KEY NOT NULL,
  profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  metric_date TEXT NOT NULL,
  time_studied_seconds INTEGER NOT NULL DEFAULT 0 CHECK (time_studied_seconds >= 0),
  lessons_started INTEGER NOT NULL DEFAULT 0 CHECK (lessons_started >= 0),
  lessons_completed INTEGER NOT NULL DEFAULT 0 CHECK (lessons_completed >= 0),
  questions_attempted INTEGER NOT NULL DEFAULT 0 CHECK (questions_attempted >= 0),
  correct_questions INTEGER NOT NULL DEFAULT 0 CHECK (correct_questions >= 0),
  accuracy DOUBLE PRECISION NOT NULL DEFAULT 0 CHECK (accuracy >= 0 AND accuracy <= 1),
  assessment_count INTEGER NOT NULL DEFAULT 0 CHECK (assessment_count >= 0),
  average_assessment_score DOUBLE PRECISION NOT NULL DEFAULT 0 CHECK (average_assessment_score >= 0 AND average_assessment_score <= 1),
  hints_used INTEGER NOT NULL DEFAULT 0 CHECK (hints_used >= 0),
  attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  average_response_time_ms DOUBLE PRECISION NOT NULL DEFAULT 0 CHECK (average_response_time_ms >= 0),
  study_days INTEGER NOT NULL DEFAULT 0 CHECK (study_days >= 0),
  streak_days INTEGER NOT NULL DEFAULT 0 CHECK (streak_days >= 0),
  consistency_score DOUBLE PRECISION NOT NULL DEFAULT 0 CHECK (consistency_score >= 0 AND consistency_score <= 1),
  mastery_score DOUBLE PRECISION NOT NULL DEFAULT 0 CHECK (mastery_score >= 0 AND mastery_score <= 1),
  mastered_concepts INTEGER NOT NULL DEFAULT 0 CHECK (mastered_concepts >= 0),
  weak_concepts INTEGER NOT NULL DEFAULT 0 CHECK (weak_concepts >= 0),
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (profile_id, metric_date)
);
CREATE INDEX IF NOT EXISTS learner_metrics_profile_date_idx ON learner_metrics (profile_id, metric_date DESC);

CREATE TABLE IF NOT EXISTS content_metrics (
  id TEXT PRIMARY KEY NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT NOT NULL,
  metric_date TEXT NOT NULL,
  subject_id TEXT REFERENCES subjects(id) ON DELETE SET NULL,
  grade_id TEXT REFERENCES grades(id) ON DELETE SET NULL,
  concept_id TEXT REFERENCES concepts(id) ON DELETE SET NULL,
  attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  completion_count INTEGER NOT NULL DEFAULT 0 CHECK (completion_count >= 0),
  correct_count INTEGER NOT NULL DEFAULT 0 CHECK (correct_count >= 0),
  accuracy DOUBLE PRECISION NOT NULL DEFAULT 0 CHECK (accuracy >= 0 AND accuracy <= 1),
  average_response_time_ms DOUBLE PRECISION NOT NULL DEFAULT 0 CHECK (average_response_time_ms >= 0),
  average_attempts DOUBLE PRECISION NOT NULL DEFAULT 0 CHECK (average_attempts >= 0),
  hint_rate DOUBLE PRECISION NOT NULL DEFAULT 0 CHECK (hint_rate >= 0),
  discrimination_index DOUBLE PRECISION NOT NULL DEFAULT 0 CHECK (discrimination_index >= -1 AND discrimination_index <= 1),
  support_count INTEGER NOT NULL DEFAULT 0 CHECK (support_count >= 0),
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (resource_type, resource_id, metric_date)
);
CREATE INDEX IF NOT EXISTS content_metrics_resource_idx ON content_metrics (resource_type, resource_id, metric_date DESC);
CREATE INDEX IF NOT EXISTS content_metrics_subject_idx ON content_metrics (subject_id, metric_date DESC);
CREATE INDEX IF NOT EXISTS content_metrics_support_idx ON content_metrics (support_count DESC, accuracy);
