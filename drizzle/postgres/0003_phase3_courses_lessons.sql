CREATE TABLE IF NOT EXISTS courses (
  id TEXT PRIMARY KEY NOT NULL,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  subject_id TEXT NOT NULL REFERENCES subjects(id) ON DELETE RESTRICT,
  difficulty TEXT NOT NULL DEFAULT 'balanced' CHECK (difficulty IN ('gentle', 'balanced', 'challenging')),
  estimated_duration_minutes INTEGER NOT NULL DEFAULT 0 CHECK (estimated_duration_minutes >= 0),
  grade_min_id TEXT REFERENCES grades(id) ON DELETE SET NULL,
  grade_max_id TEXT REFERENCES grades(id) ON DELETE SET NULL,
  course_image TEXT,
  is_required BOOLEAN NOT NULL DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  created_by_profile_id TEXT REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS courses_slug_idx ON courses (slug);
CREATE INDEX IF NOT EXISTS courses_subject_idx ON courses (subject_id);
CREATE INDEX IF NOT EXISTS courses_status_idx ON courses (status);

CREATE TABLE IF NOT EXISTS course_curricula (
  course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  curriculum_id TEXT NOT NULL REFERENCES curricula(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (course_id, curriculum_id)
);

CREATE INDEX IF NOT EXISTS course_curricula_curriculum_idx ON course_curricula (curriculum_id);

CREATE TABLE IF NOT EXISTS course_grades (
  course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  grade_id TEXT NOT NULL REFERENCES grades(id) ON DELETE CASCADE,
  is_required BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (course_id, grade_id)
);

CREATE INDEX IF NOT EXISTS course_grades_grade_idx ON course_grades (grade_id);

CREATE TABLE IF NOT EXISTS course_prerequisites (
  course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  prerequisite_course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (course_id, prerequisite_course_id),
  CHECK (course_id <> prerequisite_course_id)
);

CREATE INDEX IF NOT EXISTS course_prerequisites_prerequisite_idx ON course_prerequisites (prerequisite_course_id);

CREATE TABLE IF NOT EXISTS course_learning_objectives (
  course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  objective_id TEXT NOT NULL REFERENCES learning_objectives(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (course_id, objective_id)
);

CREATE INDEX IF NOT EXISTS course_learning_objectives_objective_idx ON course_learning_objectives (objective_id);

CREATE TABLE IF NOT EXISTS modules (
  id TEXT PRIMARY KEY NOT NULL,
  course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  estimated_study_time_minutes INTEGER NOT NULL DEFAULT 0 CHECK (estimated_study_time_minutes >= 0),
  assessment_reference TEXT,
  is_archived BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS modules_course_order_idx ON modules (course_id, sort_order);

CREATE TABLE IF NOT EXISTS module_prerequisites (
  module_id TEXT NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  prerequisite_module_id TEXT NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (module_id, prerequisite_module_id),
  CHECK (module_id <> prerequisite_module_id)
);

CREATE INDEX IF NOT EXISTS module_prerequisites_prerequisite_idx ON module_prerequisites (prerequisite_module_id);

CREATE TABLE IF NOT EXISTS module_learning_objectives (
  module_id TEXT NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  objective_id TEXT NOT NULL REFERENCES learning_objectives(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (module_id, objective_id)
);

CREATE INDEX IF NOT EXISTS module_learning_objectives_objective_idx ON module_learning_objectives (objective_id);

CREATE TABLE IF NOT EXISTS lessons (
  id TEXT PRIMARY KEY NOT NULL,
  module_id TEXT NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  estimated_duration_minutes INTEGER NOT NULL DEFAULT 0 CHECK (estimated_duration_minutes >= 0),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  current_version_number INTEGER NOT NULL DEFAULT 1,
  published_version_id TEXT,
  created_by_profile_id TEXT REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS lessons_module_slug_idx ON lessons (module_id, slug);
CREATE INDEX IF NOT EXISTS lessons_module_order_idx ON lessons (module_id, sort_order);
CREATE INDEX IF NOT EXISTS lessons_status_idx ON lessons (status);

CREATE TABLE IF NOT EXISTS lesson_sections (
  id TEXT PRIMARY KEY NOT NULL,
  lesson_id TEXT NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS lesson_sections_lesson_order_idx ON lesson_sections (lesson_id, sort_order);

CREATE TABLE IF NOT EXISTS lesson_blocks (
  id TEXT PRIMARY KEY NOT NULL,
  section_id TEXT NOT NULL REFERENCES lesson_sections(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  payload TEXT NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS lesson_blocks_section_order_idx ON lesson_blocks (section_id, sort_order);

CREATE TABLE IF NOT EXISTS lesson_assets (
  id TEXT PRIMARY KEY NOT NULL,
  lesson_id TEXT NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  block_id TEXT REFERENCES lesson_blocks(id) ON DELETE SET NULL,
  kind TEXT NOT NULL,
  name TEXT NOT NULL,
  source_url TEXT NOT NULL,
  mime_type TEXT,
  alt_text TEXT NOT NULL DEFAULT '',
  metadata TEXT NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS lesson_assets_lesson_idx ON lesson_assets (lesson_id);

CREATE TABLE IF NOT EXISTS lesson_learning_objectives (
  lesson_id TEXT NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  objective_id TEXT NOT NULL REFERENCES learning_objectives(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (lesson_id, objective_id)
);

CREATE INDEX IF NOT EXISTS lesson_learning_objectives_objective_idx ON lesson_learning_objectives (objective_id);

CREATE TABLE IF NOT EXISTS lesson_versions (
  id TEXT PRIMARY KEY NOT NULL,
  lesson_id TEXT NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  change_summary TEXT NOT NULL DEFAULT '',
  snapshot TEXT NOT NULL DEFAULT '{}',
  created_by_profile_id TEXT REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  published_at TIMESTAMPTZ,
  UNIQUE (lesson_id, version_number)
);

CREATE INDEX IF NOT EXISTS lesson_versions_lesson_status_idx ON lesson_versions (lesson_id, status);

CREATE TABLE IF NOT EXISTS user_lesson_progress (
  profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  lesson_id TEXT NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  time_spent_seconds INTEGER NOT NULL DEFAULT 0 CHECK (time_spent_seconds >= 0),
  last_viewed_block_id TEXT REFERENCES lesson_blocks(id) ON DELETE SET NULL,
  completion_percentage INTEGER NOT NULL DEFAULT 0 CHECK (completion_percentage BETWEEN 0 AND 100),
  revisit_count INTEGER NOT NULL DEFAULT 0 CHECK (revisit_count >= 0),
  last_viewed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (profile_id, lesson_id)
);

CREATE INDEX IF NOT EXISTS user_lesson_progress_lesson_idx ON user_lesson_progress (lesson_id);
