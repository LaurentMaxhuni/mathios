CREATE TABLE IF NOT EXISTS classes (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  join_code TEXT NOT NULL,
  subject_ids TEXT NOT NULL DEFAULT '[]',
  grade_ids TEXT NOT NULL DEFAULT '[]',
  created_by_profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS classes_join_code_idx ON classes (join_code);
CREATE INDEX IF NOT EXISTS classes_created_by_idx ON classes (created_by_profile_id, created_at);

CREATE TABLE IF NOT EXISTS class_members (
  class_id TEXT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'left', 'removed')),
  joined_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (class_id, profile_id)
);

CREATE INDEX IF NOT EXISTS class_members_profile_idx ON class_members (profile_id, status, joined_at);

CREATE TABLE IF NOT EXISTS class_teachers (
  class_id TEXT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'teacher' CHECK (role IN ('owner', 'teacher')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (class_id, profile_id)
);

CREATE INDEX IF NOT EXISTS class_teachers_profile_idx ON class_teachers (profile_id, role, created_at);

CREATE TABLE IF NOT EXISTS invitations (
  id TEXT PRIMARY KEY NOT NULL,
  class_id TEXT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('learner', 'teacher')),
  code TEXT NOT NULL,
  invited_profile_id TEXT REFERENCES profiles(id) ON DELETE CASCADE,
  invited_by_profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
  expires_at TEXT,
  accepted_by_profile_id TEXT REFERENCES profiles(id) ON DELETE SET NULL,
  accepted_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS invitations_code_idx ON invitations (code);
CREATE INDEX IF NOT EXISTS invitations_class_status_idx ON invitations (class_id, status, created_at);
CREATE INDEX IF NOT EXISTS invitations_profile_status_idx ON invitations (invited_profile_id, status, created_at);

CREATE TABLE IF NOT EXISTS assignments (
  id TEXT PRIMARY KEY NOT NULL,
  class_id TEXT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  instructions TEXT NOT NULL DEFAULT '',
  resource_type TEXT NOT NULL CHECK (resource_type IN ('lesson', 'course', 'exercise-set', 'assessment', 'simulation', 'laboratory', 'roadmap')),
  resource_id TEXT NOT NULL,
  resource_title TEXT NOT NULL,
  target_scope TEXT NOT NULL CHECK (target_scope IN ('class', 'individual')),
  start_at TEXT,
  due_at TEXT,
  attempt_limit INTEGER CHECK (attempt_limit IS NULL OR attempt_limit BETWEEN 1 AND 20),
  late_submission_rule TEXT NOT NULL DEFAULT 'flag' CHECK (late_submission_rule IN ('allow', 'flag', 'forbid')),
  status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'published', 'archived')),
  created_by_profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS assignments_class_status_idx ON assignments (class_id, status, due_at);
CREATE INDEX IF NOT EXISTS assignments_resource_idx ON assignments (resource_type, resource_id);

CREATE TABLE IF NOT EXISTS assignment_targets (
  assignment_id TEXT NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (assignment_id, profile_id)
);

CREATE INDEX IF NOT EXISTS assignment_targets_profile_idx ON assignment_targets (profile_id, assignment_id);

CREATE TABLE IF NOT EXISTS assignment_submissions (
  id TEXT PRIMARY KEY NOT NULL,
  assignment_id TEXT NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  attempt_number INTEGER NOT NULL CHECK (attempt_number > 0),
  status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('draft', 'submitted', 'returned', 'resubmission-required', 'graded')),
  response_json TEXT NOT NULL DEFAULT '{}',
  is_late INTEGER NOT NULL DEFAULT 0,
  submitted_at TEXT,
  returned_at TEXT,
  grade REAL,
  grade_max REAL NOT NULL DEFAULT 100,
  reviewed_by_profile_id TEXT REFERENCES profiles(id) ON DELETE SET NULL,
  reviewed_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (assignment_id, profile_id, attempt_number)
);

CREATE INDEX IF NOT EXISTS assignment_submissions_assignment_idx ON assignment_submissions (assignment_id, profile_id, attempt_number DESC);
CREATE INDEX IF NOT EXISTS assignment_submissions_profile_idx ON assignment_submissions (profile_id, status, submitted_at);

CREATE TABLE IF NOT EXISTS grading_rubrics (
  id TEXT PRIMARY KEY NOT NULL,
  assignment_id TEXT NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  criteria_json TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS grading_rubrics_assignment_idx ON grading_rubrics (assignment_id);

CREATE TABLE IF NOT EXISTS teacher_feedback (
  id TEXT PRIMARY KEY NOT NULL,
  submission_id TEXT NOT NULL REFERENCES assignment_submissions(id) ON DELETE CASCADE,
  teacher_profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  body TEXT,
  grade REAL,
  grade_max REAL NOT NULL DEFAULT 100,
  rubric_scores_json TEXT NOT NULL DEFAULT '{}',
  return_for_resubmission INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS teacher_feedback_submission_idx ON teacher_feedback (submission_id, created_at DESC);
