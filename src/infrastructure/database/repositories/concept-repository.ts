import { randomUUID } from "node:crypto";
import { ConflictError, NotFoundError } from "@/domain/errors/application-error";
import { buildConceptIntegrityReport } from "@/domain/concept/rules";
import { layoutKnowledgeGraph } from "@/domain/concept/graph";
import {
  CONCEPT_DIFFICULTIES,
  CONCEPT_RELATIONSHIP_TYPES,
  type ConceptApplication,
  type ConceptDetail,
  type ConceptDifficulty,
  type ConceptGradePlacement,
  type ConceptIntegritySnapshot,
  type ConceptLessonCandidate,
  type ConceptLessonLink,
  type ConceptListEntry,
  type ConceptListOptions,
  type ConceptLearningObjective,
  type ConceptMasteryState,
  type ConceptMisconception,
  type ConceptRecord,
  type ConceptRelationship,
  type ConceptRelationshipType,
  type ConceptRelationshipView,
  type CreateConceptApplicationInput,
  type CreateConceptInput,
  type CreateConceptMisconceptionInput,
  type CreateConceptRelationshipInput,
  type KnowledgeGraph,
  type KnowledgeGraphOptions,
  type UpdateConceptInput,
} from "@/domain/concept/types";
import type { ConceptRepository } from "@/domain/ports/concept-repository";
import { getDatabase, type DatabaseHandle } from "@/infrastructure/database/client";

type DbDate = Date | string | null;
type DbBoolean = boolean | number | string;

interface ConceptDbRow {
  id: string;
  slug: string;
  name: string;
  description: string;
  subject_id: string;
  domain_id: string | null;
  grade_min_id: string | null;
  grade_max_id: string | null;
  difficulty: string;
  mastery_threshold: number | string;
  is_archived: DbBoolean;
  created_at: DbDate;
  updated_at: DbDate;
  subject_name?: string;
  subject_slug?: string;
  domain_name?: string | null;
  relationship_count?: number | string;
  lesson_count?: number | string;
  objective_count?: number | string;
  prerequisite_count?: number | string;
}

interface RelationshipDbRow {
  id: string;
  source_concept_id: string;
  target_concept_id: string;
  relationship_type: string;
  created_at: DbDate;
  updated_at: DbDate;
  source_name?: string;
  source_slug?: string;
  source_subject_id?: string;
  target_name?: string;
  target_slug?: string;
  target_subject_id?: string;
}

interface ObjectiveDbRow {
  concept_id: string;
  objective_id: string;
  sort_order: number;
  created_at: DbDate;
}

interface ApplicationDbRow {
  id: string;
  concept_id: string;
  title: string;
  description: string;
  sort_order: number;
  created_at: DbDate;
  updated_at: DbDate;
}

interface MisconceptionDbRow {
  id: string;
  concept_id: string;
  misconception: string;
  correction: string;
  sort_order: number;
  created_at: DbDate;
  updated_at: DbDate;
}

interface LessonLinkDbRow {
  lesson_id: string;
  concept_id: string;
  sort_order: number;
  created_at: DbDate;
  lesson_title: string;
  lesson_slug: string;
  lesson_status: string;
  module_id: string;
  module_title: string;
  course_id: string;
  course_title: string;
  course_status: string;
}

interface LessonCandidateDbRow {
  lesson_id: string;
  lesson_title: string;
  lesson_slug: string;
  lesson_status: string;
  module_id: string;
  module_title: string;
  course_id: string;
  course_title: string;
  course_status: string;
}

interface GradeDbRow {
  id: string;
  name: string;
  short_name: string;
  sort_order: number;
}

interface IdDbRow {
  id: string;
}

interface ConceptIdDbRow {
  concept_id: string;
}

function asIso(value: DbDate): string {
  if (value instanceof Date) return value.toISOString();
  return value ?? new Date(0).toISOString();
}

function asBoolean(value: DbBoolean): boolean {
  return value === true || value === 1 || value === "1" || value === "true";
}

function asNumber(value: number | string | null | undefined): number {
  return typeof value === "number" ? value : Number(value ?? 0);
}

function asDifficulty(value: string): ConceptDifficulty {
  return CONCEPT_DIFFICULTIES.includes(value as ConceptDifficulty)
    ? (value as ConceptDifficulty)
    : "balanced";
}

function asRelationshipType(value: string): ConceptRelationshipType {
  return CONCEPT_RELATIONSHIP_TYPES.includes(value as ConceptRelationshipType)
    ? (value as ConceptRelationshipType)
    : "related-to";
}

function asStatus(value: string): "draft" | "published" | "archived" {
  return value === "published" || value === "archived" ? value : "draft";
}

function mapConcept(row: ConceptDbRow): ConceptRecord {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    subjectId: row.subject_id,
    domainId: row.domain_id,
    gradeMinId: row.grade_min_id,
    gradeMaxId: row.grade_max_id,
    difficulty: asDifficulty(row.difficulty),
    masteryThreshold: asNumber(row.mastery_threshold),
    isArchived: asBoolean(row.is_archived),
    createdAt: asIso(row.created_at),
    updatedAt: asIso(row.updated_at),
  };
}

function mapConceptList(row: ConceptDbRow): ConceptListEntry {
  return {
    ...mapConcept(row),
    subjectName: row.subject_name ?? "",
    subjectSlug: row.subject_slug ?? "",
    domainName: row.domain_name ?? null,
    relationshipCount: asNumber(row.relationship_count),
    lessonCount: asNumber(row.lesson_count),
    objectiveCount: asNumber(row.objective_count),
    prerequisiteCount: asNumber(row.prerequisite_count),
    masteryState: "unassessed",
  };
}

function mapRelationship(row: RelationshipDbRow): ConceptRelationship {
  return {
    id: row.id,
    sourceConceptId: row.source_concept_id,
    targetConceptId: row.target_concept_id,
    type: asRelationshipType(row.relationship_type),
    createdAt: asIso(row.created_at),
    updatedAt: asIso(row.updated_at),
  };
}

function mapRelationshipView(row: RelationshipDbRow): ConceptRelationshipView {
  return {
    ...mapRelationship(row),
    sourceConcept: {
      id: row.source_concept_id,
      slug: row.source_slug ?? row.source_concept_id,
      name: row.source_name ?? row.source_concept_id,
      subjectId: row.source_subject_id ?? "",
    },
    targetConcept: {
      id: row.target_concept_id,
      slug: row.target_slug ?? row.target_concept_id,
      name: row.target_name ?? row.target_concept_id,
      subjectId: row.target_subject_id ?? "",
    },
  };
}

function mapObjective(row: ObjectiveDbRow): ConceptLearningObjective {
  return {
    conceptId: row.concept_id,
    objectiveId: row.objective_id,
    sortOrder: row.sort_order,
    createdAt: asIso(row.created_at),
  };
}

function mapApplication(row: ApplicationDbRow): ConceptApplication {
  return {
    id: row.id,
    conceptId: row.concept_id,
    title: row.title,
    description: row.description,
    sortOrder: row.sort_order,
    createdAt: asIso(row.created_at),
    updatedAt: asIso(row.updated_at),
  };
}

function mapMisconception(row: MisconceptionDbRow): ConceptMisconception {
  return {
    id: row.id,
    conceptId: row.concept_id,
    misconception: row.misconception,
    correction: row.correction,
    sortOrder: row.sort_order,
    createdAt: asIso(row.created_at),
    updatedAt: asIso(row.updated_at),
  };
}

function mapLessonLink(row: LessonLinkDbRow): ConceptLessonLink {
  return {
    lessonId: row.lesson_id,
    conceptId: row.concept_id,
    sortOrder: row.sort_order,
    lessonTitle: row.lesson_title,
    lessonSlug: row.lesson_slug,
    lessonStatus: asStatus(row.lesson_status),
    moduleId: row.module_id,
    moduleTitle: row.module_title,
    courseId: row.course_id,
    courseTitle: row.course_title,
    courseStatus: asStatus(row.course_status),
    createdAt: asIso(row.created_at),
  };
}

function mapLessonCandidate(row: LessonCandidateDbRow): ConceptLessonCandidate {
  return {
    lessonId: row.lesson_id,
    lessonTitle: row.lesson_title,
    lessonSlug: row.lesson_slug,
    lessonStatus: asStatus(row.lesson_status),
    moduleId: row.module_id,
    moduleTitle: row.module_title,
    courseId: row.course_id,
    courseTitle: row.course_title,
    courseStatus: asStatus(row.course_status),
  };
}

function mapGrade(row: GradeDbRow): ConceptGradePlacement {
  return {
    id: row.id,
    name: row.name,
    shortName: row.short_name,
    sortOrder: row.sort_order,
  };
}

function sqliteBoolean(value: boolean): number {
  return value ? 1 : 0;
}

function asConflict(error: unknown): never {
  const message = error instanceof Error ? error.message : String(error);
  if (
    message.includes("UNIQUE constraint failed") ||
    message.includes("duplicate key") ||
    message.includes("concepts_slug_idx")
  ) {
    throw new ConflictError("That concept or relationship already exists. Use unique values.");
  }
  throw error;
}

const conceptSelect = `
  SELECT c.id, c.slug, c.name, c.description, c.subject_id, c.domain_id,
         c.grade_min_id, c.grade_max_id, c.difficulty, c.mastery_threshold,
         c.is_archived, c.created_at, c.updated_at,
         s.name AS subject_name, s.slug AS subject_slug, d.name AS domain_name,
         (SELECT COUNT(*) FROM concept_relationships r
          WHERE r.source_concept_id = c.id OR r.target_concept_id = c.id) AS relationship_count,
         (SELECT COUNT(*) FROM lesson_concepts lc WHERE lc.concept_id = c.id) AS lesson_count,
         (SELECT COUNT(*) FROM concept_learning_objectives clo WHERE clo.concept_id = c.id) AS objective_count,
         (SELECT COUNT(*) FROM concept_relationships r
          WHERE r.source_concept_id = c.id AND r.relationship_type = 'requires') AS prerequisite_count
  FROM concepts c
  JOIN subjects s ON s.id = c.subject_id
  LEFT JOIN domains d ON d.id = c.domain_id
`;

const conceptBaseSelect = `
  SELECT id, slug, name, description, subject_id, domain_id, grade_min_id, grade_max_id,
         difficulty, mastery_threshold, is_archived, created_at, updated_at
  FROM concepts
`;

const relationshipViewSelect = `
  SELECT r.id, r.source_concept_id, r.target_concept_id, r.relationship_type,
         r.created_at, r.updated_at,
         source.id AS source_concept_id, source.name AS source_name, source.slug AS source_slug,
         source.subject_id AS source_subject_id,
         target.id AS target_concept_id, target.name AS target_name, target.slug AS target_slug,
         target.subject_id AS target_subject_id
  FROM concept_relationships r
  JOIN concepts source ON source.id = r.source_concept_id
  JOIN concepts target ON target.id = r.target_concept_id
`;

const lessonLinkSelect = `
  SELECT lc.lesson_id, lc.concept_id, lc.sort_order, lc.created_at,
         l.title AS lesson_title, l.slug AS lesson_slug, l.status AS lesson_status,
         m.id AS module_id, m.title AS module_title,
         c.id AS course_id, c.title AS course_title, c.status AS course_status
  FROM lesson_concepts lc
  JOIN lessons l ON l.id = lc.lesson_id
  JOIN modules m ON m.id = l.module_id
  JOIN courses c ON c.id = m.course_id
`;

export class SqlConceptRepository implements ConceptRepository {
  constructor(private readonly database: DatabaseHandle = getDatabase()) {}

  private async rows<T>(
    sqliteQuery: string,
    postgresQuery: string,
    values: readonly unknown[] = [],
  ): Promise<T[]> {
    if (this.database.provider === "sqlite") {
      return this.database.raw.prepare(sqliteQuery).all(...values) as T[];
    }
    return (await this.database.raw.unsafe(postgresQuery, values as never[])) as T[];
  }

  private async one<T>(
    sqliteQuery: string,
    postgresQuery: string,
    values: readonly unknown[] = [],
  ): Promise<T | undefined> {
    const records = await this.rows<T>(sqliteQuery, postgresQuery, values);
    return records[0];
  }

  private async execute(
    sqliteQuery: string,
    postgresQuery: string,
    values: readonly unknown[] = [],
  ): Promise<void> {
    if (this.database.provider === "sqlite") {
      this.database.raw.prepare(sqliteQuery).run(...values);
      return;
    }
    await this.database.raw.unsafe(postgresQuery, values as never[]);
  }

  async listConcepts(options: ConceptListOptions = {}): Promise<readonly ConceptListEntry[]> {
    const sqliteWhere: string[] = [];
    const postgresWhere: string[] = [];
    const values: unknown[] = [];
    const add = (
      sqliteExpression: string,
      postgresExpression: string,
      ...nextValues: unknown[]
    ) => {
      const start = values.length + 1;
      values.push(...nextValues);
      sqliteWhere.push(sqliteExpression);
      let expression = postgresExpression;
      nextValues.forEach((_, offset) => {
        expression = expression.replace("$value", `$${start + offset}`);
      });
      postgresWhere.push(expression);
    };

    if (!options.includeArchived) add("c.is_archived = 0", "c.is_archived = FALSE");
    if (options.search?.trim()) {
      const search = `%${options.search.trim().toLowerCase()}%`;
      add(
        "(LOWER(c.name) LIKE ? OR LOWER(c.slug) LIKE ?)",
        "(LOWER(c.name) LIKE $value OR LOWER(c.slug) LIKE $value)",
        search,
        search,
      );
    }
    if (options.subjectId) add("c.subject_id = ?", "c.subject_id = $value", options.subjectId);
    if (options.domainId) add("c.domain_id = ?", "c.domain_id = $value", options.domainId);
    if (options.difficulty) add("c.difficulty = ?", "c.difficulty = $value", options.difficulty);
    if (options.gradeId) {
      add(
        `EXISTS (
          SELECT 1 FROM grades filter_grade
          LEFT JOIN grades minimum_grade ON minimum_grade.id = c.grade_min_id
          LEFT JOIN grades maximum_grade ON maximum_grade.id = c.grade_max_id
          WHERE filter_grade.id = ?
            AND (minimum_grade.sort_order IS NULL OR minimum_grade.sort_order <= filter_grade.sort_order)
            AND (maximum_grade.sort_order IS NULL OR maximum_grade.sort_order >= filter_grade.sort_order)
        )`,
        `EXISTS (
          SELECT 1 FROM grades filter_grade
          LEFT JOIN grades minimum_grade ON minimum_grade.id = c.grade_min_id
          LEFT JOIN grades maximum_grade ON maximum_grade.id = c.grade_max_id
          WHERE filter_grade.id = $value
            AND (minimum_grade.sort_order IS NULL OR minimum_grade.sort_order <= filter_grade.sort_order)
            AND (maximum_grade.sort_order IS NULL OR maximum_grade.sort_order >= filter_grade.sort_order)
        )`,
        options.gradeId,
      );
    }
    const sqliteQuery = `${conceptSelect} ${sqliteWhere.length ? `WHERE ${sqliteWhere.join(" AND ")}` : ""} ORDER BY c.name COLLATE NOCASE`;
    const postgresQuery = `${conceptSelect} ${postgresWhere.length ? `WHERE ${postgresWhere.join(" AND ")}` : ""} ORDER BY c.name`;
    return (await this.rows<ConceptDbRow>(sqliteQuery, postgresQuery, values)).map(mapConceptList);
  }

  async getSubject(id: string): Promise<{ id: string } | null> {
    const row = await this.one<IdDbRow>(
      "SELECT id FROM subjects WHERE id = ?",
      "SELECT id FROM subjects WHERE id = $1",
      [id],
    );
    return row ?? null;
  }

  async getDomain(id: string): Promise<{ id: string; subjectId: string } | null> {
    const row = await this.one<{ id: string; subject_id: string }>(
      `SELECT d.id, sd.subject_id FROM domains d JOIN subject_domains sd ON sd.domain_id = d.id WHERE d.id = ? ORDER BY sd.subject_id LIMIT 1`,
      `SELECT d.id, sd.subject_id FROM domains d JOIN subject_domains sd ON sd.domain_id = d.id WHERE d.id = $1 ORDER BY sd.subject_id LIMIT 1`,
      [id],
    );
    return row ? { id: row.id, subjectId: row.subject_id } : null;
  }

  async getConcept(id: string): Promise<ConceptRecord | null> {
    const row = await this.one<ConceptDbRow>(
      `${conceptBaseSelect} WHERE id = ?`,
      `${conceptBaseSelect} WHERE id = $1`,
      [id],
    );
    return row ? mapConcept(row) : null;
  }

  async getConceptDetail(
    id: string,
    options: { includeDraftLessons?: boolean } = {},
  ): Promise<ConceptDetail | null> {
    const concept = await this.getConcept(id);
    if (!concept) return null;
    const [
      subject,
      grades,
      relationships,
      objectives,
      applications,
      misconceptions,
      lessons,
      exerciseReferences,
    ] = await Promise.all([
      this.one<{ name: string; slug: string }>(
        "SELECT name, slug FROM subjects WHERE id = ?",
        "SELECT name, slug FROM subjects WHERE id = $1",
        [concept.subjectId],
      ),
      this.listGrades(),
      this.listRelationships({ conceptId: id }),
      this.listObjectives(id),
      this.listApplications(id),
      this.listMisconceptions(id),
      this.listLessonLinks(id, options),
      this.rows<{ id: string }>(
        `SELECT DISTINCT q.id
           FROM question_concepts qc
           JOIN questions q ON q.id = qc.question_id
           WHERE qc.concept_id = ? AND q.status = 'published'
           ORDER BY q.id`,
        `SELECT DISTINCT q.id
           FROM question_concepts qc
           JOIN questions q ON q.id = qc.question_id
           WHERE qc.concept_id = $1 AND q.status = 'published'
           ORDER BY q.id`,
        [id],
      ),
    ]);
    const minimum = concept.gradeMinId
      ? grades.find((grade) => grade.id === concept.gradeMinId)?.sortOrder
      : undefined;
    const maximum = concept.gradeMaxId
      ? grades.find((grade) => grade.id === concept.gradeMaxId)?.sortOrder
      : undefined;
    const gradePlacements = grades.filter(
      (grade) =>
        (minimum === undefined || grade.sortOrder >= minimum) &&
        (maximum === undefined || grade.sortOrder <= maximum),
    );
    const curricula = await this.rows<{ curriculum_id: string }>(
      `SELECT DISTINCT lo.curriculum_id
       FROM concept_learning_objectives clo
       JOIN learning_objectives lo ON lo.id = clo.objective_id
       WHERE clo.concept_id = ?
       UNION
       SELECT DISTINCT cc.curriculum_id
       FROM lesson_concepts lc
       JOIN lessons l ON l.id = lc.lesson_id
       JOIN modules m ON m.id = l.module_id
       JOIN course_curricula cc ON cc.course_id = m.course_id
       WHERE lc.concept_id = ? ${options.includeDraftLessons ? "" : "AND l.status = 'published' AND EXISTS (SELECT 1 FROM courses pc WHERE pc.id = m.course_id AND pc.status = 'published')"}`,
      `SELECT DISTINCT lo.curriculum_id
       FROM concept_learning_objectives clo
       JOIN learning_objectives lo ON lo.id = clo.objective_id
       WHERE clo.concept_id = $1
       UNION
       SELECT DISTINCT cc.curriculum_id
       FROM lesson_concepts lc
       JOIN lessons l ON l.id = lc.lesson_id
       JOIN modules m ON m.id = l.module_id
       JOIN course_curricula cc ON cc.course_id = m.course_id
       WHERE lc.concept_id = $2 ${options.includeDraftLessons ? "" : "AND l.status = 'published' AND EXISTS (SELECT 1 FROM courses pc WHERE pc.id = m.course_id AND pc.status = 'published')"}`,
      [id, id],
    );
    return {
      concept,
      subjectName: subject?.name ?? "",
      subjectSlug: subject?.slug ?? "",
      domainName: concept.domainId
        ? ((
            await this.one<{ name: string }>(
              "SELECT name FROM domains WHERE id = ?",
              "SELECT name FROM domains WHERE id = $1",
              [concept.domainId],
            )
          )?.name ?? null)
        : null,
      grades: gradePlacements,
      prerequisites: relationships.filter(
        (relationship) => relationship.type === "requires" && relationship.sourceConceptId === id,
      ),
      unlocks: relationships.filter(
        (relationship) =>
          (relationship.type === "unlocks" && relationship.sourceConceptId === id) ||
          (relationship.type === "requires" && relationship.targetConceptId === id),
      ),
      relationships,
      objectives,
      applications,
      misconceptions,
      lessons,
      curriculumIds: curricula.map((row) => row.curriculum_id),
      courseIds: [...new Set(lessons.map((lesson) => lesson.courseId))],
      exerciseReferences: exerciseReferences.map((row) => row.id),
      simulationReferences: [],
      masteryState: "unassessed" satisfies ConceptMasteryState,
    };
  }

  async createConcept(input: CreateConceptInput): Promise<ConceptRecord> {
    try {
      await this.execute(
        `INSERT INTO concepts (id, slug, name, description, subject_id, domain_id, grade_min_id, grade_max_id, difficulty, mastery_threshold)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        `INSERT INTO concepts (id, slug, name, description, subject_id, domain_id, grade_min_id, grade_max_id, difficulty, mastery_threshold)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          input.id,
          input.slug,
          input.name,
          input.description,
          input.subjectId,
          input.domainId,
          input.gradeMinId,
          input.gradeMaxId,
          input.difficulty,
          input.masteryThreshold,
        ],
      );
    } catch (error) {
      asConflict(error);
    }
    return (
      (await this.getConcept(input.id)) ??
      ((): never => {
        throw new NotFoundError("Concept", input.id);
      })()
    );
  }

  async updateConcept(id: string, input: UpdateConceptInput): Promise<ConceptRecord> {
    try {
      await this.execute(
        `UPDATE concepts SET slug = ?, name = ?, description = ?, subject_id = ?, domain_id = ?, grade_min_id = ?, grade_max_id = ?, difficulty = ?, mastery_threshold = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        `UPDATE concepts SET slug = $1, name = $2, description = $3, subject_id = $4, domain_id = $5, grade_min_id = $6, grade_max_id = $7, difficulty = $8, mastery_threshold = $9, updated_at = NOW() WHERE id = $10`,
        [
          input.slug,
          input.name,
          input.description,
          input.subjectId,
          input.domainId,
          input.gradeMinId,
          input.gradeMaxId,
          input.difficulty,
          input.masteryThreshold,
          id,
        ],
      );
    } catch (error) {
      asConflict(error);
    }
    return (
      (await this.getConcept(id)) ??
      ((): never => {
        throw new NotFoundError("Concept", id);
      })()
    );
  }

  async archiveConcept(id: string, isArchived: boolean): Promise<void> {
    await this.execute(
      "UPDATE concepts SET is_archived = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      "UPDATE concepts SET is_archived = $1, updated_at = NOW() WHERE id = $2",
      [this.database.provider === "sqlite" ? sqliteBoolean(isArchived) : isArchived, id],
    );
    if (!(await this.getConcept(id))) throw new NotFoundError("Concept", id);
  }

  async listRelationships(
    options: {
      conceptId?: string;
      types?: readonly ConceptRelationshipType[];
    } = {},
  ): Promise<readonly ConceptRelationshipView[]> {
    const sqliteWhere: string[] = [];
    const postgresWhere: string[] = [];
    const sqliteValues: unknown[] = [];
    const postgresValues: unknown[] = [];
    if (options.conceptId) {
      sqliteWhere.push("(r.source_concept_id = ? OR r.target_concept_id = ?)");
      sqliteValues.push(options.conceptId, options.conceptId);
      postgresWhere.push("(r.source_concept_id = $1 OR r.target_concept_id = $2)");
      postgresValues.push(options.conceptId, options.conceptId);
    }
    if (options.types?.length) {
      const sqlitePlaceholders = options.types.map(() => "?").join(", ");
      const postgresPlaceholders = options.types
        .map((_, offset) => `$${postgresValues.length + offset + 1}`)
        .join(", ");
      sqliteWhere.push(`r.relationship_type IN (${sqlitePlaceholders})`);
      postgresWhere.push(`r.relationship_type IN (${postgresPlaceholders})`);
      sqliteValues.push(...options.types);
      postgresValues.push(...options.types);
    }
    const sqliteQuery = `${relationshipViewSelect} ${sqliteWhere.length ? `WHERE ${sqliteWhere.join(" AND ")}` : ""} ORDER BY r.created_at, r.id`;
    const postgresQuery = `${relationshipViewSelect} ${postgresWhere.length ? `WHERE ${postgresWhere.join(" AND ")}` : ""} ORDER BY r.created_at, r.id`;
    const rows = await this.rows<RelationshipDbRow>(
      sqliteQuery,
      postgresQuery,
      this.database.provider === "sqlite" ? sqliteValues : postgresValues,
    );
    return rows.map(mapRelationshipView);
  }

  async getRelationship(id: string): Promise<ConceptRelationship | null> {
    const row = await this.one<RelationshipDbRow>(
      "SELECT id, source_concept_id, target_concept_id, relationship_type, created_at, updated_at FROM concept_relationships WHERE id = ?",
      "SELECT id, source_concept_id, target_concept_id, relationship_type, created_at, updated_at FROM concept_relationships WHERE id = $1",
      [id],
    );
    return row ? mapRelationship(row) : null;
  }

  async createRelationship(input: CreateConceptRelationshipInput): Promise<ConceptRelationship> {
    try {
      await this.execute(
        `INSERT INTO concept_relationships (id, source_concept_id, target_concept_id, relationship_type)
         VALUES (?, ?, ?, ?)`,
        `INSERT INTO concept_relationships (id, source_concept_id, target_concept_id, relationship_type)
         VALUES ($1, $2, $3, $4)`,
        [input.id, input.sourceConceptId, input.targetConceptId, input.type],
      );
    } catch (error) {
      asConflict(error);
    }
    return (
      (await this.getRelationship(input.id)) ??
      ((): never => {
        throw new NotFoundError("Concept relationship", input.id);
      })()
    );
  }

  async deleteRelationship(id: string): Promise<void> {
    const before = await this.getRelationship(id);
    if (!before) throw new NotFoundError("Concept relationship", id);
    await this.execute(
      "DELETE FROM concept_relationships WHERE id = ?",
      "DELETE FROM concept_relationships WHERE id = $1",
      [id],
    );
  }

  async listLessonLinks(
    conceptId: string,
    options: { includeDraftLessons?: boolean } = {},
  ): Promise<readonly ConceptLessonLink[]> {
    const statusSqlite = options.includeDraftLessons
      ? ""
      : "AND l.status = 'published' AND c.status = 'published'";
    const statusPostgres = statusSqlite;
    return (
      await this.rows<LessonLinkDbRow>(
        `${lessonLinkSelect} WHERE lc.concept_id = ? ${statusSqlite} ORDER BY lc.sort_order, l.title COLLATE NOCASE`,
        `${lessonLinkSelect} WHERE lc.concept_id = $1 ${statusPostgres} ORDER BY lc.sort_order, l.title`,
        [conceptId],
      )
    ).map(mapLessonLink);
  }

  async listLessonCandidates(): Promise<readonly ConceptLessonCandidate[]> {
    return (
      await this.rows<LessonCandidateDbRow>(
        `SELECT l.id AS lesson_id, l.title AS lesson_title, l.slug AS lesson_slug, l.status AS lesson_status,
                m.id AS module_id, m.title AS module_title, c.id AS course_id, c.title AS course_title, c.status AS course_status
         FROM lessons l JOIN modules m ON m.id = l.module_id JOIN courses c ON c.id = m.course_id
         ORDER BY c.title COLLATE NOCASE, m.sort_order, l.sort_order`,
        `SELECT l.id AS lesson_id, l.title AS lesson_title, l.slug AS lesson_slug, l.status AS lesson_status,
                m.id AS module_id, m.title AS module_title, c.id AS course_id, c.title AS course_title, c.status AS course_status
         FROM lessons l JOIN modules m ON m.id = l.module_id JOIN courses c ON c.id = m.course_id
         ORDER BY c.title, m.sort_order, l.sort_order`,
      )
    ).map(mapLessonCandidate);
  }

  async saveLessonLink(input: {
    conceptId: string;
    lessonId: string;
    sortOrder: number;
  }): Promise<void> {
    await this.execute(
      `INSERT INTO lesson_concepts (lesson_id, concept_id, sort_order) VALUES (?, ?, ?)
       ON CONFLICT(lesson_id, concept_id) DO UPDATE SET sort_order = excluded.sort_order`,
      `INSERT INTO lesson_concepts (lesson_id, concept_id, sort_order) VALUES ($1, $2, $3)
       ON CONFLICT (lesson_id, concept_id) DO UPDATE SET sort_order = EXCLUDED.sort_order`,
      [input.lessonId, input.conceptId, input.sortOrder],
    );
  }

  async deleteLessonLink(input: { conceptId: string; lessonId: string }): Promise<void> {
    await this.execute(
      "DELETE FROM lesson_concepts WHERE lesson_id = ? AND concept_id = ?",
      "DELETE FROM lesson_concepts WHERE lesson_id = $1 AND concept_id = $2",
      [input.lessonId, input.conceptId],
    );
  }

  async listObjectives(conceptId: string): Promise<readonly ConceptLearningObjective[]> {
    return (
      await this.rows<ObjectiveDbRow>(
        "SELECT concept_id, objective_id, sort_order, created_at FROM concept_learning_objectives WHERE concept_id = ? ORDER BY sort_order, objective_id",
        "SELECT concept_id, objective_id, sort_order, created_at FROM concept_learning_objectives WHERE concept_id = $1 ORDER BY sort_order, objective_id",
        [conceptId],
      )
    ).map(mapObjective);
  }

  async saveObjective(input: Omit<ConceptLearningObjective, "createdAt">): Promise<void> {
    await this.execute(
      `INSERT INTO concept_learning_objectives (concept_id, objective_id, sort_order) VALUES (?, ?, ?)
       ON CONFLICT(concept_id, objective_id) DO UPDATE SET sort_order = excluded.sort_order`,
      `INSERT INTO concept_learning_objectives (concept_id, objective_id, sort_order) VALUES ($1, $2, $3)
       ON CONFLICT (concept_id, objective_id) DO UPDATE SET sort_order = EXCLUDED.sort_order`,
      [input.conceptId, input.objectiveId, input.sortOrder],
    );
  }

  async deleteObjective(input: { conceptId: string; objectiveId: string }): Promise<void> {
    await this.execute(
      "DELETE FROM concept_learning_objectives WHERE concept_id = ? AND objective_id = ?",
      "DELETE FROM concept_learning_objectives WHERE concept_id = $1 AND objective_id = $2",
      [input.conceptId, input.objectiveId],
    );
  }

  async listApplications(conceptId: string): Promise<readonly ConceptApplication[]> {
    return (
      await this.rows<ApplicationDbRow>(
        "SELECT id, concept_id, title, description, sort_order, created_at, updated_at FROM concept_applications WHERE concept_id = ? ORDER BY sort_order, id",
        "SELECT id, concept_id, title, description, sort_order, created_at, updated_at FROM concept_applications WHERE concept_id = $1 ORDER BY sort_order, id",
        [conceptId],
      )
    ).map(mapApplication);
  }

  async saveApplication(input: CreateConceptApplicationInput): Promise<ConceptApplication> {
    await this.execute(
      `INSERT INTO concept_applications (id, concept_id, title, description, sort_order) VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET concept_id = excluded.concept_id, title = excluded.title, description = excluded.description, sort_order = excluded.sort_order, updated_at = CURRENT_TIMESTAMP`,
      `INSERT INTO concept_applications (id, concept_id, title, description, sort_order) VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (id) DO UPDATE SET concept_id = EXCLUDED.concept_id, title = EXCLUDED.title, description = EXCLUDED.description, sort_order = EXCLUDED.sort_order, updated_at = NOW()`,
      [input.id, input.conceptId, input.title, input.description, input.sortOrder],
    );
    const application = (await this.listApplications(input.conceptId)).find(
      (item) => item.id === input.id,
    );
    if (!application) throw new NotFoundError("Concept application", input.id);
    return application;
  }

  async deleteApplication(id: string): Promise<void> {
    await this.execute(
      "DELETE FROM concept_applications WHERE id = ?",
      "DELETE FROM concept_applications WHERE id = $1",
      [id],
    );
  }

  async listMisconceptions(conceptId: string): Promise<readonly ConceptMisconception[]> {
    return (
      await this.rows<MisconceptionDbRow>(
        "SELECT id, concept_id, misconception, correction, sort_order, created_at, updated_at FROM concept_misconceptions WHERE concept_id = ? ORDER BY sort_order, id",
        "SELECT id, concept_id, misconception, correction, sort_order, created_at, updated_at FROM concept_misconceptions WHERE concept_id = $1 ORDER BY sort_order, id",
        [conceptId],
      )
    ).map(mapMisconception);
  }

  async saveMisconception(input: CreateConceptMisconceptionInput): Promise<ConceptMisconception> {
    await this.execute(
      `INSERT INTO concept_misconceptions (id, concept_id, misconception, correction, sort_order) VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET concept_id = excluded.concept_id, misconception = excluded.misconception, correction = excluded.correction, sort_order = excluded.sort_order, updated_at = CURRENT_TIMESTAMP`,
      `INSERT INTO concept_misconceptions (id, concept_id, misconception, correction, sort_order) VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (id) DO UPDATE SET concept_id = EXCLUDED.concept_id, misconception = EXCLUDED.misconception, correction = EXCLUDED.correction, sort_order = EXCLUDED.sort_order, updated_at = NOW()`,
      [input.id, input.conceptId, input.misconception, input.correction, input.sortOrder],
    );
    const misconception = (await this.listMisconceptions(input.conceptId)).find(
      (item) => item.id === input.id,
    );
    if (!misconception) throw new NotFoundError("Concept misconception", input.id);
    return misconception;
  }

  async deleteMisconception(id: string): Promise<void> {
    await this.execute(
      "DELETE FROM concept_misconceptions WHERE id = ?",
      "DELETE FROM concept_misconceptions WHERE id = $1",
      [id],
    );
  }

  async listGrades(): Promise<readonly ConceptGradePlacement[]> {
    return (
      await this.rows<GradeDbRow>(
        "SELECT id, name, short_name, sort_order FROM grades WHERE is_archived = 0 ORDER BY sort_order, name COLLATE NOCASE",
        "SELECT id, name, short_name, sort_order FROM grades WHERE is_archived = FALSE ORDER BY sort_order, name",
      )
    ).map(mapGrade);
  }

  async getGraph(options: KnowledgeGraphOptions = {}): Promise<KnowledgeGraph> {
    const concepts = await this.listConcepts(options);
    const relationships = await this.listRelationships({ types: options.relationshipTypes });
    const snapshot = await this.getIntegritySnapshot();
    const integrity = buildConceptIntegrityReport(snapshot);
    const visibleIds = new Set(concepts.map((concept) => concept.id));
    const visibleRelationships = relationships
      .filter(
        (relationship) =>
          visibleIds.has(relationship.sourceConceptId) &&
          visibleIds.has(relationship.targetConceptId),
      )
      .map((relationship) => ({
        id: relationship.id,
        sourceConceptId: relationship.sourceConceptId,
        targetConceptId: relationship.targetConceptId,
        type: relationship.type,
        createdAt: relationship.createdAt,
        updatedAt: relationship.updatedAt,
      }));
    return layoutKnowledgeGraph(concepts, visibleRelationships, {
      orphanedConceptIds: integrity.orphanedConceptIds.filter((id) => visibleIds.has(id)),
      requiredCycle: integrity.requiredCycle,
    });
  }

  async getIntegritySnapshot(): Promise<ConceptIntegritySnapshot> {
    const [concepts, relationships, lessonLinks, objectiveLinks] = await Promise.all([
      this.rows<IdDbRow>("SELECT id FROM concepts", "SELECT id FROM concepts"),
      this.rows<RelationshipDbRow>(
        "SELECT id, source_concept_id, target_concept_id, relationship_type, created_at, updated_at FROM concept_relationships",
        "SELECT id, source_concept_id, target_concept_id, relationship_type, created_at, updated_at FROM concept_relationships",
      ),
      this.rows<ConceptIdDbRow>(
        "SELECT concept_id FROM lesson_concepts",
        "SELECT concept_id FROM lesson_concepts",
      ),
      this.rows<ConceptIdDbRow>(
        "SELECT concept_id FROM concept_learning_objectives",
        "SELECT concept_id FROM concept_learning_objectives",
      ),
    ]);
    return {
      concepts,
      relationships: relationships.map((relationship) => ({
        sourceConceptId: relationship.source_concept_id,
        targetConceptId: relationship.target_concept_id,
        type: asRelationshipType(relationship.relationship_type),
      })),
      lessonLinks: lessonLinks.map((row) => ({ conceptId: row.concept_id })),
      objectiveLinks: objectiveLinks.map((row) => ({ conceptId: row.concept_id })),
    };
  }
}

export function getConceptRepository(database?: DatabaseHandle): ConceptRepository {
  return new SqlConceptRepository(database);
}

export function newConceptId(prefix: string): string {
  return `${prefix}-${randomUUID()}`;
}
