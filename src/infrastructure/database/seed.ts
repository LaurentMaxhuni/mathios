import Database from "better-sqlite3";
import postgres, { type Sql } from "postgres";
import { DEFAULT_MASTERY_RULES, DEFAULT_RECOMMENDATION_RULES } from "@/domain/mastery/types";
import { publicSimulationDefinition, simulationRegistry } from "@/domain/simulation/registry";
import { laboratoryActivitySeed } from "@/infrastructure/database/laboratory-seed";
import { env } from "@/lib/env";
import { resolveSqliteFilename } from "@/infrastructure/database/client";
import { runMigrations } from "@/infrastructure/database/migrations";

const foundationSeed = [
  ["installation_name", "Mathios local installation"],
  ["seed_version", "phase-13"],
] as const;

export const simulationSeed = simulationRegistry.map((simulation) => ({
  id: simulation.id,
  slug: simulation.slug,
  title: simulation.title,
  description: simulation.description,
  subjectId: `subject-${simulation.subject}`,
  estimatedDurationMinutes: simulation.estimatedDurationMinutes,
  versionId: `${simulation.id}-version-1`,
  definition: publicSimulationDefinition(simulation),
  presets: simulation.presets,
}));

export const masteryRuleSeed = [
  {
    id: "mastery-rule-default",
    slug: "default",
    name: "Explainable mastery",
    description: "Weighted, recency-aware mastery with evidence and prerequisite safeguards.",
    configuration: DEFAULT_MASTERY_RULES,
    isActive: true,
  },
] as const;

export const recommendationRuleSeed = [
  {
    id: "recommendation-rule-default",
    slug: "default",
    name: "Explainable learning recommendations",
    description:
      "Deterministic recommendations for prerequisites, review, requirements, and weak concepts.",
    configuration: DEFAULT_RECOMMENDATION_RULES,
    isActive: true,
  },
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

export const conceptSeed = [
  {
    id: "concept-position",
    slug: "position",
    name: "Position",
    description: "A location described relative to a chosen reference point and coordinate system.",
    subjectId: "subject-physics",
    domainId: "domain-mechanics",
    gradeMinId: "grade-7",
    gradeMaxId: "grade-8",
    difficulty: "gentle",
    masteryThreshold: 70,
  },
  {
    id: "concept-velocity",
    slug: "velocity",
    name: "Velocity",
    description:
      "A rate of change of position that keeps direction as part of the physical quantity.",
    subjectId: "subject-physics",
    domainId: "domain-mechanics",
    gradeMinId: "grade-7",
    gradeMaxId: "grade-9",
    difficulty: "balanced",
    masteryThreshold: 75,
  },
  {
    id: "concept-acceleration",
    slug: "acceleration",
    name: "Acceleration",
    description: "The rate at which velocity changes, including changes in speed or direction.",
    subjectId: "subject-physics",
    domainId: "domain-mechanics",
    gradeMinId: "grade-8",
    gradeMaxId: "grade-10",
    difficulty: "balanced",
    masteryThreshold: 75,
  },
  {
    id: "concept-motion-graphs",
    slug: "motion-graphs",
    name: "Motion graphs",
    description: "Graphs that model how position, velocity, and acceleration evolve over time.",
    subjectId: "subject-physics",
    domainId: "domain-mechanics",
    gradeMinId: "grade-8",
    gradeMaxId: "grade-10",
    difficulty: "challenging",
    masteryThreshold: 80,
  },
  {
    id: "concept-ratio",
    slug: "ratio",
    name: "Ratio",
    description:
      "A multiplicative comparison used to describe scale, rates, and proportional structure.",
    subjectId: "subject-mathematics",
    domainId: "domain-arithmetic",
    gradeMinId: "grade-6",
    gradeMaxId: "grade-8",
    difficulty: "gentle",
    masteryThreshold: 70,
  },
  {
    id: "concept-linear-equations",
    slug: "linear-equations",
    name: "Linear equations",
    description:
      "Equations whose variables change at a constant rate and can be solved with inverse operations.",
    subjectId: "subject-mathematics",
    domainId: "domain-algebra",
    gradeMinId: "grade-7",
    gradeMaxId: "grade-9",
    difficulty: "balanced",
    masteryThreshold: 75,
  },
  {
    id: "concept-sky-coordinates",
    slug: "sky-coordinates",
    name: "Sky coordinates",
    description:
      "A reference system for locating objects on the celestial sphere from observations.",
    subjectId: "subject-astronomy",
    domainId: "domain-observational-astronomy",
    gradeMinId: "grade-10",
    gradeMaxId: "grade-12",
    difficulty: "balanced",
    masteryThreshold: 70,
  },
  {
    id: "concept-cell-structure",
    slug: "cell-structure",
    name: "Cell structure",
    description:
      "The organized components of a cell and how their structure supports life processes.",
    subjectId: "subject-biology",
    domainId: "domain-cell-biology",
    gradeMinId: "grade-6",
    gradeMaxId: "grade-8",
    difficulty: "gentle",
    masteryThreshold: 70,
  },
  {
    id: "concept-atomic-model",
    slug: "atomic-model",
    name: "Atomic model",
    description:
      "A model of matter built from nuclei, electrons, energy levels, and observable evidence.",
    subjectId: "subject-chemistry",
    domainId: "domain-atomic-structure",
    gradeMinId: "grade-8",
    gradeMaxId: "grade-10",
    difficulty: "balanced",
    masteryThreshold: 75,
  },
] as const;

export const conceptRelationshipSeed = [
  ["concept-edge-velocity-position", "concept-velocity", "concept-position", "requires"],
  ["concept-edge-acceleration-velocity", "concept-acceleration", "concept-velocity", "requires"],
  [
    "concept-edge-acceleration-motion-graphs",
    "concept-acceleration",
    "concept-motion-graphs",
    "unlocks",
  ],
  [
    "concept-edge-motion-graphs-velocity",
    "concept-motion-graphs",
    "concept-velocity",
    "builds-upon",
  ],
  ["concept-edge-ratio-linear-equations", "concept-linear-equations", "concept-ratio", "requires"],
  ["concept-edge-ratio-velocity", "concept-ratio", "concept-velocity", "applies-in"],
  [
    "concept-edge-position-sky-coordinates",
    "concept-sky-coordinates",
    "concept-position",
    "cross-subject-connection",
  ],
  ["concept-edge-atomic-position", "concept-atomic-model", "concept-position", "related-to"],
] as const;

export const conceptObjectiveSeed = [
  ["concept-position", "objective-kosovo-grade-8-subject-physics", 0],
  ["concept-velocity", "objective-kosovo-grade-8-subject-physics", 1],
  ["concept-acceleration", "objective-international-grade-8-subject-physics", 0],
  ["concept-motion-graphs", "objective-international-grade-8-subject-physics", 1],
  ["concept-ratio", "objective-kosovo-grade-6-subject-mathematics", 0],
  ["concept-linear-equations", "objective-kosovo-grade-8-subject-mathematics", 0],
  ["concept-sky-coordinates", "objective-international-grade-10-subject-astronomy", 0],
  ["concept-cell-structure", "objective-kosovo-grade-6-subject-biology", 0],
  ["concept-atomic-model", "objective-kosovo-grade-8-subject-chemistry", 0],
] as const;

export const conceptLessonSeed = [
  ["concept-position", "lesson-describing-motion", 0],
  ["concept-velocity", "lesson-describing-motion", 1],
  ["concept-velocity", "lesson-speed-and-velocity", 0],
  ["concept-acceleration", "lesson-constant-acceleration", 0],
  ["concept-motion-graphs", "lesson-describing-motion", 2],
] as const;

export const conceptApplicationSeed = [
  [
    "application-position-navigation",
    "concept-position",
    "Navigation and mapping",
    "Reference points and coordinate systems make it possible to describe routes, maps, and locations.",
    0,
  ],
  [
    "application-velocity-traffic",
    "concept-velocity",
    "Traffic safety",
    "Direction-aware velocity helps explain closing distances, braking, and collision risk.",
    0,
  ],
  [
    "application-acceleration-sports",
    "concept-acceleration",
    "Sports performance",
    "Acceleration describes how athletes and vehicles change their motion over time.",
    0,
  ],
  [
    "application-sky-coordinates",
    "concept-sky-coordinates",
    "Telescope pointing",
    "Astronomers use coordinates to locate and revisit objects in the night sky.",
    0,
  ],
] as const;

export const conceptMisconceptionSeed = [
  [
    "misconception-velocity-speed",
    "concept-velocity",
    "Velocity and speed are always the same.",
    "Speed is scalar; velocity also records direction.",
    0,
  ],
  [
    "misconception-acceleration-speeding",
    "concept-acceleration",
    "An object accelerates only when it speeds up.",
    "A change in direction is also acceleration, even at constant speed.",
    0,
  ],
  [
    "misconception-position-motion",
    "concept-position",
    "An object at a position is automatically moving.",
    "Position is a state; motion describes how position changes with time.",
    0,
  ],
] as const;

export const questionSeed = [
  {
    id: "question-velocity-direction",
    slug: "velocity-direction",
    title: "Velocity includes direction",
    type: "multiple-choice",
    subjectId: "subject-physics",
    gradeMinId: "grade-8",
    gradeMaxId: "grade-9",
    difficulty: "gentle",
    estimatedTimeSeconds: 90,
    source: "Mathios Phase 5 seed",
    authorProfileId: null,
    tags: ["motion", "velocity"],
    status: "published",
    prompt:
      "A car travels 20 m east, then 20 m west. Which statement is true about its displacement?",
    answerSpec: { correctOptionKeys: ["b"] },
    explanation:
      "Displacement compares the final position with the initial position, so the car ends where it started.",
    fullSolution: "The eastward and westward movements cancel: 20 m - 20 m = 0 m.",
    commonWrongAnswers: ["40 m"],
    errorFeedback: { a: "That is the total distance, not displacement." },
    partialCreditRules: null,
    changeSummary: "Initial published question.",
    options: [
      {
        id: "option-velocity-direction-a",
        key: "a",
        label: "40 m east",
        sortOrder: 0,
        isCorrect: false,
      },
      { id: "option-velocity-direction-b", key: "b", label: "0 m", sortOrder: 1, isCorrect: true },
      {
        id: "option-velocity-direction-c",
        key: "c",
        label: "20 m west",
        sortOrder: 2,
        isCorrect: false,
      },
    ],
    hints: [
      {
        id: "hint-velocity-direction-1",
        level: 1,
        content: "Look only at the starting and ending positions.",
        sortOrder: 0,
      },
    ],
    solutions: [
      {
        id: "solution-velocity-direction",
        title: "Displacement",
        content: "The final position equals the initial position, so displacement is zero.",
        sortOrder: 0,
      },
    ],
    conceptIds: ["concept-velocity"],
    learningObjectiveIds: ["objective-kosovo-grade-8-subject-physics"],
  },
  {
    id: "question-acceleration-numeric",
    slug: "acceleration-from-change-in-velocity",
    title: "Acceleration from a velocity change",
    type: "numeric-tolerance",
    subjectId: "subject-physics",
    gradeMinId: "grade-8",
    gradeMaxId: "grade-10",
    difficulty: "balanced",
    estimatedTimeSeconds: 120,
    source: "Mathios Phase 5 seed",
    authorProfileId: null,
    tags: ["motion", "acceleration"],
    status: "published",
    prompt:
      "A cyclist changes velocity from 4 m/s to 10 m/s in 3 s. What is the average acceleration in m/s²?",
    answerSpec: { expected: 2, tolerance: 0.05 },
    explanation: "Average acceleration is change in velocity divided by elapsed time.",
    fullSolution: "a = (10 - 4) / 3 = 2 m/s².",
    commonWrongAnswers: ["14/3", "6"],
    errorFeedback: {
      "outside-tolerance": "Subtract the initial velocity before dividing by time.",
    },
    partialCreditRules: null,
    options: [],
    hints: [
      {
        id: "hint-acceleration-numeric-1",
        level: 1,
        content: "Use a = (v₂ - v₁) / t.",
        sortOrder: 0,
      },
    ],
    solutions: [
      {
        id: "solution-acceleration-numeric",
        title: "Average acceleration",
        content: "a = (10 m/s - 4 m/s) / 3 s = 2 m/s².",
        sortOrder: 0,
      },
    ],
    conceptIds: ["concept-acceleration"],
    learningObjectiveIds: ["objective-international-grade-8-subject-physics"],
  },
  {
    id: "question-force-unit",
    slug: "force-from-mass-and-acceleration",
    title: "Force with a unit",
    type: "numeric-unit",
    subjectId: "subject-physics",
    gradeMinId: "grade-8",
    gradeMaxId: "grade-10",
    difficulty: "balanced",
    estimatedTimeSeconds: 120,
    source: "Mathios Phase 5 seed",
    authorProfileId: null,
    tags: ["force", "units"],
    status: "published",
    prompt: "What force accelerates a 3 kg object at 4 m/s²? Include the SI unit.",
    answerSpec: { expected: 12, unit: "N", tolerance: 0 },
    explanation: "Newton’s second law connects force, mass, and acceleration.",
    fullSolution: "F = ma = 3 kg × 4 m/s² = 12 N.",
    commonWrongAnswers: ["7 N", "0.75 N"],
    errorFeedback: { "wrong-unit": "Force is measured in newtons (N)." },
    partialCreditRules: null,
    options: [],
    hints: [
      {
        id: "hint-force-unit-1",
        level: 1,
        content: "Multiply mass by acceleration.",
        sortOrder: 0,
      },
    ],
    solutions: [
      {
        id: "solution-force-unit",
        title: "Newton’s second law",
        content: "F = ma = 3 × 4 = 12 N.",
        sortOrder: 0,
      },
    ],
    conceptIds: ["concept-acceleration"],
    learningObjectiveIds: ["objective-kosovo-grade-8-subject-physics"],
  },
  {
    id: "question-linear-equation-expression",
    slug: "equivalent-linear-expression",
    title: "Equivalent algebraic expressions",
    type: "algebraic-expression",
    subjectId: "subject-mathematics",
    gradeMinId: "grade-8",
    gradeMaxId: "grade-9",
    difficulty: "balanced",
    estimatedTimeSeconds: 150,
    source: "Mathios Phase 5 seed",
    authorProfileId: null,
    tags: ["algebra", "equivalence"],
    status: "published",
    prompt: "Enter an expression equivalent to 2(x + 1).",
    answerSpec: { acceptedAnswers: ["2*x+2"], variables: ["x"] },
    explanation: "Distribute the factor 2 across both terms.",
    fullSolution: "2(x + 1) = 2x + 2.",
    commonWrongAnswers: ["2x + 1"],
    errorFeedback: { "expression-mismatch": "Expand both terms inside the parentheses." },
    partialCreditRules: null,
    options: [],
    hints: [
      {
        id: "hint-linear-expression-1",
        level: 1,
        content: "Use the distributive property.",
        sortOrder: 0,
      },
    ],
    solutions: [
      {
        id: "solution-linear-expression",
        title: "Expand",
        content: "Multiply 2 by x and by 1: 2x + 2.",
        sortOrder: 0,
      },
    ],
    conceptIds: ["concept-linear-equations"],
    learningObjectiveIds: ["objective-kosovo-grade-8-subject-mathematics"],
  },
  {
    id: "question-position-true-false",
    slug: "position-is-not-motion",
    title: "Position and motion",
    type: "true-false",
    subjectId: "subject-physics",
    gradeMinId: "grade-8",
    gradeMaxId: "grade-9",
    difficulty: "gentle",
    estimatedTimeSeconds: 60,
    source: "Mathios Phase 5 seed",
    authorProfileId: null,
    tags: ["position", "motion"],
    status: "published",
    prompt: "True or false: An object can have a position even when it is not moving.",
    answerSpec: { expected: true },
    explanation: "Position describes location; motion describes how location changes.",
    fullSolution: "True. A stationary object still has a location relative to a reference point.",
    commonWrongAnswers: [],
    errorFeedback: {},
    partialCreditRules: null,
    options: [],
    hints: [],
    solutions: [],
    conceptIds: ["concept-position"],
    learningObjectiveIds: ["objective-kosovo-grade-8-subject-physics"],
  },
  {
    id: "question-motion-order",
    slug: "motion-investigation-order",
    title: "Order a motion investigation",
    type: "ordering",
    subjectId: "subject-physics",
    gradeMinId: "grade-8",
    gradeMaxId: "grade-10",
    difficulty: "balanced",
    estimatedTimeSeconds: 120,
    source: "Mathios Phase 5 seed",
    authorProfileId: null,
    tags: ["method", "motion"],
    status: "published",
    prompt: "Put the investigation steps in a sensible order.",
    answerSpec: { correctOrder: ["observe", "model", "calculate"] },
    explanation: "Start with observations, choose a model, then calculate a prediction.",
    fullSolution: "Observe → model → calculate.",
    commonWrongAnswers: [],
    errorFeedback: {},
    partialCreditRules: { enabled: true },
    options: [
      {
        id: "option-motion-order-observe",
        key: "observe",
        label: "Observe the motion",
        sortOrder: 0,
        isCorrect: true,
      },
      {
        id: "option-motion-order-model",
        key: "model",
        label: "Choose a model",
        sortOrder: 1,
        isCorrect: true,
      },
      {
        id: "option-motion-order-calculate",
        key: "calculate",
        label: "Calculate a prediction",
        sortOrder: 2,
        isCorrect: true,
      },
    ],
    hints: [],
    solutions: [],
    conceptIds: ["concept-motion-graphs"],
    learningObjectiveIds: ["objective-international-grade-8-subject-physics"],
  },
  {
    id: "question-velocity-matching",
    slug: "match-motion-quantities",
    title: "Match motion quantities",
    type: "matching",
    subjectId: "subject-physics",
    gradeMinId: "grade-8",
    gradeMaxId: "grade-9",
    difficulty: "gentle",
    estimatedTimeSeconds: 120,
    source: "Mathios Phase 5 seed",
    authorProfileId: null,
    tags: ["motion", "definitions"],
    status: "published",
    prompt: "Match each quantity to its meaning.",
    answerSpec: { correctPairs: { distance: "path", displacement: "change-position" } },
    explanation: "Distance follows the path; displacement compares endpoints.",
    fullSolution: "Distance → length of path. Displacement → change in position.",
    commonWrongAnswers: [],
    errorFeedback: {},
    partialCreditRules: { enabled: true },
    options: [
      {
        id: "option-velocity-matching-path",
        key: "path",
        label: "Length of the path",
        sortOrder: 0,
        isCorrect: false,
      },
      {
        id: "option-velocity-matching-change",
        key: "change-position",
        label: "Change in position",
        sortOrder: 1,
        isCorrect: false,
      },
    ],
    hints: [],
    solutions: [],
    conceptIds: ["concept-velocity", "concept-position"],
    learningObjectiveIds: ["objective-kosovo-grade-8-subject-physics"],
  },
  {
    id: "question-motion-multi-step",
    slug: "multi-step-motion-calculation",
    title: "A two-step motion calculation",
    type: "multi-step",
    subjectId: "subject-physics",
    gradeMinId: "grade-8",
    gradeMaxId: "grade-10",
    difficulty: "challenging",
    estimatedTimeSeconds: 240,
    source: "Mathios Phase 5 seed",
    authorProfileId: null,
    tags: ["motion", "multi-step"],
    status: "published",
    prompt: "First find the change in velocity, then find the acceleration.",
    answerSpec: {
      steps: [
        {
          id: "change",
          label: "Change in velocity",
          type: "numeric",
          weight: 1,
          spec: { expected: 6, tolerance: 0 },
        },
        {
          id: "acceleration",
          label: "Acceleration",
          type: "numeric-tolerance",
          weight: 1,
          spec: { expected: 2, tolerance: 0.05 },
        },
      ],
    },
    explanation: "Keep the intermediate result visible before dividing by time.",
    fullSolution: "The velocity changes by 10 - 4 = 6 m/s. Dividing by 3 s gives 2 m/s².",
    commonWrongAnswers: [],
    errorFeedback: {},
    partialCreditRules: { enabled: true },
    options: [],
    hints: [],
    solutions: [],
    conceptIds: ["concept-acceleration"],
    learningObjectiveIds: ["objective-international-grade-8-subject-physics"],
  },
] as const;

export const questionTemplateSeed = [
  {
    id: "template-force-randomized",
    questionId: "question-force-unit",
    slug: "random-force-from-mass-and-acceleration",
    name: "Random force from mass and acceleration",
    questionType: "numeric-unit",
    promptTemplate:
      "What force accelerates a {{mass}} kg object at {{acceleration}} m/s²? Include the SI unit.",
    variables: [
      { name: "mass", label: "Mass", min: 2, max: 8, step: 1, decimals: 0 },
      { name: "acceleration", label: "Acceleration", min: 2, max: 6, step: 1, decimals: 0 },
    ],
    answerExpression: "mass * acceleration",
    validationSpec: { unit: "N", tolerance: 0 },
    seed: 42,
    isActive: true,
  },
] as const;

export const exerciseSetSeed = [
  {
    id: "exercise-set-motion-practice",
    slug: "motion-practice",
    title: "Motion practice lab",
    description: "A reusable practice set for position, velocity, and acceleration.",
    kind: "concept",
    subjectId: "subject-physics",
    gradeId: "grade-8",
    difficulty: "balanced",
    status: "published",
    estimatedTimeSeconds: 900,
    createdByProfileId: null,
  },
] as const;

export const exerciseSetQuestionSeed = [
  ["exercise-set-motion-practice", "question-velocity-direction", 0, 1, true],
  ["exercise-set-motion-practice", "question-acceleration-numeric", 1, 1, true],
  ["exercise-set-motion-practice", "question-force-unit", 2, 1, true],
  ["exercise-set-motion-practice", "question-position-true-false", 3, 1, true],
  ["exercise-set-motion-practice", "question-motion-order", 4, 1, true],
  ["exercise-set-motion-practice", "question-motion-multi-step", 5, 2, true],
] as const;

export const assessmentSeed = [
  {
    id: "assessment-motion-quiz",
    slug: "motion-module-quiz",
    title: "Motion module quiz",
    description: "A short untimed knowledge check for the core language of motion.",
    type: "module-quiz",
    subjectId: "subject-physics",
    gradeId: "grade-8",
    status: "published",
    timeLimitSeconds: null,
    attemptLimit: 3,
    passingThreshold: 0.6,
    partialCredit: true,
    feedbackVisibility: "after-submit",
    reviewMode: "full",
    retakeRule: "after-failure",
    questionOrdering: "fixed",
    autoSubmit: false,
    configuration: {},
    createdByProfileId: null,
  },
  {
    id: "assessment-motion-diagnostic",
    slug: "motion-readiness-diagnostic",
    title: "Motion readiness diagnostic",
    description: "An explainable diagnostic that identifies strengths and concepts to review.",
    type: "diagnostic-test",
    subjectId: "subject-physics",
    gradeId: null,
    status: "published",
    timeLimitSeconds: 600,
    attemptLimit: 1,
    passingThreshold: 0.6,
    partialCredit: true,
    feedbackVisibility: "after-submit",
    reviewMode: "full",
    retakeRule: "never",
    questionOrdering: "fixed",
    autoSubmit: true,
    configuration: {
      gradeBands: [
        { gradeId: "grade-6", label: "Grade 6 foundations", minPercentage: 0.35 },
        { gradeId: "grade-8", label: "Grade 8 readiness", minPercentage: 0.6 },
        { gradeId: "grade-10", label: "Grade 10 extension", minPercentage: 0.82 },
      ],
    },
    createdByProfileId: null,
  },
  {
    id: "assessment-motion-placement",
    slug: "motion-placement-check",
    title: "Motion placement check",
    description: "A reproducible placement assessment that recommends a safe starting level.",
    type: "placement-test",
    subjectId: "subject-physics",
    gradeId: null,
    status: "published",
    timeLimitSeconds: 900,
    attemptLimit: 1,
    passingThreshold: 0.6,
    partialCredit: true,
    feedbackVisibility: "after-submit",
    reviewMode: "incorrect-only",
    retakeRule: "never",
    questionOrdering: "randomized",
    autoSubmit: true,
    configuration: {
      gradeBands: [
        { gradeId: "grade-6", label: "Grade 6 foundations", minPercentage: 0.35 },
        { gradeId: "grade-8", label: "Grade 8 readiness", minPercentage: 0.6 },
        { gradeId: "grade-10", label: "Grade 10 extension", minPercentage: 0.82 },
      ],
    },
    createdByProfileId: null,
  },
] as const;

export const assessmentSectionSeed = [
  {
    id: "assessment-section-motion-quiz",
    assessmentId: "assessment-motion-quiz",
    title: "Core motion language",
    description: "Fixed questions connect directly to the module concepts.",
    sortOrder: 0,
    points: 4,
    timeLimitSeconds: null,
    questionOrdering: "fixed",
  },
  {
    id: "assessment-section-motion-diagnostic",
    assessmentId: "assessment-motion-diagnostic",
    title: "Readiness signals",
    description: "Questions are grouped by the concepts they diagnose.",
    sortOrder: 0,
    points: 5,
    timeLimitSeconds: 600,
    questionOrdering: "fixed",
  },
  {
    id: "assessment-section-motion-placement",
    assessmentId: "assessment-motion-placement",
    title: "Placement sample",
    description: "The pool keeps the sampled question set reproducible for review.",
    sortOrder: 0,
    points: 3,
    timeLimitSeconds: 900,
    questionOrdering: "randomized",
  },
] as const;

export const assessmentPoolSeed = [
  {
    id: "assessment-pool-motion-placement",
    assessmentId: "assessment-motion-placement",
    sectionId: "assessment-section-motion-placement",
    title: "Motion placement pool",
    selectionCount: 3,
    difficultyDistribution: { gentle: 1, balanced: 1, challenging: 1 },
    conceptIds: [],
    questionOrdering: "randomized",
  },
] as const;

export const assessmentQuestionSeed = [
  {
    id: "assessment-question-quiz-velocity",
    assessmentId: "assessment-motion-quiz",
    sectionId: "assessment-section-motion-quiz",
    poolId: null,
    questionId: "question-velocity-direction",
    sortOrder: 0,
    points: 1,
    isRequired: true,
  },
  {
    id: "assessment-question-quiz-acceleration",
    assessmentId: "assessment-motion-quiz",
    sectionId: "assessment-section-motion-quiz",
    poolId: null,
    questionId: "question-acceleration-numeric",
    sortOrder: 1,
    points: 1,
    isRequired: true,
  },
  {
    id: "assessment-question-quiz-force",
    assessmentId: "assessment-motion-quiz",
    sectionId: "assessment-section-motion-quiz",
    poolId: null,
    questionId: "question-force-unit",
    sortOrder: 2,
    points: 1,
    isRequired: true,
  },
  {
    id: "assessment-question-quiz-equation",
    assessmentId: "assessment-motion-quiz",
    sectionId: "assessment-section-motion-quiz",
    poolId: null,
    questionId: "question-linear-equation-expression",
    sortOrder: 3,
    points: 1,
    isRequired: true,
  },
  {
    id: "assessment-question-diagnostic-velocity",
    assessmentId: "assessment-motion-diagnostic",
    sectionId: "assessment-section-motion-diagnostic",
    poolId: null,
    questionId: "question-velocity-direction",
    sortOrder: 0,
    points: 1,
    isRequired: true,
  },
  {
    id: "assessment-question-diagnostic-force",
    assessmentId: "assessment-motion-diagnostic",
    sectionId: "assessment-section-motion-diagnostic",
    poolId: null,
    questionId: "question-force-unit",
    sortOrder: 1,
    points: 1,
    isRequired: true,
  },
  {
    id: "assessment-question-diagnostic-order",
    assessmentId: "assessment-motion-diagnostic",
    sectionId: "assessment-section-motion-diagnostic",
    poolId: null,
    questionId: "question-motion-order",
    sortOrder: 2,
    points: 1,
    isRequired: true,
  },
  {
    id: "assessment-question-diagnostic-multi",
    assessmentId: "assessment-motion-diagnostic",
    sectionId: "assessment-section-motion-diagnostic",
    poolId: null,
    questionId: "question-motion-multi-step",
    sortOrder: 3,
    points: 2,
    isRequired: true,
  },
  {
    id: "assessment-question-placement-velocity",
    assessmentId: "assessment-motion-placement",
    sectionId: "assessment-section-motion-placement",
    poolId: "assessment-pool-motion-placement",
    questionId: "question-velocity-direction",
    sortOrder: 0,
    points: 1,
    isRequired: true,
  },
  {
    id: "assessment-question-placement-force",
    assessmentId: "assessment-motion-placement",
    sectionId: "assessment-section-motion-placement",
    poolId: "assessment-pool-motion-placement",
    questionId: "question-force-unit",
    sortOrder: 1,
    points: 1,
    isRequired: true,
  },
  {
    id: "assessment-question-placement-equation",
    assessmentId: "assessment-motion-placement",
    sectionId: "assessment-section-motion-placement",
    poolId: "assessment-pool-motion-placement",
    questionId: "question-linear-equation-expression",
    sortOrder: 2,
    points: 1,
    isRequired: true,
  },
  {
    id: "assessment-question-placement-multi",
    assessmentId: "assessment-motion-placement",
    sectionId: "assessment-section-motion-placement",
    poolId: "assessment-pool-motion-placement",
    questionId: "question-motion-multi-step",
    sortOrder: 3,
    points: 2,
    isRequired: true,
  },
] as const;

export const roadmapSeed = [
  {
    id: "roadmap-math-physics-foundations",
    slug: "math-physics-foundations",
    title: "Mathematics and Physics Foundations",
    description: "A gentle bridge from ratios and measurement to the language of motion.",
    goal: "Build the shared quantitative foundations needed for physical reasoning.",
    targetGradeId: "grade-8",
    targetDifficulty: "gentle",
    estimatedDurationMinutes: 110,
    coverImage: null,
    status: "published",
    createdByProfileId: null,
  },
  {
    id: "roadmap-algebra-classical-mechanics",
    slug: "algebra-to-classical-mechanics",
    title: "Algebra to Classical Mechanics",
    description: "Turn equations into models for velocity, acceleration, and force.",
    goal: "Use algebra fluently enough to reason about classical mechanics.",
    targetGradeId: "grade-10",
    targetDifficulty: "balanced",
    estimatedDurationMinutes: 190,
    coverImage: null,
    status: "published",
    createdByProfileId: null,
  },
  {
    id: "roadmap-mathematics-for-astronomy",
    slug: "mathematics-for-astronomy",
    title: "Mathematics for Astronomy",
    description: "Connect proportional reasoning and equations to locating objects in the sky.",
    goal: "Develop the mathematical language used to describe celestial observations.",
    targetGradeId: "grade-10",
    targetDifficulty: "balanced",
    estimatedDurationMinutes: 115,
    coverImage: null,
    status: "published",
    createdByProfileId: null,
  },
  {
    id: "roadmap-introductory-astrophysics",
    slug: "introductory-astrophysics",
    title: "Introductory Astrophysics",
    description: "Carry motion and coordinate ideas into an evidence-based view of the cosmos.",
    goal: "Reach a first coherent model of astronomical motion and observation.",
    targetGradeId: "grade-12",
    targetDifficulty: "challenging",
    estimatedDurationMinutes: 135,
    coverImage: null,
    status: "published",
    createdByProfileId: null,
  },
  {
    id: "roadmap-chemistry-for-biology",
    slug: "chemistry-for-biology",
    title: "Chemistry for Biology",
    description: "Follow matter from atomic structure into the organization of living cells.",
    goal: "Make the chemical foundations of cell biology visible and usable.",
    targetGradeId: "grade-10",
    targetDifficulty: "balanced",
    estimatedDurationMinutes: 100,
    coverImage: null,
    status: "published",
    createdByProfileId: null,
  },
  {
    id: "roadmap-biochemistry-foundations",
    slug: "biochemistry-foundations",
    title: "Biochemistry Foundations",
    description:
      "A cross-subject foundation for thinking about molecules, cells, and life processes.",
    goal: "Prepare for biochemistry by linking atomic models to cell structure.",
    targetGradeId: "grade-university-foundations",
    targetDifficulty: "challenging",
    estimatedDurationMinutes: 125,
    coverImage: null,
    status: "published",
    createdByProfileId: null,
  },
  {
    id: "roadmap-natural-sciences-foundations",
    slug: "complete-natural-sciences-foundations",
    title: "Complete Natural Sciences Foundations",
    description: "A wide, explainable route through the shared ideas of the five science subjects.",
    goal: "Build a connected foundation across mathematics, physics, chemistry, biology, and astronomy.",
    targetGradeId: "grade-10",
    targetDifficulty: "balanced",
    estimatedDurationMinutes: 245,
    coverImage: null,
    status: "published",
    createdByProfileId: null,
  },
] as const;

export const roadmapSubjectSeed = [
  ["roadmap-math-physics-foundations", "subject-mathematics", 0],
  ["roadmap-math-physics-foundations", "subject-physics", 1],
  ["roadmap-algebra-classical-mechanics", "subject-mathematics", 0],
  ["roadmap-algebra-classical-mechanics", "subject-physics", 1],
  ["roadmap-mathematics-for-astronomy", "subject-mathematics", 0],
  ["roadmap-mathematics-for-astronomy", "subject-astronomy", 1],
  ["roadmap-introductory-astrophysics", "subject-physics", 0],
  ["roadmap-introductory-astrophysics", "subject-astronomy", 1],
  ["roadmap-chemistry-for-biology", "subject-chemistry", 0],
  ["roadmap-chemistry-for-biology", "subject-biology", 1],
  ["roadmap-biochemistry-foundations", "subject-chemistry", 0],
  ["roadmap-biochemistry-foundations", "subject-biology", 1],
  ["roadmap-natural-sciences-foundations", "subject-mathematics", 0],
  ["roadmap-natural-sciences-foundations", "subject-physics", 1],
  ["roadmap-natural-sciences-foundations", "subject-chemistry", 2],
  ["roadmap-natural-sciences-foundations", "subject-biology", 3],
  ["roadmap-natural-sciences-foundations", "subject-astronomy", 4],
] as const;

type SeedRoadmapNode = {
  id: string;
  roadmapId: string;
  nodeKey: string;
  type: string;
  title: string;
  description: string;
  referenceId: string | null;
  referenceTitle: string | null;
  subjectId: string | null;
  isRequired: boolean;
  isCheckpoint: boolean;
  isOptionalBranch: boolean;
  sortOrder: number;
  estimatedDurationMinutes: number;
  metadata: Record<string, unknown>;
};

function seedRoadmapNode(
  roadmapId: string,
  id: string,
  nodeKey: string,
  type: string,
  title: string,
  referenceId: string | null,
  referenceTitle: string | null,
  subjectId: string | null,
  sortOrder: number,
  estimatedDurationMinutes: number,
  options: Partial<
    Pick<
      SeedRoadmapNode,
      "description" | "isRequired" | "isCheckpoint" | "isOptionalBranch" | "metadata"
    >
  > = {},
): SeedRoadmapNode {
  return {
    id,
    roadmapId,
    nodeKey,
    type,
    title,
    description: options.description ?? "A reusable step in this interdisciplinary path.",
    referenceId,
    referenceTitle,
    subjectId,
    isRequired: options.isRequired ?? true,
    isCheckpoint: options.isCheckpoint ?? false,
    isOptionalBranch: options.isOptionalBranch ?? false,
    sortOrder,
    estimatedDurationMinutes,
    metadata: options.metadata ?? {},
  };
}

export const roadmapNodeSeed: readonly SeedRoadmapNode[] = [
  seedRoadmapNode(
    "roadmap-math-physics-foundations",
    "roadmap-node-mpf-ratio",
    "ratio",
    "concept",
    "Ratio",
    "concept-ratio",
    "Ratio",
    "subject-mathematics",
    0,
    20,
  ),
  seedRoadmapNode(
    "roadmap-math-physics-foundations",
    "roadmap-node-mpf-position",
    "position",
    "concept",
    "Position",
    "concept-position",
    "Position",
    "subject-physics",
    1,
    20,
  ),
  seedRoadmapNode(
    "roadmap-math-physics-foundations",
    "roadmap-node-mpf-velocity",
    "velocity",
    "concept",
    "Velocity",
    "concept-velocity",
    "Velocity",
    "subject-physics",
    2,
    25,
  ),
  seedRoadmapNode(
    "roadmap-math-physics-foundations",
    "roadmap-node-mpf-motion",
    "motion-lesson",
    "lesson",
    "Describing motion",
    "lesson-describing-motion",
    "Describing motion",
    "subject-physics",
    3,
    25,
    { isCheckpoint: true },
  ),

  seedRoadmapNode(
    "roadmap-algebra-classical-mechanics",
    "roadmap-node-acm-ratio",
    "ratio",
    "concept",
    "Ratio",
    "concept-ratio",
    "Ratio",
    "subject-mathematics",
    0,
    20,
  ),
  seedRoadmapNode(
    "roadmap-algebra-classical-mechanics",
    "roadmap-node-acm-linear",
    "linear-equations",
    "concept",
    "Linear equations",
    "concept-linear-equations",
    "Linear equations",
    "subject-mathematics",
    1,
    30,
  ),
  seedRoadmapNode(
    "roadmap-algebra-classical-mechanics",
    "roadmap-node-acm-position",
    "position",
    "concept",
    "Position",
    "concept-position",
    "Position",
    "subject-physics",
    2,
    20,
  ),
  seedRoadmapNode(
    "roadmap-algebra-classical-mechanics",
    "roadmap-node-acm-velocity",
    "velocity",
    "concept",
    "Velocity",
    "concept-velocity",
    "Velocity",
    "subject-physics",
    3,
    25,
  ),
  seedRoadmapNode(
    "roadmap-algebra-classical-mechanics",
    "roadmap-node-acm-acceleration",
    "acceleration",
    "concept",
    "Acceleration",
    "concept-acceleration",
    "Acceleration",
    "subject-physics",
    4,
    30,
  ),
  seedRoadmapNode(
    "roadmap-algebra-classical-mechanics",
    "roadmap-node-acm-lesson",
    "acceleration-lesson",
    "lesson",
    "Constant acceleration",
    "lesson-constant-acceleration",
    "Constant acceleration",
    "subject-physics",
    5,
    35,
    { isCheckpoint: true },
  ),
  seedRoadmapNode(
    "roadmap-algebra-classical-mechanics",
    "roadmap-node-acm-assessment",
    "motion-checkpoint",
    "assessment",
    "Motion module quiz",
    "assessment-motion-quiz",
    "Motion module quiz",
    "subject-physics",
    6,
    30,
    { isCheckpoint: true },
  ),

  seedRoadmapNode(
    "roadmap-mathematics-for-astronomy",
    "roadmap-node-mfa-ratio",
    "ratio",
    "concept",
    "Ratio",
    "concept-ratio",
    "Ratio",
    "subject-mathematics",
    0,
    20,
  ),
  seedRoadmapNode(
    "roadmap-mathematics-for-astronomy",
    "roadmap-node-mfa-linear",
    "linear-equations",
    "concept",
    "Linear equations",
    "concept-linear-equations",
    "Linear equations",
    "subject-mathematics",
    1,
    30,
  ),
  seedRoadmapNode(
    "roadmap-mathematics-for-astronomy",
    "roadmap-node-mfa-coordinates",
    "sky-coordinates",
    "concept",
    "Sky coordinates",
    "concept-sky-coordinates",
    "Sky coordinates",
    "subject-astronomy",
    2,
    35,
    { isCheckpoint: true },
  ),
  seedRoadmapNode(
    "roadmap-mathematics-for-astronomy",
    "roadmap-node-mfa-milestone",
    "observation-milestone",
    "milestone",
    "Read an observation map",
    null,
    null,
    "subject-astronomy",
    3,
    30,
    { isCheckpoint: true },
  ),

  seedRoadmapNode(
    "roadmap-introductory-astrophysics",
    "roadmap-node-ia-position",
    "position",
    "concept",
    "Position",
    "concept-position",
    "Position",
    "subject-physics",
    0,
    20,
  ),
  seedRoadmapNode(
    "roadmap-introductory-astrophysics",
    "roadmap-node-ia-velocity",
    "velocity",
    "concept",
    "Velocity",
    "concept-velocity",
    "Velocity",
    "subject-physics",
    1,
    25,
  ),
  seedRoadmapNode(
    "roadmap-introductory-astrophysics",
    "roadmap-node-ia-acceleration",
    "acceleration",
    "concept",
    "Acceleration",
    "concept-acceleration",
    "Acceleration",
    "subject-physics",
    2,
    30,
  ),
  seedRoadmapNode(
    "roadmap-introductory-astrophysics",
    "roadmap-node-ia-coordinates",
    "sky-coordinates",
    "concept",
    "Sky coordinates",
    "concept-sky-coordinates",
    "Sky coordinates",
    "subject-astronomy",
    3,
    35,
  ),
  seedRoadmapNode(
    "roadmap-introductory-astrophysics",
    "roadmap-node-ia-course",
    "night-sky-course",
    "course",
    "Reading the Night Sky",
    "course-astronomy-observation",
    "Reading the Night Sky",
    "subject-astronomy",
    4,
    25,
    { isRequired: false, isOptionalBranch: true, isCheckpoint: true },
  ),

  seedRoadmapNode(
    "roadmap-chemistry-for-biology",
    "roadmap-node-cfb-atomic",
    "atomic-model",
    "concept",
    "Atomic model",
    "concept-atomic-model",
    "Atomic model",
    "subject-chemistry",
    0,
    35,
  ),
  seedRoadmapNode(
    "roadmap-chemistry-for-biology",
    "roadmap-node-cfb-cell",
    "cell-structure",
    "concept",
    "Cell structure",
    "concept-cell-structure",
    "Cell structure",
    "subject-biology",
    1,
    35,
  ),
  seedRoadmapNode(
    "roadmap-chemistry-for-biology",
    "roadmap-node-cfb-milestone",
    "matter-to-life",
    "milestone",
    "Connect matter to life",
    null,
    null,
    "subject-biology",
    2,
    30,
    { isCheckpoint: true },
  ),

  seedRoadmapNode(
    "roadmap-biochemistry-foundations",
    "roadmap-node-bcf-atomic",
    "atomic-model",
    "concept",
    "Atomic model",
    "concept-atomic-model",
    "Atomic model",
    "subject-chemistry",
    0,
    35,
  ),
  seedRoadmapNode(
    "roadmap-biochemistry-foundations",
    "roadmap-node-bcf-cell",
    "cell-structure",
    "concept",
    "Cell structure",
    "concept-cell-structure",
    "Cell structure",
    "subject-biology",
    1,
    35,
  ),
  seedRoadmapNode(
    "roadmap-biochemistry-foundations",
    "roadmap-node-bcf-milestone",
    "molecular-foundations",
    "milestone",
    "Molecular foundations",
    null,
    null,
    "subject-chemistry",
    2,
    25,
    { isCheckpoint: true },
  ),
  seedRoadmapNode(
    "roadmap-biochemistry-foundations",
    "roadmap-node-bcf-extension",
    "cellular-chemistry-extension",
    "milestone",
    "Cellular chemistry extension",
    null,
    null,
    "subject-biology",
    3,
    30,
    { isRequired: false, isOptionalBranch: true },
  ),

  seedRoadmapNode(
    "roadmap-natural-sciences-foundations",
    "roadmap-node-nsf-ratio",
    "ratio",
    "concept",
    "Ratio",
    "concept-ratio",
    "Ratio",
    "subject-mathematics",
    0,
    20,
  ),
  seedRoadmapNode(
    "roadmap-natural-sciences-foundations",
    "roadmap-node-nsf-position",
    "position",
    "concept",
    "Position",
    "concept-position",
    "Position",
    "subject-physics",
    1,
    20,
  ),
  seedRoadmapNode(
    "roadmap-natural-sciences-foundations",
    "roadmap-node-nsf-atomic",
    "atomic-model",
    "concept",
    "Atomic model",
    "concept-atomic-model",
    "Atomic model",
    "subject-chemistry",
    2,
    35,
  ),
  seedRoadmapNode(
    "roadmap-natural-sciences-foundations",
    "roadmap-node-nsf-cell",
    "cell-structure",
    "concept",
    "Cell structure",
    "concept-cell-structure",
    "Cell structure",
    "subject-biology",
    3,
    35,
  ),
  seedRoadmapNode(
    "roadmap-natural-sciences-foundations",
    "roadmap-node-nsf-coordinates",
    "sky-coordinates",
    "concept",
    "Sky coordinates",
    "concept-sky-coordinates",
    "Sky coordinates",
    "subject-astronomy",
    4,
    35,
  ),
  seedRoadmapNode(
    "roadmap-natural-sciences-foundations",
    "roadmap-node-nsf-motion",
    "motion-course",
    "course",
    "Motion in One Dimension",
    "course-physics-motion",
    "Motion in One Dimension",
    "subject-physics",
    5,
    60,
    { isCheckpoint: true },
  ),
  seedRoadmapNode(
    "roadmap-natural-sciences-foundations",
    "roadmap-node-nsf-outcome",
    "science-outcome",
    "milestone",
    "Natural sciences foundation outcome",
    null,
    null,
    null,
    6,
    40,
    { isCheckpoint: true },
  ),
];

export const roadmapVersionSeed = roadmapSeed.map((roadmap) => ({
  id: `${roadmap.id}-version-1`,
  roadmapId: roadmap.id,
  versionNumber: 1,
  status: "published",
  changeSummary: "Initial published roadmap.",
  createdByProfileId: null,
  publishedAt: "2026-01-01T00:00:00.000Z",
}));

export const roadmapEdgeSeed = roadmapNodeSeed.flatMap((node, index, nodes) => {
  const roadmapNodes = nodes.filter((candidate) => candidate.roadmapId === node.roadmapId);
  const localIndex = roadmapNodes.findIndex((candidate) => candidate.id === node.id);
  const next = roadmapNodes[localIndex + 1];
  if (!next) return [];
  return [
    {
      id: `roadmap-edge-${node.roadmapId}-${node.nodeKey}-${next.nodeKey}`,
      roadmapId: node.roadmapId,
      sourceNodeId: node.id,
      targetNodeId: next.id,
      type: next.isOptionalBranch ? "optional" : "requires",
      sortOrder: localIndex,
    },
  ];
});

export const roadmapPrerequisiteSeed = [
  ["roadmap-introductory-astrophysics", "roadmap-math-physics-foundations", true],
  ["roadmap-biochemistry-foundations", "roadmap-chemistry-for-biology", true],
  ["roadmap-natural-sciences-foundations", "roadmap-math-physics-foundations", false],
] as const;

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
      const insertConcept = database.prepare(`
        INSERT INTO concepts (id, slug, name, description, subject_id, domain_id, grade_min_id, grade_max_id, difficulty, mastery_threshold, is_archived)
        VALUES (@id, @slug, @name, @description, @subjectId, @domainId, @gradeMinId, @gradeMaxId, @difficulty, @masteryThreshold, 0)
        ON CONFLICT(id) DO UPDATE SET slug = excluded.slug, name = excluded.name, description = excluded.description,
          subject_id = excluded.subject_id, domain_id = excluded.domain_id, grade_min_id = excluded.grade_min_id,
          grade_max_id = excluded.grade_max_id, difficulty = excluded.difficulty, mastery_threshold = excluded.mastery_threshold,
          is_archived = 0, updated_at = CURRENT_TIMESTAMP
      `);
      const insertConceptRelationship = database.prepare(`
        INSERT INTO concept_relationships (id, source_concept_id, target_concept_id, relationship_type)
        VALUES (@id, @sourceConceptId, @targetConceptId, @type)
        ON CONFLICT(id) DO UPDATE SET source_concept_id = excluded.source_concept_id,
          target_concept_id = excluded.target_concept_id, relationship_type = excluded.relationship_type,
          updated_at = CURRENT_TIMESTAMP
      `);
      const insertConceptObjective = database.prepare(`
        INSERT INTO concept_learning_objectives (concept_id, objective_id, sort_order)
        VALUES (@conceptId, @objectiveId, @sortOrder)
        ON CONFLICT(concept_id, objective_id) DO UPDATE SET sort_order = excluded.sort_order
      `);
      const insertConceptLesson = database.prepare(`
        INSERT INTO lesson_concepts (lesson_id, concept_id, sort_order)
        VALUES (@lessonId, @conceptId, @sortOrder)
        ON CONFLICT(lesson_id, concept_id) DO UPDATE SET sort_order = excluded.sort_order
      `);
      const insertConceptApplication = database.prepare(`
        INSERT INTO concept_applications (id, concept_id, title, description, sort_order)
        VALUES (@id, @conceptId, @title, @description, @sortOrder)
        ON CONFLICT(id) DO UPDATE SET concept_id = excluded.concept_id, title = excluded.title,
          description = excluded.description, sort_order = excluded.sort_order, updated_at = CURRENT_TIMESTAMP
      `);
      const insertConceptMisconception = database.prepare(`
        INSERT INTO concept_misconceptions (id, concept_id, misconception, correction, sort_order)
        VALUES (@id, @conceptId, @misconception, @correction, @sortOrder)
        ON CONFLICT(id) DO UPDATE SET concept_id = excluded.concept_id, misconception = excluded.misconception,
          correction = excluded.correction, sort_order = excluded.sort_order, updated_at = CURRENT_TIMESTAMP
      `);
      const insertQuestion = database.prepare(
        "INSERT INTO questions (id, slug, title, question_type, subject_id, grade_min_id, grade_max_id, difficulty, estimated_time_seconds, source, author_profile_id, tags, status, current_version_number) VALUES (@id, @slug, @title, @type, @subjectId, @gradeMinId, @gradeMaxId, @difficulty, @estimatedTimeSeconds, @source, @authorProfileId, @tags, @status, 1) ON CONFLICT(id) DO UPDATE SET slug = excluded.slug, title = excluded.title, question_type = excluded.question_type, subject_id = excluded.subject_id, grade_min_id = excluded.grade_min_id, grade_max_id = excluded.grade_max_id, difficulty = excluded.difficulty, estimated_time_seconds = excluded.estimated_time_seconds, source = excluded.source, author_profile_id = excluded.author_profile_id, tags = excluded.tags, status = excluded.status, current_version_number = 1, updated_at = CURRENT_TIMESTAMP",
      );
      const insertQuestionVersion = database.prepare(
        "INSERT INTO question_versions (id, question_id, version_number, status, prompt, answer_spec, explanation, full_solution, common_wrong_answers, error_feedback, partial_credit_rules, change_summary, created_by_profile_id, published_at) VALUES (@id, @questionId, 1, @status, @prompt, @answerSpec, @explanation, @fullSolution, @commonWrongAnswers, @errorFeedback, @partialCreditRules, @changeSummary, @authorProfileId, CASE WHEN @status = 'published' THEN CURRENT_TIMESTAMP ELSE NULL END) ON CONFLICT(id) DO UPDATE SET question_id = excluded.question_id, status = excluded.status, prompt = excluded.prompt, answer_spec = excluded.answer_spec, explanation = excluded.explanation, full_solution = excluded.full_solution, common_wrong_answers = excluded.common_wrong_answers, error_feedback = excluded.error_feedback, partial_credit_rules = excluded.partial_credit_rules, change_summary = excluded.change_summary, created_by_profile_id = excluded.created_by_profile_id, published_at = excluded.published_at",
      );
      const insertQuestionOption = database.prepare(
        "INSERT INTO question_options (id, question_version_id, option_key, label, sort_order, is_correct) VALUES (@id, @versionId, @key, @label, @sortOrder, @isCorrect) ON CONFLICT(id) DO UPDATE SET question_version_id = excluded.question_version_id, option_key = excluded.option_key, label = excluded.label, sort_order = excluded.sort_order, is_correct = excluded.is_correct",
      );
      const insertQuestionHint = database.prepare(
        "INSERT INTO question_hints (id, question_version_id, level, content, sort_order) VALUES (@id, @versionId, @level, @content, @sortOrder) ON CONFLICT(id) DO UPDATE SET question_version_id = excluded.question_version_id, level = excluded.level, content = excluded.content, sort_order = excluded.sort_order",
      );
      const insertQuestionSolution = database.prepare(
        "INSERT INTO question_solutions (id, question_version_id, title, content, sort_order) VALUES (@id, @versionId, @title, @content, @sortOrder) ON CONFLICT(id) DO UPDATE SET question_version_id = excluded.question_version_id, title = excluded.title, content = excluded.content, sort_order = excluded.sort_order",
      );
      const insertQuestionConcept = database.prepare(
        "INSERT INTO question_concepts (question_id, concept_id, sort_order) VALUES (@questionId, @conceptId, @sortOrder) ON CONFLICT(question_id, concept_id) DO UPDATE SET sort_order = excluded.sort_order",
      );
      const insertQuestionObjective = database.prepare(
        "INSERT INTO question_learning_objectives (question_id, objective_id, sort_order) VALUES (@questionId, @objectiveId, @sortOrder) ON CONFLICT(question_id, objective_id) DO UPDATE SET sort_order = excluded.sort_order",
      );
      const insertQuestionTemplate = database.prepare(
        "INSERT INTO question_templates (id, question_id, slug, name, question_type, prompt_template, variables, answer_expression, validation_spec, seed, is_active) VALUES (@id, @questionId, @slug, @name, @questionType, @promptTemplate, @variables, @answerExpression, @validationSpec, @seed, @isActive) ON CONFLICT(id) DO UPDATE SET question_id = excluded.question_id, slug = excluded.slug, name = excluded.name, question_type = excluded.question_type, prompt_template = excluded.prompt_template, variables = excluded.variables, answer_expression = excluded.answer_expression, validation_spec = excluded.validation_spec, seed = excluded.seed, is_active = excluded.is_active, updated_at = CURRENT_TIMESTAMP",
      );
      const insertExerciseSet = database.prepare(
        "INSERT INTO exercise_sets (id, slug, title, description, kind, subject_id, grade_id, difficulty, status, estimated_time_seconds, created_by_profile_id) VALUES (@id, @slug, @title, @description, @kind, @subjectId, @gradeId, @difficulty, @status, @estimatedTimeSeconds, @createdByProfileId) ON CONFLICT(id) DO UPDATE SET slug = excluded.slug, title = excluded.title, description = excluded.description, kind = excluded.kind, subject_id = excluded.subject_id, grade_id = excluded.grade_id, difficulty = excluded.difficulty, status = excluded.status, estimated_time_seconds = excluded.estimated_time_seconds, created_by_profile_id = excluded.created_by_profile_id, updated_at = CURRENT_TIMESTAMP",
      );
      const insertExerciseSetQuestion = database.prepare(
        "INSERT INTO exercise_set_questions (exercise_set_id, question_id, sort_order, points, is_required) VALUES (@exerciseSetId, @questionId, @sortOrder, @points, @isRequired) ON CONFLICT(exercise_set_id, question_id) DO UPDATE SET sort_order = excluded.sort_order, points = excluded.points, is_required = excluded.is_required",
      );
      const insertAssessment = database.prepare(
        "INSERT INTO assessments (id, slug, title, description, assessment_type, subject_id, grade_id, status, time_limit_seconds, attempt_limit, passing_threshold, partial_credit, feedback_visibility, review_mode, retake_rule, question_ordering, auto_submit, configuration, created_by_profile_id) VALUES (@id, @slug, @title, @description, @type, @subjectId, @gradeId, @status, @timeLimitSeconds, @attemptLimit, @passingThreshold, @partialCredit, @feedbackVisibility, @reviewMode, @retakeRule, @questionOrdering, @autoSubmit, @configuration, @createdByProfileId) ON CONFLICT(id) DO UPDATE SET slug = excluded.slug, title = excluded.title, description = excluded.description, assessment_type = excluded.assessment_type, subject_id = excluded.subject_id, grade_id = excluded.grade_id, status = excluded.status, time_limit_seconds = excluded.time_limit_seconds, attempt_limit = excluded.attempt_limit, passing_threshold = excluded.passing_threshold, partial_credit = excluded.partial_credit, feedback_visibility = excluded.feedback_visibility, review_mode = excluded.review_mode, retake_rule = excluded.retake_rule, question_ordering = excluded.question_ordering, auto_submit = excluded.auto_submit, configuration = excluded.configuration, created_by_profile_id = excluded.created_by_profile_id, updated_at = CURRENT_TIMESTAMP",
      );
      const insertAssessmentSection = database.prepare(
        "INSERT INTO assessment_sections (id, assessment_id, title, description, sort_order, points, time_limit_seconds, question_ordering) VALUES (@id, @assessmentId, @title, @description, @sortOrder, @points, @timeLimitSeconds, @questionOrdering) ON CONFLICT(id) DO UPDATE SET assessment_id = excluded.assessment_id, title = excluded.title, description = excluded.description, sort_order = excluded.sort_order, points = excluded.points, time_limit_seconds = excluded.time_limit_seconds, question_ordering = excluded.question_ordering, updated_at = CURRENT_TIMESTAMP",
      );
      const insertAssessmentPool = database.prepare(
        "INSERT INTO assessment_pools (id, assessment_id, section_id, title, selection_count, difficulty_distribution, concept_ids, question_ordering) VALUES (@id, @assessmentId, @sectionId, @title, @selectionCount, @difficultyDistribution, @conceptIds, @questionOrdering) ON CONFLICT(id) DO UPDATE SET assessment_id = excluded.assessment_id, section_id = excluded.section_id, title = excluded.title, selection_count = excluded.selection_count, difficulty_distribution = excluded.difficulty_distribution, concept_ids = excluded.concept_ids, question_ordering = excluded.question_ordering, updated_at = CURRENT_TIMESTAMP",
      );
      const insertAssessmentQuestion = database.prepare(
        "INSERT INTO assessment_questions (id, assessment_id, section_id, pool_id, question_id, sort_order, points, is_required) VALUES (@id, @assessmentId, @sectionId, @poolId, @questionId, @sortOrder, @points, @isRequired) ON CONFLICT(id) DO UPDATE SET assessment_id = excluded.assessment_id, section_id = excluded.section_id, pool_id = excluded.pool_id, question_id = excluded.question_id, sort_order = excluded.sort_order, points = excluded.points, is_required = excluded.is_required",
      );
      const insertMasteryRule = database.prepare(
        "INSERT INTO mastery_rules (id, slug, name, description, configuration, is_active) VALUES (@id, @slug, @name, @description, @configuration, @isActive) ON CONFLICT(id) DO UPDATE SET slug = excluded.slug, name = excluded.name, description = excluded.description, configuration = excluded.configuration, is_active = excluded.is_active, updated_at = CURRENT_TIMESTAMP",
      );
      const insertRecommendationRule = database.prepare(
        "INSERT INTO recommendation_rules (id, slug, name, description, configuration, is_active) VALUES (@id, @slug, @name, @description, @configuration, @isActive) ON CONFLICT(id) DO UPDATE SET slug = excluded.slug, name = excluded.name, description = excluded.description, configuration = excluded.configuration, is_active = excluded.is_active, updated_at = CURRENT_TIMESTAMP",
      );
      const insertRoadmap = database.prepare(
        "INSERT INTO roadmaps (id, slug, title, description, goal, target_grade_id, target_difficulty, estimated_duration_minutes, cover_image, status, created_by_profile_id, current_version_number, published_version_id) VALUES (@id, @slug, @title, @description, @goal, @targetGradeId, @targetDifficulty, @estimatedDurationMinutes, @coverImage, @status, @createdByProfileId, 1, @publishedVersionId) ON CONFLICT(id) DO UPDATE SET slug = excluded.slug, title = excluded.title, description = excluded.description, goal = excluded.goal, target_grade_id = excluded.target_grade_id, target_difficulty = excluded.target_difficulty, estimated_duration_minutes = excluded.estimated_duration_minutes, cover_image = excluded.cover_image, status = excluded.status, current_version_number = 1, published_version_id = excluded.published_version_id, updated_at = CURRENT_TIMESTAMP",
      );
      const insertRoadmapVersion = database.prepare(
        "INSERT INTO roadmap_versions (id, roadmap_id, version_number, status, change_summary, snapshot, created_by_profile_id, published_at) VALUES (@id, @roadmapId, @versionNumber, @status, @changeSummary, @snapshot, @createdByProfileId, @publishedAt) ON CONFLICT(id) DO UPDATE SET roadmap_id = excluded.roadmap_id, version_number = excluded.version_number, status = excluded.status, change_summary = excluded.change_summary, snapshot = excluded.snapshot, created_by_profile_id = excluded.created_by_profile_id, published_at = excluded.published_at",
      );
      const insertRoadmapSubject = database.prepare(
        "INSERT INTO roadmap_subjects (roadmap_id, subject_id, sort_order) VALUES (@roadmapId, @subjectId, @sortOrder) ON CONFLICT(roadmap_id, subject_id) DO UPDATE SET sort_order = excluded.sort_order",
      );
      const insertRoadmapPrerequisite = database.prepare(
        "INSERT INTO roadmap_prerequisites (roadmap_id, prerequisite_roadmap_id, is_required) VALUES (@roadmapId, @prerequisiteRoadmapId, @isRequired) ON CONFLICT(roadmap_id, prerequisite_roadmap_id) DO UPDATE SET is_required = excluded.is_required",
      );
      const insertRoadmapNode = database.prepare(
        "INSERT INTO roadmap_nodes (id, roadmap_version_id, node_key, node_type, title, description, reference_id, reference_title, subject_id, is_required, is_checkpoint, is_optional_branch, sort_order, estimated_duration_minutes, metadata) VALUES (@id, @roadmapVersionId, @nodeKey, @type, @title, @description, @referenceId, @referenceTitle, @subjectId, @isRequired, @isCheckpoint, @isOptionalBranch, @sortOrder, @estimatedDurationMinutes, @metadata) ON CONFLICT(id) DO UPDATE SET roadmap_version_id = excluded.roadmap_version_id, node_key = excluded.node_key, node_type = excluded.node_type, title = excluded.title, description = excluded.description, reference_id = excluded.reference_id, reference_title = excluded.reference_title, subject_id = excluded.subject_id, is_required = excluded.is_required, is_checkpoint = excluded.is_checkpoint, is_optional_branch = excluded.is_optional_branch, sort_order = excluded.sort_order, estimated_duration_minutes = excluded.estimated_duration_minutes, metadata = excluded.metadata, updated_at = CURRENT_TIMESTAMP",
      );
      const insertRoadmapEdge = database.prepare(
        "INSERT INTO roadmap_edges (id, roadmap_version_id, source_node_id, target_node_id, edge_type, sort_order) VALUES (@id, @roadmapVersionId, @sourceNodeId, @targetNodeId, @type, @sortOrder) ON CONFLICT(id) DO UPDATE SET roadmap_version_id = excluded.roadmap_version_id, source_node_id = excluded.source_node_id, target_node_id = excluded.target_node_id, edge_type = excluded.edge_type, sort_order = excluded.sort_order",
      );
      const insertSimulation = database.prepare(
        "INSERT INTO simulations (id, slug, title, description, subject_id, status, estimated_duration_minutes, current_version_number, published_version_id) VALUES (@id, @slug, @title, @description, @subjectId, 'published', @estimatedDurationMinutes, 1, @versionId) ON CONFLICT(id) DO UPDATE SET slug = excluded.slug, title = excluded.title, description = excluded.description, subject_id = excluded.subject_id, status = 'published', estimated_duration_minutes = excluded.estimated_duration_minutes, current_version_number = 1, published_version_id = excluded.published_version_id, updated_at = CURRENT_TIMESTAMP",
      );
      const insertSimulationVersion = database.prepare(
        "INSERT INTO simulation_versions (id, simulation_id, version_number, status, definition, change_summary, published_at) VALUES (@id, @simulationId, 1, 'published', @definition, 'Initial published simulation.', CURRENT_TIMESTAMP) ON CONFLICT(id) DO UPDATE SET definition = excluded.definition, status = 'published', published_at = excluded.published_at",
      );
      const insertSimulationInput = database.prepare(
        "INSERT INTO simulation_inputs (simulation_version_id, input_key, label, input_type, configuration, sort_order) VALUES (@versionId, @key, @label, @type, @configuration, @sortOrder) ON CONFLICT(simulation_version_id, input_key) DO UPDATE SET label = excluded.label, input_type = excluded.input_type, configuration = excluded.configuration, sort_order = excluded.sort_order",
      );
      const insertSimulationPreset = database.prepare(
        'INSERT INTO simulation_presets (id, simulation_id, profile_id, name, "values", is_default) VALUES (@id, @simulationId, NULL, @name, @values, @isDefault) ON CONFLICT(id) DO UPDATE SET "values" = excluded."values", is_default = excluded.is_default',
      );
      const insertLessonSimulation = database.prepare(
        "INSERT INTO lesson_simulations (lesson_id, simulation_id, instructions, sort_order, is_required) VALUES (@lessonId, @simulationId, @instructions, @sortOrder, 0) ON CONFLICT(lesson_id, simulation_id) DO UPDATE SET instructions = excluded.instructions, sort_order = excluded.sort_order",
      );
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
        for (const concept of conceptSeed) insertConcept.run(concept);
        for (const [id, sourceConceptId, targetConceptId, type] of conceptRelationshipSeed)
          insertConceptRelationship.run({ id, sourceConceptId, targetConceptId, type });
        for (const [conceptId, objectiveId, sortOrder] of conceptObjectiveSeed)
          insertConceptObjective.run({ conceptId, objectiveId, sortOrder });
        for (const [conceptId, lessonId, sortOrder] of conceptLessonSeed)
          insertConceptLesson.run({ conceptId, lessonId, sortOrder });
        for (const [id, conceptId, title, description, sortOrder] of conceptApplicationSeed)
          insertConceptApplication.run({ id, conceptId, title, description, sortOrder });
        for (const [
          id,
          conceptId,
          misconception,
          correction,
          sortOrder,
        ] of conceptMisconceptionSeed)
          insertConceptMisconception.run({ id, conceptId, misconception, correction, sortOrder });
        for (const question of questionSeed) {
          insertQuestion.run({
            ...question,
            tags: JSON.stringify(question.tags),
            answerSpec: JSON.stringify(question.answerSpec),
            commonWrongAnswers: JSON.stringify(question.commonWrongAnswers),
            errorFeedback: JSON.stringify(question.errorFeedback),
            partialCreditRules: question.partialCreditRules
              ? JSON.stringify(question.partialCreditRules)
              : null,
          });
          const versionId = "question-version-" + question.id;
          insertQuestionVersion.run({
            id: versionId,
            questionId: question.id,
            status: question.status,
            prompt: question.prompt,
            answerSpec: JSON.stringify(question.answerSpec),
            explanation: question.explanation,
            fullSolution: question.fullSolution,
            commonWrongAnswers: JSON.stringify(question.commonWrongAnswers),
            errorFeedback: JSON.stringify(question.errorFeedback),
            partialCreditRules: question.partialCreditRules
              ? JSON.stringify(question.partialCreditRules)
              : null,
            changeSummary:
              (question as { changeSummary?: string }).changeSummary ??
              "Initial published question.",
            authorProfileId: question.authorProfileId,
          });
          for (const option of question.options)
            insertQuestionOption.run({ ...option, versionId, isCorrect: option.isCorrect ? 1 : 0 });
          for (const hint of question.hints) insertQuestionHint.run({ ...hint, versionId });
          for (const solution of question.solutions)
            insertQuestionSolution.run({ ...solution, versionId });
          for (const [sortOrder, conceptId] of question.conceptIds.entries())
            insertQuestionConcept.run({ questionId: question.id, conceptId, sortOrder });
          for (const [sortOrder, objectiveId] of question.learningObjectiveIds.entries())
            insertQuestionObjective.run({ questionId: question.id, objectiveId, sortOrder });
        }
        for (const template of questionTemplateSeed) {
          insertQuestionTemplate.run({
            ...template,
            questionId: template.questionId,
            variables: JSON.stringify(template.variables),
            validationSpec: JSON.stringify(template.validationSpec),
            isActive: template.isActive ? 1 : 0,
          });
        }
        for (const exerciseSet of exerciseSetSeed) insertExerciseSet.run(exerciseSet);
        for (const [
          exerciseSetId,
          questionId,
          sortOrder,
          points,
          isRequired,
        ] of exerciseSetQuestionSeed)
          insertExerciseSetQuestion.run({
            exerciseSetId,
            questionId,
            sortOrder,
            points,
            isRequired: isRequired ? 1 : 0,
          });
        for (const assessment of assessmentSeed)
          insertAssessment.run({
            ...assessment,
            partialCredit: assessment.partialCredit ? 1 : 0,
            autoSubmit: assessment.autoSubmit ? 1 : 0,
            configuration: JSON.stringify(assessment.configuration),
          });
        for (const section of assessmentSectionSeed) insertAssessmentSection.run(section);
        for (const pool of assessmentPoolSeed)
          insertAssessmentPool.run({
            ...pool,
            difficultyDistribution: JSON.stringify(pool.difficultyDistribution),
            conceptIds: JSON.stringify(pool.conceptIds),
          });
        for (const question of assessmentQuestionSeed)
          insertAssessmentQuestion.run({
            ...question,
            isRequired: question.isRequired ? 1 : 0,
          });
        for (const rule of masteryRuleSeed)
          insertMasteryRule.run({
            ...rule,
            configuration: JSON.stringify(rule.configuration),
            isActive: rule.isActive ? 1 : 0,
          });
        for (const rule of recommendationRuleSeed)
          insertRecommendationRule.run({
            ...rule,
            configuration: JSON.stringify(rule.configuration),
            isActive: rule.isActive ? 1 : 0,
          });
        for (const roadmap of roadmapSeed)
          insertRoadmap.run({
            ...roadmap,
            targetGradeId: roadmap.targetGradeId,
            publishedVersionId: `${roadmap.id}-version-1`,
          });
        for (const version of roadmapVersionSeed)
          insertRoadmapVersion.run({
            ...version,
            snapshot: JSON.stringify({}),
          });
        for (const [roadmapId, subjectId, sortOrder] of roadmapSubjectSeed)
          insertRoadmapSubject.run({ roadmapId, subjectId, sortOrder });
        for (const [roadmapId, prerequisiteRoadmapId, isRequired] of roadmapPrerequisiteSeed)
          insertRoadmapPrerequisite.run({
            roadmapId,
            prerequisiteRoadmapId,
            isRequired: isRequired ? 1 : 0,
          });
        for (const node of roadmapNodeSeed)
          insertRoadmapNode.run({
            ...node,
            roadmapVersionId: `${node.roadmapId}-version-1`,
            isRequired: node.isRequired ? 1 : 0,
            isCheckpoint: node.isCheckpoint ? 1 : 0,
            isOptionalBranch: node.isOptionalBranch ? 1 : 0,
            metadata: JSON.stringify(node.metadata),
          });
        for (const edge of roadmapEdgeSeed)
          insertRoadmapEdge.run({ ...edge, roadmapVersionId: `${edge.roadmapId}-version-1` });
        for (const simulation of simulationSeed) {
          insertSimulation.run(simulation);
          insertSimulationVersion.run({
            id: simulation.versionId,
            simulationId: simulation.id,
            definition: JSON.stringify(simulation.definition),
          });
          for (const [sortOrder, input] of simulation.definition.inputs.entries())
            insertSimulationInput.run({
              versionId: simulation.versionId,
              key: input.key,
              label: input.label,
              type: input.type,
              configuration: JSON.stringify(input),
              sortOrder,
            });
          for (const [sortOrder, preset] of simulation.presets.entries())
            insertSimulationPreset.run({
              id: `${simulation.id}-preset-${sortOrder}`,
              simulationId: simulation.id,
              name: preset.name,
              values: JSON.stringify(preset.values),
              isDefault: preset.isDefault ? 1 : 0,
            });
        }
        insertLessonSimulation.run({
          lessonId: "lesson-constant-acceleration",
          simulationId: "simulation-one-dimensional-motion",
          instructions:
            "Change acceleration and time, then compare the predicted position and velocity.",
          sortOrder: 0,
        });
      });
      seedStructure();
      seedLaboratoriesSqlite(database);
      seedStudyPlannerSqlite(database);
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
      for (const concept of conceptSeed) {
        await transaction`
          INSERT INTO concepts (id, slug, name, description, subject_id, domain_id, grade_min_id, grade_max_id, difficulty, mastery_threshold, is_archived)
          VALUES (${concept.id}, ${concept.slug}, ${concept.name}, ${concept.description}, ${concept.subjectId}, ${concept.domainId}, ${concept.gradeMinId}, ${concept.gradeMaxId}, ${concept.difficulty}, ${concept.masteryThreshold}, FALSE)
          ON CONFLICT (id) DO UPDATE SET slug = EXCLUDED.slug, name = EXCLUDED.name, description = EXCLUDED.description,
            subject_id = EXCLUDED.subject_id, domain_id = EXCLUDED.domain_id, grade_min_id = EXCLUDED.grade_min_id,
            grade_max_id = EXCLUDED.grade_max_id, difficulty = EXCLUDED.difficulty, mastery_threshold = EXCLUDED.mastery_threshold,
            is_archived = FALSE, updated_at = NOW()
        `;
      }
      for (const [id, sourceConceptId, targetConceptId, type] of conceptRelationshipSeed) {
        await transaction`
          INSERT INTO concept_relationships (id, source_concept_id, target_concept_id, relationship_type)
          VALUES (${id}, ${sourceConceptId}, ${targetConceptId}, ${type})
          ON CONFLICT (id) DO UPDATE SET source_concept_id = EXCLUDED.source_concept_id,
            target_concept_id = EXCLUDED.target_concept_id, relationship_type = EXCLUDED.relationship_type,
            updated_at = NOW()
        `;
      }
      for (const [conceptId, objectiveId, sortOrder] of conceptObjectiveSeed) {
        await transaction`
          INSERT INTO concept_learning_objectives (concept_id, objective_id, sort_order)
          VALUES (${conceptId}, ${objectiveId}, ${sortOrder})
          ON CONFLICT (concept_id, objective_id) DO UPDATE SET sort_order = EXCLUDED.sort_order
        `;
      }
      for (const [conceptId, lessonId, sortOrder] of conceptLessonSeed) {
        await transaction`
          INSERT INTO lesson_concepts (lesson_id, concept_id, sort_order)
          VALUES (${lessonId}, ${conceptId}, ${sortOrder})
          ON CONFLICT (lesson_id, concept_id) DO UPDATE SET sort_order = EXCLUDED.sort_order
        `;
      }
      for (const [id, conceptId, title, description, sortOrder] of conceptApplicationSeed) {
        await transaction`
          INSERT INTO concept_applications (id, concept_id, title, description, sort_order)
          VALUES (${id}, ${conceptId}, ${title}, ${description}, ${sortOrder})
          ON CONFLICT (id) DO UPDATE SET concept_id = EXCLUDED.concept_id, title = EXCLUDED.title,
            description = EXCLUDED.description, sort_order = EXCLUDED.sort_order, updated_at = NOW()
        `;
      }
      for (const [
        id,
        conceptId,
        misconception,
        correction,
        sortOrder,
      ] of conceptMisconceptionSeed) {
        await transaction`
          INSERT INTO concept_misconceptions (id, concept_id, misconception, correction, sort_order)
          VALUES (${id}, ${conceptId}, ${misconception}, ${correction}, ${sortOrder})
          ON CONFLICT (id) DO UPDATE SET concept_id = EXCLUDED.concept_id, misconception = EXCLUDED.misconception,
            correction = EXCLUDED.correction, sort_order = EXCLUDED.sort_order, updated_at = NOW()
        `;
      }
      for (const question of questionSeed) {
        await transaction.unsafe(
          "INSERT INTO questions (id, slug, title, question_type, subject_id, grade_min_id, grade_max_id, difficulty, estimated_time_seconds, source, author_profile_id, tags, status, current_version_number) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 1) ON CONFLICT (id) DO UPDATE SET slug = EXCLUDED.slug, title = EXCLUDED.title, question_type = EXCLUDED.question_type, subject_id = EXCLUDED.subject_id, grade_min_id = EXCLUDED.grade_min_id, grade_max_id = EXCLUDED.grade_max_id, difficulty = EXCLUDED.difficulty, estimated_time_seconds = EXCLUDED.estimated_time_seconds, source = EXCLUDED.source, author_profile_id = EXCLUDED.author_profile_id, tags = EXCLUDED.tags, status = EXCLUDED.status, current_version_number = 1, updated_at = NOW()",
          [
            question.id,
            question.slug,
            question.title,
            question.type,
            question.subjectId,
            question.gradeMinId,
            question.gradeMaxId,
            question.difficulty,
            question.estimatedTimeSeconds,
            question.source,
            question.authorProfileId,
            JSON.stringify(question.tags),
            question.status,
          ],
        );
        const versionId = "question-version-" + question.id;
        await transaction.unsafe(
          "INSERT INTO question_versions (id, question_id, version_number, status, prompt, answer_spec, explanation, full_solution, common_wrong_answers, error_feedback, partial_credit_rules, change_summary, created_by_profile_id, published_at) VALUES ($1, $2, 1, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) ON CONFLICT (id) DO UPDATE SET question_id = EXCLUDED.question_id, status = EXCLUDED.status, prompt = EXCLUDED.prompt, answer_spec = EXCLUDED.answer_spec, explanation = EXCLUDED.explanation, full_solution = EXCLUDED.full_solution, common_wrong_answers = EXCLUDED.common_wrong_answers, error_feedback = EXCLUDED.error_feedback, partial_credit_rules = EXCLUDED.partial_credit_rules, change_summary = EXCLUDED.change_summary, created_by_profile_id = EXCLUDED.created_by_profile_id, published_at = EXCLUDED.published_at",
          [
            versionId,
            question.id,
            question.status,
            question.prompt,
            JSON.stringify(question.answerSpec),
            question.explanation,
            question.fullSolution,
            JSON.stringify(question.commonWrongAnswers),
            JSON.stringify(question.errorFeedback),
            question.partialCreditRules ? JSON.stringify(question.partialCreditRules) : null,
            (question as { changeSummary?: string }).changeSummary ?? "Initial published question.",
            question.authorProfileId,
            question.status === "published" ? new Date().toISOString() : null,
          ],
        );
        for (const option of question.options)
          await transaction.unsafe(
            "INSERT INTO question_options (id, question_version_id, option_key, label, sort_order, is_correct) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (id) DO UPDATE SET question_version_id = EXCLUDED.question_version_id, option_key = EXCLUDED.option_key, label = EXCLUDED.label, sort_order = EXCLUDED.sort_order, is_correct = EXCLUDED.is_correct",
            [option.id, versionId, option.key, option.label, option.sortOrder, option.isCorrect],
          );
        for (const hint of question.hints)
          await transaction.unsafe(
            "INSERT INTO question_hints (id, question_version_id, level, content, sort_order) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (id) DO UPDATE SET question_version_id = EXCLUDED.question_version_id, level = EXCLUDED.level, content = EXCLUDED.content, sort_order = EXCLUDED.sort_order",
            [hint.id, versionId, hint.level, hint.content, hint.sortOrder],
          );
        for (const solution of question.solutions)
          await transaction.unsafe(
            "INSERT INTO question_solutions (id, question_version_id, title, content, sort_order) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (id) DO UPDATE SET question_version_id = EXCLUDED.question_version_id, title = EXCLUDED.title, content = EXCLUDED.content, sort_order = EXCLUDED.sort_order",
            [solution.id, versionId, solution.title, solution.content, solution.sortOrder],
          );
        for (const [sortOrder, conceptId] of question.conceptIds.entries())
          await transaction.unsafe(
            "INSERT INTO question_concepts (question_id, concept_id, sort_order) VALUES ($1, $2, $3) ON CONFLICT (question_id, concept_id) DO UPDATE SET sort_order = EXCLUDED.sort_order",
            [question.id, conceptId, sortOrder],
          );
        for (const [sortOrder, objectiveId] of question.learningObjectiveIds.entries())
          await transaction.unsafe(
            "INSERT INTO question_learning_objectives (question_id, objective_id, sort_order) VALUES ($1, $2, $3) ON CONFLICT (question_id, objective_id) DO UPDATE SET sort_order = EXCLUDED.sort_order",
            [question.id, objectiveId, sortOrder],
          );
      }
      for (const template of questionTemplateSeed)
        await transaction.unsafe(
          "INSERT INTO question_templates (id, question_id, slug, name, question_type, prompt_template, variables, answer_expression, validation_spec, seed, is_active) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) ON CONFLICT (id) DO UPDATE SET question_id = EXCLUDED.question_id, slug = EXCLUDED.slug, name = EXCLUDED.name, question_type = EXCLUDED.question_type, prompt_template = EXCLUDED.prompt_template, variables = EXCLUDED.variables, answer_expression = EXCLUDED.answer_expression, validation_spec = EXCLUDED.validation_spec, seed = EXCLUDED.seed, is_active = EXCLUDED.is_active, updated_at = NOW()",
          [
            template.id,
            template.questionId,
            template.slug,
            template.name,
            template.questionType,
            template.promptTemplate,
            JSON.stringify(template.variables),
            template.answerExpression,
            JSON.stringify(template.validationSpec),
            template.seed,
            template.isActive,
          ],
        );
      for (const exerciseSet of exerciseSetSeed)
        await transaction.unsafe(
          "INSERT INTO exercise_sets (id, slug, title, description, kind, subject_id, grade_id, difficulty, status, estimated_time_seconds, created_by_profile_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) ON CONFLICT (id) DO UPDATE SET slug = EXCLUDED.slug, title = EXCLUDED.title, description = EXCLUDED.description, kind = EXCLUDED.kind, subject_id = EXCLUDED.subject_id, grade_id = EXCLUDED.grade_id, difficulty = EXCLUDED.difficulty, status = EXCLUDED.status, estimated_time_seconds = EXCLUDED.estimated_time_seconds, created_by_profile_id = EXCLUDED.created_by_profile_id, updated_at = NOW()",
          [
            exerciseSet.id,
            exerciseSet.slug,
            exerciseSet.title,
            exerciseSet.description,
            exerciseSet.kind,
            exerciseSet.subjectId,
            exerciseSet.gradeId,
            exerciseSet.difficulty,
            exerciseSet.status,
            exerciseSet.estimatedTimeSeconds,
            exerciseSet.createdByProfileId,
          ],
        );
      for (const [
        exerciseSetId,
        questionId,
        sortOrder,
        points,
        isRequired,
      ] of exerciseSetQuestionSeed)
        await transaction.unsafe(
          "INSERT INTO exercise_set_questions (exercise_set_id, question_id, sort_order, points, is_required) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (exercise_set_id, question_id) DO UPDATE SET sort_order = EXCLUDED.sort_order, points = EXCLUDED.points, is_required = EXCLUDED.is_required",
          [exerciseSetId, questionId, sortOrder, points, isRequired],
        );
      for (const assessment of assessmentSeed)
        await transaction.unsafe(
          "INSERT INTO assessments (id, slug, title, description, type, subject_id, grade_id, status, time_limit_seconds, attempt_limit, passing_threshold, partial_credit, feedback_visibility, review_mode, retake_rule, question_ordering, auto_submit, configuration, created_by_profile_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19) ON CONFLICT (id) DO UPDATE SET slug = EXCLUDED.slug, title = EXCLUDED.title, description = EXCLUDED.description, type = EXCLUDED.type, subject_id = EXCLUDED.subject_id, grade_id = EXCLUDED.grade_id, status = EXCLUDED.status, time_limit_seconds = EXCLUDED.time_limit_seconds, attempt_limit = EXCLUDED.attempt_limit, passing_threshold = EXCLUDED.passing_threshold, partial_credit = EXCLUDED.partial_credit, feedback_visibility = EXCLUDED.feedback_visibility, review_mode = EXCLUDED.review_mode, retake_rule = EXCLUDED.retake_rule, question_ordering = EXCLUDED.question_ordering, auto_submit = EXCLUDED.auto_submit, configuration = EXCLUDED.configuration, created_by_profile_id = EXCLUDED.created_by_profile_id, updated_at = NOW()",
          [
            assessment.id,
            assessment.slug,
            assessment.title,
            assessment.description,
            assessment.type,
            assessment.subjectId,
            assessment.gradeId,
            assessment.status,
            assessment.timeLimitSeconds,
            assessment.attemptLimit,
            assessment.passingThreshold,
            assessment.partialCredit,
            assessment.feedbackVisibility,
            assessment.reviewMode,
            assessment.retakeRule,
            assessment.questionOrdering,
            assessment.autoSubmit,
            JSON.stringify(assessment.configuration),
            assessment.createdByProfileId,
          ],
        );
      for (const section of assessmentSectionSeed)
        await transaction.unsafe(
          "INSERT INTO assessment_sections (id, assessment_id, title, description, sort_order, points, time_limit_seconds, question_ordering) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT (id) DO UPDATE SET assessment_id = EXCLUDED.assessment_id, title = EXCLUDED.title, description = EXCLUDED.description, sort_order = EXCLUDED.sort_order, points = EXCLUDED.points, time_limit_seconds = EXCLUDED.time_limit_seconds, question_ordering = EXCLUDED.question_ordering, updated_at = NOW()",
          [
            section.id,
            section.assessmentId,
            section.title,
            section.description,
            section.sortOrder,
            section.points,
            section.timeLimitSeconds,
            section.questionOrdering,
          ],
        );
      for (const pool of assessmentPoolSeed)
        await transaction.unsafe(
          "INSERT INTO assessment_pools (id, assessment_id, section_id, title, selection_count, difficulty_distribution, concept_ids, question_ordering) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT (id) DO UPDATE SET assessment_id = EXCLUDED.assessment_id, section_id = EXCLUDED.section_id, title = EXCLUDED.title, selection_count = EXCLUDED.selection_count, difficulty_distribution = EXCLUDED.difficulty_distribution, concept_ids = EXCLUDED.concept_ids, question_ordering = EXCLUDED.question_ordering, updated_at = NOW()",
          [
            pool.id,
            pool.assessmentId,
            pool.sectionId,
            pool.title,
            pool.selectionCount,
            JSON.stringify(pool.difficultyDistribution),
            JSON.stringify(pool.conceptIds),
            pool.questionOrdering,
          ],
        );
      for (const question of assessmentQuestionSeed)
        await transaction.unsafe(
          "INSERT INTO assessment_questions (id, assessment_id, section_id, pool_id, question_id, sort_order, points, is_required) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT (id) DO UPDATE SET assessment_id = EXCLUDED.assessment_id, section_id = EXCLUDED.section_id, pool_id = EXCLUDED.pool_id, question_id = EXCLUDED.question_id, sort_order = EXCLUDED.sort_order, points = EXCLUDED.points, is_required = EXCLUDED.is_required, updated_at = NOW()",
          [
            question.id,
            question.assessmentId,
            question.sectionId,
            question.poolId,
            question.questionId,
            question.sortOrder,
            question.points,
            question.isRequired,
          ],
        );
      for (const rule of masteryRuleSeed)
        await transaction.unsafe(
          "INSERT INTO mastery_rules (id, slug, name, description, configuration, is_active) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (id) DO UPDATE SET slug = EXCLUDED.slug, name = EXCLUDED.name, description = EXCLUDED.description, configuration = EXCLUDED.configuration, is_active = EXCLUDED.is_active, updated_at = NOW()",
          [
            rule.id,
            rule.slug,
            rule.name,
            rule.description,
            JSON.stringify(rule.configuration),
            rule.isActive,
          ],
        );
      for (const rule of recommendationRuleSeed)
        await transaction.unsafe(
          "INSERT INTO recommendation_rules (id, slug, name, description, configuration, is_active) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (id) DO UPDATE SET slug = EXCLUDED.slug, name = EXCLUDED.name, description = EXCLUDED.description, configuration = EXCLUDED.configuration, is_active = EXCLUDED.is_active, updated_at = NOW()",
          [
            rule.id,
            rule.slug,
            rule.name,
            rule.description,
            JSON.stringify(rule.configuration),
            rule.isActive,
          ],
        );
      for (const roadmap of roadmapSeed)
        await transaction.unsafe(
          "INSERT INTO roadmaps (id, slug, title, description, goal, target_grade_id, target_difficulty, estimated_duration_minutes, cover_image, status, created_by_profile_id, current_version_number, published_version_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 1, $12) ON CONFLICT (id) DO UPDATE SET slug = EXCLUDED.slug, title = EXCLUDED.title, description = EXCLUDED.description, goal = EXCLUDED.goal, target_grade_id = EXCLUDED.target_grade_id, target_difficulty = EXCLUDED.target_difficulty, estimated_duration_minutes = EXCLUDED.estimated_duration_minutes, cover_image = EXCLUDED.cover_image, status = EXCLUDED.status, current_version_number = 1, published_version_id = EXCLUDED.published_version_id, updated_at = NOW()",
          [
            roadmap.id,
            roadmap.slug,
            roadmap.title,
            roadmap.description,
            roadmap.goal,
            roadmap.targetGradeId,
            roadmap.targetDifficulty,
            roadmap.estimatedDurationMinutes,
            roadmap.coverImage,
            roadmap.status,
            roadmap.createdByProfileId,
            `${roadmap.id}-version-1`,
          ],
        );
      for (const version of roadmapVersionSeed)
        await transaction.unsafe(
          "INSERT INTO roadmap_versions (id, roadmap_id, version_number, status, change_summary, snapshot, created_by_profile_id, published_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT (id) DO UPDATE SET roadmap_id = EXCLUDED.roadmap_id, version_number = EXCLUDED.version_number, status = EXCLUDED.status, change_summary = EXCLUDED.change_summary, snapshot = EXCLUDED.snapshot, created_by_profile_id = EXCLUDED.created_by_profile_id, published_at = EXCLUDED.published_at",
          [
            version.id,
            version.roadmapId,
            version.versionNumber,
            version.status,
            version.changeSummary,
            JSON.stringify({}),
            version.createdByProfileId,
            version.publishedAt,
          ],
        );
      for (const [roadmapId, subjectId, sortOrder] of roadmapSubjectSeed)
        await transaction.unsafe(
          "INSERT INTO roadmap_subjects (roadmap_id, subject_id, sort_order) VALUES ($1, $2, $3) ON CONFLICT (roadmap_id, subject_id) DO UPDATE SET sort_order = EXCLUDED.sort_order",
          [roadmapId, subjectId, sortOrder],
        );
      for (const [roadmapId, prerequisiteRoadmapId, isRequired] of roadmapPrerequisiteSeed)
        await transaction.unsafe(
          "INSERT INTO roadmap_prerequisites (roadmap_id, prerequisite_roadmap_id, is_required) VALUES ($1, $2, $3) ON CONFLICT (roadmap_id, prerequisite_roadmap_id) DO UPDATE SET is_required = EXCLUDED.is_required",
          [roadmapId, prerequisiteRoadmapId, isRequired],
        );
      for (const node of roadmapNodeSeed)
        await transaction.unsafe(
          "INSERT INTO roadmap_nodes (id, roadmap_version_id, node_key, node_type, title, description, reference_id, reference_title, subject_id, is_required, is_checkpoint, is_optional_branch, sort_order, estimated_duration_minutes, metadata) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15) ON CONFLICT (id) DO UPDATE SET roadmap_version_id = EXCLUDED.roadmap_version_id, node_key = EXCLUDED.node_key, node_type = EXCLUDED.node_type, title = EXCLUDED.title, description = EXCLUDED.description, reference_id = EXCLUDED.reference_id, reference_title = EXCLUDED.reference_title, subject_id = EXCLUDED.subject_id, is_required = EXCLUDED.is_required, is_checkpoint = EXCLUDED.is_checkpoint, is_optional_branch = EXCLUDED.is_optional_branch, sort_order = EXCLUDED.sort_order, estimated_duration_minutes = EXCLUDED.estimated_duration_minutes, metadata = EXCLUDED.metadata, updated_at = NOW()",
          [
            node.id,
            `${node.roadmapId}-version-1`,
            node.nodeKey,
            node.type,
            node.title,
            node.description,
            node.referenceId,
            node.referenceTitle,
            node.subjectId,
            node.isRequired,
            node.isCheckpoint,
            node.isOptionalBranch,
            node.sortOrder,
            node.estimatedDurationMinutes,
            JSON.stringify(node.metadata),
          ],
        );
      for (const edge of roadmapEdgeSeed)
        await transaction.unsafe(
          "INSERT INTO roadmap_edges (id, roadmap_version_id, source_node_id, target_node_id, edge_type, sort_order) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (id) DO UPDATE SET roadmap_version_id = EXCLUDED.roadmap_version_id, source_node_id = EXCLUDED.source_node_id, target_node_id = EXCLUDED.target_node_id, edge_type = EXCLUDED.edge_type, sort_order = EXCLUDED.sort_order",
          [
            edge.id,
            `${edge.roadmapId}-version-1`,
            edge.sourceNodeId,
            edge.targetNodeId,
            edge.type,
            edge.sortOrder,
          ],
        );
      for (const simulation of simulationSeed) {
        await transaction.unsafe(
          "INSERT INTO simulations (id, slug, title, description, subject_id, status, estimated_duration_minutes, current_version_number, published_version_id) VALUES ($1, $2, $3, $4, $5, 'published', $6, 1, $7) ON CONFLICT (id) DO UPDATE SET slug = EXCLUDED.slug, title = EXCLUDED.title, description = EXCLUDED.description, subject_id = EXCLUDED.subject_id, status = 'published', estimated_duration_minutes = EXCLUDED.estimated_duration_minutes, current_version_number = 1, published_version_id = EXCLUDED.published_version_id, updated_at = NOW()",
          [
            simulation.id,
            simulation.slug,
            simulation.title,
            simulation.description,
            simulation.subjectId,
            simulation.estimatedDurationMinutes,
            simulation.versionId,
          ],
        );
        await transaction.unsafe(
          "INSERT INTO simulation_versions (id, simulation_id, version_number, status, definition, change_summary, published_at) VALUES ($1, $2, 1, 'published', $3, 'Initial published simulation.', NOW()) ON CONFLICT (id) DO UPDATE SET definition = EXCLUDED.definition, status = 'published', published_at = EXCLUDED.published_at",
          [simulation.versionId, simulation.id, JSON.stringify(simulation.definition)],
        );
        for (const [sortOrder, input] of simulation.definition.inputs.entries())
          await transaction.unsafe(
            "INSERT INTO simulation_inputs (simulation_version_id, input_key, label, input_type, configuration, sort_order) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (simulation_version_id, input_key) DO UPDATE SET label = EXCLUDED.label, input_type = EXCLUDED.input_type, configuration = EXCLUDED.configuration, sort_order = EXCLUDED.sort_order",
            [
              simulation.versionId,
              input.key,
              input.label,
              input.type,
              JSON.stringify(input),
              sortOrder,
            ],
          );
        for (const [sortOrder, preset] of simulation.presets.entries())
          await transaction.unsafe(
            'INSERT INTO simulation_presets (id, simulation_id, profile_id, name, "values", is_default) VALUES ($1, $2, NULL, $3, $4, $5) ON CONFLICT (id) DO UPDATE SET "values" = EXCLUDED."values", is_default = EXCLUDED.is_default',
            [
              `${simulation.id}-preset-${sortOrder}`,
              simulation.id,
              preset.name,
              JSON.stringify(preset.values),
              preset.isDefault,
            ],
          );
      }
      await transaction.unsafe(
        "INSERT INTO lesson_simulations (lesson_id, simulation_id, instructions, sort_order, is_required) VALUES ($1, $2, $3, 0, FALSE) ON CONFLICT (lesson_id, simulation_id) DO UPDATE SET instructions = EXCLUDED.instructions",
        [
          "lesson-constant-acceleration",
          "simulation-one-dimensional-motion",
          "Change acceleration and time, then compare the predicted position and velocity.",
        ],
      );
    });
    await seedLaboratoriesPostgres(database);
    await seedStudyPlannerPostgres(database);
  } finally {
    await database.end({ timeout: 5 });
  }
}

function seedLaboratoriesSqlite(database: Database.Database): void {
  const insertActivity = database.prepare(
    `INSERT INTO laboratory_activities (id, slug, title, description, subject_id, mode, status, objective, theory, materials, safety_notes, analysis_prompt, graphing_instructions, questions, conclusion_prompt, extension_activity, simulation_id, estimated_duration_minutes, published_at)
     VALUES (@id, @slug, @title, @description, @subjectId, @mode, @status, @objective, @theory, @materials, @safetyNotes, @analysisPrompt, @graphingInstructions, @questions, @conclusionPrompt, @extensionActivity, @simulationId, @estimatedDurationMinutes, CASE WHEN @status = 'published' THEN CURRENT_TIMESTAMP ELSE NULL END)
     ON CONFLICT(id) DO UPDATE SET slug = excluded.slug, title = excluded.title, description = excluded.description, subject_id = excluded.subject_id, mode = excluded.mode, status = excluded.status, objective = excluded.objective, theory = excluded.theory, materials = excluded.materials, safety_notes = excluded.safety_notes, analysis_prompt = excluded.analysis_prompt, graphing_instructions = excluded.graphing_instructions, questions = excluded.questions, conclusion_prompt = excluded.conclusion_prompt, extension_activity = excluded.extension_activity, simulation_id = excluded.simulation_id, estimated_duration_minutes = excluded.estimated_duration_minutes, published_at = excluded.published_at, updated_at = CURRENT_TIMESTAMP`,
  );
  const deleteSteps = database.prepare("DELETE FROM laboratory_steps WHERE activity_id = ?");
  const deleteVariables = database.prepare(
    "DELETE FROM laboratory_variables WHERE activity_id = ?",
  );
  const insertStep = database.prepare(
    `INSERT INTO laboratory_steps (id, activity_id, step_type, title, instructions, expected_observation, sort_order, is_required)
     VALUES (@id, @activityId, @type, @title, @instructions, @expectedObservation, @sortOrder, @isRequired)
     ON CONFLICT(id) DO UPDATE SET step_type = excluded.step_type, title = excluded.title, instructions = excluded.instructions, expected_observation = excluded.expected_observation, sort_order = excluded.sort_order, is_required = excluded.is_required`,
  );
  const insertVariable = database.prepare(
    `INSERT INTO laboratory_variables (id, activity_id, variable_key, label, symbol, role, data_type, unit, description, default_value, min_value, max_value, uncertainty, significant_figures, theoretical_value, configuration, sort_order)
     VALUES (@id, @activityId, @key, @label, @symbol, @role, @dataType, @unit, @description, @defaultValue, @minValue, @maxValue, @uncertainty, @significantFigures, @theoreticalValue, @configuration, @sortOrder)
     ON CONFLICT(id) DO UPDATE SET variable_key = excluded.variable_key, label = excluded.label, symbol = excluded.symbol, role = excluded.role, data_type = excluded.data_type, unit = excluded.unit, description = excluded.description, default_value = excluded.default_value, min_value = excluded.min_value, max_value = excluded.max_value, uncertainty = excluded.uncertainty, significant_figures = excluded.significant_figures, theoretical_value = excluded.theoretical_value, configuration = excluded.configuration, sort_order = excluded.sort_order`,
  );
  const seed = database.transaction(() => {
    for (const activity of laboratoryActivitySeed) {
      insertActivity.run({
        ...activity,
        materials: JSON.stringify(activity.materials),
        safetyNotes: JSON.stringify(activity.safetyNotes),
        questions: JSON.stringify(activity.questions),
        simulationId: activity.simulationId,
      });
      deleteSteps.run(activity.id);
      deleteVariables.run(activity.id);
      for (const item of activity.steps)
        insertStep.run({ ...item, activityId: activity.id, isRequired: item.isRequired ? 1 : 0 });
      for (const item of activity.variables) {
        insertVariable.run({
          ...item,
          activityId: activity.id,
          defaultValue: JSON.stringify(item.defaultValue),
          configuration: JSON.stringify(item.configuration),
        });
      }
    }
  });
  seed();
}

async function seedLaboratoriesPostgres(database: Sql): Promise<void> {
  await database.begin(async (transaction) => {
    for (const activity of laboratoryActivitySeed) {
      await transaction.unsafe(
        `INSERT INTO laboratory_activities (id, slug, title, description, subject_id, mode, status, objective, theory, materials, safety_notes, analysis_prompt, graphing_instructions, questions, conclusion_prompt, extension_activity, simulation_id, estimated_duration_minutes, published_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, CASE WHEN $7 = 'published' THEN NOW() ELSE NULL END)
         ON CONFLICT (id) DO UPDATE SET slug = EXCLUDED.slug, title = EXCLUDED.title, description = EXCLUDED.description, subject_id = EXCLUDED.subject_id, mode = EXCLUDED.mode, status = EXCLUDED.status, objective = EXCLUDED.objective, theory = EXCLUDED.theory, materials = EXCLUDED.materials, safety_notes = EXCLUDED.safety_notes, analysis_prompt = EXCLUDED.analysis_prompt, graphing_instructions = EXCLUDED.graphing_instructions, questions = EXCLUDED.questions, conclusion_prompt = EXCLUDED.conclusion_prompt, extension_activity = EXCLUDED.extension_activity, simulation_id = EXCLUDED.simulation_id, estimated_duration_minutes = EXCLUDED.estimated_duration_minutes, published_at = EXCLUDED.published_at, updated_at = NOW()`,
        [
          activity.id,
          activity.slug,
          activity.title,
          activity.description,
          activity.subjectId,
          activity.mode,
          activity.status,
          activity.objective,
          activity.theory,
          JSON.stringify(activity.materials),
          JSON.stringify(activity.safetyNotes),
          activity.analysisPrompt,
          activity.graphingInstructions,
          JSON.stringify(activity.questions),
          activity.conclusionPrompt,
          activity.extensionActivity,
          activity.simulationId,
          activity.estimatedDurationMinutes,
        ],
      );
      await transaction.unsafe("DELETE FROM laboratory_steps WHERE activity_id = $1", [
        activity.id,
      ]);
      await transaction.unsafe("DELETE FROM laboratory_variables WHERE activity_id = $1", [
        activity.id,
      ]);
      for (const item of activity.steps) {
        await transaction.unsafe(
          "INSERT INTO laboratory_steps (id, activity_id, step_type, title, instructions, expected_observation, sort_order, is_required) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
          [
            item.id,
            activity.id,
            item.type,
            item.title,
            item.instructions,
            item.expectedObservation,
            item.sortOrder,
            item.isRequired,
          ],
        );
      }
      for (const item of activity.variables) {
        await transaction.unsafe(
          "INSERT INTO laboratory_variables (id, activity_id, variable_key, label, symbol, role, data_type, unit, description, default_value, min_value, max_value, uncertainty, significant_figures, theoretical_value, configuration, sort_order) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)",
          [
            item.id,
            activity.id,
            item.key,
            item.label,
            item.symbol,
            item.role,
            item.dataType,
            item.unit,
            item.description,
            JSON.stringify(item.defaultValue),
            item.minValue,
            item.maxValue,
            item.uncertainty,
            item.significantFigures,
            item.theoreticalValue,
            JSON.stringify(item.configuration),
            item.sortOrder,
          ],
        );
      }
    }
  });
}

function plannerSeedDate(offset: number): string {
  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}

function seedStudyPlannerSqlite(database: Database.Database): void {
  const profile = database
    .prepare("SELECT id FROM profiles ORDER BY created_at, id LIMIT 1")
    .get() as { id: string } | undefined;
  if (!profile) return;
  const availabilityCount = database
    .prepare("SELECT COUNT(*) AS count FROM study_availability WHERE profile_id = ?")
    .get(profile.id) as { count: number };
  if (availabilityCount.count === 0) {
    const insertAvailability = database.prepare(
      "INSERT OR IGNORE INTO study_availability (id, profile_id, weekday, start_minute, end_minute, max_minutes, label) VALUES (?, ?, ?, ?, ?, ?, ?)",
    );
    for (const slot of [1, 2, 3, 4, 5]) {
      insertAvailability.run(
        `seed-availability-${profile.id}-${slot}`,
        profile.id,
        slot,
        1080,
        1260,
        90,
        "Evening study window",
      );
    }
  }
  const goalId = `seed-study-goal-${profile.id}`;
  const planId = `seed-study-plan-${profile.id}`;
  const itemId = `seed-study-item-${profile.id}`;
  database
    .prepare(
      "INSERT INTO study_goals (id, profile_id, title, description, goal_type, target_id, target_title, start_date, target_date, weekly_study_minutes, available_days, session_duration_minutes, priority_subject_ids, rest_days, difficulty_preference, review_frequency_days, status) VALUES (?, ?, ?, ?, 'roadmap-completion', ?, ?, ?, ?, 180, '[1,2,3,4,5]', 45, '[\"subject-mathematics\"]', '[5]', 'balanced', 7, 'active') ON CONFLICT(id) DO NOTHING",
    )
    .run(
      goalId,
      profile.id,
      "Build a science foundation",
      "A small seeded example showing how a roadmap becomes a weekly rhythm.",
      "roadmap-math-physics-foundations",
      "Mathematics and physics foundations",
      plannerSeedDate(0),
      plannerSeedDate(28),
    );
  database
    .prepare(
      "INSERT INTO study_plans (id, profile_id, goal_id, source_type, source_id, status, target_date, weekly_study_minutes, total_minutes, scheduled_minutes, unallocated_minutes, capacity_minutes, realism, warnings) VALUES (?, ?, ?, 'roadmap', ?, 'active', ?, 180, 90, 90, 0, 540, 'realistic', '[]') ON CONFLICT(id) DO NOTHING",
    )
    .run(planId, profile.id, goalId, "roadmap-math-physics-foundations", plannerSeedDate(28));
  database
    .prepare(
      "INSERT INTO study_plan_items (id, plan_id, item_type, source_id, title, description, subject_id, estimated_minutes, priority, sort_order, metadata) VALUES (?, ?, 'lesson', ?, ?, ?, ?, 45, 20, 0, '{}') ON CONFLICT(id) DO NOTHING",
    )
    .run(
      itemId,
      planId,
      "lesson-constant-acceleration",
      "A first focused lesson",
      "Seeded planner lesson",
      "subject-physics",
    );
  database
    .prepare(
      "INSERT INTO study_sessions (id, profile_id, plan_id, plan_item_id, scheduled_date, start_minute, duration_minutes, status) VALUES (?, ?, ?, ?, ?, 1080, 45, 'scheduled') ON CONFLICT(id) DO NOTHING",
    )
    .run(`seed-study-session-${profile.id}`, profile.id, planId, itemId, plannerSeedDate(1));
}

async function seedStudyPlannerPostgres(database: Sql): Promise<void> {
  const profiles = await database<
    { id: string }[]
  >`SELECT id FROM profiles ORDER BY created_at, id LIMIT 1`;
  const profile = profiles[0];
  if (!profile) return;
  const availability = await database<
    { count: number }[]
  >`SELECT COUNT(*)::int AS count FROM study_availability WHERE profile_id = ${profile.id}`;
  if (!availability[0] || availability[0].count === 0) {
    for (const weekday of [1, 2, 3, 4, 5]) {
      await database`
        INSERT INTO study_availability (id, profile_id, weekday, start_minute, end_minute, max_minutes, label)
        VALUES (${`seed-availability-${profile.id}-${weekday}`}, ${profile.id}, ${weekday}, 1080, 1260, 90, 'Evening study window')
        ON CONFLICT DO NOTHING
      `;
    }
  }
  const goalId = `seed-study-goal-${profile.id}`;
  const planId = `seed-study-plan-${profile.id}`;
  const itemId = `seed-study-item-${profile.id}`;
  await database`
    INSERT INTO study_goals (id, profile_id, title, description, goal_type, target_id, target_title, start_date, target_date, weekly_study_minutes, available_days, session_duration_minutes, priority_subject_ids, rest_days, difficulty_preference, review_frequency_days, status)
    VALUES (${goalId}, ${profile.id}, 'Build a science foundation', 'A small seeded example showing how a roadmap becomes a weekly rhythm.', 'roadmap-completion', 'roadmap-math-physics-foundations', 'Mathematics and physics foundations', ${plannerSeedDate(0)}, ${plannerSeedDate(28)}, 180, '[1,2,3,4,5]', 45, '["subject-mathematics"]', '[5]', 'balanced', 7, 'active')
    ON CONFLICT (id) DO NOTHING
  `;
  await database`
    INSERT INTO study_plans (id, profile_id, goal_id, source_type, source_id, status, target_date, weekly_study_minutes, total_minutes, scheduled_minutes, unallocated_minutes, capacity_minutes, realism, warnings)
    VALUES (${planId}, ${profile.id}, ${goalId}, 'roadmap', 'roadmap-math-physics-foundations', 'active', ${plannerSeedDate(28)}, 180, 90, 90, 0, 540, 'realistic', '[]')
    ON CONFLICT (id) DO NOTHING
  `;
  await database`
    INSERT INTO study_plan_items (id, plan_id, item_type, source_id, title, description, subject_id, estimated_minutes, priority, sort_order, metadata)
    VALUES (${itemId}, ${planId}, 'lesson', 'lesson-constant-acceleration', 'A first focused lesson', 'Seeded planner lesson', 'subject-physics', 45, 20, 0, '{}')
    ON CONFLICT (id) DO NOTHING
  `;
  await database`
    INSERT INTO study_sessions (id, profile_id, plan_id, plan_item_id, scheduled_date, start_minute, duration_minutes, status)
    VALUES (${`seed-study-session-${profile.id}`}, ${profile.id}, ${planId}, ${itemId}, ${plannerSeedDate(1)}, 1080, 45, 'scheduled')
    ON CONFLICT (id) DO NOTHING
  `;
}
