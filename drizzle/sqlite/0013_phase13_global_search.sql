CREATE TABLE IF NOT EXISTS search_index_state (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  source_revision INTEGER NOT NULL DEFAULT 0,
  indexed_revision INTEGER NOT NULL DEFAULT -1,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT OR IGNORE INTO search_index_state (id, source_revision, indexed_revision) VALUES (1, 0, -1);

CREATE TABLE IF NOT EXISTS search_documents (
  id TEXT PRIMARY KEY NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT NOT NULL,
  profile_id TEXT REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  href TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (resource_type, resource_id, profile_id)
);
CREATE INDEX IF NOT EXISTS search_documents_resource_idx ON search_documents (resource_type, resource_id);
CREATE INDEX IF NOT EXISTS search_documents_profile_idx ON search_documents (profile_id, updated_at);

CREATE VIRTUAL TABLE IF NOT EXISTS search_documents_fts USING fts5(
  id UNINDEXED,
  title,
  content,
  tokenize = 'unicode61 remove_diacritics 2'
);

CREATE TRIGGER IF NOT EXISTS search_documents_ai AFTER INSERT ON search_documents BEGIN
  INSERT INTO search_documents_fts (id, title, content) VALUES (new.id, new.title, new.content);
END;
CREATE TRIGGER IF NOT EXISTS search_documents_au AFTER UPDATE ON search_documents BEGIN
  DELETE FROM search_documents_fts WHERE id = old.id;
  INSERT INTO search_documents_fts (id, title, content) VALUES (new.id, new.title, new.content);
END;
CREATE TRIGGER IF NOT EXISTS search_documents_ad AFTER DELETE ON search_documents BEGIN
  DELETE FROM search_documents_fts WHERE id = old.id;
END;

CREATE TABLE IF NOT EXISTS search_recent_queries (
  id TEXT PRIMARY KEY NOT NULL,
  profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  query TEXT NOT NULL,
  filters_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (profile_id, query)
);
CREATE INDEX IF NOT EXISTS search_recent_queries_profile_idx ON search_recent_queries (profile_id, created_at DESC);

CREATE TRIGGER IF NOT EXISTS search_revision_curricula_insert AFTER INSERT ON curricula BEGIN UPDATE search_index_state SET source_revision = source_revision + 1, updated_at = CURRENT_TIMESTAMP WHERE id = 1; END;
CREATE TRIGGER IF NOT EXISTS search_revision_curricula_update AFTER UPDATE ON curricula BEGIN UPDATE search_index_state SET source_revision = source_revision + 1, updated_at = CURRENT_TIMESTAMP WHERE id = 1; END;
CREATE TRIGGER IF NOT EXISTS search_revision_curricula_delete AFTER DELETE ON curricula BEGIN UPDATE search_index_state SET source_revision = source_revision + 1, updated_at = CURRENT_TIMESTAMP WHERE id = 1; END;
CREATE TRIGGER IF NOT EXISTS search_revision_grades_insert AFTER INSERT ON grades BEGIN UPDATE search_index_state SET source_revision = source_revision + 1, updated_at = CURRENT_TIMESTAMP WHERE id = 1; END;
CREATE TRIGGER IF NOT EXISTS search_revision_grades_update AFTER UPDATE ON grades BEGIN UPDATE search_index_state SET source_revision = source_revision + 1, updated_at = CURRENT_TIMESTAMP WHERE id = 1; END;
CREATE TRIGGER IF NOT EXISTS search_revision_grades_delete AFTER DELETE ON grades BEGIN UPDATE search_index_state SET source_revision = source_revision + 1, updated_at = CURRENT_TIMESTAMP WHERE id = 1; END;
CREATE TRIGGER IF NOT EXISTS search_revision_subjects_insert AFTER INSERT ON subjects BEGIN UPDATE search_index_state SET source_revision = source_revision + 1, updated_at = CURRENT_TIMESTAMP WHERE id = 1; END;
CREATE TRIGGER IF NOT EXISTS search_revision_subjects_update AFTER UPDATE ON subjects BEGIN UPDATE search_index_state SET source_revision = source_revision + 1, updated_at = CURRENT_TIMESTAMP WHERE id = 1; END;
CREATE TRIGGER IF NOT EXISTS search_revision_subjects_delete AFTER DELETE ON subjects BEGIN UPDATE search_index_state SET source_revision = source_revision + 1, updated_at = CURRENT_TIMESTAMP WHERE id = 1; END;
CREATE TRIGGER IF NOT EXISTS search_revision_domains_insert AFTER INSERT ON domains BEGIN UPDATE search_index_state SET source_revision = source_revision + 1, updated_at = CURRENT_TIMESTAMP WHERE id = 1; END;
CREATE TRIGGER IF NOT EXISTS search_revision_domains_update AFTER UPDATE ON domains BEGIN UPDATE search_index_state SET source_revision = source_revision + 1, updated_at = CURRENT_TIMESTAMP WHERE id = 1; END;
CREATE TRIGGER IF NOT EXISTS search_revision_domains_delete AFTER DELETE ON domains BEGIN UPDATE search_index_state SET source_revision = source_revision + 1, updated_at = CURRENT_TIMESTAMP WHERE id = 1; END;
CREATE TRIGGER IF NOT EXISTS search_revision_curriculum_grades_insert AFTER INSERT ON curriculum_grades BEGIN UPDATE search_index_state SET source_revision = source_revision + 1, updated_at = CURRENT_TIMESTAMP WHERE id = 1; END;
CREATE TRIGGER IF NOT EXISTS search_revision_curriculum_grades_update AFTER UPDATE ON curriculum_grades BEGIN UPDATE search_index_state SET source_revision = source_revision + 1, updated_at = CURRENT_TIMESTAMP WHERE id = 1; END;
CREATE TRIGGER IF NOT EXISTS search_revision_curriculum_grades_delete AFTER DELETE ON curriculum_grades BEGIN UPDATE search_index_state SET source_revision = source_revision + 1, updated_at = CURRENT_TIMESTAMP WHERE id = 1; END;
CREATE TRIGGER IF NOT EXISTS search_revision_curriculum_subjects_insert AFTER INSERT ON curriculum_subjects BEGIN UPDATE search_index_state SET source_revision = source_revision + 1, updated_at = CURRENT_TIMESTAMP WHERE id = 1; END;
CREATE TRIGGER IF NOT EXISTS search_revision_curriculum_subjects_update AFTER UPDATE ON curriculum_subjects BEGIN UPDATE search_index_state SET source_revision = source_revision + 1, updated_at = CURRENT_TIMESTAMP WHERE id = 1; END;
CREATE TRIGGER IF NOT EXISTS search_revision_curriculum_subjects_delete AFTER DELETE ON curriculum_subjects BEGIN UPDATE search_index_state SET source_revision = source_revision + 1, updated_at = CURRENT_TIMESTAMP WHERE id = 1; END;
CREATE TRIGGER IF NOT EXISTS search_revision_grade_subjects_insert AFTER INSERT ON grade_subjects BEGIN UPDATE search_index_state SET source_revision = source_revision + 1, updated_at = CURRENT_TIMESTAMP WHERE id = 1; END;
CREATE TRIGGER IF NOT EXISTS search_revision_grade_subjects_update AFTER UPDATE ON grade_subjects BEGIN UPDATE search_index_state SET source_revision = source_revision + 1, updated_at = CURRENT_TIMESTAMP WHERE id = 1; END;
CREATE TRIGGER IF NOT EXISTS search_revision_grade_subjects_delete AFTER DELETE ON grade_subjects BEGIN UPDATE search_index_state SET source_revision = source_revision + 1, updated_at = CURRENT_TIMESTAMP WHERE id = 1; END;
CREATE TRIGGER IF NOT EXISTS search_revision_subject_domains_insert AFTER INSERT ON subject_domains BEGIN UPDATE search_index_state SET source_revision = source_revision + 1, updated_at = CURRENT_TIMESTAMP WHERE id = 1; END;
CREATE TRIGGER IF NOT EXISTS search_revision_subject_domains_update AFTER UPDATE ON subject_domains BEGIN UPDATE search_index_state SET source_revision = source_revision + 1, updated_at = CURRENT_TIMESTAMP WHERE id = 1; END;
CREATE TRIGGER IF NOT EXISTS search_revision_subject_domains_delete AFTER DELETE ON subject_domains BEGIN UPDATE search_index_state SET source_revision = source_revision + 1, updated_at = CURRENT_TIMESTAMP WHERE id = 1; END;
CREATE TRIGGER IF NOT EXISTS search_revision_grade_subject_domains_insert AFTER INSERT ON grade_subject_domains BEGIN UPDATE search_index_state SET source_revision = source_revision + 1, updated_at = CURRENT_TIMESTAMP WHERE id = 1; END;
CREATE TRIGGER IF NOT EXISTS search_revision_grade_subject_domains_update AFTER UPDATE ON grade_subject_domains BEGIN UPDATE search_index_state SET source_revision = source_revision + 1, updated_at = CURRENT_TIMESTAMP WHERE id = 1; END;
CREATE TRIGGER IF NOT EXISTS search_revision_grade_subject_domains_delete AFTER DELETE ON grade_subject_domains BEGIN UPDATE search_index_state SET source_revision = source_revision + 1, updated_at = CURRENT_TIMESTAMP WHERE id = 1; END;

CREATE TRIGGER IF NOT EXISTS search_revision_courses_insert AFTER INSERT ON courses BEGIN UPDATE search_index_state SET source_revision = source_revision + 1, updated_at = CURRENT_TIMESTAMP WHERE id = 1; END;
CREATE TRIGGER IF NOT EXISTS search_revision_courses_update AFTER UPDATE ON courses BEGIN UPDATE search_index_state SET source_revision = source_revision + 1, updated_at = CURRENT_TIMESTAMP WHERE id = 1; END;
CREATE TRIGGER IF NOT EXISTS search_revision_courses_delete AFTER DELETE ON courses BEGIN UPDATE search_index_state SET source_revision = source_revision + 1, updated_at = CURRENT_TIMESTAMP WHERE id = 1; END;
CREATE TRIGGER IF NOT EXISTS search_revision_course_curricula_insert AFTER INSERT ON course_curricula BEGIN UPDATE search_index_state SET source_revision = source_revision + 1, updated_at = CURRENT_TIMESTAMP WHERE id = 1; END;
CREATE TRIGGER IF NOT EXISTS search_revision_course_curricula_update AFTER UPDATE ON course_curricula BEGIN UPDATE search_index_state SET source_revision = source_revision + 1, updated_at = CURRENT_TIMESTAMP WHERE id = 1; END;
CREATE TRIGGER IF NOT EXISTS search_revision_course_curricula_delete AFTER DELETE ON course_curricula BEGIN UPDATE search_index_state SET source_revision = source_revision + 1, updated_at = CURRENT_TIMESTAMP WHERE id = 1; END;
CREATE TRIGGER IF NOT EXISTS search_revision_course_grades_insert AFTER INSERT ON course_grades BEGIN UPDATE search_index_state SET source_revision = source_revision + 1, updated_at = CURRENT_TIMESTAMP WHERE id = 1; END;
CREATE TRIGGER IF NOT EXISTS search_revision_course_grades_update AFTER UPDATE ON course_grades BEGIN UPDATE search_index_state SET source_revision = source_revision + 1, updated_at = CURRENT_TIMESTAMP WHERE id = 1; END;
CREATE TRIGGER IF NOT EXISTS search_revision_course_grades_delete AFTER DELETE ON course_grades BEGIN UPDATE search_index_state SET source_revision = source_revision + 1, updated_at = CURRENT_TIMESTAMP WHERE id = 1; END;
CREATE TRIGGER IF NOT EXISTS search_revision_modules_insert AFTER INSERT ON modules BEGIN UPDATE search_index_state SET source_revision = source_revision + 1, updated_at = CURRENT_TIMESTAMP WHERE id = 1; END;
CREATE TRIGGER IF NOT EXISTS search_revision_modules_update AFTER UPDATE ON modules BEGIN UPDATE search_index_state SET source_revision = source_revision + 1, updated_at = CURRENT_TIMESTAMP WHERE id = 1; END;
CREATE TRIGGER IF NOT EXISTS search_revision_modules_delete AFTER DELETE ON modules BEGIN UPDATE search_index_state SET source_revision = source_revision + 1, updated_at = CURRENT_TIMESTAMP WHERE id = 1; END;
CREATE TRIGGER IF NOT EXISTS search_revision_lessons_insert AFTER INSERT ON lessons BEGIN UPDATE search_index_state SET source_revision = source_revision + 1, updated_at = CURRENT_TIMESTAMP WHERE id = 1; END;
CREATE TRIGGER IF NOT EXISTS search_revision_lessons_update AFTER UPDATE ON lessons BEGIN UPDATE search_index_state SET source_revision = source_revision + 1, updated_at = CURRENT_TIMESTAMP WHERE id = 1; END;
CREATE TRIGGER IF NOT EXISTS search_revision_lessons_delete AFTER DELETE ON lessons BEGIN UPDATE search_index_state SET source_revision = source_revision + 1, updated_at = CURRENT_TIMESTAMP WHERE id = 1; END;
CREATE TRIGGER IF NOT EXISTS search_revision_lesson_sections_insert AFTER INSERT ON lesson_sections BEGIN UPDATE search_index_state SET source_revision = source_revision + 1, updated_at = CURRENT_TIMESTAMP WHERE id = 1; END;
CREATE TRIGGER IF NOT EXISTS search_revision_lesson_sections_update AFTER UPDATE ON lesson_sections BEGIN UPDATE search_index_state SET source_revision = source_revision + 1, updated_at = CURRENT_TIMESTAMP WHERE id = 1; END;
CREATE TRIGGER IF NOT EXISTS search_revision_lesson_sections_delete AFTER DELETE ON lesson_sections BEGIN UPDATE search_index_state SET source_revision = source_revision + 1, updated_at = CURRENT_TIMESTAMP WHERE id = 1; END;
CREATE TRIGGER IF NOT EXISTS search_revision_lesson_blocks_insert AFTER INSERT ON lesson_blocks BEGIN UPDATE search_index_state SET source_revision = source_revision + 1, updated_at = CURRENT_TIMESTAMP WHERE id = 1; END;
CREATE TRIGGER IF NOT EXISTS search_revision_lesson_blocks_update AFTER UPDATE ON lesson_blocks BEGIN UPDATE search_index_state SET source_revision = source_revision + 1, updated_at = CURRENT_TIMESTAMP WHERE id = 1; END;
CREATE TRIGGER IF NOT EXISTS search_revision_lesson_blocks_delete AFTER DELETE ON lesson_blocks BEGIN UPDATE search_index_state SET source_revision = source_revision + 1, updated_at = CURRENT_TIMESTAMP WHERE id = 1; END;
CREATE TRIGGER IF NOT EXISTS search_revision_lesson_versions_insert AFTER INSERT ON lesson_versions BEGIN UPDATE search_index_state SET source_revision = source_revision + 1, updated_at = CURRENT_TIMESTAMP WHERE id = 1; END;
CREATE TRIGGER IF NOT EXISTS search_revision_lesson_versions_update AFTER UPDATE ON lesson_versions BEGIN UPDATE search_index_state SET source_revision = source_revision + 1, updated_at = CURRENT_TIMESTAMP WHERE id = 1; END;
CREATE TRIGGER IF NOT EXISTS search_revision_lesson_versions_delete AFTER DELETE ON lesson_versions BEGIN UPDATE search_index_state SET source_revision = source_revision + 1, updated_at = CURRENT_TIMESTAMP WHERE id = 1; END;

CREATE TRIGGER IF NOT EXISTS search_revision_concepts_insert AFTER INSERT ON concepts BEGIN UPDATE search_index_state SET source_revision = source_revision + 1, updated_at = CURRENT_TIMESTAMP WHERE id = 1; END;
CREATE TRIGGER IF NOT EXISTS search_revision_concepts_update AFTER UPDATE ON concepts BEGIN UPDATE search_index_state SET source_revision = source_revision + 1, updated_at = CURRENT_TIMESTAMP WHERE id = 1; END;
CREATE TRIGGER IF NOT EXISTS search_revision_concepts_delete AFTER DELETE ON concepts BEGIN UPDATE search_index_state SET source_revision = source_revision + 1, updated_at = CURRENT_TIMESTAMP WHERE id = 1; END;
CREATE TRIGGER IF NOT EXISTS search_revision_lesson_concepts_insert AFTER INSERT ON lesson_concepts BEGIN UPDATE search_index_state SET source_revision = source_revision + 1, updated_at = CURRENT_TIMESTAMP WHERE id = 1; END;
CREATE TRIGGER IF NOT EXISTS search_revision_lesson_concepts_update AFTER UPDATE ON lesson_concepts BEGIN UPDATE search_index_state SET source_revision = source_revision + 1, updated_at = CURRENT_TIMESTAMP WHERE id = 1; END;
CREATE TRIGGER IF NOT EXISTS search_revision_lesson_concepts_delete AFTER DELETE ON lesson_concepts BEGIN UPDATE search_index_state SET source_revision = source_revision + 1, updated_at = CURRENT_TIMESTAMP WHERE id = 1; END;
CREATE TRIGGER IF NOT EXISTS search_revision_concept_learning_objectives_insert AFTER INSERT ON concept_learning_objectives BEGIN UPDATE search_index_state SET source_revision = source_revision + 1, updated_at = CURRENT_TIMESTAMP WHERE id = 1; END;
CREATE TRIGGER IF NOT EXISTS search_revision_concept_learning_objectives_update AFTER UPDATE ON concept_learning_objectives BEGIN UPDATE search_index_state SET source_revision = source_revision + 1, updated_at = CURRENT_TIMESTAMP WHERE id = 1; END;
CREATE TRIGGER IF NOT EXISTS search_revision_concept_learning_objectives_delete AFTER DELETE ON concept_learning_objectives BEGIN UPDATE search_index_state SET source_revision = source_revision + 1, updated_at = CURRENT_TIMESTAMP WHERE id = 1; END;

CREATE TRIGGER IF NOT EXISTS search_revision_questions_insert AFTER INSERT ON questions BEGIN UPDATE search_index_state SET source_revision = source_revision + 1, updated_at = CURRENT_TIMESTAMP WHERE id = 1; END;
CREATE TRIGGER IF NOT EXISTS search_revision_questions_update AFTER UPDATE ON questions BEGIN UPDATE search_index_state SET source_revision = source_revision + 1, updated_at = CURRENT_TIMESTAMP WHERE id = 1; END;
CREATE TRIGGER IF NOT EXISTS search_revision_questions_delete AFTER DELETE ON questions BEGIN UPDATE search_index_state SET source_revision = source_revision + 1, updated_at = CURRENT_TIMESTAMP WHERE id = 1; END;
CREATE TRIGGER IF NOT EXISTS search_revision_question_versions_insert AFTER INSERT ON question_versions BEGIN UPDATE search_index_state SET source_revision = source_revision + 1, updated_at = CURRENT_TIMESTAMP WHERE id = 1; END;
CREATE TRIGGER IF NOT EXISTS search_revision_question_versions_update AFTER UPDATE ON question_versions BEGIN UPDATE search_index_state SET source_revision = source_revision + 1, updated_at = CURRENT_TIMESTAMP WHERE id = 1; END;
CREATE TRIGGER IF NOT EXISTS search_revision_question_versions_delete AFTER DELETE ON question_versions BEGIN UPDATE search_index_state SET source_revision = source_revision + 1, updated_at = CURRENT_TIMESTAMP WHERE id = 1; END;
CREATE TRIGGER IF NOT EXISTS search_revision_question_concepts_insert AFTER INSERT ON question_concepts BEGIN UPDATE search_index_state SET source_revision = source_revision + 1, updated_at = CURRENT_TIMESTAMP WHERE id = 1; END;
CREATE TRIGGER IF NOT EXISTS search_revision_question_concepts_update AFTER UPDATE ON question_concepts BEGIN UPDATE search_index_state SET source_revision = source_revision + 1, updated_at = CURRENT_TIMESTAMP WHERE id = 1; END;
CREATE TRIGGER IF NOT EXISTS search_revision_question_concepts_delete AFTER DELETE ON question_concepts BEGIN UPDATE search_index_state SET source_revision = source_revision + 1, updated_at = CURRENT_TIMESTAMP WHERE id = 1; END;
CREATE TRIGGER IF NOT EXISTS search_revision_question_learning_objectives_insert AFTER INSERT ON question_learning_objectives BEGIN UPDATE search_index_state SET source_revision = source_revision + 1, updated_at = CURRENT_TIMESTAMP WHERE id = 1; END;
CREATE TRIGGER IF NOT EXISTS search_revision_question_learning_objectives_update AFTER UPDATE ON question_learning_objectives BEGIN UPDATE search_index_state SET source_revision = source_revision + 1, updated_at = CURRENT_TIMESTAMP WHERE id = 1; END;
CREATE TRIGGER IF NOT EXISTS search_revision_question_learning_objectives_delete AFTER DELETE ON question_learning_objectives BEGIN UPDATE search_index_state SET source_revision = source_revision + 1, updated_at = CURRENT_TIMESTAMP WHERE id = 1; END;

CREATE TRIGGER IF NOT EXISTS search_revision_assessments_insert AFTER INSERT ON assessments BEGIN UPDATE search_index_state SET source_revision = source_revision + 1, updated_at = CURRENT_TIMESTAMP WHERE id = 1; END;
CREATE TRIGGER IF NOT EXISTS search_revision_assessments_update AFTER UPDATE ON assessments BEGIN UPDATE search_index_state SET source_revision = source_revision + 1, updated_at = CURRENT_TIMESTAMP WHERE id = 1; END;
CREATE TRIGGER IF NOT EXISTS search_revision_assessments_delete AFTER DELETE ON assessments BEGIN UPDATE search_index_state SET source_revision = source_revision + 1, updated_at = CURRENT_TIMESTAMP WHERE id = 1; END;
CREATE TRIGGER IF NOT EXISTS search_revision_assessment_sections_insert AFTER INSERT ON assessment_sections BEGIN UPDATE search_index_state SET source_revision = source_revision + 1, updated_at = CURRENT_TIMESTAMP WHERE id = 1; END;
CREATE TRIGGER IF NOT EXISTS search_revision_assessment_sections_update AFTER UPDATE ON assessment_sections BEGIN UPDATE search_index_state SET source_revision = source_revision + 1, updated_at = CURRENT_TIMESTAMP WHERE id = 1; END;
CREATE TRIGGER IF NOT EXISTS search_revision_assessment_sections_delete AFTER DELETE ON assessment_sections BEGIN UPDATE search_index_state SET source_revision = source_revision + 1, updated_at = CURRENT_TIMESTAMP WHERE id = 1; END;
CREATE TRIGGER IF NOT EXISTS search_revision_assessment_pools_insert AFTER INSERT ON assessment_pools BEGIN UPDATE search_index_state SET source_revision = source_revision + 1, updated_at = CURRENT_TIMESTAMP WHERE id = 1; END;
CREATE TRIGGER IF NOT EXISTS search_revision_assessment_pools_update AFTER UPDATE ON assessment_pools BEGIN UPDATE search_index_state SET source_revision = source_revision + 1, updated_at = CURRENT_TIMESTAMP WHERE id = 1; END;
CREATE TRIGGER IF NOT EXISTS search_revision_assessment_pools_delete AFTER DELETE ON assessment_pools BEGIN UPDATE search_index_state SET source_revision = source_revision + 1, updated_at = CURRENT_TIMESTAMP WHERE id = 1; END;
CREATE TRIGGER IF NOT EXISTS search_revision_assessment_questions_insert AFTER INSERT ON assessment_questions BEGIN UPDATE search_index_state SET source_revision = source_revision + 1, updated_at = CURRENT_TIMESTAMP WHERE id = 1; END;
CREATE TRIGGER IF NOT EXISTS search_revision_assessment_questions_update AFTER UPDATE ON assessment_questions BEGIN UPDATE search_index_state SET source_revision = source_revision + 1, updated_at = CURRENT_TIMESTAMP WHERE id = 1; END;
CREATE TRIGGER IF NOT EXISTS search_revision_assessment_questions_delete AFTER DELETE ON assessment_questions BEGIN UPDATE search_index_state SET source_revision = source_revision + 1, updated_at = CURRENT_TIMESTAMP WHERE id = 1; END;

CREATE TRIGGER IF NOT EXISTS search_revision_simulations_insert AFTER INSERT ON simulations BEGIN UPDATE search_index_state SET source_revision = source_revision + 1, updated_at = CURRENT_TIMESTAMP WHERE id = 1; END;
CREATE TRIGGER IF NOT EXISTS search_revision_simulations_update AFTER UPDATE ON simulations BEGIN UPDATE search_index_state SET source_revision = source_revision + 1, updated_at = CURRENT_TIMESTAMP WHERE id = 1; END;
CREATE TRIGGER IF NOT EXISTS search_revision_simulations_delete AFTER DELETE ON simulations BEGIN UPDATE search_index_state SET source_revision = source_revision + 1, updated_at = CURRENT_TIMESTAMP WHERE id = 1; END;
CREATE TRIGGER IF NOT EXISTS search_revision_simulation_versions_insert AFTER INSERT ON simulation_versions BEGIN UPDATE search_index_state SET source_revision = source_revision + 1, updated_at = CURRENT_TIMESTAMP WHERE id = 1; END;
CREATE TRIGGER IF NOT EXISTS search_revision_simulation_versions_update AFTER UPDATE ON simulation_versions BEGIN UPDATE search_index_state SET source_revision = source_revision + 1, updated_at = CURRENT_TIMESTAMP WHERE id = 1; END;
CREATE TRIGGER IF NOT EXISTS search_revision_simulation_versions_delete AFTER DELETE ON simulation_versions BEGIN UPDATE search_index_state SET source_revision = source_revision + 1, updated_at = CURRENT_TIMESTAMP WHERE id = 1; END;
CREATE TRIGGER IF NOT EXISTS search_revision_lesson_simulations_insert AFTER INSERT ON lesson_simulations BEGIN UPDATE search_index_state SET source_revision = source_revision + 1, updated_at = CURRENT_TIMESTAMP WHERE id = 1; END;
CREATE TRIGGER IF NOT EXISTS search_revision_lesson_simulations_update AFTER UPDATE ON lesson_simulations BEGIN UPDATE search_index_state SET source_revision = source_revision + 1, updated_at = CURRENT_TIMESTAMP WHERE id = 1; END;
CREATE TRIGGER IF NOT EXISTS search_revision_lesson_simulations_delete AFTER DELETE ON lesson_simulations BEGIN UPDATE search_index_state SET source_revision = source_revision + 1, updated_at = CURRENT_TIMESTAMP WHERE id = 1; END;

CREATE TRIGGER IF NOT EXISTS search_revision_laboratory_activities_insert AFTER INSERT ON laboratory_activities BEGIN UPDATE search_index_state SET source_revision = source_revision + 1, updated_at = CURRENT_TIMESTAMP WHERE id = 1; END;
CREATE TRIGGER IF NOT EXISTS search_revision_laboratory_activities_update AFTER UPDATE ON laboratory_activities BEGIN UPDATE search_index_state SET source_revision = source_revision + 1, updated_at = CURRENT_TIMESTAMP WHERE id = 1; END;
CREATE TRIGGER IF NOT EXISTS search_revision_laboratory_activities_delete AFTER DELETE ON laboratory_activities BEGIN UPDATE search_index_state SET source_revision = source_revision + 1, updated_at = CURRENT_TIMESTAMP WHERE id = 1; END;
CREATE TRIGGER IF NOT EXISTS search_revision_laboratory_steps_insert AFTER INSERT ON laboratory_steps BEGIN UPDATE search_index_state SET source_revision = source_revision + 1, updated_at = CURRENT_TIMESTAMP WHERE id = 1; END;
CREATE TRIGGER IF NOT EXISTS search_revision_laboratory_steps_update AFTER UPDATE ON laboratory_steps BEGIN UPDATE search_index_state SET source_revision = source_revision + 1, updated_at = CURRENT_TIMESTAMP WHERE id = 1; END;
CREATE TRIGGER IF NOT EXISTS search_revision_laboratory_steps_delete AFTER DELETE ON laboratory_steps BEGIN UPDATE search_index_state SET source_revision = source_revision + 1, updated_at = CURRENT_TIMESTAMP WHERE id = 1; END;

CREATE TRIGGER IF NOT EXISTS search_revision_roadmaps_insert AFTER INSERT ON roadmaps BEGIN UPDATE search_index_state SET source_revision = source_revision + 1, updated_at = CURRENT_TIMESTAMP WHERE id = 1; END;
CREATE TRIGGER IF NOT EXISTS search_revision_roadmaps_update AFTER UPDATE ON roadmaps BEGIN UPDATE search_index_state SET source_revision = source_revision + 1, updated_at = CURRENT_TIMESTAMP WHERE id = 1; END;
CREATE TRIGGER IF NOT EXISTS search_revision_roadmaps_delete AFTER DELETE ON roadmaps BEGIN UPDATE search_index_state SET source_revision = source_revision + 1, updated_at = CURRENT_TIMESTAMP WHERE id = 1; END;
CREATE TRIGGER IF NOT EXISTS search_revision_roadmap_versions_insert AFTER INSERT ON roadmap_versions BEGIN UPDATE search_index_state SET source_revision = source_revision + 1, updated_at = CURRENT_TIMESTAMP WHERE id = 1; END;
CREATE TRIGGER IF NOT EXISTS search_revision_roadmap_versions_update AFTER UPDATE ON roadmap_versions BEGIN UPDATE search_index_state SET source_revision = source_revision + 1, updated_at = CURRENT_TIMESTAMP WHERE id = 1; END;
CREATE TRIGGER IF NOT EXISTS search_revision_roadmap_versions_delete AFTER DELETE ON roadmap_versions BEGIN UPDATE search_index_state SET source_revision = source_revision + 1, updated_at = CURRENT_TIMESTAMP WHERE id = 1; END;
CREATE TRIGGER IF NOT EXISTS search_revision_roadmap_subjects_insert AFTER INSERT ON roadmap_subjects BEGIN UPDATE search_index_state SET source_revision = source_revision + 1, updated_at = CURRENT_TIMESTAMP WHERE id = 1; END;
CREATE TRIGGER IF NOT EXISTS search_revision_roadmap_subjects_update AFTER UPDATE ON roadmap_subjects BEGIN UPDATE search_index_state SET source_revision = source_revision + 1, updated_at = CURRENT_TIMESTAMP WHERE id = 1; END;
CREATE TRIGGER IF NOT EXISTS search_revision_roadmap_subjects_delete AFTER DELETE ON roadmap_subjects BEGIN UPDATE search_index_state SET source_revision = source_revision + 1, updated_at = CURRENT_TIMESTAMP WHERE id = 1; END;
CREATE TRIGGER IF NOT EXISTS search_revision_roadmap_nodes_insert AFTER INSERT ON roadmap_nodes BEGIN UPDATE search_index_state SET source_revision = source_revision + 1, updated_at = CURRENT_TIMESTAMP WHERE id = 1; END;
CREATE TRIGGER IF NOT EXISTS search_revision_roadmap_nodes_update AFTER UPDATE ON roadmap_nodes BEGIN UPDATE search_index_state SET source_revision = source_revision + 1, updated_at = CURRENT_TIMESTAMP WHERE id = 1; END;
CREATE TRIGGER IF NOT EXISTS search_revision_roadmap_nodes_delete AFTER DELETE ON roadmap_nodes BEGIN UPDATE search_index_state SET source_revision = source_revision + 1, updated_at = CURRENT_TIMESTAMP WHERE id = 1; END;

CREATE TRIGGER IF NOT EXISTS search_revision_tags_insert AFTER INSERT ON tags BEGIN UPDATE search_index_state SET source_revision = source_revision + 1, updated_at = CURRENT_TIMESTAMP WHERE id = 1; END;
CREATE TRIGGER IF NOT EXISTS search_revision_tags_update AFTER UPDATE ON tags BEGIN UPDATE search_index_state SET source_revision = source_revision + 1, updated_at = CURRENT_TIMESTAMP WHERE id = 1; END;
CREATE TRIGGER IF NOT EXISTS search_revision_tags_delete AFTER DELETE ON tags BEGIN UPDATE search_index_state SET source_revision = source_revision + 1, updated_at = CURRENT_TIMESTAMP WHERE id = 1; END;
CREATE TRIGGER IF NOT EXISTS search_revision_notes_insert AFTER INSERT ON notes BEGIN UPDATE search_index_state SET source_revision = source_revision + 1, updated_at = CURRENT_TIMESTAMP WHERE id = 1; END;
CREATE TRIGGER IF NOT EXISTS search_revision_notes_update AFTER UPDATE ON notes BEGIN UPDATE search_index_state SET source_revision = source_revision + 1, updated_at = CURRENT_TIMESTAMP WHERE id = 1; END;
CREATE TRIGGER IF NOT EXISTS search_revision_notes_delete AFTER DELETE ON notes BEGIN UPDATE search_index_state SET source_revision = source_revision + 1, updated_at = CURRENT_TIMESTAMP WHERE id = 1; END;
CREATE TRIGGER IF NOT EXISTS search_revision_note_links_insert AFTER INSERT ON note_links BEGIN UPDATE search_index_state SET source_revision = source_revision + 1, updated_at = CURRENT_TIMESTAMP WHERE id = 1; END;
CREATE TRIGGER IF NOT EXISTS search_revision_note_links_update AFTER UPDATE ON note_links BEGIN UPDATE search_index_state SET source_revision = source_revision + 1, updated_at = CURRENT_TIMESTAMP WHERE id = 1; END;
CREATE TRIGGER IF NOT EXISTS search_revision_note_links_delete AFTER DELETE ON note_links BEGIN UPDATE search_index_state SET source_revision = source_revision + 1, updated_at = CURRENT_TIMESTAMP WHERE id = 1; END;
CREATE TRIGGER IF NOT EXISTS search_revision_note_tags_insert AFTER INSERT ON note_tags BEGIN UPDATE search_index_state SET source_revision = source_revision + 1, updated_at = CURRENT_TIMESTAMP WHERE id = 1; END;
CREATE TRIGGER IF NOT EXISTS search_revision_note_tags_update AFTER UPDATE ON note_tags BEGIN UPDATE search_index_state SET source_revision = source_revision + 1, updated_at = CURRENT_TIMESTAMP WHERE id = 1; END;
CREATE TRIGGER IF NOT EXISTS search_revision_note_tags_delete AFTER DELETE ON note_tags BEGIN UPDATE search_index_state SET source_revision = source_revision + 1, updated_at = CURRENT_TIMESTAMP WHERE id = 1; END;
CREATE TRIGGER IF NOT EXISTS search_revision_bookmarks_insert AFTER INSERT ON bookmarks BEGIN UPDATE search_index_state SET source_revision = source_revision + 1, updated_at = CURRENT_TIMESTAMP WHERE id = 1; END;
CREATE TRIGGER IF NOT EXISTS search_revision_bookmarks_update AFTER UPDATE ON bookmarks BEGIN UPDATE search_index_state SET source_revision = source_revision + 1, updated_at = CURRENT_TIMESTAMP WHERE id = 1; END;
CREATE TRIGGER IF NOT EXISTS search_revision_bookmarks_delete AFTER DELETE ON bookmarks BEGIN UPDATE search_index_state SET source_revision = source_revision + 1, updated_at = CURRENT_TIMESTAMP WHERE id = 1; END;
