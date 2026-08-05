CREATE TABLE IF NOT EXISTS assessments (
  id TEXT PRIMARY KEY NOT NULL,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  assessment_type TEXT NOT NULL CHECK (assessment_type IN ('lesson-knowledge-check', 'module-quiz', 'unit-test', 'grade-exam', 'subject-exam', 'diagnostic-test', 'placement-test', 'roadmap-checkpoint', 'cumulative-review', 'timed-exam', 'untimed-practice', 'olympiad-problem-set')),
  subject_id TEXT REFERENCES subjects(id) ON DELETE SET NULL,
  grade_id TEXT REFERENCES grades(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  time_limit_seconds INTEGER CHECK (time_limit_seconds IS NULL OR time_limit_seconds > 0),
  attempt_limit INTEGER CHECK (attempt_limit IS NULL OR attempt_limit > 0),
  passing_threshold REAL NOT NULL DEFAULT 0.6 CHECK (passing_threshold >= 0 AND passing_threshold <= 1),
  partial_credit INTEGER NOT NULL DEFAULT 1,
  feedback_visibility TEXT NOT NULL DEFAULT 'after-submit' CHECK (feedback_visibility IN ('immediate', 'after-submit', 'hidden')),
  review_mode TEXT NOT NULL DEFAULT 'full' CHECK (review_mode IN ('none', 'incorrect-only', 'full')),
  retake_rule TEXT NOT NULL DEFAULT 'after-failure' CHECK (retake_rule IN ('always', 'after-completion', 'after-failure', 'never')),
  question_ordering TEXT NOT NULL DEFAULT 'fixed' CHECK (question_ordering IN ('fixed', 'randomized')),
  auto_submit INTEGER NOT NULL DEFAULT 0,
  configuration TEXT NOT NULL DEFAULT '{}',
  created_by_profile_id TEXT REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS assessments_slug_idx ON assessments (slug);
CREATE INDEX IF NOT EXISTS assessments_status_idx ON assessments (status);
CREATE INDEX IF NOT EXISTS assessments_type_idx ON assessments (assessment_type);
CREATE INDEX IF NOT EXISTS assessments_subject_grade_idx ON assessments (subject_id, grade_id);

CREATE TABLE IF NOT EXISTS assessment_sections (
  id TEXT PRIMARY KEY NOT NULL,
  assessment_id TEXT NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0 CHECK (sort_order >= 0),
  points REAL NOT NULL DEFAULT 1 CHECK (points > 0),
  time_limit_seconds INTEGER CHECK (time_limit_seconds IS NULL OR time_limit_seconds > 0),
  question_ordering TEXT NOT NULL DEFAULT 'fixed' CHECK (question_ordering IN ('fixed', 'randomized')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS assessment_sections_assessment_idx ON assessment_sections (assessment_id, sort_order);

CREATE TABLE IF NOT EXISTS assessment_pools (
  id TEXT PRIMARY KEY NOT NULL,
  assessment_id TEXT NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  section_id TEXT NOT NULL REFERENCES assessment_sections(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  selection_count INTEGER NOT NULL CHECK (selection_count > 0),
  difficulty_distribution TEXT NOT NULL DEFAULT '{}',
  concept_ids TEXT NOT NULL DEFAULT '[]',
  question_ordering TEXT NOT NULL DEFAULT 'randomized' CHECK (question_ordering IN ('fixed', 'randomized')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS assessment_pools_section_idx ON assessment_pools (section_id);

CREATE TABLE IF NOT EXISTS assessment_questions (
  id TEXT PRIMARY KEY NOT NULL,
  assessment_id TEXT NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  section_id TEXT NOT NULL REFERENCES assessment_sections(id) ON DELETE CASCADE,
  pool_id TEXT REFERENCES assessment_pools(id) ON DELETE CASCADE,
  question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE RESTRICT,
  sort_order INTEGER NOT NULL DEFAULT 0 CHECK (sort_order >= 0),
  points REAL NOT NULL DEFAULT 1 CHECK (points > 0),
  is_required INTEGER NOT NULL DEFAULT 1
);
CREATE UNIQUE INDEX IF NOT EXISTS assessment_questions_fixed_idx ON assessment_questions (assessment_id, section_id, question_id) WHERE pool_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS assessment_questions_pool_idx ON assessment_questions (pool_id, question_id) WHERE pool_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS assessment_questions_section_idx ON assessment_questions (section_id, sort_order);
CREATE INDEX IF NOT EXISTS assessment_questions_question_idx ON assessment_questions (question_id);

CREATE TABLE IF NOT EXISTS assessment_attempts (
  id TEXT PRIMARY KEY NOT NULL,
  assessment_id TEXT NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'in-progress' CHECK (status IN ('in-progress', 'completed', 'expired', 'abandoned')),
  seed INTEGER NOT NULL,
  score REAL NOT NULL DEFAULT 0 CHECK (score >= 0),
  max_score REAL NOT NULL DEFAULT 0 CHECK (max_score >= 0),
  percentage REAL NOT NULL DEFAULT 0 CHECK (percentage >= 0 AND percentage <= 1),
  passed INTEGER,
  question_order TEXT NOT NULL DEFAULT '[]',
  question_instances TEXT NOT NULL DEFAULT '[]',
  started_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at TEXT,
  submitted_at TEXT
);
CREATE INDEX IF NOT EXISTS assessment_attempts_profile_idx ON assessment_attempts (profile_id, started_at);
CREATE INDEX IF NOT EXISTS assessment_attempts_assessment_idx ON assessment_attempts (assessment_id, profile_id, status);

CREATE TABLE IF NOT EXISTS assessment_section_results (
  id TEXT PRIMARY KEY NOT NULL,
  assessment_attempt_id TEXT NOT NULL REFERENCES assessment_attempts(id) ON DELETE CASCADE,
  section_id TEXT NOT NULL REFERENCES assessment_sections(id) ON DELETE CASCADE,
  score REAL NOT NULL DEFAULT 0 CHECK (score >= 0),
  max_score REAL NOT NULL DEFAULT 0 CHECK (max_score >= 0),
  percentage REAL NOT NULL DEFAULT 0 CHECK (percentage >= 0 AND percentage <= 1),
  correct_count INTEGER NOT NULL DEFAULT 0 CHECK (correct_count >= 0),
  answered_count INTEGER NOT NULL DEFAULT 0 CHECK (answered_count >= 0),
  question_count INTEGER NOT NULL DEFAULT 0 CHECK (question_count >= 0),
  concept_scores TEXT NOT NULL DEFAULT '{}',
  UNIQUE (assessment_attempt_id, section_id)
);
CREATE INDEX IF NOT EXISTS assessment_section_results_attempt_idx ON assessment_section_results (assessment_attempt_id);

CREATE TABLE IF NOT EXISTS diagnostic_results (
  id TEXT PRIMARY KEY NOT NULL,
  assessment_attempt_id TEXT NOT NULL UNIQUE REFERENCES assessment_attempts(id) ON DELETE CASCADE,
  readiness_grade_id TEXT REFERENCES grades(id) ON DELETE SET NULL,
  readiness_label TEXT NOT NULL,
  subject_strengths TEXT NOT NULL DEFAULT '[]',
  weak_concept_ids TEXT NOT NULL DEFAULT '[]',
  missing_prerequisite_concept_ids TEXT NOT NULL DEFAULT '[]',
  recommendations TEXT NOT NULL DEFAULT '[]',
  explanation TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS placement_results (
  id TEXT PRIMARY KEY NOT NULL,
  assessment_attempt_id TEXT NOT NULL UNIQUE REFERENCES assessment_attempts(id) ON DELETE CASCADE,
  recommended_grade_id TEXT REFERENCES grades(id) ON DELETE SET NULL,
  starting_level TEXT NOT NULL,
  confidence REAL NOT NULL DEFAULT 0 CHECK (confidence >= 0 AND confidence <= 1),
  review_question_ids TEXT NOT NULL DEFAULT '[]',
  recommendations TEXT NOT NULL DEFAULT '[]',
  explanation TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

DROP INDEX IF EXISTS question_attempts_attempt_idx;
DROP INDEX IF EXISTS question_attempts_question_idx;
ALTER TABLE question_attempts RENAME TO question_attempts_phase5;

CREATE TABLE question_attempts (
  id TEXT PRIMARY KEY NOT NULL,
  exercise_attempt_id TEXT REFERENCES exercise_attempts(id) ON DELETE CASCADE,
  assessment_attempt_id TEXT REFERENCES assessment_attempts(id) ON DELETE CASCADE,
  question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE RESTRICT,
  question_version_id TEXT NOT NULL REFERENCES question_versions(id) ON DELETE RESTRICT,
  template_id TEXT REFERENCES question_templates(id) ON DELETE SET NULL,
  instance_seed INTEGER,
  response TEXT NOT NULL DEFAULT 'null',
  validation_result TEXT NOT NULL DEFAULT '{}',
  score REAL NOT NULL DEFAULT 0 CHECK (score >= 0),
  max_score REAL NOT NULL DEFAULT 0 CHECK (max_score >= 0),
  answered_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK ((exercise_attempt_id IS NOT NULL) <> (assessment_attempt_id IS NOT NULL))
);
INSERT INTO question_attempts (id, exercise_attempt_id, assessment_attempt_id, question_id, question_version_id, template_id, instance_seed, response, validation_result, score, max_score, answered_at)
SELECT id, exercise_attempt_id, NULL, question_id, question_version_id, template_id, instance_seed, response, validation_result, score, max_score, answered_at
FROM question_attempts_phase5;
DROP TABLE question_attempts_phase5;
CREATE UNIQUE INDEX IF NOT EXISTS question_attempts_exercise_question_idx ON question_attempts (exercise_attempt_id, question_id);
CREATE UNIQUE INDEX IF NOT EXISTS question_attempts_assessment_question_idx ON question_attempts (assessment_attempt_id, question_id) WHERE assessment_attempt_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS question_attempts_exercise_idx ON question_attempts (exercise_attempt_id, answered_at);
CREATE INDEX IF NOT EXISTS question_attempts_assessment_idx ON question_attempts (assessment_attempt_id, answered_at);
CREATE INDEX IF NOT EXISTS question_attempts_question_idx ON question_attempts (question_id, answered_at);
