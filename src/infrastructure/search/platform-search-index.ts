import { getDatabase, type DatabaseHandle } from "@/infrastructure/database/client";
import { SqlSearchProvider } from "@/infrastructure/search/sql-search-provider";
import type { SearchDocument, SearchDocumentMetadata } from "@/domain/search/types";
import type { SearchProvider } from "@/domain/ports/search-provider";

type DbRow = Record<string, unknown>;
type SearchContext = Pick<SearchDocumentMetadata, "subjectIds" | "gradeIds" | "curriculumIds">;

let rebuildPromise: Promise<void> | null = null;

export async function ensureSearchIndex(
  database: DatabaseHandle = getDatabase(),
  provider: SearchProvider = new SqlSearchProvider(database),
): Promise<void> {
  const state = await readIndexState(database);
  if (state.sourceRevision === state.indexedRevision) return;
  if (!rebuildPromise) {
    rebuildPromise = rebuildSearchIndex(database, provider).finally(() => {
      rebuildPromise = null;
    });
  }
  await rebuildPromise;
}

export async function rebuildSearchIndex(
  database: DatabaseHandle = getDatabase(),
  provider: SearchProvider = new SqlSearchProvider(database),
): Promise<void> {
  const state = await readIndexState(database);
  const documents = await buildSearchDocuments(database);
  await provider.replaceAll(documents);
  await writeIndexedRevision(database, state.sourceRevision);
}

export async function buildSearchDocuments(
  database: DatabaseHandle = getDatabase(),
): Promise<readonly SearchDocument[]> {
  const [
    curricula,
    grades,
    subjects,
    domains,
    courses,
    modules,
    lessons,
    lessonBlocks,
    concepts,
    questions,
    assessments,
    assessmentSections,
    simulations,
    laboratories,
    laboratorySteps,
    roadmaps,
    roadmapNodes,
    notes,
    bookmarks,
    curriculumGrades,
    curriculumSubjects,
    gradeSubjects,
    subjectDomains,
    gradeSubjectDomains,
    courseCurricula,
    courseGrades,
    gradeObjectives,
    conceptObjectives,
    questionObjectives,
    questionConcepts,
    assessmentQuestions,
    lessonSimulations,
    roadmapSubjects,
    noteLinks,
    noteTags,
  ] = await Promise.all([
    rows(
      database,
      "SELECT id, name, description, authority, is_archived, updated_at FROM curricula",
    ),
    rows(database, "SELECT id, name, short_name, description, is_archived, updated_at FROM grades"),
    rows(database, "SELECT id, name, description, is_archived, updated_at FROM subjects"),
    rows(database, "SELECT id, name, description, is_archived, updated_at FROM domains"),
    rows(
      database,
      "SELECT id, title, description, subject_id, difficulty, grade_min_id, grade_max_id, status, updated_at FROM courses",
    ),
    rows(
      database,
      "SELECT id, course_id, title, description, assessment_reference, is_archived, updated_at FROM modules",
    ),
    rows(database, "SELECT id, module_id, title, summary, status, updated_at FROM lessons"),
    rows(
      database,
      "SELECT ls.lesson_id, lb.title, lb.payload FROM lesson_sections ls JOIN lesson_blocks lb ON lb.section_id = ls.id ORDER BY ls.lesson_id, ls.sort_order, lb.sort_order",
    ),
    rows(
      database,
      "SELECT id, name, description, subject_id, domain_id, grade_min_id, grade_max_id, difficulty, is_archived, updated_at FROM concepts",
    ),
    rows(
      database,
      "SELECT q.id, q.title, q.subject_id, q.grade_min_id, q.grade_max_id, q.difficulty, q.status, q.tags, q.updated_at, v.prompt, v.explanation FROM questions q LEFT JOIN question_versions v ON v.question_id = q.id AND v.version_number = q.current_version_number",
    ),
    rows(
      database,
      "SELECT id, title, description, subject_id, grade_id, status, updated_at FROM assessments",
    ),
    rows(database, "SELECT assessment_id, title, description FROM assessment_sections"),
    rows(
      database,
      "SELECT id, title, description, subject_id, status, updated_at FROM simulations",
    ),
    rows(
      database,
      "SELECT id, title, description, objective, theory, analysis_prompt, status, subject_id, simulation_id, updated_at FROM laboratory_activities",
    ),
    rows(
      database,
      "SELECT activity_id, title, instructions, expected_observation FROM laboratory_steps",
    ),
    rows(
      database,
      "SELECT id, title, description, goal, target_grade_id, target_difficulty, status, updated_at FROM roadmaps",
    ),
    rows(
      database,
      "SELECT rv.roadmap_id, rn.title, rn.description FROM roadmap_nodes rn JOIN roadmap_versions rv ON rv.id = rn.roadmap_version_id",
    ),
    rows(
      database,
      "SELECT id, profile_id, title, body_markdown, is_archived, updated_at FROM notes",
    ),
    rows(
      database,
      "SELECT id, profile_id, resource_type, resource_id, title, source_url, updated_at FROM bookmarks",
    ),
    rows(database, "SELECT curriculum_id, grade_id FROM curriculum_grades"),
    rows(database, "SELECT curriculum_id, subject_id FROM curriculum_subjects"),
    rows(database, "SELECT curriculum_id, grade_id, subject_id FROM grade_subjects"),
    rows(database, "SELECT subject_id, domain_id FROM subject_domains"),
    rows(
      database,
      "SELECT curriculum_id, grade_id, subject_id, domain_id FROM grade_subject_domains",
    ),
    rows(database, "SELECT course_id, curriculum_id FROM course_curricula"),
    rows(database, "SELECT course_id, grade_id FROM course_grades"),
    rows(database, "SELECT curriculum_id, grade_id, objective_id FROM grade_learning_objectives"),
    rows(database, "SELECT concept_id, objective_id FROM concept_learning_objectives"),
    rows(database, "SELECT question_id, objective_id FROM question_learning_objectives"),
    rows(database, "SELECT question_id, concept_id FROM question_concepts"),
    rows(database, "SELECT assessment_id, question_id FROM assessment_questions"),
    rows(database, "SELECT lesson_id, simulation_id FROM lesson_simulations"),
    rows(database, "SELECT roadmap_id, subject_id FROM roadmap_subjects"),
    rows(database, "SELECT profile_id, note_id, resource_type, resource_id, label FROM note_links"),
    rows(
      database,
      "SELECT nt.note_id, nt.tag_id, t.name FROM note_tags nt JOIN tags t ON t.id = nt.tag_id",
    ),
  ]);

  const courseById = byId(courses);
  const moduleById = byId(modules);
  const lessonById = byId(lessons);

  const curriculumIdsByGrade = relationMap(curriculumGrades, "grade_id", "curriculum_id");
  const curriculumIdsBySubject = relationMap(curriculumSubjects, "subject_id", "curriculum_id");
  const gradeIdsBySubject = relationMap(gradeSubjects, "subject_id", "grade_id");
  const subjectIdsByGrade = relationMap(gradeSubjects, "grade_id", "subject_id");
  const subjectIdsByDomain = relationMap(subjectDomains, "domain_id", "subject_id");
  const curriculumIdsByDomain = relationMap(gradeSubjectDomains, "domain_id", "curriculum_id");
  const gradeIdsByDomain = relationMap(gradeSubjectDomains, "domain_id", "grade_id");
  const curriculumIdsByCourse = relationMap(courseCurricula, "course_id", "curriculum_id");
  const gradeIdsByCourse = relationMap(courseGrades, "course_id", "grade_id");
  const gradeIdsByObjective = relationMap(gradeObjectives, "objective_id", "grade_id");
  const curriculumIdsByObjective = relationMap(gradeObjectives, "objective_id", "curriculum_id");
  const objectiveIdsByConcept = relationMap(conceptObjectives, "concept_id", "objective_id");
  const objectiveIdsByQuestion = relationMap(questionObjectives, "question_id", "objective_id");
  const conceptIdsByQuestion = relationMap(questionConcepts, "question_id", "concept_id");
  const questionIdsByAssessment = relationMap(assessmentQuestions, "assessment_id", "question_id");
  const simulationIdsByLesson = relationMap(lessonSimulations, "lesson_id", "simulation_id");
  const subjectIdsByRoadmap = relationMap(roadmapSubjects, "roadmap_id", "subject_id");
  const tagsByNote = relationMap(noteTags, "note_id", "name");
  const blocksByLesson = groupText(
    lessonBlocks,
    "lesson_id",
    (row) => `${asText(row.title)} ${searchableText(row.payload)}`,
  );
  const sectionsByAssessment = groupText(
    assessmentSections,
    "assessment_id",
    (row) => `${asText(row.title)} ${asText(row.description)}`,
  );
  const stepsByLaboratory = groupText(
    laboratorySteps,
    "activity_id",
    (row) => `${asText(row.title)} ${asText(row.instructions)} ${asText(row.expected_observation)}`,
  );
  const nodesByRoadmap = groupText(
    roadmapNodes,
    "roadmap_id",
    (row) => `${asText(row.title)} ${asText(row.description)}`,
  );

  const gradeLabels = labels(grades);
  const subjectLabels = labels(subjects);
  const curriculumLabels = labels(curricula);
  const contextLabels = {
    gradeLabels,
    subjectLabels,
    curriculumLabels,
  };
  const documents: SearchDocument[] = [];

  for (const row of curricula) {
    const id = asText(row.id);
    documents.push(
      makeDocument(
        "curriculum",
        id,
        asText(row.name),
        `${asText(row.description)} ${asText(row.authority)}`,
        `/curricula/${id}`,
        {
          ...contextLabels,
          gradeIds: curriculumGrades
            .filter((item) => asText(item.curriculum_id) === id)
            .map((item) => asText(item.grade_id)),
          subjectIds: curriculumSubjects
            .filter((item) => asText(item.curriculum_id) === id)
            .map((item) => asText(item.subject_id)),
          publicationStatus: archivedStatus(row.is_archived),
        },
        undefined,
        row.updated_at,
      ),
    );
  }
  for (const row of grades) {
    const id = asText(row.id);
    documents.push(
      makeDocument(
        "grade",
        id,
        asText(row.name),
        `${asText(row.short_name)} ${asText(row.description)}`,
        `/grades/${id}`,
        {
          ...contextLabels,
          gradeIds: [id],
          curriculumIds: curriculumIdsByGrade.get(id),
          subjectIds: subjectIdsByGrade.get(id),
          publicationStatus: archivedStatus(row.is_archived),
        },
        undefined,
        row.updated_at,
      ),
    );
  }
  for (const row of subjects) {
    const id = asText(row.id);
    documents.push(
      makeDocument(
        "subject",
        id,
        asText(row.name),
        asText(row.description),
        `/subjects/${id}`,
        {
          ...contextLabels,
          subjectIds: [id],
          gradeIds: gradeIdsBySubject.get(id),
          curriculumIds: curriculumIdsBySubject.get(id),
          publicationStatus: archivedStatus(row.is_archived),
        },
        undefined,
        row.updated_at,
      ),
    );
  }
  for (const row of domains) {
    const id = asText(row.id);
    const subjectId = subjectIdsByDomain.get(id)?.[0];
    documents.push(
      makeDocument(
        "domain",
        id,
        asText(row.name),
        asText(row.description),
        subjectId ? `/subjects/${subjectId}` : "/subjects",
        {
          ...contextLabels,
          subjectIds: subjectIdsByDomain.get(id),
          gradeIds: gradeIdsByDomain.get(id),
          curriculumIds: curriculumIdsByDomain.get(id),
          publicationStatus: archivedStatus(row.is_archived),
        },
        undefined,
        row.updated_at,
      ),
    );
  }

  const contextForCourse = (row: DbRow): SearchContext => ({
    subjectIds: [asText(row.subject_id)],
    gradeIds: [
      ...(gradeIdsByCourse.get(asText(row.id)) ?? []),
      ...nonNull([row.grade_min_id, row.grade_max_id]),
    ],
    curriculumIds: curriculumIdsByCourse.get(asText(row.id)),
  });
  for (const row of courses) {
    const id = asText(row.id);
    documents.push(
      makeDocument(
        "course",
        id,
        asText(row.title),
        asText(row.description),
        `/courses/${id}`,
        {
          ...contextLabels,
          ...contextForCourse(row),
          difficulty: difficulty(row.difficulty),
          publicationStatus: status(row.status),
        },
        undefined,
        row.updated_at,
      ),
    );
  }
  const contextForModule = (row: DbRow): SearchContext => {
    const course = courseById.get(asText(row.course_id));
    return course ? contextForCourse(course) : {};
  };
  for (const row of modules) {
    const id = asText(row.id);
    const courseId = asText(row.course_id);
    const course = courseById.get(courseId);
    const moduleStatus = row.is_archived ? "archived" : status(course?.status);
    documents.push(
      makeDocument(
        "module",
        id,
        asText(row.title),
        `${asText(row.description)} ${asText(row.assessment_reference)}`,
        `/courses/${courseId}/modules/${id}`,
        {
          ...contextLabels,
          ...contextForModule(row),
          publicationStatus: moduleStatus,
        },
        undefined,
        row.updated_at,
      ),
    );
  }
  const contextForLesson = (row: DbRow): SearchContext => {
    const moduleRow = moduleById.get(asText(row.module_id));
    return moduleRow ? contextForModule(moduleRow) : {};
  };
  for (const row of lessons) {
    const id = asText(row.id);
    const context = contextForLesson(row);
    const moduleRow = moduleById.get(asText(row.module_id));
    const course = moduleRow ? courseById.get(asText(moduleRow.course_id)) : undefined;
    const lessonStatus = course?.status === "archived" ? "archived" : status(row.status);
    documents.push(
      makeDocument(
        "lesson",
        id,
        asText(row.title),
        `${asText(row.summary)} ${blocksByLesson.get(id)?.join(" ") ?? ""}`,
        `/lessons/${id}`,
        {
          ...contextLabels,
          ...context,
          publicationStatus: lessonStatus,
        },
        undefined,
        row.updated_at,
      ),
    );
  }

  const contextForConcept = (row: DbRow): SearchContext => {
    const id = asText(row.id);
    const objectiveIds = objectiveIdsByConcept.get(id) ?? [];
    return {
      subjectIds: [asText(row.subject_id)],
      gradeIds: unique([
        ...nonNull([row.grade_min_id, row.grade_max_id]),
        ...objectiveIds.flatMap((objectiveId) => gradeIdsByObjective.get(objectiveId) ?? []),
      ]),
      curriculumIds: unique(
        objectiveIds.flatMap((objectiveId) => curriculumIdsByObjective.get(objectiveId) ?? []),
      ),
    };
  };
  for (const row of concepts) {
    const id = asText(row.id);
    documents.push(
      makeDocument(
        "concept",
        id,
        asText(row.name),
        asText(row.description),
        `/concepts/${id}`,
        {
          ...contextLabels,
          ...contextForConcept(row),
          difficulty: difficulty(row.difficulty),
          masteryState: "unassessed",
          publicationStatus: archivedStatus(row.is_archived),
        },
        undefined,
        row.updated_at,
      ),
    );
  }
  const contextForQuestion = (row: DbRow): SearchContext => {
    const id = asText(row.id);
    const objectiveIds = objectiveIdsByQuestion.get(id) ?? [];
    const conceptIds = conceptIdsByQuestion.get(id) ?? [];
    return {
      subjectIds: [
        asText(row.subject_id),
        ...conceptIds.flatMap((conceptId) => {
          const concept = concepts.find((item) => asText(item.id) === conceptId);
          return concept ? [asText(concept.subject_id)] : [];
        }),
      ],
      gradeIds: unique([
        ...nonNull([row.grade_min_id, row.grade_max_id]),
        ...objectiveIds.flatMap((objectiveId) => gradeIdsByObjective.get(objectiveId) ?? []),
      ]),
      curriculumIds: unique(
        objectiveIds.flatMap((objectiveId) => curriculumIdsByObjective.get(objectiveId) ?? []),
      ),
    };
  };
  for (const row of questions) {
    const id = asText(row.id);
    documents.push(
      makeDocument(
        "question",
        id,
        asText(row.title),
        `${asText(row.prompt)} ${asText(row.explanation)} ${searchableText(row.tags)}`,
        "/exercises",
        {
          ...contextLabels,
          ...contextForQuestion(row),
          difficulty: difficulty(row.difficulty),
          publicationStatus: status(row.status),
        },
        undefined,
        row.updated_at,
      ),
    );
  }
  const contextForAssessment = (row: DbRow): SearchContext => ({
    subjectIds: nonNull([row.subject_id]),
    gradeIds: nonNull([row.grade_id]),
    curriculumIds: unique(
      (questionIdsByAssessment.get(asText(row.id)) ?? []).flatMap((questionId) => {
        const question = questions.find((item) => asText(item.id) === questionId);
        return question ? (contextForQuestion(question).curriculumIds ?? []) : [];
      }),
    ),
  });
  for (const row of assessments) {
    const id = asText(row.id);
    documents.push(
      makeDocument(
        "assessment",
        id,
        asText(row.title),
        `${asText(row.description)} ${sectionsByAssessment.get(id)?.join(" ") ?? ""}`,
        `/assessments/${id}`,
        {
          ...contextLabels,
          ...contextForAssessment(row),
          publicationStatus: status(row.status),
        },
        undefined,
        row.updated_at,
      ),
    );
  }
  const contextForSimulation = (row: DbRow): SearchContext => {
    const lessonIds = simulationIdsByLesson;
    const linkedLessons = [...lessonIds.entries()]
      .filter(([, simulationIds]) => simulationIds.includes(asText(row.id)))
      .map(([lessonId]) => lessonId);
    return {
      subjectIds: [asText(row.subject_id)],
      gradeIds: unique(
        linkedLessons.flatMap(
          (lessonId) => contextForLesson(lessonById.get(lessonId) ?? {}).gradeIds ?? [],
        ),
      ),
      curriculumIds: unique(
        linkedLessons.flatMap(
          (lessonId) => contextForLesson(lessonById.get(lessonId) ?? {}).curriculumIds ?? [],
        ),
      ),
    };
  };
  for (const row of simulations) {
    const id = asText(row.id);
    documents.push(
      makeDocument(
        "simulation",
        id,
        asText(row.title),
        asText(row.description),
        `/simulations/${id}`,
        {
          ...contextLabels,
          ...contextForSimulation(row),
          publicationStatus: status(row.status),
        },
        undefined,
        row.updated_at,
      ),
    );
  }
  for (const row of laboratories) {
    const id = asText(row.id);
    const simulation = simulations.find((item) => asText(item.id) === asText(row.simulation_id));
    documents.push(
      makeDocument(
        "laboratory",
        id,
        asText(row.title),
        `${asText(row.description)} ${asText(row.objective)} ${asText(row.theory)} ${asText(row.analysis_prompt)} ${stepsByLaboratory.get(id)?.join(" ") ?? ""}`,
        `/laboratories/${id}`,
        {
          ...contextLabels,
          subjectIds: nonNull([row.subject_id, simulation?.subject_id]),
          ...((simulation && contextForSimulation(simulation)) || {}),
          publicationStatus: status(row.status),
        },
        undefined,
        row.updated_at,
      ),
    );
  }
  for (const row of roadmaps) {
    const id = asText(row.id);
    documents.push(
      makeDocument(
        "roadmap",
        id,
        asText(row.title),
        `${asText(row.description)} ${asText(row.goal)} ${nodesByRoadmap.get(id)?.join(" ") ?? ""}`,
        `/roadmaps/${id}`,
        {
          ...contextLabels,
          subjectIds: subjectIdsByRoadmap.get(id),
          gradeIds: nonNull([row.target_grade_id]),
          difficulty: difficulty(row.target_difficulty),
          publicationStatus: status(row.status),
        },
        undefined,
        row.updated_at,
      ),
    );
  }

  const globalDocuments = new Map(
    documents.map((document) => [`${document.type}:${document.resourceId}`, document]),
  );
  const addLinkedContext = (context: SearchContext, type: string, resourceId: string) => {
    const target = globalDocuments.get(`${type}:${resourceId}`);
    if (!target) return context;
    return {
      subjectIds: unique([...(context.subjectIds ?? []), ...(target.metadata?.subjectIds ?? [])]),
      gradeIds: unique([...(context.gradeIds ?? []), ...(target.metadata?.gradeIds ?? [])]),
      curriculumIds: unique([
        ...(context.curriculumIds ?? []),
        ...(target.metadata?.curriculumIds ?? []),
      ]),
    };
  };
  for (const row of notes) {
    const id = asText(row.id);
    let context: SearchContext = {};
    for (const link of noteLinks.filter((item) => asText(item.note_id) === id))
      context = addLinkedContext(
        context,
        noteResourceType(asText(link.resource_type)),
        asText(link.resource_id),
      );
    documents.push(
      makeDocument(
        "note",
        id,
        asText(row.title),
        `${asText(row.body_markdown)} ${(tagsByNote.get(id) ?? []).join(" ")}`,
        "/notes",
        {
          ...contextLabels,
          ...context,
          publicationStatus: row.is_archived ? "archived" : "personal",
        },
        asText(row.profile_id),
        row.updated_at,
      ),
    );
  }
  for (const row of bookmarks) {
    const id = asText(row.id);
    const targetType = bookmarkResourceType(asText(row.resource_type));
    const target = globalDocuments.get(`${targetType}:${asText(row.resource_id)}`);
    const targetContext = target?.metadata ?? {};
    documents.push(
      makeDocument(
        "bookmark",
        id,
        asText(row.title),
        `${asText(row.title)} ${asText(row.source_url)}`,
        target?.href ?? "/notes",
        {
          ...contextLabels,
          subjectIds: targetContext.subjectIds,
          gradeIds: targetContext.gradeIds,
          curriculumIds: targetContext.curriculumIds,
          resourceType: targetType,
          publicationStatus: "personal",
        },
        asText(row.profile_id),
        row.updated_at,
      ),
    );
  }

  return documents;
}

async function rows(database: DatabaseHandle, query: string): Promise<DbRow[]> {
  if (database.provider === "sqlite") return database.raw.prepare(query).all() as DbRow[];
  return (await database.raw.unsafe(query)) as DbRow[];
}

async function readIndexState(
  database: DatabaseHandle,
): Promise<{ sourceRevision: number; indexedRevision: number }> {
  const row =
    database.provider === "sqlite"
      ? (database.raw
          .prepare("SELECT source_revision, indexed_revision FROM search_index_state WHERE id = 1")
          .get() as DbRow | undefined)
      : (
          (await database.raw.unsafe(
            "SELECT source_revision, indexed_revision FROM search_index_state WHERE id = 1",
          )) as DbRow[]
        )[0];
  return {
    sourceRevision: Number(row?.source_revision ?? 0),
    indexedRevision: Number(row?.indexed_revision ?? -1),
  };
}

async function writeIndexedRevision(database: DatabaseHandle, revision: number): Promise<void> {
  if (database.provider === "sqlite") {
    database.raw
      .prepare(
        "UPDATE search_index_state SET indexed_revision = ?, updated_at = CURRENT_TIMESTAMP WHERE id = 1",
      )
      .run(revision);
    return;
  }
  await database.raw.unsafe(
    "UPDATE search_index_state SET indexed_revision = $1, updated_at = NOW() WHERE id = 1",
    [revision],
  );
}

function makeDocument(
  type: SearchDocument["type"],
  resourceId: string,
  title: string,
  content: string,
  href: string,
  metadata: SearchDocumentMetadata,
  profileId?: string,
  updatedAt?: unknown,
): SearchDocument {
  return {
    id: `${type}:${resourceId}${profileId ? `:${profileId}` : ""}`,
    type,
    resourceId,
    profileId: profileId ?? null,
    title: title || "Untitled",
    content: content.replace(/\s+/g, " ").trim(),
    href,
    metadata,
    updatedAt: asText(updatedAt) || new Date(0).toISOString(),
  };
}

function byId(rows: readonly DbRow[]): Map<string, DbRow> {
  return new Map(rows.map((row) => [asText(row.id), row]));
}

function relationMap(rows: readonly DbRow[], key: string, value: string): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const row of rows) {
    const keyValue = asText(row[key]);
    const valueValue = asText(row[value]);
    if (!keyValue || !valueValue) continue;
    const values = map.get(keyValue) ?? [];
    if (!values.includes(valueValue)) values.push(valueValue);
    map.set(keyValue, values);
  }
  return map;
}

function groupText(
  rows: readonly DbRow[],
  key: string,
  text: (row: DbRow) => string,
): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const row of rows) {
    const keyValue = asText(row[key]);
    if (!keyValue) continue;
    const value = text(row).trim();
    if (value) map.set(keyValue, [...(map.get(keyValue) ?? []), value]);
  }
  return map;
}

function labels(rows: readonly DbRow[]): Record<string, string> {
  return Object.fromEntries(rows.map((row) => [asText(row.id), asText(row.name)]));
}

function archivedStatus(value: unknown): "published" | "archived" {
  return asBoolean(value) ? "archived" : "published";
}

function status(value: unknown): "published" | "draft" | "archived" {
  return value === "published" || value === "archived" ? value : "draft";
}

function difficulty(value: unknown): "gentle" | "balanced" | "challenging" | "mixed" | undefined {
  return value === "gentle" || value === "balanced" || value === "challenging" ? value : undefined;
}

function nonNull(values: readonly unknown[]): string[] {
  return values.filter((value): value is string => typeof value === "string" && value.length > 0);
}

function unique(values: readonly string[] | undefined): string[] {
  return [...new Set(values ?? [])];
}

function asText(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  return value === null || value === undefined ? "" : String(value);
}

function asBoolean(value: unknown): boolean {
  return value === true || value === 1 || value === "1" || value === "true";
}

function searchableText(value: unknown): string {
  if (typeof value === "string") {
    try {
      return searchableText(JSON.parse(value));
    } catch {
      return value;
    }
  }
  if (Array.isArray(value)) return value.map(searchableText).join(" ");
  if (value && typeof value === "object")
    return Object.entries(value)
      .filter(([key]) => !["id", "href", "sourceUrl", "mimeType"].includes(key))
      .map(([, child]) => searchableText(child))
      .join(" ");
  return value === null || value === undefined ? "" : String(value);
}

function noteResourceType(value: string): string {
  return value === "exercise" ? "question" : value;
}

function bookmarkResourceType(value: string): string {
  return value === "exercise" ? "question" : value;
}
