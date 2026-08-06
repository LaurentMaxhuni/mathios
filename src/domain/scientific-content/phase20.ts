export const PHASE20_SUBJECTS = [
  "mathematics",
  "physics",
  "chemistry",
  "biology",
  "astronomy",
] as const;

export type Phase20Subject = (typeof PHASE20_SUBJECTS)[number];
export type Phase20Difficulty = "gentle" | "balanced" | "challenging";

export type Phase20Topic = {
  key: string;
  slug: string;
  name: string;
  subjectSlug: Phase20Subject;
  domainId: string;
  description: string;
  minimumGrade: number;
  maximumGrade: number;
  difficulty: Phase20Difficulty;
  prerequisiteKeys: readonly string[];
  formula: string;
  formulaLabel: string;
  workedExample: string;
  application: string;
  misconception: string;
  sourceAttribution: string;
};

export const PHASE20_REQUIRED_TOPIC_SLUGS: Record<Phase20Subject, readonly string[]> = {
  mathematics: [
    "arithmetic",
    "algebra",
    "geometry",
    "trigonometry",
    "functions",
    "probability",
    "statistics",
    "combinatorics",
    "calculus",
    "linear-algebra",
    "differential-equations",
    "number-theory",
    "complex-numbers",
    "discrete-mathematics",
    "olympiad-mathematics",
  ],
  physics: [
    "measurement",
    "kinematics",
    "dynamics",
    "energy",
    "momentum",
    "rotation",
    "gravitation",
    "fluids",
    "waves",
    "thermodynamics",
    "electricity",
    "magnetism",
    "optics",
    "relativity",
    "quantum-physics",
    "nuclear-physics",
    "particle-physics",
    "olympiad-physics",
  ],
  chemistry: [
    "atomic-structure",
    "periodicity",
    "bonding",
    "stoichiometry",
    "reactions",
    "gases",
    "thermochemistry",
    "kinetics",
    "equilibrium",
    "acids-bases",
    "electrochemistry",
    "organic-chemistry",
    "inorganic-chemistry",
    "analytical-chemistry",
    "physical-chemistry",
    "biochemistry",
    "olympiad-chemistry",
  ],
  biology: [
    "cell-biology",
    "molecular-biology",
    "genetics",
    "evolution",
    "ecology",
    "anatomy",
    "physiology",
    "microbiology",
    "botany",
    "zoology",
    "neuroscience",
    "immunology",
    "biotechnology",
    "bioinformatics",
    "olympiad-biology",
  ],
  astronomy: [
    "observational-astronomy",
    "celestial-coordinates",
    "solar-system",
    "planetary-science",
    "orbital-mechanics",
    "stellar-physics",
    "stellar-evolution",
    "galaxies",
    "exoplanets",
    "compact-objects",
    "black-holes",
    "spectroscopy",
    "cosmology",
    "space-science",
    "astrobiology",
  ],
};

function hasBalancedBraces(value: string): boolean {
  let depth = 0;
  for (const character of value) {
    if (character === "{") depth += 1;
    if (character === "}") depth -= 1;
    if (depth < 0) return false;
  }
  return depth === 0;
}

function formulaErrors(topic: Phase20Topic): string[] {
  const errors: string[] = [];
  if (!topic.formula.trim()) errors.push(`${topic.key} is missing a formula or relationship.`);
  if (topic.formula.length > 500) errors.push(`${topic.key} formula is too long.`);
  if (!hasBalancedBraces(topic.formula)) errors.push(`${topic.key} formula has unbalanced braces.`);
  if (/[<>]/.test(topic.formula)) errors.push(`${topic.key} formula contains markup characters.`);
  if (/\\(?:input|include|write|def|gdef|catcode|href|url|html)/i.test(topic.formula)) {
    errors.push(`${topic.key} formula contains a disallowed TeX command.`);
  }
  if (!topic.formulaLabel.trim())
    errors.push(`${topic.key} is missing an accessible formula label.`);
  return errors;
}

function cycleErrors(topics: readonly Phase20Topic[]): string[] {
  const byKey = new Map(topics.map((topic) => [topic.key, topic]));
  const state = new Map<string, "visiting" | "visited">();
  const errors: string[] = [];

  function visit(key: string, path: readonly string[]): void {
    const currentState = state.get(key);
    if (currentState === "visited") return;
    if (currentState === "visiting") {
      errors.push(`Prerequisite cycle detected: ${[...path, key].join(" -> ")}.`);
      return;
    }
    const topic = byKey.get(key);
    if (!topic) return;
    state.set(key, "visiting");
    for (const prerequisite of topic.prerequisiteKeys) visit(prerequisite, [...path, key]);
    state.set(key, "visited");
  }

  for (const topic of topics) visit(topic.key, []);
  return errors;
}

export function validatePhase20Topics(topics: readonly Phase20Topic[]): string[] {
  const errors: string[] = [];
  const byKey = new Map<string, Phase20Topic>();
  const subjectSets = new Map<Phase20Subject, Set<string>>(
    PHASE20_SUBJECTS.map((subject) => [subject, new Set<string>()]),
  );

  for (const topic of topics) {
    if (byKey.has(topic.key)) errors.push(`Duplicate Phase 20 topic key: ${topic.key}.`);
    byKey.set(topic.key, topic);
    subjectSets.get(topic.subjectSlug)?.add(topic.slug);
    if (!PHASE20_SUBJECTS.includes(topic.subjectSlug)) {
      errors.push(`${topic.key} uses an unsupported subject.`);
    }
    if (topic.domainId !== `domain-${topic.slug}` && topic.slug !== "anatomy-physiology") {
      errors.push(`${topic.key} must map to its domain slug.`);
    }
    if (
      topic.minimumGrade < 6 ||
      topic.maximumGrade > 15 ||
      topic.minimumGrade > topic.maximumGrade
    ) {
      errors.push(`${topic.key} has an invalid grade range.`);
    }
    if (!topic.description.trim() || !topic.workedExample.trim() || !topic.application.trim()) {
      errors.push(`${topic.key} is missing descriptive content.`);
    }
    if (!topic.misconception.trim()) errors.push(`${topic.key} is missing misconception guidance.`);
    if (!topic.sourceAttribution.trim()) errors.push(`${topic.key} is missing source attribution.`);
    errors.push(...formulaErrors(topic));
    for (const prerequisite of topic.prerequisiteKeys) {
      if (!byKey.has(prerequisite) && !topics.some((candidate) => candidate.key === prerequisite)) {
        errors.push(`${topic.key} references missing prerequisite ${prerequisite}.`);
      }
      if (prerequisite === topic.key) errors.push(`${topic.key} cannot require itself.`);
    }
  }

  for (const subject of PHASE20_SUBJECTS) {
    const actual = subjectSets.get(subject) ?? new Set<string>();
    for (const requiredSlug of PHASE20_REQUIRED_TOPIC_SLUGS[subject]) {
      if (!actual.has(requiredSlug))
        errors.push(`Missing ${subject} Phase 20 topic: ${requiredSlug}.`);
    }
  }

  errors.push(...cycleErrors(topics));
  return errors;
}

export function assertValidPhase20Topics(topics: readonly Phase20Topic[]): void {
  const errors = validatePhase20Topics(topics);
  if (errors.length > 0)
    throw new Error(`Invalid Phase 20 scientific content:\n- ${errors.join("\n- ")}`);
}
