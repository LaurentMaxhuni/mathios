import { ConflictError, NotFoundError } from "@/domain/errors/application-error";
import type { CurriculumRepository } from "@/domain/ports/curriculum-repository";
import type {
  CreateCurriculumInput,
  CreateDomainInput,
  CreateGradeInput,
  CreateLearningObjectiveInput,
  CreateSubjectInput,
  CurriculumExplorer,
  CurriculumGradeMappingInput,
  CurriculumGradePlacement,
  CurriculumGradeRecord,
  CurriculumRecord,
  CurriculumSubjectMappingInput,
  CurriculumSubjectPlacement,
  CurriculumSubjectRecord,
  DomainRecord,
  GradeExplorer,
  GradeLearningObjectiveMappingInput,
  GradeLearningObjectiveRecord,
  GradeRecord,
  GradeSubjectDomainMappingInput,
  GradeSubjectDomainPlacement,
  GradeSubjectDomainRecord,
  GradeSubjectMappingInput,
  GradeSubjectPlacement,
  GradeSubjectRecord,
  LearningObjectiveRecord,
  SubjectDomainMappingInput,
  SubjectDomainPlacement,
  SubjectDomainRecord,
  SubjectExplorer,
  SubjectGradePlacement,
  SubjectRecord,
  StructureDifficulty,
  UpdateCurriculumInput,
  UpdateDomainInput,
  UpdateGradeInput,
  UpdateLearningObjectiveInput,
  UpdateSubjectInput,
} from "@/domain/curriculum/types";
import { getDatabase, type DatabaseHandle } from "@/infrastructure/database/client";

type DbDate = Date | string;
type DbBoolean = boolean | number | string;

interface CurriculumDbRow {
  id: string;
  slug: string;
  name: string;
  kind: string;
  description: string;
  authority: string | null;
  is_system: DbBoolean;
  is_archived: DbBoolean;
  created_at: DbDate;
  updated_at: DbDate;
}

interface GradeDbRow {
  id: string;
  slug: string;
  name: string;
  short_name: string;
  description: string;
  sort_order: number;
  is_archived: DbBoolean;
  created_at: DbDate;
  updated_at: DbDate;
}

interface CurriculumGradeDbRow {
  created_at: DbDate;
  updated_at: DbDate;
  is_available: DbBoolean;
  curriculum_id: string;
  grade_id: string;
  sort_order: number;
}

interface SubjectDbRow {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon: string;
  accent: string;
  recommended_study_hours: number;
  sort_order: number;
  is_archived: DbBoolean;
  created_at: DbDate;
  updated_at: DbDate;
}

interface CurriculumSubjectDbRow {
  curriculum_id: string;
  subject_id: string;
  is_required: DbBoolean;
  is_available: DbBoolean;
  sort_order: number;
  created_at: DbDate;
  updated_at: DbDate;
}

interface GradeSubjectDbRow {
  curriculum_id: string;
  grade_id: string;
  subject_id: string;
  is_required: DbBoolean;
  is_available: DbBoolean;
  sort_order: number;
  created_at: DbDate;
  updated_at: DbDate;
}

interface DomainDbRow {
  id: string;
  slug: string;
  name: string;
  description: string;
  sort_order: number;
  is_archived: DbBoolean;
  created_at: DbDate;
  updated_at: DbDate;
}

interface SubjectDomainDbRow {
  subject_id: string;
  domain_id: string;
  sort_order: number;
  created_at: DbDate;
  updated_at: DbDate;
}

interface GradeSubjectDomainDbRow {
  curriculum_id: string;
  grade_id: string;
  subject_id: string;
  domain_id: string;
  is_required: DbBoolean;
  is_available: DbBoolean;
  depth: number;
  sort_order: number;
  created_at: DbDate;
  updated_at: DbDate;
}

interface LearningObjectiveDbRow {
  id: string;
  curriculum_id: string;
  subject_id: string;
  domain_id: string | null;
  code: string;
  title: string;
  description: string;
  difficulty: string;
  is_required: DbBoolean;
  sort_order: number;
  is_archived: DbBoolean;
  created_at: DbDate;
  updated_at: DbDate;
}

interface GradeLearningObjectiveDbRow {
  curriculum_id: string;
  grade_id: string;
  objective_id: string;
  is_required: DbBoolean;
  sort_order: number;
  created_at: DbDate;
  updated_at: DbDate;
}

interface CurriculumSubjectViewRow extends CurriculumSubjectDbRow {
  subject_slug: string;
  subject_name: string;
  subject_description: string;
  subject_icon: string;
  subject_accent: string;
  subject_recommended_study_hours: number;
  subject_sort_order: number;
  subject_is_archived: DbBoolean;
  subject_created_at: DbDate;
  subject_updated_at: DbDate;
  grade_count: number;
}

interface CurriculumGradePlacementDbRow extends CurriculumGradeDbRow {
  grade_id_value: string;
  slug: string;
  name: string;
  short_name: string;
  description: string;
  grade_slug: string;
  grade_name: string;
  grade_short_name: string;
  grade_description: string;
  grade_sort_order: number;
  grade_is_archived: DbBoolean;
  grade_created_at: DbDate;
  grade_updated_at: DbDate;
}

interface GradeSubjectViewRow extends GradeSubjectDbRow {
  subject_slug: string;
  subject_name: string;
  subject_description: string;
  subject_icon: string;
  subject_accent: string;
  subject_recommended_study_hours: number;
  subject_sort_order: number;
  subject_is_archived: DbBoolean;
  subject_created_at: DbDate;
  subject_updated_at: DbDate;
  domain_id: string | null;
  domain_slug: string | null;
  domain_name: string | null;
  domain_description: string | null;
  domain_sort_order: number | null;
  domain_is_archived: DbBoolean | null;
  domain_created_at: DbDate | null;
  domain_updated_at: DbDate | null;
  domain_is_required: DbBoolean | null;
  domain_is_available: DbBoolean | null;
  domain_depth: number | null;
  domain_mapping_sort_order: number | null;
  domain_mapping_created_at: DbDate | null;
  domain_mapping_updated_at: DbDate | null;
  objective_count: number;
}

interface SubjectGradeViewRow extends GradeSubjectDbRow {
  grade_slug: string;
  grade_name: string;
  grade_short_name: string;
  grade_description: string;
  grade_sort_order: number;
  grade_is_archived: DbBoolean;
  grade_created_at: DbDate;
  grade_updated_at: DbDate;
  domain_id: string | null;
  domain_slug: string | null;
  domain_name: string | null;
  domain_description: string | null;
  domain_sort_order: number | null;
  domain_is_archived: DbBoolean | null;
  domain_created_at: DbDate | null;
  domain_updated_at: DbDate | null;
  domain_is_required: DbBoolean | null;
  domain_is_available: DbBoolean | null;
  domain_depth: number | null;
  domain_mapping_sort_order: number | null;
  domain_mapping_created_at: DbDate | null;
  domain_mapping_updated_at: DbDate | null;
}

const curriculumSelect = `
  SELECT id, slug, name, kind, description, authority, is_system, is_archived, created_at, updated_at
  FROM curricula
`;

const gradeSelect = `
  SELECT id, slug, name, short_name, description, sort_order, is_archived, created_at, updated_at
  FROM grades
`;

const subjectSelect = `
  SELECT id, slug, name, description, icon, accent, recommended_study_hours, sort_order,
         is_archived, created_at, updated_at
  FROM subjects
`;

const domainSelect = `
  SELECT id, slug, name, description, sort_order, is_archived, created_at, updated_at
  FROM domains
`;

const objectiveSelect = `
  SELECT id, curriculum_id, subject_id, domain_id, code, title, description, difficulty,
         is_required, sort_order, is_archived, created_at, updated_at
  FROM learning_objectives
`;

function asIso(value: DbDate | null | undefined): string {
  if (value instanceof Date) return value.toISOString();
  return value ?? new Date(0).toISOString();
}

function asBoolean(value: DbBoolean | null | undefined): boolean {
  return value === true || value === 1 || value === "1" || value === "true";
}

function asKind(value: string): CurriculumRecord["kind"] {
  return value === "kosovo" || value === "international" ? value : "custom";
}

function asDifficulty(value: string): StructureDifficulty {
  return value === "gentle" || value === "challenging" ? value : "balanced";
}

function mapCurriculum(row: CurriculumDbRow): CurriculumRecord {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    kind: asKind(row.kind),
    description: row.description,
    authority: row.authority,
    isSystem: asBoolean(row.is_system),
    isArchived: asBoolean(row.is_archived),
    createdAt: asIso(row.created_at),
    updatedAt: asIso(row.updated_at),
  };
}

function mapGrade(row: GradeDbRow): GradeRecord {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    shortName: row.short_name,
    description: row.description,
    sortOrder: row.sort_order,
    isArchived: asBoolean(row.is_archived),
    createdAt: asIso(row.created_at),
    updatedAt: asIso(row.updated_at),
  };
}

function mapCurriculumGrade(row: CurriculumGradeDbRow): CurriculumGradeRecord {
  return {
    curriculumId: row.curriculum_id,
    gradeId: row.grade_id,
    sortOrder: row.sort_order,
    isAvailable: asBoolean(row.is_available),
    createdAt: asIso(row.created_at),
    updatedAt: asIso(row.updated_at),
  };
}

function mapSubject(row: SubjectDbRow): SubjectRecord {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    icon: row.icon,
    accent: row.accent,
    recommendedStudyHours: row.recommended_study_hours,
    sortOrder: row.sort_order,
    isArchived: asBoolean(row.is_archived),
    createdAt: asIso(row.created_at),
    updatedAt: asIso(row.updated_at),
  };
}

function mapCurriculumSubject(row: CurriculumSubjectDbRow): CurriculumSubjectRecord {
  return {
    curriculumId: row.curriculum_id,
    subjectId: row.subject_id,
    isRequired: asBoolean(row.is_required),
    isAvailable: asBoolean(row.is_available),
    sortOrder: row.sort_order,
    createdAt: asIso(row.created_at),
    updatedAt: asIso(row.updated_at),
  };
}

function mapGradeSubject(row: GradeSubjectDbRow): GradeSubjectRecord {
  return {
    curriculumId: row.curriculum_id,
    gradeId: row.grade_id,
    subjectId: row.subject_id,
    isRequired: asBoolean(row.is_required),
    isAvailable: asBoolean(row.is_available),
    sortOrder: row.sort_order,
    createdAt: asIso(row.created_at),
    updatedAt: asIso(row.updated_at),
  };
}

function mapDomain(row: DomainDbRow): DomainRecord {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    sortOrder: row.sort_order,
    isArchived: asBoolean(row.is_archived),
    createdAt: asIso(row.created_at),
    updatedAt: asIso(row.updated_at),
  };
}

function mapSubjectDomain(row: SubjectDomainDbRow): SubjectDomainRecord {
  return {
    subjectId: row.subject_id,
    domainId: row.domain_id,
    sortOrder: row.sort_order,
    createdAt: asIso(row.created_at),
    updatedAt: asIso(row.updated_at),
  };
}

function mapGradeSubjectDomain(row: GradeSubjectDomainDbRow): GradeSubjectDomainRecord {
  return {
    curriculumId: row.curriculum_id,
    gradeId: row.grade_id,
    subjectId: row.subject_id,
    domainId: row.domain_id,
    isRequired: asBoolean(row.is_required),
    isAvailable: asBoolean(row.is_available),
    depth: row.depth,
    sortOrder: row.sort_order,
    createdAt: asIso(row.created_at),
    updatedAt: asIso(row.updated_at),
  };
}

function mapObjective(row: LearningObjectiveDbRow): LearningObjectiveRecord {
  return {
    id: row.id,
    curriculumId: row.curriculum_id,
    subjectId: row.subject_id,
    domainId: row.domain_id,
    code: row.code,
    title: row.title,
    description: row.description,
    difficulty: asDifficulty(row.difficulty),
    isRequired: asBoolean(row.is_required),
    sortOrder: row.sort_order,
    isArchived: asBoolean(row.is_archived),
    createdAt: asIso(row.created_at),
    updatedAt: asIso(row.updated_at),
  };
}

function mapGradeLearningObjective(row: GradeLearningObjectiveDbRow): GradeLearningObjectiveRecord {
  return {
    curriculumId: row.curriculum_id,
    gradeId: row.grade_id,
    objectiveId: row.objective_id,
    isRequired: asBoolean(row.is_required),
    sortOrder: row.sort_order,
    createdAt: asIso(row.created_at),
    updatedAt: asIso(row.updated_at),
  };
}

function asConflict(error: unknown): never {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes("UNIQUE constraint failed") || message.includes("duplicate key")) {
    throw new ConflictError("That structure already exists. Use a unique slug or code.");
  }
  throw error;
}

function sqliteBoolean(value: boolean): number {
  return value ? 1 : 0;
}

export class SqlCurriculumRepository implements CurriculumRepository {
  constructor(private readonly database: DatabaseHandle = getDatabase()) {}

  async listCurricula(
    options: { includeArchived?: boolean } = {},
  ): Promise<readonly CurriculumRecord[]> {
    const where = options.includeArchived ? "" : "WHERE is_archived = 0";
    if (this.database.provider === "sqlite") {
      return (
        this.database.raw
          .prepare(`${curriculumSelect} ${where} ORDER BY name COLLATE NOCASE`)
          .all() as CurriculumDbRow[]
      ).map(mapCurriculum);
    }
    const rows = options.includeArchived
      ? await this.database.raw<
          CurriculumDbRow[]
        >`${this.database.raw.unsafe(curriculumSelect)} ORDER BY name`
      : await this.database.raw<
          CurriculumDbRow[]
        >`${this.database.raw.unsafe(curriculumSelect)} WHERE is_archived = FALSE ORDER BY name`;
    return rows.map(mapCurriculum);
  }

  async getCurriculum(id: string): Promise<CurriculumRecord | null> {
    if (this.database.provider === "sqlite") {
      const row = this.database.raw.prepare(`${curriculumSelect} WHERE id = ?`).get(id) as
        CurriculumDbRow | undefined;
      return row ? mapCurriculum(row) : null;
    }
    const rows = await this.database.raw<
      CurriculumDbRow[]
    >`${this.database.raw.unsafe(curriculumSelect)} WHERE id = ${id}`;
    return rows[0] ? mapCurriculum(rows[0]) : null;
  }

  async getCurriculumExplorer(id: string): Promise<CurriculumExplorer | null> {
    const curriculum = await this.getCurriculum(id);
    if (!curriculum) return null;
    const [grades, subjects, objectives] = await Promise.all([
      this.listCurriculumGradePlacements(id),
      this.listCurriculumSubjectPlacements(id),
      this.listLearningObjectives({ curriculumId: id }),
    ]);
    return { curriculum, grades, subjects, objectiveCount: objectives.length };
  }

  private async listCurriculumGradePlacements(
    curriculumId: string,
  ): Promise<readonly CurriculumGradePlacement[]> {
    const query = `
      SELECT cg.curriculum_id, cg.grade_id, cg.sort_order, cg.is_available, cg.created_at, cg.updated_at,
             g.id AS grade_id_value, g.slug, g.name, g.short_name, g.description, g.sort_order AS grade_sort_order,
             g.is_archived AS grade_is_archived, g.created_at AS grade_created_at, g.updated_at AS grade_updated_at
      FROM curriculum_grades cg
      JOIN grades g ON g.id = cg.grade_id
      WHERE cg.curriculum_id = ${this.database.provider === "sqlite" ? "?" : "$1"}
        AND cg.is_available = ${this.database.provider === "sqlite" ? "1" : "TRUE"}
        AND g.is_archived = ${this.database.provider === "sqlite" ? "0" : "FALSE"}
      ORDER BY cg.sort_order, g.sort_order, g.name
    `;
    const rows =
      this.database.provider === "sqlite"
        ? (this.database.raw.prepare(query).all(curriculumId) as CurriculumGradePlacementDbRow[])
        : await this.database.raw<
            CurriculumGradePlacementDbRow[]
          >`SELECT cg.curriculum_id, cg.grade_id, cg.sort_order, cg.is_available, cg.created_at, cg.updated_at,
          g.id AS grade_id_value, g.slug, g.name, g.short_name, g.description, g.sort_order AS grade_sort_order,
          g.is_archived AS grade_is_archived, g.created_at AS grade_created_at, g.updated_at AS grade_updated_at
          FROM curriculum_grades cg JOIN grades g ON g.id = cg.grade_id
          WHERE cg.curriculum_id = ${curriculumId} AND cg.is_available = TRUE AND g.is_archived = FALSE
          ORDER BY cg.sort_order, g.sort_order, g.name`;
    return rows.map((row) => ({
      curriculumId: row.curriculum_id,
      gradeId: row.grade_id,
      sortOrder: row.sort_order,
      isAvailable: asBoolean(row.is_available),
      createdAt: asIso(row.created_at),
      updatedAt: asIso(row.updated_at),
      grade: mapGrade({
        id: row.grade_id_value,
        slug: row.slug,
        name: row.name,
        short_name: row.short_name,
        description: row.description,
        sort_order: row.grade_sort_order,
        is_archived: row.grade_is_archived,
        created_at: row.grade_created_at,
        updated_at: row.grade_updated_at,
      }),
    }));
  }

  private async listCurriculumSubjectPlacements(
    curriculumId: string,
  ): Promise<readonly CurriculumSubjectPlacement[]> {
    const sqliteQuery = `
      SELECT cs.curriculum_id, cs.subject_id, cs.is_required, cs.is_available, cs.sort_order, cs.created_at, cs.updated_at,
             s.slug AS subject_slug, s.name AS subject_name, s.description AS subject_description,
             s.icon AS subject_icon, s.accent AS subject_accent, s.recommended_study_hours AS subject_recommended_study_hours,
             s.sort_order AS subject_sort_order, s.is_archived AS subject_is_archived,
             s.created_at AS subject_created_at, s.updated_at AS subject_updated_at,
             (SELECT COUNT(*) FROM grade_subjects gs WHERE gs.curriculum_id = cs.curriculum_id AND gs.subject_id = cs.subject_id AND gs.is_available = 1) AS grade_count
      FROM curriculum_subjects cs JOIN subjects s ON s.id = cs.subject_id
      WHERE cs.curriculum_id = ? AND cs.is_available = 1 AND s.is_archived = 0
      ORDER BY cs.sort_order, s.sort_order, s.name COLLATE NOCASE
    `;
    const rows =
      this.database.provider === "sqlite"
        ? (this.database.raw.prepare(sqliteQuery).all(curriculumId) as CurriculumSubjectViewRow[])
        : await this.database.raw<
            CurriculumSubjectViewRow[]
          >`SELECT cs.curriculum_id, cs.subject_id, cs.is_required, cs.is_available, cs.sort_order, cs.created_at, cs.updated_at,
          s.slug AS subject_slug, s.name AS subject_name, s.description AS subject_description,
          s.icon AS subject_icon, s.accent AS subject_accent, s.recommended_study_hours AS subject_recommended_study_hours,
          s.sort_order AS subject_sort_order, s.is_archived AS subject_is_archived,
          s.created_at AS subject_created_at, s.updated_at AS subject_updated_at,
          (SELECT COUNT(*) FROM grade_subjects gs WHERE gs.curriculum_id = cs.curriculum_id AND gs.subject_id = cs.subject_id AND gs.is_available = TRUE) AS grade_count
          FROM curriculum_subjects cs JOIN subjects s ON s.id = cs.subject_id
          WHERE cs.curriculum_id = ${curriculumId} AND cs.is_available = TRUE AND s.is_archived = FALSE
          ORDER BY cs.sort_order, s.sort_order, s.name`;
    return rows.map((row) => ({
      ...mapCurriculumSubject(row),
      gradeCount: Number(row.grade_count),
      subject: mapSubject({
        id: row.subject_id,
        slug: row.subject_slug,
        name: row.subject_name,
        description: row.subject_description,
        icon: row.subject_icon,
        accent: row.subject_accent,
        recommended_study_hours: row.subject_recommended_study_hours,
        sort_order: row.subject_sort_order,
        is_archived: row.subject_is_archived,
        created_at: row.subject_created_at,
        updated_at: row.subject_updated_at,
      }),
    }));
  }

  async createCurriculum(input: CreateCurriculumInput): Promise<CurriculumRecord> {
    try {
      if (this.database.provider === "sqlite") {
        this.database.raw
          .prepare(
            `INSERT INTO curricula (id, slug, name, kind, description, authority, is_system) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          )
          .run(
            input.id,
            input.slug,
            input.name,
            input.kind,
            input.description,
            input.authority,
            sqliteBoolean(input.isSystem ?? false),
          );
      } else {
        await this.database
          .raw`INSERT INTO curricula (id, slug, name, kind, description, authority, is_system) VALUES (${input.id}, ${input.slug}, ${input.name}, ${input.kind}, ${input.description}, ${input.authority}, ${input.isSystem ?? false})`;
      }
    } catch (error) {
      asConflict(error);
    }
    const created = await this.getCurriculum(input.id);
    if (!created) throw new NotFoundError("Curriculum", input.id);
    return created;
  }

  async updateCurriculum(id: string, input: UpdateCurriculumInput): Promise<CurriculumRecord> {
    try {
      if (this.database.provider === "sqlite") {
        const result = this.database.raw
          .prepare(
            `UPDATE curricula SET slug = ?, name = ?, kind = ?, description = ?, authority = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
          )
          .run(input.slug, input.name, input.kind, input.description, input.authority, id);
        if (result.changes === 0) throw new NotFoundError("Curriculum", id);
      } else {
        const rows = await this.database.raw<
          { id: string }[]
        >`UPDATE curricula SET slug = ${input.slug}, name = ${input.name}, kind = ${input.kind}, description = ${input.description}, authority = ${input.authority}, updated_at = NOW() WHERE id = ${id} RETURNING id`;
        if (!rows[0]) throw new NotFoundError("Curriculum", id);
      }
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      asConflict(error);
    }
    const updated = await this.getCurriculum(id);
    if (!updated) throw new NotFoundError("Curriculum", id);
    return updated;
  }

  async archiveCurriculum(id: string, isArchived: boolean): Promise<void> {
    await this.setArchived("curricula", id, isArchived, "Curriculum");
  }

  async listGrades(options: { includeArchived?: boolean } = {}): Promise<readonly GradeRecord[]> {
    if (this.database.provider === "sqlite") {
      const where = options.includeArchived ? "" : "WHERE is_archived = 0";
      return (
        this.database.raw
          .prepare(`${gradeSelect} ${where} ORDER BY sort_order, name COLLATE NOCASE`)
          .all() as GradeDbRow[]
      ).map(mapGrade);
    }
    const rows = options.includeArchived
      ? await this.database.raw<
          GradeDbRow[]
        >`${this.database.raw.unsafe(gradeSelect)} ORDER BY sort_order, name`
      : await this.database.raw<
          GradeDbRow[]
        >`${this.database.raw.unsafe(gradeSelect)} WHERE is_archived = FALSE ORDER BY sort_order, name`;
    return rows.map(mapGrade);
  }

  async getGrade(id: string): Promise<GradeRecord | null> {
    if (this.database.provider === "sqlite") {
      const row = this.database.raw.prepare(`${gradeSelect} WHERE id = ?`).get(id) as
        GradeDbRow | undefined;
      return row ? mapGrade(row) : null;
    }
    const rows = await this.database.raw<
      GradeDbRow[]
    >`${this.database.raw.unsafe(gradeSelect)} WHERE id = ${id}`;
    return rows[0] ? mapGrade(rows[0]) : null;
  }

  async getGradeExplorer(curriculumId: string, gradeId: string): Promise<GradeExplorer | null> {
    const [curriculum, grade] = await Promise.all([
      this.getCurriculum(curriculumId),
      this.getGrade(gradeId),
    ]);
    if (!curriculum || !grade) return null;
    const subjects = await this.listGradeSubjectPlacements(curriculumId, gradeId);
    const objectives = await this.listLearningObjectives({ curriculumId, gradeId });
    return { curriculum, grade, subjects, objectives };
  }

  private async listGradeSubjectPlacements(
    curriculumId: string,
    gradeId: string,
  ): Promise<readonly GradeSubjectPlacement[]> {
    const sqliteQuery = `
      SELECT gs.curriculum_id, gs.grade_id, gs.subject_id, gs.is_required, gs.is_available, gs.sort_order, gs.created_at, gs.updated_at,
             s.slug AS subject_slug, s.name AS subject_name, s.description AS subject_description,
             s.icon AS subject_icon, s.accent AS subject_accent, s.recommended_study_hours AS subject_recommended_study_hours,
             s.sort_order AS subject_sort_order, s.is_archived AS subject_is_archived,
             s.created_at AS subject_created_at, s.updated_at AS subject_updated_at,
             gsd.domain_id, d.slug AS domain_slug, d.name AS domain_name, d.description AS domain_description,
             d.sort_order AS domain_sort_order, d.is_archived AS domain_is_archived,
             d.created_at AS domain_created_at, d.updated_at AS domain_updated_at,
             gsd.is_required AS domain_is_required, gsd.is_available AS domain_is_available, gsd.depth AS domain_depth,
             gsd.sort_order AS domain_mapping_sort_order, gsd.created_at AS domain_mapping_created_at,
             gsd.updated_at AS domain_mapping_updated_at,
             (SELECT COUNT(*) FROM grade_learning_objectives glo JOIN learning_objectives lo ON lo.id = glo.objective_id
              WHERE glo.curriculum_id = gs.curriculum_id AND glo.grade_id = gs.grade_id AND lo.subject_id = gs.subject_id AND lo.is_archived = 0) AS objective_count
      FROM grade_subjects gs JOIN subjects s ON s.id = gs.subject_id
      LEFT JOIN grade_subject_domains gsd ON gsd.curriculum_id = gs.curriculum_id AND gsd.grade_id = gs.grade_id AND gsd.subject_id = gs.subject_id AND gsd.is_available = 1
      LEFT JOIN domains d ON d.id = gsd.domain_id AND d.is_archived = 0
      WHERE gs.curriculum_id = ? AND gs.grade_id = ? AND gs.is_available = 1 AND s.is_archived = 0
      ORDER BY gs.sort_order, s.sort_order, s.name COLLATE NOCASE, gsd.sort_order, d.name COLLATE NOCASE
    `;
    const rows =
      this.database.provider === "sqlite"
        ? (this.database.raw
            .prepare(sqliteQuery)
            .all(curriculumId, gradeId) as GradeSubjectViewRow[])
        : await this.database.raw<
            GradeSubjectViewRow[]
          >`SELECT gs.curriculum_id, gs.grade_id, gs.subject_id, gs.is_required, gs.is_available, gs.sort_order, gs.created_at, gs.updated_at,
          s.slug AS subject_slug, s.name AS subject_name, s.description AS subject_description,
          s.icon AS subject_icon, s.accent AS subject_accent, s.recommended_study_hours AS subject_recommended_study_hours,
          s.sort_order AS subject_sort_order, s.is_archived AS subject_is_archived,
          s.created_at AS subject_created_at, s.updated_at AS subject_updated_at,
          gsd.domain_id, d.slug AS domain_slug, d.name AS domain_name, d.description AS domain_description,
          d.sort_order AS domain_sort_order, d.is_archived AS domain_is_archived,
          d.created_at AS domain_created_at, d.updated_at AS domain_updated_at,
          gsd.is_required AS domain_is_required, gsd.is_available AS domain_is_available, gsd.depth AS domain_depth,
          gsd.sort_order AS domain_mapping_sort_order, gsd.created_at AS domain_mapping_created_at,
          gsd.updated_at AS domain_mapping_updated_at,
          (SELECT COUNT(*) FROM grade_learning_objectives glo JOIN learning_objectives lo ON lo.id = glo.objective_id
           WHERE glo.curriculum_id = gs.curriculum_id AND glo.grade_id = gs.grade_id AND lo.subject_id = gs.subject_id AND lo.is_archived = FALSE) AS objective_count
          FROM grade_subjects gs JOIN subjects s ON s.id = gs.subject_id
          LEFT JOIN grade_subject_domains gsd ON gsd.curriculum_id = gs.curriculum_id AND gsd.grade_id = gs.grade_id AND gsd.subject_id = gs.subject_id AND gsd.is_available = TRUE
          LEFT JOIN domains d ON d.id = gsd.domain_id AND d.is_archived = FALSE
          WHERE gs.curriculum_id = ${curriculumId} AND gs.grade_id = ${gradeId} AND gs.is_available = TRUE AND s.is_archived = FALSE
          ORDER BY gs.sort_order, s.sort_order, s.name, gsd.sort_order, d.name`;
    const grouped = new Map<string, GradeSubjectPlacement>();
    for (const row of rows) {
      const existing = grouped.get(row.subject_id);
      const domain = row.domain_id && row.domain_name ? this.mapGradeDomain(row) : null;
      if (existing) {
        if (domain) existing.domains = [...existing.domains, domain];
        continue;
      }
      grouped.set(row.subject_id, {
        ...mapGradeSubject(row),
        subject: mapSubject({
          id: row.subject_id,
          slug: row.subject_slug,
          name: row.subject_name,
          description: row.subject_description,
          icon: row.subject_icon,
          accent: row.subject_accent,
          recommended_study_hours: row.subject_recommended_study_hours,
          sort_order: row.subject_sort_order,
          is_archived: row.subject_is_archived,
          created_at: row.subject_created_at,
          updated_at: row.subject_updated_at,
        }),
        domains: domain ? [domain] : [],
        objectiveCount: Number(row.objective_count),
      });
    }
    return [...grouped.values()];
  }

  private mapGradeDomain(row: GradeSubjectViewRow): GradeSubjectDomainPlacement {
    return {
      curriculumId: row.curriculum_id,
      gradeId: row.grade_id,
      subjectId: row.subject_id,
      domainId: row.domain_id!,
      isRequired: asBoolean(row.domain_is_required),
      isAvailable: asBoolean(row.domain_is_available),
      depth: row.domain_depth ?? 1,
      sortOrder: row.domain_mapping_sort_order ?? 0,
      createdAt: asIso(row.domain_mapping_created_at),
      updatedAt: asIso(row.domain_mapping_updated_at),
      domain: {
        id: row.domain_id!,
        slug: row.domain_slug!,
        name: row.domain_name!,
        description: row.domain_description ?? "",
        sortOrder: row.domain_sort_order ?? 0,
        isArchived: asBoolean(row.domain_is_archived),
        createdAt: asIso(row.domain_created_at),
        updatedAt: asIso(row.domain_updated_at),
      },
    };
  }

  async createGrade(input: CreateGradeInput): Promise<GradeRecord> {
    try {
      if (this.database.provider === "sqlite") {
        this.database.raw
          .prepare(
            `INSERT INTO grades (id, slug, name, short_name, description, sort_order) VALUES (?, ?, ?, ?, ?, ?)`,
          )
          .run(
            input.id,
            input.slug,
            input.name,
            input.shortName,
            input.description,
            input.sortOrder,
          );
      } else {
        await this.database
          .raw`INSERT INTO grades (id, slug, name, short_name, description, sort_order) VALUES (${input.id}, ${input.slug}, ${input.name}, ${input.shortName}, ${input.description}, ${input.sortOrder})`;
      }
    } catch (error) {
      asConflict(error);
    }
    const created = await this.getGrade(input.id);
    if (!created) throw new NotFoundError("Grade", input.id);
    return created;
  }

  async updateGrade(id: string, input: UpdateGradeInput): Promise<GradeRecord> {
    try {
      if (this.database.provider === "sqlite") {
        const result = this.database.raw
          .prepare(
            `UPDATE grades SET slug = ?, name = ?, short_name = ?, description = ?, sort_order = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
          )
          .run(input.slug, input.name, input.shortName, input.description, input.sortOrder, id);
        if (result.changes === 0) throw new NotFoundError("Grade", id);
      } else {
        const rows = await this.database.raw<
          { id: string }[]
        >`UPDATE grades SET slug = ${input.slug}, name = ${input.name}, short_name = ${input.shortName}, description = ${input.description}, sort_order = ${input.sortOrder}, updated_at = NOW() WHERE id = ${id} RETURNING id`;
        if (!rows[0]) throw new NotFoundError("Grade", id);
      }
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      asConflict(error);
    }
    const updated = await this.getGrade(id);
    if (!updated) throw new NotFoundError("Grade", id);
    return updated;
  }

  async archiveGrade(id: string, isArchived: boolean): Promise<void> {
    await this.setArchived("grades", id, isArchived, "Grade");
  }

  async listSubjects(
    options: { includeArchived?: boolean } = {},
  ): Promise<readonly SubjectRecord[]> {
    if (this.database.provider === "sqlite") {
      const where = options.includeArchived ? "" : "WHERE is_archived = 0";
      return (
        this.database.raw
          .prepare(`${subjectSelect} ${where} ORDER BY sort_order, name COLLATE NOCASE`)
          .all() as SubjectDbRow[]
      ).map(mapSubject);
    }
    const rows = options.includeArchived
      ? await this.database.raw<
          SubjectDbRow[]
        >`${this.database.raw.unsafe(subjectSelect)} ORDER BY sort_order, name`
      : await this.database.raw<
          SubjectDbRow[]
        >`${this.database.raw.unsafe(subjectSelect)} WHERE is_archived = FALSE ORDER BY sort_order, name`;
    return rows.map(mapSubject);
  }

  async getSubject(id: string): Promise<SubjectRecord | null> {
    if (this.database.provider === "sqlite") {
      const row = this.database.raw.prepare(`${subjectSelect} WHERE id = ?`).get(id) as
        SubjectDbRow | undefined;
      return row ? mapSubject(row) : null;
    }
    const rows = await this.database.raw<
      SubjectDbRow[]
    >`${this.database.raw.unsafe(subjectSelect)} WHERE id = ${id}`;
    return rows[0] ? mapSubject(rows[0]) : null;
  }

  async getSubjectExplorer(
    subjectId: string,
    curriculumId?: string,
  ): Promise<SubjectExplorer | null> {
    const subject = await this.getSubject(subjectId);
    if (!subject) return null;
    const [domains, curricula, grades, objectives] = await Promise.all([
      this.listSubjectDomainPlacements(subjectId),
      this.listCurriculumSubjectsForSubject(subjectId),
      this.listSubjectGradePlacements(subjectId, curriculumId),
      this.listLearningObjectives({ subjectId, curriculumId }),
    ]);
    return { subject, domains, curricula, grades, objectives };
  }

  private async listSubjectDomainPlacements(
    subjectId: string,
  ): Promise<readonly SubjectDomainPlacement[]> {
    const query = `
      SELECT sd.subject_id, sd.domain_id, sd.sort_order, sd.created_at, sd.updated_at,
             d.id, d.slug, d.name, d.description, d.sort_order AS domain_sort_order, d.is_archived,
             d.created_at AS domain_created_at, d.updated_at AS domain_updated_at
      FROM subject_domains sd JOIN domains d ON d.id = sd.domain_id
      WHERE sd.subject_id = ${this.database.provider === "sqlite" ? "?" : "$1"} AND d.is_archived = ${this.database.provider === "sqlite" ? "0" : "FALSE"}
      ORDER BY sd.sort_order, d.sort_order, d.name
    `;
    const rows =
      this.database.provider === "sqlite"
        ? (this.database.raw.prepare(query).all(subjectId) as Array<
            SubjectDomainDbRow &
              DomainDbRow & {
                domain_sort_order: number;
                domain_created_at: DbDate;
                domain_updated_at: DbDate;
              }
          >)
        : await this.database.raw<
            Array<
              SubjectDomainDbRow &
                DomainDbRow & {
                  domain_sort_order: number;
                  domain_created_at: DbDate;
                  domain_updated_at: DbDate;
                }
            >
          >`SELECT sd.subject_id, sd.domain_id, sd.sort_order, sd.created_at, sd.updated_at,
          d.id, d.slug, d.name, d.description, d.sort_order AS domain_sort_order, d.is_archived,
          d.created_at AS domain_created_at, d.updated_at AS domain_updated_at
          FROM subject_domains sd JOIN domains d ON d.id = sd.domain_id
          WHERE sd.subject_id = ${subjectId} AND d.is_archived = FALSE
          ORDER BY sd.sort_order, d.sort_order, d.name`;
    return rows.map((row) => ({
      ...mapSubjectDomain(row),
      domain: mapDomain({
        id: row.domain_id,
        slug: row.slug,
        name: row.name,
        description: row.description,
        sort_order: row.domain_sort_order,
        is_archived: row.is_archived,
        created_at: row.domain_created_at,
        updated_at: row.domain_updated_at,
      }),
    }));
  }

  private async listCurriculumSubjectsForSubject(
    subjectId: string,
  ): Promise<readonly CurriculumSubjectRecord[]> {
    if (this.database.provider === "sqlite") {
      return (
        this.database.raw
          .prepare(
            `SELECT curriculum_id, subject_id, is_required, is_available, sort_order, created_at, updated_at FROM curriculum_subjects WHERE subject_id = ? ORDER BY sort_order, curriculum_id`,
          )
          .all(subjectId) as CurriculumSubjectDbRow[]
      ).map(mapCurriculumSubject);
    }
    const rows = await this.database.raw<
      CurriculumSubjectDbRow[]
    >`SELECT curriculum_id, subject_id, is_required, is_available, sort_order, created_at, updated_at FROM curriculum_subjects WHERE subject_id = ${subjectId} ORDER BY sort_order, curriculum_id`;
    return rows.map(mapCurriculumSubject);
  }

  private async listSubjectGradePlacements(
    subjectId: string,
    curriculumId?: string,
  ): Promise<readonly SubjectGradePlacement[]> {
    const sqliteQuery = `
      SELECT gs.curriculum_id, gs.grade_id, gs.subject_id, gs.is_required, gs.is_available, gs.sort_order, gs.created_at, gs.updated_at,
             g.slug AS grade_slug, g.name AS grade_name, g.short_name AS grade_short_name, g.description AS grade_description,
             g.sort_order AS grade_sort_order, g.is_archived AS grade_is_archived, g.created_at AS grade_created_at, g.updated_at AS grade_updated_at,
             gsd.domain_id, d.slug AS domain_slug, d.name AS domain_name, d.description AS domain_description,
             d.sort_order AS domain_sort_order, d.is_archived AS domain_is_archived, d.created_at AS domain_created_at,
             d.updated_at AS domain_updated_at, gsd.is_required AS domain_is_required, gsd.is_available AS domain_is_available,
             gsd.depth AS domain_depth, gsd.sort_order AS domain_mapping_sort_order, gsd.created_at AS domain_mapping_created_at,
             gsd.updated_at AS domain_mapping_updated_at
      FROM grade_subjects gs JOIN grades g ON g.id = gs.grade_id
      LEFT JOIN grade_subject_domains gsd ON gsd.curriculum_id = gs.curriculum_id AND gsd.grade_id = gs.grade_id AND gsd.subject_id = gs.subject_id AND gsd.is_available = 1
      LEFT JOIN domains d ON d.id = gsd.domain_id AND d.is_archived = 0
      WHERE gs.subject_id = ? AND gs.is_available = 1 AND g.is_archived = 0 ${curriculumId ? "AND gs.curriculum_id = ?" : ""}
      ORDER BY gs.curriculum_id, g.sort_order, g.name, gsd.sort_order, d.name
    `;
    const rows =
      this.database.provider === "sqlite"
        ? (this.database.raw
            .prepare(sqliteQuery)
            .all(
              ...(curriculumId ? [subjectId, curriculumId] : [subjectId]),
            ) as SubjectGradeViewRow[])
        : curriculumId
          ? await this.database.raw<
              SubjectGradeViewRow[]
            >`SELECT gs.curriculum_id, gs.grade_id, gs.subject_id, gs.is_required, gs.is_available, gs.sort_order, gs.created_at, gs.updated_at,
            g.slug AS grade_slug, g.name AS grade_name, g.short_name AS grade_short_name, g.description AS grade_description,
            g.sort_order AS grade_sort_order, g.is_archived AS grade_is_archived, g.created_at AS grade_created_at, g.updated_at AS grade_updated_at,
            gsd.domain_id, d.slug AS domain_slug, d.name AS domain_name, d.description AS domain_description,
            d.sort_order AS domain_sort_order, d.is_archived AS domain_is_archived, d.created_at AS domain_created_at,
            d.updated_at AS domain_updated_at, gsd.is_required AS domain_is_required, gsd.is_available AS domain_is_available,
            gsd.depth AS domain_depth, gsd.sort_order AS domain_mapping_sort_order, gsd.created_at AS domain_mapping_created_at,
            gsd.updated_at AS domain_mapping_updated_at
            FROM grade_subjects gs JOIN grades g ON g.id = gs.grade_id
            LEFT JOIN grade_subject_domains gsd ON gsd.curriculum_id = gs.curriculum_id AND gsd.grade_id = gs.grade_id AND gsd.subject_id = gs.subject_id AND gsd.is_available = TRUE
            LEFT JOIN domains d ON d.id = gsd.domain_id AND d.is_archived = FALSE
            WHERE gs.subject_id = ${subjectId} AND gs.is_available = TRUE AND g.is_archived = FALSE AND gs.curriculum_id = ${curriculumId}
            ORDER BY gs.curriculum_id, g.sort_order, g.name, gsd.sort_order, d.name`
          : await this.database.raw<
              SubjectGradeViewRow[]
            >`SELECT gs.curriculum_id, gs.grade_id, gs.subject_id, gs.is_required, gs.is_available, gs.sort_order, gs.created_at, gs.updated_at,
            g.slug AS grade_slug, g.name AS grade_name, g.short_name AS grade_short_name, g.description AS grade_description,
            g.sort_order AS grade_sort_order, g.is_archived AS grade_is_archived, g.created_at AS grade_created_at, g.updated_at AS grade_updated_at,
            gsd.domain_id, d.slug AS domain_slug, d.name AS domain_name, d.description AS domain_description,
            d.sort_order AS domain_sort_order, d.is_archived AS domain_is_archived, d.created_at AS domain_created_at,
            d.updated_at AS domain_updated_at, gsd.is_required AS domain_is_required, gsd.is_available AS domain_is_available,
            gsd.depth AS domain_depth, gsd.sort_order AS domain_mapping_sort_order, gsd.created_at AS domain_mapping_created_at,
            gsd.updated_at AS domain_mapping_updated_at
            FROM grade_subjects gs JOIN grades g ON g.id = gs.grade_id
            LEFT JOIN grade_subject_domains gsd ON gsd.curriculum_id = gs.curriculum_id AND gsd.grade_id = gs.grade_id AND gsd.subject_id = gs.subject_id AND gsd.is_available = TRUE
            LEFT JOIN domains d ON d.id = gsd.domain_id AND d.is_archived = FALSE
            WHERE gs.subject_id = ${subjectId} AND gs.is_available = TRUE AND g.is_archived = FALSE
            ORDER BY gs.curriculum_id, g.sort_order, g.name, gsd.sort_order, d.name`;
    const grouped = new Map<string, SubjectGradePlacement>();
    for (const row of rows) {
      const key = `${row.curriculum_id}:${row.grade_id}`;
      const existing = grouped.get(key);
      const domain = row.domain_id && row.domain_name ? this.mapSubjectDomainPlacement(row) : null;
      if (existing) {
        if (domain) existing.domains = [...existing.domains, domain];
        continue;
      }
      grouped.set(key, {
        ...mapGradeSubject(row),
        grade: {
          id: row.grade_id,
          slug: row.grade_slug,
          name: row.grade_name,
          shortName: row.grade_short_name,
          description: row.grade_description,
          sortOrder: row.grade_sort_order,
          isArchived: asBoolean(row.grade_is_archived),
          createdAt: asIso(row.grade_created_at),
          updatedAt: asIso(row.grade_updated_at),
        },
        domains: domain ? [domain] : [],
      });
    }
    return [...grouped.values()];
  }

  private mapSubjectDomainPlacement(row: SubjectGradeViewRow): GradeSubjectDomainPlacement {
    return {
      curriculumId: row.curriculum_id,
      gradeId: row.grade_id,
      subjectId: row.subject_id,
      domainId: row.domain_id!,
      isRequired: asBoolean(row.domain_is_required),
      isAvailable: asBoolean(row.domain_is_available),
      depth: row.domain_depth ?? 1,
      sortOrder: row.domain_mapping_sort_order ?? 0,
      createdAt: asIso(row.domain_mapping_created_at),
      updatedAt: asIso(row.domain_mapping_updated_at),
      domain: {
        id: row.domain_id!,
        slug: row.domain_slug!,
        name: row.domain_name!,
        description: row.domain_description ?? "",
        sortOrder: row.domain_sort_order ?? 0,
        isArchived: asBoolean(row.domain_is_archived),
        createdAt: asIso(row.domain_created_at),
        updatedAt: asIso(row.domain_updated_at),
      },
    };
  }

  async createSubject(input: CreateSubjectInput): Promise<SubjectRecord> {
    try {
      if (this.database.provider === "sqlite") {
        this.database.raw
          .prepare(
            `INSERT INTO subjects (id, slug, name, description, icon, accent, recommended_study_hours, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          )
          .run(
            input.id,
            input.slug,
            input.name,
            input.description,
            input.icon,
            input.accent,
            input.recommendedStudyHours,
            input.sortOrder,
          );
      } else {
        await this.database
          .raw`INSERT INTO subjects (id, slug, name, description, icon, accent, recommended_study_hours, sort_order) VALUES (${input.id}, ${input.slug}, ${input.name}, ${input.description}, ${input.icon}, ${input.accent}, ${input.recommendedStudyHours}, ${input.sortOrder})`;
      }
    } catch (error) {
      asConflict(error);
    }
    const created = await this.getSubject(input.id);
    if (!created) throw new NotFoundError("Subject", input.id);
    return created;
  }

  async updateSubject(id: string, input: UpdateSubjectInput): Promise<SubjectRecord> {
    try {
      if (this.database.provider === "sqlite") {
        const result = this.database.raw
          .prepare(
            `UPDATE subjects SET slug = ?, name = ?, description = ?, icon = ?, accent = ?, recommended_study_hours = ?, sort_order = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
          )
          .run(
            input.slug,
            input.name,
            input.description,
            input.icon,
            input.accent,
            input.recommendedStudyHours,
            input.sortOrder,
            id,
          );
        if (result.changes === 0) throw new NotFoundError("Subject", id);
      } else {
        const rows = await this.database.raw<
          { id: string }[]
        >`UPDATE subjects SET slug = ${input.slug}, name = ${input.name}, description = ${input.description}, icon = ${input.icon}, accent = ${input.accent}, recommended_study_hours = ${input.recommendedStudyHours}, sort_order = ${input.sortOrder}, updated_at = NOW() WHERE id = ${id} RETURNING id`;
        if (!rows[0]) throw new NotFoundError("Subject", id);
      }
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      asConflict(error);
    }
    const updated = await this.getSubject(id);
    if (!updated) throw new NotFoundError("Subject", id);
    return updated;
  }

  async archiveSubject(id: string, isArchived: boolean): Promise<void> {
    await this.setArchived("subjects", id, isArchived, "Subject");
  }

  async listDomains(
    options: { subjectId?: string; includeArchived?: boolean } = {},
  ): Promise<readonly DomainRecord[]> {
    if (this.database.provider === "sqlite") {
      const where = options.includeArchived
        ? ""
        : options.subjectId
          ? "WHERE d.is_archived = 0"
          : "WHERE is_archived = 0";
      const query = options.subjectId
        ? `${domainSelect.replace("FROM domains", "FROM domains d")} JOIN subject_domains sd ON sd.domain_id = d.id ${where ? "AND" : "WHERE"} sd.subject_id = ? ORDER BY d.sort_order, d.name COLLATE NOCASE`
        : `${domainSelect} ${where} ORDER BY sort_order, name COLLATE NOCASE`;
      return (
        this.database.raw
          .prepare(query)
          .all(...(options.subjectId ? [options.subjectId] : [])) as DomainDbRow[]
      ).map(mapDomain);
    }
    if (options.subjectId) {
      const rows = options.includeArchived
        ? await this.database.raw<
            DomainDbRow[]
          >`SELECT d.id, d.slug, d.name, d.description, d.sort_order, d.is_archived, d.created_at, d.updated_at FROM domains d JOIN subject_domains sd ON sd.domain_id = d.id WHERE sd.subject_id = ${options.subjectId} ORDER BY d.sort_order, d.name`
        : await this.database.raw<
            DomainDbRow[]
          >`SELECT d.id, d.slug, d.name, d.description, d.sort_order, d.is_archived, d.created_at, d.updated_at FROM domains d JOIN subject_domains sd ON sd.domain_id = d.id WHERE sd.subject_id = ${options.subjectId} AND d.is_archived = FALSE ORDER BY d.sort_order, d.name`;
      return rows.map(mapDomain);
    }
    const rows = options.includeArchived
      ? await this.database.raw<
          DomainDbRow[]
        >`${this.database.raw.unsafe(domainSelect)} ORDER BY sort_order, name`
      : await this.database.raw<
          DomainDbRow[]
        >`${this.database.raw.unsafe(domainSelect)} WHERE is_archived = FALSE ORDER BY sort_order, name`;
    return rows.map(mapDomain);
  }

  async getDomain(id: string): Promise<DomainRecord | null> {
    if (this.database.provider === "sqlite") {
      const row = this.database.raw.prepare(`${domainSelect} WHERE id = ?`).get(id) as
        DomainDbRow | undefined;
      return row ? mapDomain(row) : null;
    }
    const rows = await this.database.raw<
      DomainDbRow[]
    >`${this.database.raw.unsafe(domainSelect)} WHERE id = ${id}`;
    return rows[0] ? mapDomain(rows[0]) : null;
  }

  async createDomain(input: CreateDomainInput): Promise<DomainRecord> {
    try {
      if (this.database.provider === "sqlite") {
        this.database.raw
          .prepare(
            `INSERT INTO domains (id, slug, name, description, sort_order) VALUES (?, ?, ?, ?, ?)`,
          )
          .run(input.id, input.slug, input.name, input.description, input.sortOrder);
      } else {
        await this.database
          .raw`INSERT INTO domains (id, slug, name, description, sort_order) VALUES (${input.id}, ${input.slug}, ${input.name}, ${input.description}, ${input.sortOrder})`;
      }
    } catch (error) {
      asConflict(error);
    }
    const created = await this.getDomain(input.id);
    if (!created) throw new NotFoundError("Domain", input.id);
    return created;
  }

  async updateDomain(id: string, input: UpdateDomainInput): Promise<DomainRecord> {
    try {
      if (this.database.provider === "sqlite") {
        const result = this.database.raw
          .prepare(
            `UPDATE domains SET slug = ?, name = ?, description = ?, sort_order = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
          )
          .run(input.slug, input.name, input.description, input.sortOrder, id);
        if (result.changes === 0) throw new NotFoundError("Domain", id);
      } else {
        const rows = await this.database.raw<
          { id: string }[]
        >`UPDATE domains SET slug = ${input.slug}, name = ${input.name}, description = ${input.description}, sort_order = ${input.sortOrder}, updated_at = NOW() WHERE id = ${id} RETURNING id`;
        if (!rows[0]) throw new NotFoundError("Domain", id);
      }
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      asConflict(error);
    }
    const updated = await this.getDomain(id);
    if (!updated) throw new NotFoundError("Domain", id);
    return updated;
  }

  async archiveDomain(id: string, isArchived: boolean): Promise<void> {
    await this.setArchived("domains", id, isArchived, "Domain");
  }

  async listCurriculumGrades(curriculumId: string): Promise<readonly CurriculumGradeRecord[]> {
    if (this.database.provider === "sqlite") {
      return (
        this.database.raw
          .prepare(
            `SELECT curriculum_id, grade_id, sort_order, is_available, created_at, updated_at FROM curriculum_grades WHERE curriculum_id = ? ORDER BY sort_order, grade_id`,
          )
          .all(curriculumId) as CurriculumGradeDbRow[]
      ).map(mapCurriculumGrade);
    }
    const rows = await this.database.raw<
      CurriculumGradeDbRow[]
    >`SELECT curriculum_id, grade_id, sort_order, is_available, created_at, updated_at FROM curriculum_grades WHERE curriculum_id = ${curriculumId} ORDER BY sort_order, grade_id`;
    return rows.map(mapCurriculumGrade);
  }

  async saveCurriculumGrade(input: CurriculumGradeMappingInput): Promise<CurriculumGradeRecord> {
    if (this.database.provider === "sqlite") {
      this.database.raw
        .prepare(
          `INSERT INTO curriculum_grades (curriculum_id, grade_id, sort_order, is_available) VALUES (?, ?, ?, ?) ON CONFLICT(curriculum_id, grade_id) DO UPDATE SET sort_order = excluded.sort_order, is_available = excluded.is_available, updated_at = CURRENT_TIMESTAMP`,
        )
        .run(input.curriculumId, input.gradeId, input.sortOrder, sqliteBoolean(input.isAvailable));
      const row = this.database.raw
        .prepare(
          `SELECT curriculum_id, grade_id, sort_order, is_available, created_at, updated_at FROM curriculum_grades WHERE curriculum_id = ? AND grade_id = ?`,
        )
        .get(input.curriculumId, input.gradeId) as CurriculumGradeDbRow | undefined;
      if (!row) throw new NotFoundError("Curriculum grade mapping");
      return mapCurriculumGrade(row);
    }
    const rows = await this.database.raw<
      CurriculumGradeDbRow[]
    >`INSERT INTO curriculum_grades (curriculum_id, grade_id, sort_order, is_available) VALUES (${input.curriculumId}, ${input.gradeId}, ${input.sortOrder}, ${input.isAvailable}) ON CONFLICT (curriculum_id, grade_id) DO UPDATE SET sort_order = EXCLUDED.sort_order, is_available = EXCLUDED.is_available, updated_at = NOW() RETURNING curriculum_id, grade_id, sort_order, is_available, created_at, updated_at`;
    if (!rows[0]) throw new NotFoundError("Curriculum grade mapping");
    return mapCurriculumGrade(rows[0]);
  }

  async listCurriculumSubjects(curriculumId: string): Promise<readonly CurriculumSubjectRecord[]> {
    if (this.database.provider === "sqlite") {
      return (
        this.database.raw
          .prepare(
            `SELECT curriculum_id, subject_id, is_required, is_available, sort_order, created_at, updated_at FROM curriculum_subjects WHERE curriculum_id = ? ORDER BY sort_order, subject_id`,
          )
          .all(curriculumId) as CurriculumSubjectDbRow[]
      ).map(mapCurriculumSubject);
    }
    const rows = await this.database.raw<
      CurriculumSubjectDbRow[]
    >`SELECT curriculum_id, subject_id, is_required, is_available, sort_order, created_at, updated_at FROM curriculum_subjects WHERE curriculum_id = ${curriculumId} ORDER BY sort_order, subject_id`;
    return rows.map(mapCurriculumSubject);
  }

  async saveCurriculumSubject(
    input: CurriculumSubjectMappingInput,
  ): Promise<CurriculumSubjectRecord> {
    if (this.database.provider === "sqlite") {
      this.database.raw
        .prepare(
          `INSERT INTO curriculum_subjects (curriculum_id, subject_id, is_required, is_available, sort_order) VALUES (?, ?, ?, ?, ?) ON CONFLICT(curriculum_id, subject_id) DO UPDATE SET is_required = excluded.is_required, is_available = excluded.is_available, sort_order = excluded.sort_order, updated_at = CURRENT_TIMESTAMP`,
        )
        .run(
          input.curriculumId,
          input.subjectId,
          sqliteBoolean(input.isRequired),
          sqliteBoolean(input.isAvailable),
          input.sortOrder,
        );
      const row = this.database.raw
        .prepare(
          `SELECT curriculum_id, subject_id, is_required, is_available, sort_order, created_at, updated_at FROM curriculum_subjects WHERE curriculum_id = ? AND subject_id = ?`,
        )
        .get(input.curriculumId, input.subjectId) as CurriculumSubjectDbRow | undefined;
      if (!row) throw new NotFoundError("Curriculum subject mapping");
      return mapCurriculumSubject(row);
    }
    const rows = await this.database.raw<
      CurriculumSubjectDbRow[]
    >`INSERT INTO curriculum_subjects (curriculum_id, subject_id, is_required, is_available, sort_order) VALUES (${input.curriculumId}, ${input.subjectId}, ${input.isRequired}, ${input.isAvailable}, ${input.sortOrder}) ON CONFLICT (curriculum_id, subject_id) DO UPDATE SET is_required = EXCLUDED.is_required, is_available = EXCLUDED.is_available, sort_order = EXCLUDED.sort_order, updated_at = NOW() RETURNING curriculum_id, subject_id, is_required, is_available, sort_order, created_at, updated_at`;
    if (!rows[0]) throw new NotFoundError("Curriculum subject mapping");
    return mapCurriculumSubject(rows[0]);
  }

  async listGradeSubjects(
    curriculumId: string,
    gradeId: string,
  ): Promise<readonly GradeSubjectRecord[]> {
    if (this.database.provider === "sqlite") {
      return (
        this.database.raw
          .prepare(
            `SELECT curriculum_id, grade_id, subject_id, is_required, is_available, sort_order, created_at, updated_at FROM grade_subjects WHERE curriculum_id = ? AND grade_id = ? ORDER BY sort_order, subject_id`,
          )
          .all(curriculumId, gradeId) as GradeSubjectDbRow[]
      ).map(mapGradeSubject);
    }
    const rows = await this.database.raw<
      GradeSubjectDbRow[]
    >`SELECT curriculum_id, grade_id, subject_id, is_required, is_available, sort_order, created_at, updated_at FROM grade_subjects WHERE curriculum_id = ${curriculumId} AND grade_id = ${gradeId} ORDER BY sort_order, subject_id`;
    return rows.map(mapGradeSubject);
  }

  async saveGradeSubject(input: GradeSubjectMappingInput): Promise<GradeSubjectRecord> {
    if (this.database.provider === "sqlite") {
      this.database.raw
        .prepare(
          `INSERT INTO grade_subjects (curriculum_id, grade_id, subject_id, is_required, is_available, sort_order) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(curriculum_id, grade_id, subject_id) DO UPDATE SET is_required = excluded.is_required, is_available = excluded.is_available, sort_order = excluded.sort_order, updated_at = CURRENT_TIMESTAMP`,
        )
        .run(
          input.curriculumId,
          input.gradeId,
          input.subjectId,
          sqliteBoolean(input.isRequired),
          sqliteBoolean(input.isAvailable),
          input.sortOrder,
        );
      const row = this.database.raw
        .prepare(
          `SELECT curriculum_id, grade_id, subject_id, is_required, is_available, sort_order, created_at, updated_at FROM grade_subjects WHERE curriculum_id = ? AND grade_id = ? AND subject_id = ?`,
        )
        .get(input.curriculumId, input.gradeId, input.subjectId) as GradeSubjectDbRow | undefined;
      if (!row) throw new NotFoundError("Grade subject mapping");
      return mapGradeSubject(row);
    }
    const rows = await this.database.raw<
      GradeSubjectDbRow[]
    >`INSERT INTO grade_subjects (curriculum_id, grade_id, subject_id, is_required, is_available, sort_order) VALUES (${input.curriculumId}, ${input.gradeId}, ${input.subjectId}, ${input.isRequired}, ${input.isAvailable}, ${input.sortOrder}) ON CONFLICT (curriculum_id, grade_id, subject_id) DO UPDATE SET is_required = EXCLUDED.is_required, is_available = EXCLUDED.is_available, sort_order = EXCLUDED.sort_order, updated_at = NOW() RETURNING curriculum_id, grade_id, subject_id, is_required, is_available, sort_order, created_at, updated_at`;
    if (!rows[0]) throw new NotFoundError("Grade subject mapping");
    return mapGradeSubject(rows[0]);
  }

  async listSubjectDomains(subjectId: string): Promise<readonly SubjectDomainRecord[]> {
    if (this.database.provider === "sqlite") {
      return (
        this.database.raw
          .prepare(
            `SELECT subject_id, domain_id, sort_order, created_at, updated_at FROM subject_domains WHERE subject_id = ? ORDER BY sort_order, domain_id`,
          )
          .all(subjectId) as SubjectDomainDbRow[]
      ).map(mapSubjectDomain);
    }
    const rows = await this.database.raw<
      SubjectDomainDbRow[]
    >`SELECT subject_id, domain_id, sort_order, created_at, updated_at FROM subject_domains WHERE subject_id = ${subjectId} ORDER BY sort_order, domain_id`;
    return rows.map(mapSubjectDomain);
  }

  async saveSubjectDomain(input: SubjectDomainMappingInput): Promise<SubjectDomainRecord> {
    if (this.database.provider === "sqlite") {
      this.database.raw
        .prepare(
          `INSERT INTO subject_domains (subject_id, domain_id, sort_order) VALUES (?, ?, ?) ON CONFLICT(subject_id, domain_id) DO UPDATE SET sort_order = excluded.sort_order, updated_at = CURRENT_TIMESTAMP`,
        )
        .run(input.subjectId, input.domainId, input.sortOrder);
      const row = this.database.raw
        .prepare(
          `SELECT subject_id, domain_id, sort_order, created_at, updated_at FROM subject_domains WHERE subject_id = ? AND domain_id = ?`,
        )
        .get(input.subjectId, input.domainId) as SubjectDomainDbRow | undefined;
      if (!row) throw new NotFoundError("Subject domain mapping");
      return mapSubjectDomain(row);
    }
    const rows = await this.database.raw<
      SubjectDomainDbRow[]
    >`INSERT INTO subject_domains (subject_id, domain_id, sort_order) VALUES (${input.subjectId}, ${input.domainId}, ${input.sortOrder}) ON CONFLICT (subject_id, domain_id) DO UPDATE SET sort_order = EXCLUDED.sort_order, updated_at = NOW() RETURNING subject_id, domain_id, sort_order, created_at, updated_at`;
    if (!rows[0]) throw new NotFoundError("Subject domain mapping");
    return mapSubjectDomain(rows[0]);
  }

  async listGradeSubjectDomains(
    curriculumId: string,
    gradeId: string,
    subjectId: string,
  ): Promise<readonly GradeSubjectDomainRecord[]> {
    if (this.database.provider === "sqlite") {
      return (
        this.database.raw
          .prepare(
            `SELECT curriculum_id, grade_id, subject_id, domain_id, is_required, is_available, depth, sort_order, created_at, updated_at FROM grade_subject_domains WHERE curriculum_id = ? AND grade_id = ? AND subject_id = ? ORDER BY sort_order, domain_id`,
          )
          .all(curriculumId, gradeId, subjectId) as GradeSubjectDomainDbRow[]
      ).map(mapGradeSubjectDomain);
    }
    const rows = await this.database.raw<
      GradeSubjectDomainDbRow[]
    >`SELECT curriculum_id, grade_id, subject_id, domain_id, is_required, is_available, depth, sort_order, created_at, updated_at FROM grade_subject_domains WHERE curriculum_id = ${curriculumId} AND grade_id = ${gradeId} AND subject_id = ${subjectId} ORDER BY sort_order, domain_id`;
    return rows.map(mapGradeSubjectDomain);
  }

  async saveGradeSubjectDomain(
    input: GradeSubjectDomainMappingInput,
  ): Promise<GradeSubjectDomainRecord> {
    if (this.database.provider === "sqlite") {
      this.database.raw
        .prepare(
          `INSERT INTO grade_subject_domains (curriculum_id, grade_id, subject_id, domain_id, is_required, is_available, depth, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(curriculum_id, grade_id, subject_id, domain_id) DO UPDATE SET is_required = excluded.is_required, is_available = excluded.is_available, depth = excluded.depth, sort_order = excluded.sort_order, updated_at = CURRENT_TIMESTAMP`,
        )
        .run(
          input.curriculumId,
          input.gradeId,
          input.subjectId,
          input.domainId,
          sqliteBoolean(input.isRequired),
          sqliteBoolean(input.isAvailable),
          input.depth,
          input.sortOrder,
        );
      const row = this.database.raw
        .prepare(
          `SELECT curriculum_id, grade_id, subject_id, domain_id, is_required, is_available, depth, sort_order, created_at, updated_at FROM grade_subject_domains WHERE curriculum_id = ? AND grade_id = ? AND subject_id = ? AND domain_id = ?`,
        )
        .get(input.curriculumId, input.gradeId, input.subjectId, input.domainId) as
        GradeSubjectDomainDbRow | undefined;
      if (!row) throw new NotFoundError("Grade domain mapping");
      return mapGradeSubjectDomain(row);
    }
    const rows = await this.database.raw<
      GradeSubjectDomainDbRow[]
    >`INSERT INTO grade_subject_domains (curriculum_id, grade_id, subject_id, domain_id, is_required, is_available, depth, sort_order) VALUES (${input.curriculumId}, ${input.gradeId}, ${input.subjectId}, ${input.domainId}, ${input.isRequired}, ${input.isAvailable}, ${input.depth}, ${input.sortOrder}) ON CONFLICT (curriculum_id, grade_id, subject_id, domain_id) DO UPDATE SET is_required = EXCLUDED.is_required, is_available = EXCLUDED.is_available, depth = EXCLUDED.depth, sort_order = EXCLUDED.sort_order, updated_at = NOW() RETURNING curriculum_id, grade_id, subject_id, domain_id, is_required, is_available, depth, sort_order, created_at, updated_at`;
    if (!rows[0]) throw new NotFoundError("Grade domain mapping");
    return mapGradeSubjectDomain(rows[0]);
  }

  async listLearningObjectives(
    options: {
      curriculumId?: string;
      subjectId?: string;
      gradeId?: string;
      includeArchived?: boolean;
    } = {},
  ): Promise<readonly LearningObjectiveRecord[]> {
    const includeArchived = options.includeArchived ?? false;
    let rows: LearningObjectiveDbRow[];
    if (this.database.provider === "sqlite") {
      rows = this.database.raw
        .prepare(
          `${objectiveSelect} ${includeArchived ? "" : "WHERE is_archived = 0"} ORDER BY sort_order, code`,
        )
        .all() as LearningObjectiveDbRow[];
    } else {
      rows = includeArchived
        ? await this.database.raw<
            LearningObjectiveDbRow[]
          >`${this.database.raw.unsafe(objectiveSelect)} ORDER BY sort_order, code`
        : await this.database.raw<
            LearningObjectiveDbRow[]
          >`${this.database.raw.unsafe(objectiveSelect)} WHERE is_archived = FALSE ORDER BY sort_order, code`;
    }
    let objectives = rows.map(mapObjective);
    if (options.curriculumId)
      objectives = objectives.filter(
        (objective) => objective.curriculumId === options.curriculumId,
      );
    if (options.subjectId)
      objectives = objectives.filter((objective) => objective.subjectId === options.subjectId);
    if (options.gradeId && options.curriculumId) {
      const links = await this.listGradeLearningObjectiveIds(options.curriculumId, options.gradeId);
      objectives = objectives.filter((objective) => links.has(objective.id));
    }
    return objectives;
  }

  private async listGradeLearningObjectiveIds(
    curriculumId: string,
    gradeId: string,
  ): Promise<Set<string>> {
    if (this.database.provider === "sqlite") {
      const rows = this.database.raw
        .prepare(
          `SELECT objective_id FROM grade_learning_objectives WHERE curriculum_id = ? AND grade_id = ?`,
        )
        .all(curriculumId, gradeId) as Array<{ objective_id: string }>;
      return new Set(rows.map((row) => row.objective_id));
    }
    const rows = await this.database.raw<
      Array<{ objective_id: string }>
    >`SELECT objective_id FROM grade_learning_objectives WHERE curriculum_id = ${curriculumId} AND grade_id = ${gradeId}`;
    return new Set(rows.map((row) => row.objective_id));
  }

  async getLearningObjective(id: string): Promise<LearningObjectiveRecord | null> {
    if (this.database.provider === "sqlite") {
      const row = this.database.raw.prepare(`${objectiveSelect} WHERE id = ?`).get(id) as
        LearningObjectiveDbRow | undefined;
      return row ? mapObjective(row) : null;
    }
    const rows = await this.database.raw<
      LearningObjectiveDbRow[]
    >`${this.database.raw.unsafe(objectiveSelect)} WHERE id = ${id}`;
    return rows[0] ? mapObjective(rows[0]) : null;
  }

  async createLearningObjective(
    input: CreateLearningObjectiveInput,
  ): Promise<LearningObjectiveRecord> {
    try {
      if (this.database.provider === "sqlite") {
        this.database.raw
          .prepare(
            `INSERT INTO learning_objectives (id, curriculum_id, subject_id, domain_id, code, title, description, difficulty, is_required, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          )
          .run(
            input.id,
            input.curriculumId,
            input.subjectId,
            input.domainId,
            input.code,
            input.title,
            input.description,
            input.difficulty,
            sqliteBoolean(input.isRequired),
            input.sortOrder,
          );
      } else {
        await this.database
          .raw`INSERT INTO learning_objectives (id, curriculum_id, subject_id, domain_id, code, title, description, difficulty, is_required, sort_order) VALUES (${input.id}, ${input.curriculumId}, ${input.subjectId}, ${input.domainId}, ${input.code}, ${input.title}, ${input.description}, ${input.difficulty}, ${input.isRequired}, ${input.sortOrder})`;
      }
    } catch (error) {
      asConflict(error);
    }
    const created = await this.getLearningObjective(input.id);
    if (!created) throw new NotFoundError("Learning objective", input.id);
    return created;
  }

  async updateLearningObjective(
    id: string,
    input: UpdateLearningObjectiveInput,
  ): Promise<LearningObjectiveRecord> {
    try {
      if (this.database.provider === "sqlite") {
        const result = this.database.raw
          .prepare(
            `UPDATE learning_objectives SET subject_id = ?, domain_id = ?, code = ?, title = ?, description = ?, difficulty = ?, is_required = ?, sort_order = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
          )
          .run(
            input.subjectId,
            input.domainId,
            input.code,
            input.title,
            input.description,
            input.difficulty,
            sqliteBoolean(input.isRequired),
            input.sortOrder,
            id,
          );
        if (result.changes === 0) throw new NotFoundError("Learning objective", id);
      } else {
        const rows = await this.database.raw<
          { id: string }[]
        >`UPDATE learning_objectives SET subject_id = ${input.subjectId}, domain_id = ${input.domainId}, code = ${input.code}, title = ${input.title}, description = ${input.description}, difficulty = ${input.difficulty}, is_required = ${input.isRequired}, sort_order = ${input.sortOrder}, updated_at = NOW() WHERE id = ${id} RETURNING id`;
        if (!rows[0]) throw new NotFoundError("Learning objective", id);
      }
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      asConflict(error);
    }
    const updated = await this.getLearningObjective(id);
    if (!updated) throw new NotFoundError("Learning objective", id);
    return updated;
  }

  async archiveLearningObjective(id: string, isArchived: boolean): Promise<void> {
    await this.setArchived("learning_objectives", id, isArchived, "Learning objective");
  }

  async saveGradeLearningObjective(
    input: GradeLearningObjectiveMappingInput,
  ): Promise<GradeLearningObjectiveRecord> {
    if (this.database.provider === "sqlite") {
      this.database.raw
        .prepare(
          `INSERT INTO grade_learning_objectives (curriculum_id, grade_id, objective_id, is_required, sort_order) VALUES (?, ?, ?, ?, ?) ON CONFLICT(curriculum_id, grade_id, objective_id) DO UPDATE SET is_required = excluded.is_required, sort_order = excluded.sort_order, updated_at = CURRENT_TIMESTAMP`,
        )
        .run(
          input.curriculumId,
          input.gradeId,
          input.objectiveId,
          sqliteBoolean(input.isRequired),
          input.sortOrder,
        );
      const row = this.database.raw
        .prepare(
          `SELECT curriculum_id, grade_id, objective_id, is_required, sort_order, created_at, updated_at FROM grade_learning_objectives WHERE curriculum_id = ? AND grade_id = ? AND objective_id = ?`,
        )
        .get(input.curriculumId, input.gradeId, input.objectiveId) as
        GradeLearningObjectiveDbRow | undefined;
      if (!row) throw new NotFoundError("Grade learning objective mapping");
      return mapGradeLearningObjective(row);
    }
    const rows = await this.database.raw<
      GradeLearningObjectiveDbRow[]
    >`INSERT INTO grade_learning_objectives (curriculum_id, grade_id, objective_id, is_required, sort_order) VALUES (${input.curriculumId}, ${input.gradeId}, ${input.objectiveId}, ${input.isRequired}, ${input.sortOrder}) ON CONFLICT (curriculum_id, grade_id, objective_id) DO UPDATE SET is_required = EXCLUDED.is_required, sort_order = EXCLUDED.sort_order, updated_at = NOW() RETURNING curriculum_id, grade_id, objective_id, is_required, sort_order, created_at, updated_at`;
    if (!rows[0]) throw new NotFoundError("Grade learning objective mapping");
    return mapGradeLearningObjective(rows[0]);
  }

  private async setArchived(
    table: string,
    id: string,
    isArchived: boolean,
    resource: string,
  ): Promise<void> {
    if (this.database.provider === "sqlite") {
      const result = this.database.raw
        .prepare(`UPDATE ${table} SET is_archived = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
        .run(sqliteBoolean(isArchived), id);
      if (result.changes === 0) throw new NotFoundError(resource, id);
      return;
    }
    const rows = (await this.database.raw.unsafe(
      `UPDATE ${table} SET is_archived = $1, updated_at = NOW() WHERE id = $2 RETURNING id`,
      [isArchived, id],
    )) as Array<{ id: string }>;
    if (!rows[0]) throw new NotFoundError(resource, id);
  }
}

export function getCurriculumRepository(database?: DatabaseHandle): CurriculumRepository {
  return new SqlCurriculumRepository(database);
}
