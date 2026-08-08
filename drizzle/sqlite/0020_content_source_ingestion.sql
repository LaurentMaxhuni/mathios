CREATE TABLE IF NOT EXISTS source_documents (
  id TEXT PRIMARY KEY NOT NULL,
  title TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  storage_key TEXT NOT NULL UNIQUE,
  mime_type TEXT NOT NULL,
  byte_size INTEGER NOT NULL,
  sha256 TEXT NOT NULL,
  subject_id TEXT NOT NULL REFERENCES subjects(id) ON DELETE RESTRICT,
  target_grade_id TEXT NOT NULL REFERENCES grades(id) ON DELETE RESTRICT,
  difficulty TEXT NOT NULL CHECK (difficulty IN ('gentle', 'balanced', 'challenging')),
  lesson_size TEXT NOT NULL CHECK (lesson_size IN ('small', 'standard', 'deep')),
  rights_status TEXT NOT NULL DEFAULT 'unknown' CHECK (rights_status IN ('unknown', 'permitted', 'restricted')),
  page_count INTEGER,
  extraction_method TEXT,
  processing_status TEXT NOT NULL DEFAULT 'uploaded',
  processing_error TEXT,
  created_by_profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS source_documents_creator_status_idx
  ON source_documents(created_by_profile_id, processing_status, created_at DESC);
CREATE INDEX IF NOT EXISTS source_documents_sha256_idx ON source_documents(sha256);

CREATE TABLE IF NOT EXISTS source_document_pages (
  document_id TEXT NOT NULL REFERENCES source_documents(id) ON DELETE CASCADE,
  page_number INTEGER NOT NULL,
  extracted_text TEXT NOT NULL,
  character_count INTEGER NOT NULL,
  extraction_method TEXT NOT NULL DEFAULT 'pdf-text',
  warnings_json TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (document_id, page_number)
);

CREATE TABLE IF NOT EXISTS content_import_jobs (
  id TEXT PRIMARY KEY NOT NULL,
  document_id TEXT NOT NULL UNIQUE REFERENCES source_documents(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'queued',
  total_units INTEGER NOT NULL DEFAULT 0,
  processed_units INTEGER NOT NULL DEFAULT 0,
  error_details TEXT,
  started_at TEXT,
  finished_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS content_import_jobs_status_idx
  ON content_import_jobs(status, created_at);

CREATE TABLE IF NOT EXISTS source_chunks (
  id TEXT PRIMARY KEY NOT NULL,
  document_id TEXT NOT NULL REFERENCES source_documents(id) ON DELETE CASCADE,
  job_id TEXT NOT NULL REFERENCES content_import_jobs(id) ON DELETE CASCADE,
  page_start INTEGER NOT NULL,
  page_end INTEGER NOT NULL,
  chunk_text TEXT NOT NULL,
  character_count INTEGER NOT NULL,
  content_hash TEXT NOT NULL,
  sort_order INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  processing_error TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS source_chunks_job_order_idx
  ON source_chunks(job_id, sort_order);
CREATE INDEX IF NOT EXISTS source_chunks_job_status_idx
  ON source_chunks(job_id, status, sort_order);

CREATE TABLE IF NOT EXISTS content_import_items (
  id TEXT PRIMARY KEY NOT NULL,
  job_id TEXT NOT NULL REFERENCES content_import_jobs(id) ON DELETE CASCADE,
  chunk_id TEXT NOT NULL REFERENCES source_chunks(id) ON DELETE CASCADE,
  stable_entity_key TEXT NOT NULL,
  title TEXT NOT NULL,
  page_start INTEGER NOT NULL,
  page_end INTEGER NOT NULL,
  payload_json TEXT NOT NULL,
  generation_id TEXT REFERENCES ai_generations(id) ON DELETE SET NULL,
  saved_lesson_id TEXT REFERENCES lessons(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  sort_order INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS content_import_items_stable_key_idx
  ON content_import_items(job_id, stable_entity_key);
CREATE INDEX IF NOT EXISTS content_import_items_job_status_idx
  ON content_import_items(job_id, status, sort_order);
