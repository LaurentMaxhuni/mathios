CREATE TABLE IF NOT EXISTS folders (
  id TEXT PRIMARY KEY NOT NULL,
  profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  parent_folder_id TEXT REFERENCES folders(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0 CHECK (sort_order >= 0),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (profile_id, name, parent_folder_id)
);
CREATE INDEX IF NOT EXISTS folders_profile_parent_idx ON folders (profile_id, parent_folder_id, sort_order, name);

CREATE TABLE IF NOT EXISTS tags (
  id TEXT PRIMARY KEY NOT NULL,
  profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  color TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (profile_id, slug)
);
CREATE INDEX IF NOT EXISTS tags_profile_name_idx ON tags (profile_id, name);

CREATE TABLE IF NOT EXISTS notes (
  id TEXT PRIMARY KEY NOT NULL,
  profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body_markdown TEXT NOT NULL DEFAULT '',
  folder_id TEXT REFERENCES folders(id) ON DELETE SET NULL,
  is_pinned INTEGER NOT NULL DEFAULT 0 CHECK (is_pinned IN (0, 1)),
  is_archived INTEGER NOT NULL DEFAULT 0 CHECK (is_archived IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS notes_profile_updated_idx ON notes (profile_id, is_archived, is_pinned, updated_at);
CREATE INDEX IF NOT EXISTS notes_folder_idx ON notes (profile_id, folder_id, updated_at);

CREATE TABLE IF NOT EXISTS note_links (
  id TEXT PRIMARY KEY NOT NULL,
  profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  note_id TEXT NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  resource_type TEXT NOT NULL CHECK (resource_type IN ('subject', 'grade', 'course', 'module', 'lesson', 'concept', 'question', 'simulation', 'assessment', 'laboratory')),
  resource_id TEXT NOT NULL,
  label TEXT NOT NULL DEFAULT '',
  source_location TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (note_id, resource_type, resource_id, source_location)
);
CREATE INDEX IF NOT EXISTS note_links_profile_resource_idx ON note_links (profile_id, resource_type, resource_id);
CREATE INDEX IF NOT EXISTS note_links_note_idx ON note_links (note_id, created_at);

CREATE TABLE IF NOT EXISTS note_tags (
  note_id TEXT NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (note_id, tag_id)
);
CREATE INDEX IF NOT EXISTS note_tags_tag_idx ON note_tags (tag_id, note_id);

CREATE TABLE IF NOT EXISTS note_backlinks (
  id TEXT PRIMARY KEY NOT NULL,
  profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  source_note_id TEXT NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  target_note_id TEXT NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  anchor TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (source_note_id <> target_note_id),
  UNIQUE (source_note_id, target_note_id, anchor)
);
CREATE INDEX IF NOT EXISTS note_backlinks_target_idx ON note_backlinks (profile_id, target_note_id, created_at);
CREATE INDEX IF NOT EXISTS note_backlinks_source_idx ON note_backlinks (profile_id, source_note_id, created_at);

CREATE TABLE IF NOT EXISTS highlights (
  id TEXT PRIMARY KEY NOT NULL,
  profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL CHECK (source_type IN ('lesson-text', 'definition', 'formula', 'example', 'question-solution')),
  source_id TEXT NOT NULL,
  source_location TEXT NOT NULL DEFAULT '',
  selected_text TEXT NOT NULL,
  note_id TEXT REFERENCES notes(id) ON DELETE SET NULL,
  color TEXT NOT NULL DEFAULT 'yellow' CHECK (color IN ('yellow', 'blue', 'green', 'pink')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS highlights_profile_source_idx ON highlights (profile_id, source_type, source_id, created_at);
CREATE INDEX IF NOT EXISTS highlights_note_idx ON highlights (profile_id, note_id, created_at);

CREATE TABLE IF NOT EXISTS bookmarks (
  id TEXT PRIMARY KEY NOT NULL,
  profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  resource_type TEXT NOT NULL CHECK (resource_type IN ('lesson', 'concept', 'exercise', 'simulation', 'roadmap', 'note')),
  resource_id TEXT NOT NULL,
  title TEXT NOT NULL,
  source_url TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (profile_id, resource_type, resource_id)
);
CREATE INDEX IF NOT EXISTS bookmarks_profile_created_idx ON bookmarks (profile_id, created_at DESC);
CREATE INDEX IF NOT EXISTS bookmarks_resource_idx ON bookmarks (profile_id, resource_type, resource_id);
