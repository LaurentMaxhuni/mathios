CREATE TABLE IF NOT EXISTS concepts (
  id TEXT PRIMARY KEY NOT NULL,
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  subject_id TEXT NOT NULL REFERENCES subjects(id) ON DELETE RESTRICT,
  domain_id TEXT REFERENCES domains(id) ON DELETE SET NULL,
  grade_min_id TEXT REFERENCES grades(id) ON DELETE SET NULL,
  grade_max_id TEXT REFERENCES grades(id) ON DELETE SET NULL,
  difficulty TEXT NOT NULL DEFAULT 'balanced' CHECK (difficulty IN ('gentle', 'balanced', 'challenging')),
  mastery_threshold INTEGER NOT NULL DEFAULT 70 CHECK (mastery_threshold BETWEEN 0 AND 100),
  is_archived INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS concepts_slug_idx ON concepts (slug);
CREATE INDEX IF NOT EXISTS concepts_subject_idx ON concepts (subject_id);
CREATE INDEX IF NOT EXISTS concepts_domain_idx ON concepts (domain_id);
CREATE INDEX IF NOT EXISTS concepts_grade_range_idx ON concepts (grade_min_id, grade_max_id);
CREATE INDEX IF NOT EXISTS concepts_difficulty_idx ON concepts (difficulty);
CREATE INDEX IF NOT EXISTS concepts_archived_idx ON concepts (is_archived);

CREATE TABLE IF NOT EXISTS lesson_concepts (
  lesson_id TEXT NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  concept_id TEXT NOT NULL REFERENCES concepts(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0 CHECK (sort_order >= 0),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (lesson_id, concept_id)
);

CREATE INDEX IF NOT EXISTS lesson_concepts_concept_idx ON lesson_concepts (concept_id, sort_order);

CREATE TABLE IF NOT EXISTS concept_relationships (
  id TEXT PRIMARY KEY NOT NULL,
  source_concept_id TEXT NOT NULL REFERENCES concepts(id) ON DELETE CASCADE,
  target_concept_id TEXT NOT NULL REFERENCES concepts(id) ON DELETE CASCADE,
  relationship_type TEXT NOT NULL CHECK (relationship_type IN (
    'requires', 'recommended-before', 'unlocks', 'related-to', 'builds-upon',
    'applies-in', 'used-by', 'cross-subject-connection', 'grade-level-extension',
    'advanced-extension', 'alternative-explanation'
  )),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (source_concept_id <> target_concept_id),
  UNIQUE (source_concept_id, target_concept_id, relationship_type)
);

CREATE INDEX IF NOT EXISTS concept_relationships_source_idx ON concept_relationships (source_concept_id, relationship_type);
CREATE INDEX IF NOT EXISTS concept_relationships_target_idx ON concept_relationships (target_concept_id, relationship_type);

CREATE TABLE IF NOT EXISTS concept_learning_objectives (
  concept_id TEXT NOT NULL REFERENCES concepts(id) ON DELETE CASCADE,
  objective_id TEXT NOT NULL REFERENCES learning_objectives(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0 CHECK (sort_order >= 0),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (concept_id, objective_id)
);

CREATE INDEX IF NOT EXISTS concept_learning_objectives_objective_idx ON concept_learning_objectives (objective_id);

CREATE TABLE IF NOT EXISTS concept_applications (
  id TEXT PRIMARY KEY NOT NULL,
  concept_id TEXT NOT NULL REFERENCES concepts(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0 CHECK (sort_order >= 0),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS concept_applications_concept_idx ON concept_applications (concept_id, sort_order);

CREATE TABLE IF NOT EXISTS concept_misconceptions (
  id TEXT PRIMARY KEY NOT NULL,
  concept_id TEXT NOT NULL REFERENCES concepts(id) ON DELETE CASCADE,
  misconception TEXT NOT NULL,
  correction TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0 CHECK (sort_order >= 0),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS concept_misconceptions_concept_idx ON concept_misconceptions (concept_id, sort_order);
