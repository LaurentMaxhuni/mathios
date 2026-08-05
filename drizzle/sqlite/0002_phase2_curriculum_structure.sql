CREATE TABLE IF NOT EXISTS curricula (
  id TEXT PRIMARY KEY NOT NULL,
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'custom' CHECK (kind IN ('custom', 'kosovo', 'international')),
  description TEXT NOT NULL DEFAULT '',
  authority TEXT,
  is_system INTEGER NOT NULL DEFAULT 0,
  is_archived INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS curricula_slug_idx ON curricula (slug);
CREATE INDEX IF NOT EXISTS curricula_archived_idx ON curricula (is_archived);

CREATE TABLE IF NOT EXISTS grades (
  id TEXT PRIMARY KEY NOT NULL,
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  short_name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_archived INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS grades_slug_idx ON grades (slug);
CREATE INDEX IF NOT EXISTS grades_sort_order_idx ON grades (sort_order);

CREATE TABLE IF NOT EXISTS curriculum_grades (
  curriculum_id TEXT NOT NULL REFERENCES curricula(id) ON DELETE CASCADE,
  grade_id TEXT NOT NULL REFERENCES grades(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_available INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (curriculum_id, grade_id)
);

CREATE INDEX IF NOT EXISTS curriculum_grades_grade_idx ON curriculum_grades (grade_id);

CREATE TABLE IF NOT EXISTS subjects (
  id TEXT PRIMARY KEY NOT NULL,
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  icon TEXT NOT NULL DEFAULT 'book-open',
  accent TEXT NOT NULL DEFAULT 'accent',
  recommended_study_hours INTEGER NOT NULL DEFAULT 0 CHECK (recommended_study_hours >= 0),
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_archived INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS subjects_slug_idx ON subjects (slug);
CREATE INDEX IF NOT EXISTS subjects_sort_order_idx ON subjects (sort_order);

CREATE TABLE IF NOT EXISTS curriculum_subjects (
  curriculum_id TEXT NOT NULL REFERENCES curricula(id) ON DELETE CASCADE,
  subject_id TEXT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  is_required INTEGER NOT NULL DEFAULT 0,
  is_available INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (curriculum_id, subject_id)
);

CREATE INDEX IF NOT EXISTS curriculum_subjects_subject_idx ON curriculum_subjects (subject_id);

CREATE TABLE IF NOT EXISTS grade_subjects (
  curriculum_id TEXT NOT NULL REFERENCES curricula(id) ON DELETE CASCADE,
  grade_id TEXT NOT NULL REFERENCES grades(id) ON DELETE CASCADE,
  subject_id TEXT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  is_required INTEGER NOT NULL DEFAULT 0,
  is_available INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (curriculum_id, grade_id, subject_id),
  FOREIGN KEY (curriculum_id, grade_id) REFERENCES curriculum_grades(curriculum_id, grade_id) ON DELETE CASCADE,
  FOREIGN KEY (curriculum_id, subject_id) REFERENCES curriculum_subjects(curriculum_id, subject_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS grade_subjects_grade_idx ON grade_subjects (curriculum_id, grade_id);
CREATE INDEX IF NOT EXISTS grade_subjects_subject_idx ON grade_subjects (subject_id);

CREATE TABLE IF NOT EXISTS domains (
  id TEXT PRIMARY KEY NOT NULL,
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_archived INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS domains_slug_idx ON domains (slug);
CREATE INDEX IF NOT EXISTS domains_sort_order_idx ON domains (sort_order);

CREATE TABLE IF NOT EXISTS subject_domains (
  subject_id TEXT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  domain_id TEXT NOT NULL REFERENCES domains(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (subject_id, domain_id)
);

CREATE INDEX IF NOT EXISTS subject_domains_domain_idx ON subject_domains (domain_id);

CREATE TABLE IF NOT EXISTS grade_subject_domains (
  curriculum_id TEXT NOT NULL REFERENCES curricula(id) ON DELETE CASCADE,
  grade_id TEXT NOT NULL REFERENCES grades(id) ON DELETE CASCADE,
  subject_id TEXT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  domain_id TEXT NOT NULL REFERENCES domains(id) ON DELETE CASCADE,
  is_required INTEGER NOT NULL DEFAULT 0,
  is_available INTEGER NOT NULL DEFAULT 1,
  depth INTEGER NOT NULL DEFAULT 1 CHECK (depth BETWEEN 1 AND 5),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (curriculum_id, grade_id, subject_id, domain_id),
  FOREIGN KEY (curriculum_id, grade_id, subject_id) REFERENCES grade_subjects(curriculum_id, grade_id, subject_id) ON DELETE CASCADE,
  FOREIGN KEY (subject_id, domain_id) REFERENCES subject_domains(subject_id, domain_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS grade_subject_domains_grade_idx ON grade_subject_domains (curriculum_id, grade_id);
CREATE INDEX IF NOT EXISTS grade_subject_domains_domain_idx ON grade_subject_domains (domain_id);

CREATE TABLE IF NOT EXISTS learning_objectives (
  id TEXT PRIMARY KEY NOT NULL,
  curriculum_id TEXT NOT NULL REFERENCES curricula(id) ON DELETE CASCADE,
  subject_id TEXT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  domain_id TEXT REFERENCES domains(id) ON DELETE SET NULL,
  code TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  difficulty TEXT NOT NULL DEFAULT 'balanced' CHECK (difficulty IN ('gentle', 'balanced', 'challenging')),
  is_required INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_archived INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (curriculum_id, code),
  UNIQUE (curriculum_id, id)
);

CREATE INDEX IF NOT EXISTS learning_objectives_curriculum_idx ON learning_objectives (curriculum_id);
CREATE INDEX IF NOT EXISTS learning_objectives_subject_idx ON learning_objectives (subject_id);

CREATE TABLE IF NOT EXISTS grade_learning_objectives (
  curriculum_id TEXT NOT NULL REFERENCES curricula(id) ON DELETE CASCADE,
  grade_id TEXT NOT NULL REFERENCES grades(id) ON DELETE CASCADE,
  objective_id TEXT NOT NULL REFERENCES learning_objectives(id) ON DELETE CASCADE,
  is_required INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (curriculum_id, grade_id, objective_id),
  FOREIGN KEY (curriculum_id, grade_id) REFERENCES curriculum_grades(curriculum_id, grade_id) ON DELETE CASCADE,
  FOREIGN KEY (curriculum_id, objective_id) REFERENCES learning_objectives(curriculum_id, id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS grade_learning_objectives_grade_idx ON grade_learning_objectives (curriculum_id, grade_id);
CREATE INDEX IF NOT EXISTS grade_learning_objectives_objective_idx ON grade_learning_objectives (objective_id);
