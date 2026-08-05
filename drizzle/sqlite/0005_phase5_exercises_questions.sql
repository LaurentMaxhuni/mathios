CREATE TABLE IF NOT EXISTS questions (
  id TEXT PRIMARY KEY NOT NULL,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  question_type TEXT NOT NULL CHECK (question_type IN ('multiple-choice', 'multiple-selection', 'true-false', 'numeric', 'numeric-tolerance', 'numeric-unit', 'algebraic-expression', 'formula', 'short-answer', 'long-answer', 'matching', 'ordering', 'diagram-labeling', 'graph-interpretation', 'table-interpretation', 'multi-step')),
  subject_id TEXT NOT NULL REFERENCES subjects(id) ON DELETE RESTRICT,
  grade_min_id TEXT REFERENCES grades(id) ON DELETE SET NULL,
  grade_max_id TEXT REFERENCES grades(id) ON DELETE SET NULL,
  difficulty TEXT NOT NULL DEFAULT 'balanced' CHECK (difficulty IN ('gentle', 'balanced', 'challenging')),
  estimated_time_seconds INTEGER NOT NULL DEFAULT 120 CHECK (estimated_time_seconds >= 0),
  source TEXT NOT NULL DEFAULT '',
  author_profile_id TEXT REFERENCES profiles(id) ON DELETE SET NULL,
  tags TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  current_version_number INTEGER NOT NULL DEFAULT 1 CHECK (current_version_number > 0),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS questions_slug_idx ON questions (slug);
CREATE INDEX IF NOT EXISTS questions_subject_idx ON questions (subject_id);
CREATE INDEX IF NOT EXISTS questions_grade_range_idx ON questions (grade_min_id, grade_max_id);
CREATE INDEX IF NOT EXISTS questions_type_idx ON questions (question_type);
CREATE INDEX IF NOT EXISTS questions_status_idx ON questions (status);

CREATE TABLE IF NOT EXISTS question_versions (
  id TEXT PRIMARY KEY NOT NULL,
  question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL CHECK (version_number > 0),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  prompt TEXT NOT NULL,
  answer_spec TEXT NOT NULL DEFAULT '{}',
  explanation TEXT NOT NULL DEFAULT '',
  full_solution TEXT NOT NULL DEFAULT '',
  common_wrong_answers TEXT NOT NULL DEFAULT '[]',
  error_feedback TEXT NOT NULL DEFAULT '{}',
  partial_credit_rules TEXT,
  change_summary TEXT NOT NULL DEFAULT '',
  created_by_profile_id TEXT REFERENCES profiles(id) ON DELETE SET NULL,
  published_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (question_id, version_number)
);
CREATE INDEX IF NOT EXISTS question_versions_question_idx ON question_versions (question_id, version_number);
CREATE INDEX IF NOT EXISTS question_versions_status_idx ON question_versions (status);

CREATE TABLE IF NOT EXISTS question_options (
  id TEXT PRIMARY KEY NOT NULL,
  question_version_id TEXT NOT NULL REFERENCES question_versions(id) ON DELETE CASCADE,
  option_key TEXT NOT NULL,
  label TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0 CHECK (sort_order >= 0),
  is_correct INTEGER NOT NULL DEFAULT 0,
  UNIQUE (question_version_id, option_key)
);
CREATE INDEX IF NOT EXISTS question_options_version_idx ON question_options (question_version_id, sort_order);

CREATE TABLE IF NOT EXISTS question_hints (
  id TEXT PRIMARY KEY NOT NULL,
  question_version_id TEXT NOT NULL REFERENCES question_versions(id) ON DELETE CASCADE,
  level INTEGER NOT NULL DEFAULT 1 CHECK (level > 0),
  content TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0 CHECK (sort_order >= 0),
  UNIQUE (question_version_id, level)
);
CREATE INDEX IF NOT EXISTS question_hints_version_idx ON question_hints (question_version_id, sort_order);

CREATE TABLE IF NOT EXISTS question_solutions (
  id TEXT PRIMARY KEY NOT NULL,
  question_version_id TEXT NOT NULL REFERENCES question_versions(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0 CHECK (sort_order >= 0)
);
CREATE INDEX IF NOT EXISTS question_solutions_version_idx ON question_solutions (question_version_id, sort_order);

CREATE TABLE IF NOT EXISTS question_concepts (
  question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  concept_id TEXT NOT NULL REFERENCES concepts(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0 CHECK (sort_order >= 0),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (question_id, concept_id)
);
CREATE INDEX IF NOT EXISTS question_concepts_concept_idx ON question_concepts (concept_id, sort_order);

CREATE TABLE IF NOT EXISTS question_learning_objectives (
  question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  objective_id TEXT NOT NULL REFERENCES learning_objectives(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0 CHECK (sort_order >= 0),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (question_id, objective_id)
);
CREATE INDEX IF NOT EXISTS question_learning_objectives_objective_idx ON question_learning_objectives (objective_id);

CREATE TABLE IF NOT EXISTS question_templates (
  id TEXT PRIMARY KEY NOT NULL,
  question_id TEXT REFERENCES questions(id) ON DELETE SET NULL,
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  question_type TEXT NOT NULL CHECK (question_type IN ('multiple-choice', 'multiple-selection', 'true-false', 'numeric', 'numeric-tolerance', 'numeric-unit', 'algebraic-expression', 'formula', 'short-answer', 'long-answer', 'matching', 'ordering', 'diagram-labeling', 'graph-interpretation', 'table-interpretation', 'multi-step')),
  prompt_template TEXT NOT NULL,
  variables TEXT NOT NULL DEFAULT '[]',
  answer_expression TEXT NOT NULL DEFAULT '',
  validation_spec TEXT NOT NULL DEFAULT '{}',
  seed INTEGER,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS question_templates_slug_idx ON question_templates (slug);
CREATE INDEX IF NOT EXISTS question_templates_question_idx ON question_templates (question_id);
CREATE INDEX IF NOT EXISTS question_templates_active_idx ON question_templates (is_active);

CREATE TABLE IF NOT EXISTS exercise_sets (
  id TEXT PRIMARY KEY NOT NULL,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  kind TEXT NOT NULL CHECK (kind IN ('lesson', 'module', 'concept', 'grade', 'custom', 'randomized', 'adaptive')),
  subject_id TEXT REFERENCES subjects(id) ON DELETE SET NULL,
  grade_id TEXT REFERENCES grades(id) ON DELETE SET NULL,
  difficulty TEXT NOT NULL DEFAULT 'balanced' CHECK (difficulty IN ('gentle', 'balanced', 'challenging')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  estimated_time_seconds INTEGER NOT NULL DEFAULT 0 CHECK (estimated_time_seconds >= 0),
  created_by_profile_id TEXT REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS exercise_sets_slug_idx ON exercise_sets (slug);
CREATE INDEX IF NOT EXISTS exercise_sets_status_idx ON exercise_sets (status);
CREATE INDEX IF NOT EXISTS exercise_sets_kind_idx ON exercise_sets (kind);
CREATE INDEX IF NOT EXISTS exercise_sets_subject_idx ON exercise_sets (subject_id);

CREATE TABLE IF NOT EXISTS exercise_set_questions (
  exercise_set_id TEXT NOT NULL REFERENCES exercise_sets(id) ON DELETE CASCADE,
  question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0 CHECK (sort_order >= 0),
  points REAL NOT NULL DEFAULT 1 CHECK (points > 0),
  is_required INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (exercise_set_id, question_id)
);
CREATE INDEX IF NOT EXISTS exercise_set_questions_question_idx ON exercise_set_questions (question_id, sort_order);

CREATE TABLE IF NOT EXISTS exercise_attempts (
  id TEXT PRIMARY KEY NOT NULL,
  exercise_set_id TEXT NOT NULL REFERENCES exercise_sets(id) ON DELETE CASCADE,
  profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'in-progress' CHECK (status IN ('in-progress', 'completed', 'abandoned')),
  seed INTEGER NOT NULL,
  score REAL NOT NULL DEFAULT 0 CHECK (score >= 0),
  max_score REAL NOT NULL DEFAULT 0 CHECK (max_score >= 0),
  started_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at TEXT
);
CREATE INDEX IF NOT EXISTS exercise_attempts_profile_idx ON exercise_attempts (profile_id, started_at);
CREATE INDEX IF NOT EXISTS exercise_attempts_set_idx ON exercise_attempts (exercise_set_id, status);

CREATE TABLE IF NOT EXISTS question_attempts (
  id TEXT PRIMARY KEY NOT NULL,
  exercise_attempt_id TEXT NOT NULL REFERENCES exercise_attempts(id) ON DELETE CASCADE,
  question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE RESTRICT,
  question_version_id TEXT NOT NULL REFERENCES question_versions(id) ON DELETE RESTRICT,
  template_id TEXT REFERENCES question_templates(id) ON DELETE SET NULL,
  instance_seed INTEGER,
  response TEXT NOT NULL DEFAULT 'null',
  validation_result TEXT NOT NULL DEFAULT '{}',
  score REAL NOT NULL DEFAULT 0 CHECK (score >= 0),
  max_score REAL NOT NULL DEFAULT 0 CHECK (max_score >= 0),
  answered_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (exercise_attempt_id, question_id)
);
CREATE INDEX IF NOT EXISTS question_attempts_attempt_idx ON question_attempts (exercise_attempt_id, answered_at);
CREATE INDEX IF NOT EXISTS question_attempts_question_idx ON question_attempts (question_id, answered_at);
