CREATE TABLE IF NOT EXISTS search_index_state (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  source_revision BIGINT NOT NULL DEFAULT 0,
  indexed_revision BIGINT NOT NULL DEFAULT -1,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
INSERT INTO search_index_state (id, source_revision, indexed_revision)
VALUES (1, 0, -1)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS search_documents (
  id TEXT PRIMARY KEY NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT NOT NULL,
  profile_id TEXT REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  href TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  search_vector TSVECTOR NOT NULL DEFAULT ''::tsvector,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (resource_type, resource_id, profile_id)
);
CREATE INDEX IF NOT EXISTS search_documents_resource_idx ON search_documents (resource_type, resource_id);
CREATE INDEX IF NOT EXISTS search_documents_profile_idx ON search_documents (profile_id, updated_at);
CREATE INDEX IF NOT EXISTS search_documents_search_vector_idx ON search_documents USING GIN (search_vector);

CREATE OR REPLACE FUNCTION mathios_search_document_vector() RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('simple', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('simple', COALESCE(NEW.content, '')), 'B');
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS search_documents_vector ON search_documents;
CREATE TRIGGER search_documents_vector
BEFORE INSERT OR UPDATE OF title, content ON search_documents
FOR EACH ROW EXECUTE FUNCTION mathios_search_document_vector();

CREATE TABLE IF NOT EXISTS search_recent_queries (
  id TEXT PRIMARY KEY NOT NULL,
  profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  query TEXT NOT NULL,
  filters_json TEXT NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (profile_id, query)
);
CREATE INDEX IF NOT EXISTS search_recent_queries_profile_idx ON search_recent_queries (profile_id, created_at DESC);

CREATE OR REPLACE FUNCTION mathios_bump_search_revision() RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
  UPDATE search_index_state
  SET source_revision = source_revision + 1, updated_at = NOW()
  WHERE id = 1;
  RETURN NULL;
END;
$$;

DO $$
DECLARE table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'curricula', 'grades', 'subjects', 'domains', 'curriculum_grades', 'curriculum_subjects',
    'grade_subjects', 'subject_domains', 'grade_subject_domains', 'courses', 'course_curricula',
    'course_grades', 'modules', 'lessons', 'lesson_sections', 'lesson_blocks', 'lesson_versions',
    'concepts', 'lesson_concepts', 'concept_learning_objectives', 'questions', 'question_versions',
    'question_concepts', 'question_learning_objectives', 'assessments', 'assessment_sections',
    'assessment_pools', 'assessment_questions', 'simulations', 'simulation_versions',
    'lesson_simulations', 'laboratory_activities', 'laboratory_steps', 'roadmaps', 'roadmap_versions',
    'roadmap_subjects', 'roadmap_nodes', 'tags', 'notes', 'note_links', 'note_tags', 'bookmarks'
  ] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS mathios_search_revision ON %I', table_name);
    EXECUTE format(
      'CREATE TRIGGER mathios_search_revision AFTER INSERT OR UPDATE OR DELETE ON %I FOR EACH STATEMENT EXECUTE FUNCTION mathios_bump_search_revision()',
      table_name
    );
  END LOOP;
END;
$$;
