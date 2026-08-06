CREATE TABLE IF NOT EXISTS study_goals (
  id TEXT PRIMARY KEY NOT NULL,
  profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  goal_type TEXT NOT NULL CHECK (goal_type IN ('grade-completion', 'subject-completion', 'course-completion', 'roadmap-completion', 'exam-preparation', 'concept-mastery', 'weekly-study-time')),
  target_id TEXT,
  target_title TEXT NOT NULL DEFAULT '',
  start_date TEXT NOT NULL,
  target_date TEXT NOT NULL,
  weekly_study_minutes INTEGER NOT NULL CHECK (weekly_study_minutes >= 30),
  available_days TEXT NOT NULL DEFAULT '[1,2,3,4,5]',
  session_duration_minutes INTEGER NOT NULL DEFAULT 30 CHECK (session_duration_minutes BETWEEN 10 AND 240),
  priority_subject_ids TEXT NOT NULL DEFAULT '[]',
  rest_days TEXT NOT NULL DEFAULT '[]',
  difficulty_preference TEXT NOT NULL DEFAULT 'balanced' CHECK (difficulty_preference IN ('gentle', 'balanced', 'challenging')),
  review_frequency_days INTEGER NOT NULL DEFAULT 7 CHECK (review_frequency_days BETWEEN 0 AND 90),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'archived')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS study_goals_profile_status_idx ON study_goals (profile_id, status, updated_at);
CREATE INDEX IF NOT EXISTS study_goals_target_idx ON study_goals (target_id, goal_type);

CREATE TABLE IF NOT EXISTS study_plans (
  id TEXT PRIMARY KEY NOT NULL,
  profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  goal_id TEXT NOT NULL REFERENCES study_goals(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL DEFAULT 'goal' CHECK (source_type IN ('goal', 'roadmap')),
  source_id TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'active', 'completed', 'paused', 'archived')),
  generated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  target_date TEXT NOT NULL,
  weekly_study_minutes INTEGER NOT NULL CHECK (weekly_study_minutes >= 30),
  total_minutes INTEGER NOT NULL DEFAULT 0 CHECK (total_minutes >= 0),
  scheduled_minutes INTEGER NOT NULL DEFAULT 0 CHECK (scheduled_minutes >= 0),
  unallocated_minutes INTEGER NOT NULL DEFAULT 0 CHECK (unallocated_minutes >= 0),
  capacity_minutes INTEGER NOT NULL DEFAULT 0 CHECK (capacity_minutes >= 0),
  realism TEXT NOT NULL DEFAULT 'realistic' CHECK (realism IN ('realistic', 'tight', 'infeasible')),
  warnings TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS study_plans_profile_status_idx ON study_plans (profile_id, status, updated_at);
CREATE INDEX IF NOT EXISTS study_plans_goal_idx ON study_plans (goal_id, status, updated_at);

CREATE TABLE IF NOT EXISTS study_plan_items (
  id TEXT PRIMARY KEY NOT NULL,
  plan_id TEXT NOT NULL REFERENCES study_plans(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL CHECK (item_type IN ('lesson', 'exercise', 'review', 'simulation', 'laboratory', 'assessment', 'catch-up')),
  source_id TEXT,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  subject_id TEXT REFERENCES subjects(id) ON DELETE SET NULL,
  estimated_minutes INTEGER NOT NULL CHECK (estimated_minutes > 0),
  priority INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  metadata TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS study_plan_items_plan_order_idx ON study_plan_items (plan_id, sort_order, id);
CREATE INDEX IF NOT EXISTS study_plan_items_source_idx ON study_plan_items (source_id, item_type);

CREATE TABLE IF NOT EXISTS study_sessions (
  id TEXT PRIMARY KEY NOT NULL,
  profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  plan_id TEXT NOT NULL REFERENCES study_plans(id) ON DELETE CASCADE,
  plan_item_id TEXT NOT NULL REFERENCES study_plan_items(id) ON DELETE CASCADE,
  scheduled_date TEXT NOT NULL,
  start_minute INTEGER NOT NULL CHECK (start_minute BETWEEN 0 AND 1439),
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes BETWEEN 10 AND 1440),
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in-progress', 'completed', 'skipped', 'missed', 'cancelled')),
  rescheduled_from_date TEXT,
  skip_reason TEXT,
  completed_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS study_sessions_profile_date_idx ON study_sessions (profile_id, scheduled_date, start_minute);
CREATE INDEX IF NOT EXISTS study_sessions_plan_status_idx ON study_sessions (plan_id, status, scheduled_date);
CREATE INDEX IF NOT EXISTS study_sessions_item_idx ON study_sessions (plan_item_id, status);

CREATE TABLE IF NOT EXISTS study_availability (
  id TEXT PRIMARY KEY NOT NULL,
  profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  weekday INTEGER NOT NULL CHECK (weekday BETWEEN 1 AND 7),
  start_minute INTEGER NOT NULL CHECK (start_minute BETWEEN 0 AND 1439),
  end_minute INTEGER NOT NULL CHECK (end_minute BETWEEN 1 AND 1440),
  max_minutes INTEGER CHECK (max_minutes IS NULL OR max_minutes BETWEEN 10 AND 1440),
  label TEXT NOT NULL DEFAULT 'Study time',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (end_minute > start_minute),
  UNIQUE (profile_id, weekday, start_minute, end_minute)
);
CREATE INDEX IF NOT EXISTS study_availability_profile_weekday_idx ON study_availability (profile_id, weekday, start_minute);

CREATE TABLE IF NOT EXISTS study_exceptions (
  id TEXT PRIMARY KEY NOT NULL,
  profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  exception_date TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('unavailable', 'blocked', 'extra-availability')),
  start_minute INTEGER CHECK (start_minute IS NULL OR start_minute BETWEEN 0 AND 1439),
  end_minute INTEGER CHECK (end_minute IS NULL OR end_minute BETWEEN 1 AND 1440),
  reason TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK ((start_minute IS NULL AND end_minute IS NULL) OR (start_minute IS NOT NULL AND end_minute IS NOT NULL AND end_minute > start_minute))
);
CREATE INDEX IF NOT EXISTS study_exceptions_profile_date_idx ON study_exceptions (profile_id, exception_date, start_minute);

CREATE TABLE IF NOT EXISTS study_completion_events (
  id TEXT PRIMARY KEY NOT NULL,
  profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL REFERENCES study_sessions(id) ON DELETE CASCADE,
  plan_item_id TEXT NOT NULL REFERENCES study_plan_items(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('completed', 'skipped', 'missed', 'rescheduled')),
  minutes INTEGER NOT NULL DEFAULT 0 CHECK (minutes >= 0),
  metadata TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (session_id, event_type)
);
CREATE INDEX IF NOT EXISTS study_completion_events_profile_idx ON study_completion_events (profile_id, created_at);
CREATE INDEX IF NOT EXISTS study_completion_events_item_idx ON study_completion_events (plan_item_id, event_type);
