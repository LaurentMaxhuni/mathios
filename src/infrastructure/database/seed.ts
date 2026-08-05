import Database from "better-sqlite3";
import postgres from "postgres";
import { env } from "@/lib/env";
import { resolveSqliteFilename } from "@/infrastructure/database/client";
import { runMigrations } from "@/infrastructure/database/migrations";

const foundationSeed = [
  ["installation_name", "Mathios local installation"],
  ["seed_version", "phase-3"],
] as const;

export const roleSeed = [
  [
    "role-learner",
    "learner",
    "Learner",
    "Can access learning content and personal learning settings.",
  ],
  [
    "role-teacher",
    "teacher",
    "Teacher",
    "Can create and publish learning content and view analytics.",
  ],
  [
    "role-content-creator",
    "content-creator",
    "Content creator",
    "Can author and publish learning content.",
  ],
  [
    "role-administrator",
    "administrator",
    "Administrator",
    "Can manage profiles, application settings, and all local capabilities.",
  ],
] as const;

export const permissionSeed = [
  ["permission-view-learning-content", "view_learning_content", "View learning content"],
  ["permission-edit-content", "edit_content", "Edit content"],
  ["permission-publish-content", "publish_content", "Publish content"],
  ["permission-manage-users", "manage_users", "Manage users and roles"],
  ["permission-view-analytics", "view_analytics", "View analytics"],
  [
    "permission-manage-application-settings",
    "manage_application_settings",
    "Manage application settings",
  ],
  ["permission-run-backups", "run_backups", "Run backups"],
  ["permission-restore-backups", "restore_backups", "Restore backups"],
] as const;

export const rolePermissionSeed = {
  learner: ["view_learning_content"],
  teacher: ["view_learning_content", "edit_content", "publish_content", "view_analytics"],
  "content-creator": ["view_learning_content", "edit_content", "publish_content"],
  administrator: permissionSeed.map(([, slug]) => slug),
} as const;

export const curriculumSeed = [
  {
    id: "curriculum-kosovo",
    slug: "kosovo",
    name: "Kosovo Curriculum",
    kind: "kosovo",
    description: "A Kosovo-oriented science progression with grade-aware subject availability.",
    authority: "Mathios reference structure",
    isSystem: true,
  },
  {
    id: "curriculum-international",
    slug: "international",
    name: "International Curriculum",
    kind: "international",
    description: "A flexible international progression for shared science foundations.",
    authority: "Mathios reference structure",
    isSystem: true,
  },
  {
    id: "curriculum-custom",
    slug: "custom",
    name: "Custom Curriculum",
    kind: "custom",
    description: "A blank-but-seeded structure for locally authored learning paths.",
    authority: null,
    isSystem: true,
  },
] as const;

export const gradeSeed = [
  ["grade-6", "grade-6", "Grade 6", "6", "Core lower-secondary foundations.", 6],
  ["grade-7", "grade-7", "Grade 7", "7", "Core lower-secondary progression.", 7],
  ["grade-8", "grade-8", "Grade 8", "8", "Intermediate lower-secondary progression.", 8],
  ["grade-9", "grade-9", "Grade 9", "9", "Upper lower-secondary foundations.", 9],
  ["grade-10", "grade-10", "Grade 10", "10", "Secondary-school subject depth.", 10],
  ["grade-11", "grade-11", "Grade 11", "11", "Advanced secondary-school progression.", 11],
  ["grade-12", "grade-12", "Grade 12", "12", "Final secondary-school progression.", 12],
  [
    "grade-university-foundations",
    "university-foundations",
    "University Foundations",
    "UF",
    "Bridging foundations for university study.",
    13,
  ],
  ["grade-advanced", "advanced", "Advanced", "ADV", "Advanced subject extensions.", 14],
  ["grade-olympiad", "olympiad", "Olympiad", "OLY", "Competition-level extensions.", 15],
] as const;

export const subjectSeed = [
  [
    "subject-mathematics",
    "mathematics",
    "Mathematics",
    "Quantitative reasoning, structure, proof, and mathematical modeling.",
    "sigma",
    "mathematics",
    120,
    1,
  ],
  [
    "subject-physics",
    "physics",
    "Physics",
    "Models of matter, motion, energy, fields, and the universe.",
    "atom",
    "physics",
    100,
    2,
  ],
  [
    "subject-chemistry",
    "chemistry",
    "Chemistry",
    "The structure, properties, and transformations of matter.",
    "flask-conical",
    "chemistry",
    90,
    3,
  ],
  [
    "subject-biology",
    "biology",
    "Biology",
    "Living systems from cells and genes to ecosystems and evolution.",
    "dna",
    "biology",
    90,
    4,
  ],
  [
    "subject-astronomy",
    "astronomy",
    "Astronomy",
    "Observation and physical understanding of the cosmos.",
    "orbit",
    "astronomy",
    60,
    5,
  ],
] as const;

export const domainSeed = [
  [
    "domain-arithmetic",
    "arithmetic",
    "Arithmetic",
    "Number sense, operations, ratios, and estimation.",
    "mathematics",
    1,
  ],
  [
    "domain-algebra",
    "algebra",
    "Algebra",
    "Symbols, equations, patterns, and functions.",
    "mathematics",
    2,
  ],
  [
    "domain-geometry",
    "geometry",
    "Geometry",
    "Shape, space, measurement, and proof.",
    "mathematics",
    3,
  ],
  [
    "domain-trigonometry",
    "trigonometry",
    "Trigonometry",
    "Angles, triangles, and periodic relationships.",
    "mathematics",
    4,
  ],
  [
    "domain-calculus",
    "calculus",
    "Calculus",
    "Change, accumulation, limits, and modeling.",
    "mathematics",
    5,
  ],
  [
    "domain-mechanics",
    "mechanics",
    "Mechanics",
    "Motion, forces, momentum, and energy.",
    "physics",
    1,
  ],
  [
    "domain-waves",
    "waves",
    "Waves",
    "Oscillations, sound, light, and wave behavior.",
    "physics",
    2,
  ],
  [
    "domain-thermodynamics",
    "thermodynamics",
    "Thermodynamics",
    "Temperature, heat, work, and entropy.",
    "physics",
    3,
  ],
  [
    "domain-electricity",
    "electricity",
    "Electricity",
    "Charge, circuits, fields, and potential.",
    "physics",
    4,
  ],
  [
    "domain-modern-physics",
    "modern-physics",
    "Modern Physics",
    "Relativity, quantum ideas, and atomic phenomena.",
    "physics",
    5,
  ],
  [
    "domain-atomic-structure",
    "atomic-structure",
    "Atomic Structure",
    "Atoms, isotopes, electrons, and periodicity.",
    "chemistry",
    1,
  ],
  [
    "domain-stoichiometry",
    "stoichiometry",
    "Stoichiometry",
    "Chemical quantities, ratios, and conservation.",
    "chemistry",
    2,
  ],
  [
    "domain-reactions",
    "reactions",
    "Reactions",
    "Reaction types, equations, and rates.",
    "chemistry",
    3,
  ],
  [
    "domain-acids-bases",
    "acids-bases",
    "Acids and Bases",
    "pH, equilibria, neutralization, and buffers.",
    "chemistry",
    4,
  ],
  [
    "domain-organic-chemistry",
    "organic-chemistry",
    "Organic Chemistry",
    "Carbon compounds, structure, and reactivity.",
    "chemistry",
    5,
  ],
  [
    "domain-cell-biology",
    "cell-biology",
    "Cell Biology",
    "Cell structure, processes, and organization.",
    "biology",
    1,
  ],
  [
    "domain-genetics",
    "genetics",
    "Genetics",
    "Inheritance, variation, and molecular information.",
    "biology",
    2,
  ],
  [
    "domain-ecology",
    "ecology",
    "Ecology",
    "Populations, communities, and ecosystems.",
    "biology",
    3,
  ],
  [
    "domain-anatomy-physiology",
    "anatomy-physiology",
    "Anatomy and Physiology",
    "Body structure and coordinated function.",
    "biology",
    4,
  ],
  [
    "domain-evolution",
    "evolution",
    "Evolution",
    "Change in populations and the history of life.",
    "biology",
    5,
  ],
  [
    "domain-observational-astronomy",
    "observational-astronomy",
    "Observational Astronomy",
    "The sky, coordinates, instruments, and evidence.",
    "astronomy",
    1,
  ],
  [
    "domain-solar-system",
    "solar-system",
    "Solar System",
    "The Sun, planets, moons, and small bodies.",
    "astronomy",
    2,
  ],
  [
    "domain-planetary-science",
    "planetary-science",
    "Planetary Science",
    "Worlds, surfaces, atmospheres, and orbital systems.",
    "astronomy",
    3,
  ],
  [
    "domain-stellar-physics",
    "stellar-physics",
    "Stellar Physics",
    "Stars, spectra, evolution, and compact remnants.",
    "astronomy",
    4,
  ],
  [
    "domain-cosmology",
    "cosmology",
    "Cosmology",
    "Galaxies, expansion, structure, and cosmic history.",
    "astronomy",
    5,
  ],
] as const;

function gradeNumber(slug: string): number | null {
  const match = /^grade-(6|7|8|9|10|11|12)$/.exec(slug);
  return match ? Number(match[1]) : null;
}

function isSpecialGrade(slug: string): boolean {
  return slug === "university-foundations" || slug === "advanced" || slug === "olympiad";
}

function subjectAvailable(subjectSlug: string, gradeSlug: string): boolean {
  const grade = gradeNumber(gradeSlug);
  if (isSpecialGrade(gradeSlug)) return true;
  if (subjectSlug === "mathematics" || subjectSlug === "biology") return true;
  if (subjectSlug === "physics") return grade !== null && grade >= 7;
  if (subjectSlug === "chemistry") return grade !== null && grade >= 8;
  return grade !== null && grade >= 10;
}

function domainAvailable(subjectSlug: string, domainIndex: number, gradeSlug: string): boolean {
  if (isSpecialGrade(gradeSlug)) return true;
  const grade = gradeNumber(gradeSlug) ?? 6;
  const threshold =
    subjectSlug === "mathematics"
      ? [6, 7, 8, 9, 10][domainIndex]
      : subjectSlug === "physics"
        ? [7, 8, 9, 10, 11][domainIndex]
        : subjectSlug === "chemistry"
          ? [8, 8, 9, 10, 11][domainIndex]
          : subjectSlug === "biology"
            ? [6, 8, 7, 7, 10][domainIndex]
            : [6, 6, 7, 10, 11][domainIndex];
  return grade >= threshold;
}

function domainDepth(gradeSlug: string): number {
  if (gradeSlug === "olympiad") return 5;
  if (gradeSlug === "advanced") return 4;
  if (gradeSlug === "university-foundations") return 3;
  const grade = gradeNumber(gradeSlug) ?? 6;
  return Math.min(5, Math.max(1, Math.ceil((grade - 5) / 2)));
}

function seededGradeSlug(id: string): string {
  return gradeSeed.find(([gradeId]) => gradeId === id)?.[1] ?? "grade-6";
}

const curriculumGradeSeed = curriculumSeed.flatMap((curriculum) =>
  gradeSeed.map(([id, slug], sortOrder) => ({
    curriculumId: curriculum.id,
    gradeId: id,
    sortOrder,
    isAvailable: true,
    slug,
  })),
);

const curriculumSubjectSeed = curriculumSeed.flatMap((curriculum) =>
  subjectSeed.map(([subjectId, subjectSlug], sortOrder) => ({
    curriculumId: curriculum.id,
    subjectId,
    sortOrder,
    isRequired: subjectSlug === "mathematics",
    isAvailable: true,
  })),
);

const gradeSubjectSeed = curriculumSeed.flatMap((curriculum) =>
  gradeSeed.flatMap(([gradeId, gradeSlug]) =>
    subjectSeed
      .filter(([, subjectSlug]) => subjectAvailable(subjectSlug, gradeSlug))
      .map(([subjectId, subjectSlug], sortOrder) => ({
        curriculumId: curriculum.id,
        gradeId,
        subjectId,
        subjectSlug,
        isRequired:
          subjectSlug === "mathematics" ||
          (curriculum.kind === "kosovo" && subjectSlug === "biology" && gradeSlug !== "olympiad"),
        isAvailable: true,
        sortOrder,
      })),
  ),
);

const subjectDomainSeed = domainSeed.map(([domainId, , , , subjectSlug, sortOrder]) => ({
  subjectId: subjectSeed.find(([, slug]) => slug === subjectSlug)![0],
  domainId,
  sortOrder,
}));

const gradeSubjectDomainSeed = gradeSubjectSeed.flatMap((mapping) =>
  domainSeed
    .filter(
      ([, , , , subjectSlug, domainIndex]) =>
        subjectSlug === mapping.subjectSlug &&
        domainAvailable(subjectSlug, domainIndex - 1, seededGradeSlug(mapping.gradeId)),
    )
    .map(([domainId, , , , , domainIndex]) => ({
      curriculumId: mapping.curriculumId,
      gradeId: mapping.gradeId,
      subjectId: mapping.subjectId,
      domainId,
      isRequired: mapping.isRequired && domainIndex === 1,
      isAvailable: true,
      depth: domainDepth(seededGradeSlug(mapping.gradeId)),
      sortOrder: domainIndex - 1,
    })),
);

const objectiveGradeSlugs = new Set([
  "grade-6",
  "grade-8",
  "grade-10",
  "grade-12",
  "advanced",
  "olympiad",
]);
const learningObjectiveSeed = gradeSubjectSeed
  .filter((mapping) => objectiveGradeSlugs.has(seededGradeSlug(mapping.gradeId)))
  .map((mapping) => {
    const gradeSlug = seededGradeSlug(mapping.gradeId);
    const firstDomain = gradeSubjectDomainSeed.find(
      (domain) =>
        domain.curriculumId === mapping.curriculumId &&
        domain.gradeId === mapping.gradeId &&
        domain.subjectId === mapping.subjectId,
    );
    const domain = domainSeed.find(([domainId]) => domainId === firstDomain?.domainId);
    const subject = subjectSeed.find(([subjectId]) => subjectId === mapping.subjectId)!;
    const code = `${subject[1].slice(0, 4).toUpperCase()}-${gradeSlug.replace("grade-", "").toUpperCase()}-01`;
    return {
      id: `objective-${mapping.curriculumId.replace("curriculum-", "")}-${mapping.gradeId}-${mapping.subjectId}`,
      curriculumId: mapping.curriculumId,
      subjectId: mapping.subjectId,
      domainId: domain?.[0] ?? null,
      code,
      title: `Build ${domain?.[2] ?? subject[2]} foundations`,
      description: `Describe and apply the central ideas of ${domain?.[2] ?? subject[2]} at the ${gradeSlug.replace("grade-", "")} progression point.`,
      difficulty:
        gradeSlug === "olympiad" || gradeSlug === "advanced"
          ? "challenging"
          : gradeSlug === "grade-6"
            ? "gentle"
            : "balanced",
      isRequired: mapping.isRequired,
      sortOrder: 0,
      gradeId: mapping.gradeId,
    } as const;
  });

export const courseSeed = [
  {
    id: "course-physics-motion",
    slug: "physics-motion",
    title: "Motion in One Dimension",
    description:
      "Build a reliable language for position, velocity, acceleration, and motion graphs.",
    subjectId: "subject-physics",
    difficulty: "balanced",
    estimatedDurationMinutes: 90,
    gradeMinId: "grade-7",
    gradeMaxId: "grade-8",
    courseImage: null,
    isRequired: true,
    status: "published",
    createdByProfileId: null,
  },
  {
    id: "course-astronomy-observation",
    slug: "astronomy-observation",
    title: "Reading the Night Sky",
    description: "A draft course for practicing observation, evidence, and sky coordinates.",
    subjectId: "subject-astronomy",
    difficulty: "gentle",
    estimatedDurationMinutes: 60,
    gradeMinId: "grade-10",
    gradeMaxId: "grade-10",
    courseImage: null,
    isRequired: false,
    status: "draft",
    createdByProfileId: null,
  },
] as const;

export const courseCurriculumSeed = [
  ["course-physics-motion", "curriculum-kosovo"],
  ["course-physics-motion", "curriculum-international"],
  ["course-astronomy-observation", "curriculum-international"],
] as const;

export const courseGradeSeed = [
  ["course-physics-motion", "grade-7", true, 0],
  ["course-physics-motion", "grade-8", true, 1],
  ["course-astronomy-observation", "grade-10", false, 0],
] as const;

export const courseObjectiveSeed = [
  ["course-physics-motion", "objective-kosovo-grade-8-subject-physics", 0],
  ["course-physics-motion", "objective-international-grade-8-subject-physics", 1],
] as const;

export const moduleSeed = [
  {
    id: "module-motion-language",
    courseId: "course-physics-motion",
    title: "The language of motion",
    description: "Move from observations to precise descriptions and graphs.",
    sortOrder: 0,
    estimatedStudyTimeMinutes: 45,
    assessmentReference: "Module knowledge check: motion vocabulary",
  },
  {
    id: "module-motion-models",
    courseId: "course-physics-motion",
    title: "Simple motion models",
    description: "Use formulas and worked examples to predict motion.",
    sortOrder: 1,
    estimatedStudyTimeMinutes: 45,
    assessmentReference: null,
  },
] as const;

export const lessonSeed = [
  {
    id: "lesson-describing-motion",
    moduleId: "module-motion-language",
    slug: "describing-motion",
    title: "Describing motion",
    summary: "Learn how position changes become a measurable story.",
    sortOrder: 0,
    estimatedDurationMinutes: 25,
    status: "published",
    currentVersionNumber: 2,
    publishedVersionId: "lesson-version-describing-motion-1",
    createdByProfileId: null,
  },
  {
    id: "lesson-speed-and-velocity",
    moduleId: "module-motion-language",
    slug: "speed-and-velocity",
    title: "Speed and velocity",
    summary: "A draft lesson contrasting scalar speed with directed velocity.",
    sortOrder: 1,
    estimatedDurationMinutes: 30,
    status: "draft",
    currentVersionNumber: 1,
    publishedVersionId: null,
    createdByProfileId: null,
  },
  {
    id: "lesson-constant-acceleration",
    moduleId: "module-motion-models",
    slug: "constant-acceleration",
    title: "Constant acceleration",
    summary: "Use a compact model to connect velocity, time, and displacement.",
    sortOrder: 0,
    estimatedDurationMinutes: 35,
    status: "published",
    currentVersionNumber: 2,
    publishedVersionId: "lesson-version-constant-acceleration-1",
    createdByProfileId: null,
  },
] as const;

export const sectionSeed = [
  [
    "section-motion-introduction",
    "lesson-describing-motion",
    "introduction",
    "Start with an observation",
    "A careful observation gives physics something to measure.",
    0,
  ],
  [
    "section-motion-formal",
    "lesson-describing-motion",
    "formal-explanation",
    "From position to motion",
    "Translate an everyday description into quantities and graphs.",
    1,
  ],
  [
    "section-motion-example",
    "lesson-describing-motion",
    "worked-example",
    "Worked example",
    "Read a position-time table without losing the units.",
    2,
  ],
  [
    "section-motion-summary",
    "lesson-describing-motion",
    "summary",
    "Summary",
    "Keep the core distinctions close at hand.",
    3,
  ],
  [
    "section-velocity-draft",
    "lesson-speed-and-velocity",
    "introduction",
    "A draft introduction",
    "This section is ready for creator review.",
    0,
  ],
  [
    "section-acceleration-formal",
    "lesson-constant-acceleration",
    "formal-explanation",
    "A compact model",
    "Connect the variables before choosing a formula.",
    0,
  ],
  [
    "section-acceleration-example",
    "lesson-constant-acceleration",
    "worked-example",
    "Worked example",
    "Substitute values and keep track of units.",
    1,
  ],
] as const;

export const blockSeed = [
  [
    "block-motion-observation",
    "section-motion-introduction",
    "paragraph",
    "",
    0,
    {
      text: "A cyclist moving along a straight path changes position as time passes. Physics begins by naming that change precisely.",
    },
  ],
  [
    "block-motion-heading",
    "section-motion-formal",
    "heading",
    "Position, time, and displacement",
    0,
    { level: 3, text: "Position, time, and displacement" },
  ],
  [
    "block-motion-markdown",
    "section-motion-formal",
    "markdown",
    "",
    1,
    {
      markdown:
        "Position tells us where an object is. Displacement compares the final and initial positions, including direction.",
    },
  ],
  [
    "block-motion-definition",
    "section-motion-formal",
    "definition",
    "Displacement",
    2,
    {
      term: "Displacement",
      definition: "The change in position, with a sign that records direction.",
    },
  ],
  [
    "block-motion-example",
    "section-motion-example",
    "example",
    "Reading a table",
    0,
    {
      prompt:
        "If position changes from 2 m to 8 m, the displacement is 6 m in the positive direction.",
      steps: [
        "Identify final and initial position.",
        "Subtract initial from final.",
        "Attach the unit and direction.",
      ],
    },
  ],
  [
    "block-motion-formula",
    "section-motion-example",
    "formula",
    "Displacement",
    1,
    {
      latex: "\\Delta x = x_f - x_i",
      accessibleLabel: "Delta x equals final position minus initial position",
      display: "block",
    },
  ],
  [
    "block-motion-summary",
    "section-motion-summary",
    "callout",
    "Remember",
    0,
    { tone: "success", text: "A graph is a model of measurements, not the motion itself." },
  ],
  [
    "block-velocity-draft",
    "section-velocity-draft",
    "paragraph",
    "",
    0,
    { text: "Draft content: explain why direction matters before publishing." },
  ],
  [
    "block-acceleration-formula",
    "section-acceleration-formal",
    "formula",
    "Constant acceleration",
    0,
    {
      latex: "v = v_0 + at",
      accessibleLabel: "Final velocity equals initial velocity plus acceleration times time",
      display: "block",
    },
  ],
  [
    "block-acceleration-example",
    "section-acceleration-example",
    "example",
    "A 2-second prediction",
    0,
    {
      prompt: "Starting from rest with a = 3 m/s^2 for 2 s gives v = 6 m/s.",
      steps: [
        "Write the known values.",
        "Substitute into v = v_0 + at.",
        "Check that the unit is m/s.",
      ],
    },
  ],
] as const;

export const lessonObjectiveSeed = [
  ["lesson-describing-motion", "objective-kosovo-grade-8-subject-physics", 0],
  ["lesson-constant-acceleration", "objective-kosovo-grade-8-subject-physics", 0],
] as const;

function lessonSnapshot(lessonId: string) {
  const lesson = lessonSeed.find((item) => item.id === lessonId)!;
  return {
    lesson: {
      id: lesson.id,
      slug: lesson.slug,
      title: lesson.title,
      summary: lesson.summary,
      estimatedDurationMinutes: lesson.estimatedDurationMinutes,
    },
    sections: sectionSeed
      .filter((section) => section[1] === lessonId)
      .map((section) => ({
        section: {
          id: section[0],
          lessonId,
          kind: section[2],
          title: section[3],
          description: section[4],
          sortOrder: section[5],
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
        },
        blocks: blockSeed
          .filter((block) => block[1] === section[0])
          .map((block) => ({
            id: block[0],
            sectionId: section[0],
            type: block[2],
            title: block[3] || null,
            sortOrder: block[4],
            payload: block[5],
            createdAt: "2026-01-01T00:00:00.000Z",
            updatedAt: "2026-01-01T00:00:00.000Z",
          })),
      })),
    assets: [],
    objectiveIds: lessonObjectiveSeed.filter((item) => item[0] === lessonId).map((item) => item[1]),
  };
}

export const lessonVersionSeed = lessonSeed.flatMap((lesson) => [
  {
    id: `lesson-version-${lesson.id.replace("lesson-", "")}-1`,
    lessonId: lesson.id,
    versionNumber: 1,
    status: lesson.status === "published" ? "published" : "draft",
    changeSummary: lesson.status === "published" ? "Initial published lesson" : "Initial draft",
    snapshot: lessonSnapshot(lesson.id),
    createdByProfileId: null,
    publishedAt: lesson.status === "published" ? "2026-01-01T00:00:00.000Z" : null,
  },
  ...(lesson.status === "published"
    ? [
        {
          id: `lesson-version-${lesson.id.replace("lesson-", "")}-2`,
          lessonId: lesson.id,
          versionNumber: 2,
          status: "draft",
          changeSummary: "Draft workspace after publishing",
          snapshot: lessonSnapshot(lesson.id),
          createdByProfileId: null,
          publishedAt: null,
        },
      ]
    : []),
]);

export async function runSeed(
  options: { provider?: "sqlite" | "postgres"; databaseUrl?: string } = {},
): Promise<void> {
  const provider = options.provider ?? env.DATABASE_PROVIDER;
  const databaseUrl = options.databaseUrl ?? env.DATABASE_URL;
  await runMigrations({ provider, databaseUrl });

  if (provider === "sqlite") {
    const database = new Database(resolveSqliteFilename(databaseUrl));
    try {
      database.pragma("foreign_keys = ON");
      const statement = database.prepare(`
        INSERT INTO app_metadata (key, value, updated_at)
        VALUES (@key, @value, CURRENT_TIMESTAMP)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
      `);
      const insert = database.transaction(() => {
        for (const [key, value] of foundationSeed) statement.run({ key, value });
      });
      insert();

      const insertRole = database.prepare(`
        INSERT INTO roles (id, slug, name, description, is_system)
        VALUES (@id, @slug, @name, @description, 1)
        ON CONFLICT(slug) DO UPDATE SET name = excluded.name, description = excluded.description, updated_at = CURRENT_TIMESTAMP
      `);
      const insertPermission = database.prepare(`
        INSERT INTO permissions (id, slug, name, description)
        VALUES (@id, @slug, @name, @description)
        ON CONFLICT(slug) DO UPDATE SET name = excluded.name, description = excluded.description, updated_at = CURRENT_TIMESTAMP
      `);
      const insertRolePermission = database.prepare(`
        INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
        SELECT roles.id, permissions.id
        FROM roles, permissions
        WHERE roles.slug = @roleSlug AND permissions.slug = @permissionSlug
      `);
      const insertCatalog = database.transaction(() => {
        for (const [id, slug, name, description] of roleSeed) {
          insertRole.run({ id, slug, name, description });
        }
        for (const [id, slug, name] of permissionSeed) {
          insertPermission.run({ id, slug, name, description: name });
        }
        for (const [roleSlug, permissions] of Object.entries(rolePermissionSeed)) {
          for (const permissionSlug of permissions) {
            insertRolePermission.run({ roleSlug, permissionSlug });
          }
        }
      });
      insertCatalog();

      const insertCurriculum = database.prepare(`
        INSERT INTO curricula (id, slug, name, kind, description, authority, is_system, is_archived)
        VALUES (@id, @slug, @name, @kind, @description, @authority, @isSystem, 0)
        ON CONFLICT(id) DO UPDATE SET slug = excluded.slug, name = excluded.name, kind = excluded.kind,
          description = excluded.description, authority = excluded.authority, is_system = excluded.is_system,
          is_archived = 0, updated_at = CURRENT_TIMESTAMP
      `);
      const insertGrade = database.prepare(`
        INSERT INTO grades (id, slug, name, short_name, description, sort_order, is_archived)
        VALUES (@id, @slug, @name, @shortName, @description, @sortOrder, 0)
        ON CONFLICT(id) DO UPDATE SET slug = excluded.slug, name = excluded.name, short_name = excluded.short_name,
          description = excluded.description, sort_order = excluded.sort_order, is_archived = 0, updated_at = CURRENT_TIMESTAMP
      `);
      const insertSubject = database.prepare(`
        INSERT INTO subjects (id, slug, name, description, icon, accent, recommended_study_hours, sort_order, is_archived)
        VALUES (@id, @slug, @name, @description, @icon, @accent, @recommendedStudyHours, @sortOrder, 0)
        ON CONFLICT(id) DO UPDATE SET slug = excluded.slug, name = excluded.name, description = excluded.description,
          icon = excluded.icon, accent = excluded.accent, recommended_study_hours = excluded.recommended_study_hours,
          sort_order = excluded.sort_order, is_archived = 0, updated_at = CURRENT_TIMESTAMP
      `);
      const insertDomain = database.prepare(`
        INSERT INTO domains (id, slug, name, description, sort_order, is_archived)
        VALUES (@id, @slug, @name, @description, @sortOrder, 0)
        ON CONFLICT(id) DO UPDATE SET slug = excluded.slug, name = excluded.name, description = excluded.description,
          sort_order = excluded.sort_order, is_archived = 0, updated_at = CURRENT_TIMESTAMP
      `);
      const insertCurriculumGrade = database.prepare(`
        INSERT INTO curriculum_grades (curriculum_id, grade_id, sort_order, is_available)
        VALUES (@curriculumId, @gradeId, @sortOrder, @isAvailable)
        ON CONFLICT(curriculum_id, grade_id) DO UPDATE SET sort_order = excluded.sort_order,
          is_available = excluded.is_available, updated_at = CURRENT_TIMESTAMP
      `);
      const insertCurriculumSubject = database.prepare(`
        INSERT INTO curriculum_subjects (curriculum_id, subject_id, is_required, is_available, sort_order)
        VALUES (@curriculumId, @subjectId, @isRequired, @isAvailable, @sortOrder)
        ON CONFLICT(curriculum_id, subject_id) DO UPDATE SET is_required = excluded.is_required,
          is_available = excluded.is_available, sort_order = excluded.sort_order, updated_at = CURRENT_TIMESTAMP
      `);
      const insertGradeSubject = database.prepare(`
        INSERT INTO grade_subjects (curriculum_id, grade_id, subject_id, is_required, is_available, sort_order)
        VALUES (@curriculumId, @gradeId, @subjectId, @isRequired, @isAvailable, @sortOrder)
        ON CONFLICT(curriculum_id, grade_id, subject_id) DO UPDATE SET is_required = excluded.is_required,
          is_available = excluded.is_available, sort_order = excluded.sort_order, updated_at = CURRENT_TIMESTAMP
      `);
      const insertSubjectDomain = database.prepare(`
        INSERT INTO subject_domains (subject_id, domain_id, sort_order)
        VALUES (@subjectId, @domainId, @sortOrder)
        ON CONFLICT(subject_id, domain_id) DO UPDATE SET sort_order = excluded.sort_order, updated_at = CURRENT_TIMESTAMP
      `);
      const insertGradeSubjectDomain = database.prepare(`
        INSERT INTO grade_subject_domains (curriculum_id, grade_id, subject_id, domain_id, is_required, is_available, depth, sort_order)
        VALUES (@curriculumId, @gradeId, @subjectId, @domainId, @isRequired, @isAvailable, @depth, @sortOrder)
        ON CONFLICT(curriculum_id, grade_id, subject_id, domain_id) DO UPDATE SET is_required = excluded.is_required,
          is_available = excluded.is_available, depth = excluded.depth, sort_order = excluded.sort_order,
          updated_at = CURRENT_TIMESTAMP
      `);
      const insertObjective = database.prepare(`
        INSERT INTO learning_objectives (id, curriculum_id, subject_id, domain_id, code, title, description, difficulty, is_required, sort_order, is_archived)
        VALUES (@id, @curriculumId, @subjectId, @domainId, @code, @title, @description, @difficulty, @isRequired, @sortOrder, 0)
        ON CONFLICT(id) DO UPDATE SET curriculum_id = excluded.curriculum_id, subject_id = excluded.subject_id,
          domain_id = excluded.domain_id, code = excluded.code, title = excluded.title, description = excluded.description,
          difficulty = excluded.difficulty, is_required = excluded.is_required, sort_order = excluded.sort_order,
          is_archived = 0, updated_at = CURRENT_TIMESTAMP
      `);
      const insertGradeObjective = database.prepare(`
        INSERT INTO grade_learning_objectives (curriculum_id, grade_id, objective_id, is_required, sort_order)
        VALUES (@curriculumId, @gradeId, @objectiveId, @isRequired, @sortOrder)
        ON CONFLICT(curriculum_id, grade_id, objective_id) DO UPDATE SET is_required = excluded.is_required,
          sort_order = excluded.sort_order, updated_at = CURRENT_TIMESTAMP
      `);
      const insertCourse = database.prepare(`
        INSERT INTO courses (id, slug, title, description, subject_id, difficulty, estimated_duration_minutes, grade_min_id, grade_max_id, course_image, is_required, status, created_by_profile_id)
        VALUES (@id, @slug, @title, @description, @subjectId, @difficulty, @estimatedDurationMinutes, @gradeMinId, @gradeMaxId, @courseImage, @isRequired, @status, @createdByProfileId)
        ON CONFLICT(id) DO UPDATE SET slug = excluded.slug, title = excluded.title, description = excluded.description,
          subject_id = excluded.subject_id, difficulty = excluded.difficulty, estimated_duration_minutes = excluded.estimated_duration_minutes,
          grade_min_id = excluded.grade_min_id, grade_max_id = excluded.grade_max_id, course_image = excluded.course_image,
          is_required = excluded.is_required, status = excluded.status, updated_at = CURRENT_TIMESTAMP
      `);
      const insertCourseCurriculum = database.prepare(`
        INSERT OR IGNORE INTO course_curricula (course_id, curriculum_id) VALUES (@courseId, @curriculumId)
      `);
      const insertCourseGrade = database.prepare(`
        INSERT INTO course_grades (course_id, grade_id, is_required, sort_order)
        VALUES (@courseId, @gradeId, @isRequired, @sortOrder)
        ON CONFLICT(course_id, grade_id) DO UPDATE SET is_required = excluded.is_required, sort_order = excluded.sort_order
      `);
      const insertCourseObjective = database.prepare(`
        INSERT INTO course_learning_objectives (course_id, objective_id, sort_order)
        VALUES (@courseId, @objectiveId, @sortOrder)
        ON CONFLICT(course_id, objective_id) DO UPDATE SET sort_order = excluded.sort_order
      `);
      const insertModule = database.prepare(`
        INSERT INTO modules (id, course_id, title, description, sort_order, estimated_study_time_minutes, assessment_reference, is_archived)
        VALUES (@id, @courseId, @title, @description, @sortOrder, @estimatedStudyTimeMinutes, @assessmentReference, 0)
        ON CONFLICT(id) DO UPDATE SET course_id = excluded.course_id, title = excluded.title, description = excluded.description,
          sort_order = excluded.sort_order, estimated_study_time_minutes = excluded.estimated_study_time_minutes,
          assessment_reference = excluded.assessment_reference, is_archived = 0, updated_at = CURRENT_TIMESTAMP
      `);
      const insertLesson = database.prepare(`
        INSERT INTO lessons (id, module_id, slug, title, summary, sort_order, estimated_duration_minutes, status, current_version_number, published_version_id, created_by_profile_id)
        VALUES (@id, @moduleId, @slug, @title, @summary, @sortOrder, @estimatedDurationMinutes, @status, @currentVersionNumber, @publishedVersionId, @createdByProfileId)
        ON CONFLICT(id) DO UPDATE SET module_id = excluded.module_id, slug = excluded.slug, title = excluded.title,
          summary = excluded.summary, sort_order = excluded.sort_order, estimated_duration_minutes = excluded.estimated_duration_minutes,
          status = excluded.status, current_version_number = excluded.current_version_number, published_version_id = excluded.published_version_id,
          updated_at = CURRENT_TIMESTAMP
      `);
      const insertSection = database.prepare(`
        INSERT INTO lesson_sections (id, lesson_id, kind, title, description, sort_order)
        VALUES (@id, @lessonId, @kind, @title, @description, @sortOrder)
        ON CONFLICT(id) DO UPDATE SET lesson_id = excluded.lesson_id, kind = excluded.kind, title = excluded.title,
          description = excluded.description, sort_order = excluded.sort_order, updated_at = CURRENT_TIMESTAMP
      `);
      const insertBlock = database.prepare(`
        INSERT INTO lesson_blocks (id, section_id, type, title, sort_order, payload)
        VALUES (@id, @sectionId, @type, @title, @sortOrder, @payload)
        ON CONFLICT(id) DO UPDATE SET section_id = excluded.section_id, type = excluded.type, title = excluded.title,
          sort_order = excluded.sort_order, payload = excluded.payload, updated_at = CURRENT_TIMESTAMP
      `);
      const insertLessonObjective = database.prepare(`
        INSERT INTO lesson_learning_objectives (lesson_id, objective_id, sort_order)
        VALUES (@lessonId, @objectiveId, @sortOrder)
        ON CONFLICT(lesson_id, objective_id) DO UPDATE SET sort_order = excluded.sort_order
      `);
      const insertLessonVersion = database.prepare(`
        INSERT INTO lesson_versions (id, lesson_id, version_number, status, change_summary, snapshot, created_by_profile_id, published_at)
        VALUES (@id, @lessonId, @versionNumber, @status, @changeSummary, @snapshot, @createdByProfileId, @publishedAt)
        ON CONFLICT(id) DO UPDATE SET lesson_id = excluded.lesson_id, version_number = excluded.version_number,
          status = excluded.status, change_summary = excluded.change_summary, snapshot = excluded.snapshot,
          created_by_profile_id = excluded.created_by_profile_id, published_at = excluded.published_at
      `);
      const seedStructure = database.transaction(() => {
        for (const curriculum of curriculumSeed)
          insertCurriculum.run({ ...curriculum, isSystem: curriculum.isSystem ? 1 : 0 });
        for (const [id, slug, name, shortName, description, sortOrder] of gradeSeed)
          insertGrade.run({ id, slug, name, shortName, description, sortOrder });
        for (const [
          id,
          slug,
          name,
          description,
          icon,
          accent,
          recommendedStudyHours,
          sortOrder,
        ] of subjectSeed)
          insertSubject.run({
            id,
            slug,
            name,
            description,
            icon,
            accent,
            recommendedStudyHours,
            sortOrder,
          });
        for (const [id, slug, name, description, , sortOrder] of domainSeed)
          insertDomain.run({ id, slug, name, description, sortOrder });
        for (const mapping of curriculumGradeSeed)
          insertCurriculumGrade.run({ ...mapping, isAvailable: mapping.isAvailable ? 1 : 0 });
        for (const mapping of curriculumSubjectSeed)
          insertCurriculumSubject.run({
            ...mapping,
            isRequired: mapping.isRequired ? 1 : 0,
            isAvailable: mapping.isAvailable ? 1 : 0,
          });
        for (const mapping of gradeSubjectSeed)
          insertGradeSubject.run({
            ...mapping,
            isRequired: mapping.isRequired ? 1 : 0,
            isAvailable: mapping.isAvailable ? 1 : 0,
          });
        for (const mapping of subjectDomainSeed) insertSubjectDomain.run(mapping);
        for (const mapping of gradeSubjectDomainSeed)
          insertGradeSubjectDomain.run({
            ...mapping,
            isRequired: mapping.isRequired ? 1 : 0,
            isAvailable: mapping.isAvailable ? 1 : 0,
          });
        for (const objective of learningObjectiveSeed) {
          insertObjective.run({ ...objective, isRequired: objective.isRequired ? 1 : 0 });
          insertGradeObjective.run({
            curriculumId: objective.curriculumId,
            gradeId: objective.gradeId,
            objectiveId: objective.id,
            isRequired: objective.isRequired ? 1 : 0,
            sortOrder: objective.sortOrder,
          });
        }
        for (const course of courseSeed) {
          insertCourse.run({
            ...course,
            isRequired: course.isRequired ? 1 : 0,
          });
        }
        for (const [courseId, curriculumId] of courseCurriculumSeed)
          insertCourseCurriculum.run({ courseId, curriculumId });
        for (const [courseId, gradeId, isRequired, sortOrder] of courseGradeSeed)
          insertCourseGrade.run({ courseId, gradeId, isRequired: isRequired ? 1 : 0, sortOrder });
        for (const [courseId, objectiveId, sortOrder] of courseObjectiveSeed)
          insertCourseObjective.run({ courseId, objectiveId, sortOrder });
        for (const courseModule of moduleSeed) insertModule.run(courseModule);
        for (const lesson of lessonSeed) insertLesson.run(lesson);
        for (const [id, lessonId, kind, title, description, sortOrder] of sectionSeed)
          insertSection.run({ id, lessonId, kind, title, description, sortOrder });
        for (const [id, sectionId, type, title, sortOrder, payload] of blockSeed)
          insertBlock.run({
            id,
            sectionId,
            type,
            title: title || null,
            sortOrder,
            payload: JSON.stringify(payload),
          });
        for (const [lessonId, objectiveId, sortOrder] of lessonObjectiveSeed)
          insertLessonObjective.run({ lessonId, objectiveId, sortOrder });
        for (const version of lessonVersionSeed)
          insertLessonVersion.run({
            ...version,
            snapshot: JSON.stringify(version.snapshot),
          });
      });
      seedStructure();
    } finally {
      database.close();
    }
    return;
  }

  const database = postgres(databaseUrl, { max: 1, connect_timeout: 10 });
  try {
    await database.begin(async (transaction) => {
      for (const [key, value] of foundationSeed) {
        await transaction`
          INSERT INTO app_metadata (key, value, updated_at)
          VALUES (${key}, ${value}, NOW())
          ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
        `;
      }
      for (const [id, slug, name, description] of roleSeed) {
        await transaction`
          INSERT INTO roles (id, slug, name, description, is_system)
          VALUES (${id}, ${slug}, ${name}, ${description}, TRUE)
          ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, updated_at = NOW()
        `;
      }
      for (const [id, slug, name] of permissionSeed) {
        await transaction`
          INSERT INTO permissions (id, slug, name, description)
          VALUES (${id}, ${slug}, ${name}, ${name})
          ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, updated_at = NOW()
        `;
      }
      for (const [roleSlug, permissions] of Object.entries(rolePermissionSeed)) {
        for (const permissionSlug of permissions) {
          await transaction`
            INSERT INTO role_permissions (role_id, permission_id)
            SELECT roles.id, permissions.id
            FROM roles, permissions
            WHERE roles.slug = ${roleSlug} AND permissions.slug = ${permissionSlug}
            ON CONFLICT DO NOTHING
          `;
        }
      }
      for (const curriculum of curriculumSeed) {
        await transaction`
          INSERT INTO curricula (id, slug, name, kind, description, authority, is_system, is_archived)
          VALUES (${curriculum.id}, ${curriculum.slug}, ${curriculum.name}, ${curriculum.kind}, ${curriculum.description}, ${curriculum.authority}, ${curriculum.isSystem}, FALSE)
          ON CONFLICT (id) DO UPDATE SET slug = EXCLUDED.slug, name = EXCLUDED.name, kind = EXCLUDED.kind,
            description = EXCLUDED.description, authority = EXCLUDED.authority, is_system = EXCLUDED.is_system,
            is_archived = FALSE, updated_at = NOW()
        `;
      }
      for (const [id, slug, name, shortName, description, sortOrder] of gradeSeed) {
        await transaction`
          INSERT INTO grades (id, slug, name, short_name, description, sort_order, is_archived)
          VALUES (${id}, ${slug}, ${name}, ${shortName}, ${description}, ${sortOrder}, FALSE)
          ON CONFLICT (id) DO UPDATE SET slug = EXCLUDED.slug, name = EXCLUDED.name, short_name = EXCLUDED.short_name,
            description = EXCLUDED.description, sort_order = EXCLUDED.sort_order, is_archived = FALSE, updated_at = NOW()
        `;
      }
      for (const [
        id,
        slug,
        name,
        description,
        icon,
        accent,
        recommendedStudyHours,
        sortOrder,
      ] of subjectSeed) {
        await transaction`
          INSERT INTO subjects (id, slug, name, description, icon, accent, recommended_study_hours, sort_order, is_archived)
          VALUES (${id}, ${slug}, ${name}, ${description}, ${icon}, ${accent}, ${recommendedStudyHours}, ${sortOrder}, FALSE)
          ON CONFLICT (id) DO UPDATE SET slug = EXCLUDED.slug, name = EXCLUDED.name, description = EXCLUDED.description,
            icon = EXCLUDED.icon, accent = EXCLUDED.accent, recommended_study_hours = EXCLUDED.recommended_study_hours,
            sort_order = EXCLUDED.sort_order, is_archived = FALSE, updated_at = NOW()
        `;
      }
      for (const [id, slug, name, description, , sortOrder] of domainSeed) {
        await transaction`
          INSERT INTO domains (id, slug, name, description, sort_order, is_archived)
          VALUES (${id}, ${slug}, ${name}, ${description}, ${sortOrder}, FALSE)
          ON CONFLICT (id) DO UPDATE SET slug = EXCLUDED.slug, name = EXCLUDED.name, description = EXCLUDED.description,
            sort_order = EXCLUDED.sort_order, is_archived = FALSE, updated_at = NOW()
        `;
      }
      for (const mapping of curriculumGradeSeed) {
        await transaction`
          INSERT INTO curriculum_grades (curriculum_id, grade_id, sort_order, is_available)
          VALUES (${mapping.curriculumId}, ${mapping.gradeId}, ${mapping.sortOrder}, ${mapping.isAvailable})
          ON CONFLICT (curriculum_id, grade_id) DO UPDATE SET sort_order = EXCLUDED.sort_order,
            is_available = EXCLUDED.is_available, updated_at = NOW()
        `;
      }
      for (const mapping of curriculumSubjectSeed) {
        await transaction`
          INSERT INTO curriculum_subjects (curriculum_id, subject_id, is_required, is_available, sort_order)
          VALUES (${mapping.curriculumId}, ${mapping.subjectId}, ${mapping.isRequired}, ${mapping.isAvailable}, ${mapping.sortOrder})
          ON CONFLICT (curriculum_id, subject_id) DO UPDATE SET is_required = EXCLUDED.is_required,
            is_available = EXCLUDED.is_available, sort_order = EXCLUDED.sort_order, updated_at = NOW()
        `;
      }
      for (const mapping of gradeSubjectSeed) {
        await transaction`
          INSERT INTO grade_subjects (curriculum_id, grade_id, subject_id, is_required, is_available, sort_order)
          VALUES (${mapping.curriculumId}, ${mapping.gradeId}, ${mapping.subjectId}, ${mapping.isRequired}, ${mapping.isAvailable}, ${mapping.sortOrder})
          ON CONFLICT (curriculum_id, grade_id, subject_id) DO UPDATE SET is_required = EXCLUDED.is_required,
            is_available = EXCLUDED.is_available, sort_order = EXCLUDED.sort_order, updated_at = NOW()
        `;
      }
      for (const mapping of subjectDomainSeed) {
        await transaction`
          INSERT INTO subject_domains (subject_id, domain_id, sort_order)
          VALUES (${mapping.subjectId}, ${mapping.domainId}, ${mapping.sortOrder})
          ON CONFLICT (subject_id, domain_id) DO UPDATE SET sort_order = EXCLUDED.sort_order, updated_at = NOW()
        `;
      }
      for (const mapping of gradeSubjectDomainSeed) {
        await transaction`
          INSERT INTO grade_subject_domains (curriculum_id, grade_id, subject_id, domain_id, is_required, is_available, depth, sort_order)
          VALUES (${mapping.curriculumId}, ${mapping.gradeId}, ${mapping.subjectId}, ${mapping.domainId}, ${mapping.isRequired}, ${mapping.isAvailable}, ${mapping.depth}, ${mapping.sortOrder})
          ON CONFLICT (curriculum_id, grade_id, subject_id, domain_id) DO UPDATE SET is_required = EXCLUDED.is_required,
            is_available = EXCLUDED.is_available, depth = EXCLUDED.depth, sort_order = EXCLUDED.sort_order, updated_at = NOW()
        `;
      }
      for (const objective of learningObjectiveSeed) {
        await transaction`
          INSERT INTO learning_objectives (id, curriculum_id, subject_id, domain_id, code, title, description, difficulty, is_required, sort_order, is_archived)
          VALUES (${objective.id}, ${objective.curriculumId}, ${objective.subjectId}, ${objective.domainId}, ${objective.code}, ${objective.title}, ${objective.description}, ${objective.difficulty}, ${objective.isRequired}, ${objective.sortOrder}, FALSE)
          ON CONFLICT (id) DO UPDATE SET curriculum_id = EXCLUDED.curriculum_id, subject_id = EXCLUDED.subject_id,
            domain_id = EXCLUDED.domain_id, code = EXCLUDED.code, title = EXCLUDED.title, description = EXCLUDED.description,
            difficulty = EXCLUDED.difficulty, is_required = EXCLUDED.is_required, sort_order = EXCLUDED.sort_order,
            is_archived = FALSE, updated_at = NOW()
        `;
        await transaction`
          INSERT INTO grade_learning_objectives (curriculum_id, grade_id, objective_id, is_required, sort_order)
          VALUES (${objective.curriculumId}, ${objective.gradeId}, ${objective.id}, ${objective.isRequired}, ${objective.sortOrder})
          ON CONFLICT (curriculum_id, grade_id, objective_id) DO UPDATE SET is_required = EXCLUDED.is_required,
            sort_order = EXCLUDED.sort_order, updated_at = NOW()
        `;
      }
      for (const course of courseSeed) {
        await transaction`
          INSERT INTO courses (id, slug, title, description, subject_id, difficulty, estimated_duration_minutes, grade_min_id, grade_max_id, course_image, is_required, status, created_by_profile_id)
          VALUES (${course.id}, ${course.slug}, ${course.title}, ${course.description}, ${course.subjectId}, ${course.difficulty}, ${course.estimatedDurationMinutes}, ${course.gradeMinId}, ${course.gradeMaxId}, ${course.courseImage}, ${course.isRequired}, ${course.status}, ${course.createdByProfileId})
          ON CONFLICT (id) DO UPDATE SET slug = EXCLUDED.slug, title = EXCLUDED.title, description = EXCLUDED.description,
            subject_id = EXCLUDED.subject_id, difficulty = EXCLUDED.difficulty, estimated_duration_minutes = EXCLUDED.estimated_duration_minutes,
            grade_min_id = EXCLUDED.grade_min_id, grade_max_id = EXCLUDED.grade_max_id, course_image = EXCLUDED.course_image,
            is_required = EXCLUDED.is_required, status = EXCLUDED.status, updated_at = NOW()
        `;
      }
      for (const [courseId, curriculumId] of courseCurriculumSeed) {
        await transaction`
          INSERT INTO course_curricula (course_id, curriculum_id)
          VALUES (${courseId}, ${curriculumId}) ON CONFLICT DO NOTHING
        `;
      }
      for (const [courseId, gradeId, isRequired, sortOrder] of courseGradeSeed) {
        await transaction`
          INSERT INTO course_grades (course_id, grade_id, is_required, sort_order)
          VALUES (${courseId}, ${gradeId}, ${isRequired}, ${sortOrder})
          ON CONFLICT (course_id, grade_id) DO UPDATE SET is_required = EXCLUDED.is_required, sort_order = EXCLUDED.sort_order
        `;
      }
      for (const [courseId, objectiveId, sortOrder] of courseObjectiveSeed) {
        await transaction`
          INSERT INTO course_learning_objectives (course_id, objective_id, sort_order)
          VALUES (${courseId}, ${objectiveId}, ${sortOrder})
          ON CONFLICT (course_id, objective_id) DO UPDATE SET sort_order = EXCLUDED.sort_order
        `;
      }
      for (const courseModule of moduleSeed) {
        await transaction`
          INSERT INTO modules (id, course_id, title, description, sort_order, estimated_study_time_minutes, assessment_reference, is_archived)
          VALUES (${courseModule.id}, ${courseModule.courseId}, ${courseModule.title}, ${courseModule.description}, ${courseModule.sortOrder}, ${courseModule.estimatedStudyTimeMinutes}, ${courseModule.assessmentReference}, FALSE)
          ON CONFLICT (id) DO UPDATE SET course_id = EXCLUDED.course_id, title = EXCLUDED.title, description = EXCLUDED.description,
            sort_order = EXCLUDED.sort_order, estimated_study_time_minutes = EXCLUDED.estimated_study_time_minutes,
            assessment_reference = EXCLUDED.assessment_reference, is_archived = FALSE, updated_at = NOW()
        `;
      }
      for (const lesson of lessonSeed) {
        await transaction`
          INSERT INTO lessons (id, module_id, slug, title, summary, sort_order, estimated_duration_minutes, status, current_version_number, published_version_id, created_by_profile_id)
          VALUES (${lesson.id}, ${lesson.moduleId}, ${lesson.slug}, ${lesson.title}, ${lesson.summary}, ${lesson.sortOrder}, ${lesson.estimatedDurationMinutes}, ${lesson.status}, ${lesson.currentVersionNumber}, ${lesson.publishedVersionId}, ${lesson.createdByProfileId})
          ON CONFLICT (id) DO UPDATE SET module_id = EXCLUDED.module_id, slug = EXCLUDED.slug, title = EXCLUDED.title,
            summary = EXCLUDED.summary, sort_order = EXCLUDED.sort_order, estimated_duration_minutes = EXCLUDED.estimated_duration_minutes,
            status = EXCLUDED.status, current_version_number = EXCLUDED.current_version_number, published_version_id = EXCLUDED.published_version_id,
            updated_at = NOW()
        `;
      }
      for (const [id, lessonId, kind, title, description, sortOrder] of sectionSeed) {
        await transaction`
          INSERT INTO lesson_sections (id, lesson_id, kind, title, description, sort_order)
          VALUES (${id}, ${lessonId}, ${kind}, ${title}, ${description}, ${sortOrder})
          ON CONFLICT (id) DO UPDATE SET lesson_id = EXCLUDED.lesson_id, kind = EXCLUDED.kind, title = EXCLUDED.title,
            description = EXCLUDED.description, sort_order = EXCLUDED.sort_order, updated_at = NOW()
        `;
      }
      for (const [id, sectionId, type, title, sortOrder, payload] of blockSeed) {
        await transaction`
          INSERT INTO lesson_blocks (id, section_id, type, title, sort_order, payload)
          VALUES (${id}, ${sectionId}, ${type}, ${title || null}, ${sortOrder}, ${JSON.stringify(payload)})
          ON CONFLICT (id) DO UPDATE SET section_id = EXCLUDED.section_id, type = EXCLUDED.type, title = EXCLUDED.title,
            sort_order = EXCLUDED.sort_order, payload = EXCLUDED.payload, updated_at = NOW()
        `;
      }
      for (const [lessonId, objectiveId, sortOrder] of lessonObjectiveSeed) {
        await transaction`
          INSERT INTO lesson_learning_objectives (lesson_id, objective_id, sort_order)
          VALUES (${lessonId}, ${objectiveId}, ${sortOrder})
          ON CONFLICT (lesson_id, objective_id) DO UPDATE SET sort_order = EXCLUDED.sort_order
        `;
      }
      for (const version of lessonVersionSeed) {
        await transaction`
          INSERT INTO lesson_versions (id, lesson_id, version_number, status, change_summary, snapshot, created_by_profile_id, published_at)
          VALUES (${version.id}, ${version.lessonId}, ${version.versionNumber}, ${version.status}, ${version.changeSummary}, ${JSON.stringify(version.snapshot)}, ${version.createdByProfileId}, ${version.publishedAt})
          ON CONFLICT (id) DO UPDATE SET lesson_id = EXCLUDED.lesson_id, version_number = EXCLUDED.version_number,
            status = EXCLUDED.status, change_summary = EXCLUDED.change_summary, snapshot = EXCLUDED.snapshot,
            created_by_profile_id = EXCLUDED.created_by_profile_id, published_at = EXCLUDED.published_at
        `;
      }
    });
  } finally {
    await database.end({ timeout: 5 });
  }
}
