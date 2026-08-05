CREATE TABLE IF NOT EXISTS user_concept_mastery (
  profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  concept_id TEXT NOT NULL REFERENCES concepts(id) ON DELETE CASCADE,
  state TEXT NOT NULL DEFAULT 'not-started' CHECK (state IN ('not-started', 'introduced', 'developing', 'practiced', 'proficient', 'mastered', 'needs-review')),
  score DOUBLE PRECISION NOT NULL DEFAULT 0 CHECK (score >= 0 AND score <= 1),
  confidence DOUBLE PRECISION NOT NULL DEFAULT 0 CHECK (confidence >= 0 AND confidence <= 1),
  evidence_count INTEGER NOT NULL DEFAULT 0 CHECK (evidence_count >= 0),
  evidence_type_count INTEGER NOT NULL DEFAULT 0 CHECK (evidence_type_count >= 0),
  difficulty_band_count INTEGER NOT NULL DEFAULT 0 CHECK (difficulty_band_count >= 0),
  last_practiced_at TIMESTAMPTZ,
  next_review_at TIMESTAMPTZ,
  breakdown TEXT NOT NULL DEFAULT '{}',
  evidence_summary TEXT NOT NULL DEFAULT '[]',
  current_snapshot_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (profile_id, concept_id)
);
CREATE INDEX IF NOT EXISTS user_concept_mastery_profile_state_idx ON user_concept_mastery (profile_id, state, score);
CREATE INDEX IF NOT EXISTS user_concept_mastery_review_idx ON user_concept_mastery (profile_id, next_review_at);
CREATE INDEX IF NOT EXISTS user_concept_mastery_concept_idx ON user_concept_mastery (concept_id);

CREATE TABLE IF NOT EXISTS mastery_events (
  id TEXT PRIMARY KEY NOT NULL,
  profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  concept_id TEXT NOT NULL REFERENCES concepts(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('lesson-completion', 'exercise', 'assessment')),
  source_id TEXT NOT NULL,
  score DOUBLE PRECISION NOT NULL DEFAULT 0 CHECK (score >= 0 AND score <= 1),
  difficulty TEXT NOT NULL DEFAULT 'balanced' CHECK (difficulty IN ('gentle', 'balanced', 'challenging', 'mixed')),
  attempts INTEGER NOT NULL DEFAULT 1 CHECK (attempts > 0),
  hints_used INTEGER NOT NULL DEFAULT 0 CHECK (hints_used >= 0),
  partial_credit BOOLEAN NOT NULL DEFAULT FALSE,
  metadata TEXT NOT NULL DEFAULT '{}',
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (profile_id, concept_id, event_type, source_id)
);
CREATE INDEX IF NOT EXISTS mastery_events_profile_concept_idx ON mastery_events (profile_id, concept_id, occurred_at);
CREATE INDEX IF NOT EXISTS mastery_events_source_idx ON mastery_events (event_type, source_id);

CREATE TABLE IF NOT EXISTS mastery_snapshots (
  id TEXT PRIMARY KEY NOT NULL,
  profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  concept_id TEXT NOT NULL REFERENCES concepts(id) ON DELETE CASCADE,
  state TEXT NOT NULL CHECK (state IN ('not-started', 'introduced', 'developing', 'practiced', 'proficient', 'mastered', 'needs-review')),
  score DOUBLE PRECISION NOT NULL CHECK (score >= 0 AND score <= 1),
  confidence DOUBLE PRECISION NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  evidence_count INTEGER NOT NULL CHECK (evidence_count >= 0),
  evidence_type_count INTEGER NOT NULL CHECK (evidence_type_count >= 0),
  difficulty_band_count INTEGER NOT NULL CHECK (difficulty_band_count >= 0),
  last_practiced_at TIMESTAMPTZ,
  next_review_at TIMESTAMPTZ,
  breakdown TEXT NOT NULL DEFAULT '{}',
  evidence_summary TEXT NOT NULL DEFAULT '[]',
  reason TEXT NOT NULL DEFAULT 'Evidence updated.',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS mastery_snapshots_profile_concept_idx ON mastery_snapshots (profile_id, concept_id, created_at);

CREATE TABLE IF NOT EXISTS mastery_rules (
  id TEXT PRIMARY KEY NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  configuration TEXT NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS recommendation_rules (
  id TEXT PRIMARY KEY NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  configuration TEXT NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS recommendations (
  id TEXT PRIMARY KEY NOT NULL,
  profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  concept_id TEXT REFERENCES concepts(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('missing-prerequisite', 'weak-concept', 'failed-assessment', 'due-for-review', 'grade-requirement', 'nearly-mastered', 'recently-unlocked')),
  source_key TEXT NOT NULL,
  title TEXT NOT NULL,
  reason TEXT NOT NULL,
  priority INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'dismissed', 'completed')),
  metadata TEXT NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  UNIQUE (profile_id, kind, source_key)
);
CREATE INDEX IF NOT EXISTS recommendations_profile_status_idx ON recommendations (profile_id, status, priority);
CREATE INDEX IF NOT EXISTS recommendations_concept_idx ON recommendations (concept_id, status);

CREATE TABLE IF NOT EXISTS recommendation_dismissals (
  id TEXT PRIMARY KEY NOT NULL,
  recommendation_id TEXT NOT NULL REFERENCES recommendations(id) ON DELETE CASCADE,
  profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  dismissed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reason TEXT,
  UNIQUE (profile_id, recommendation_id)
);
CREATE INDEX IF NOT EXISTS recommendation_dismissals_profile_idx ON recommendation_dismissals (profile_id, dismissed_at);
