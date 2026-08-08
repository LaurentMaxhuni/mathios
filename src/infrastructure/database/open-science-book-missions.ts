import {
  openScienceBookSeed,
  type OpenScienceBook,
  type OpenScienceBookSubject,
} from "@/infrastructure/database/open-science-books";
import {
  openScienceBookTopicSeed,
  type OpenScienceBookTopic,
} from "@/infrastructure/database/open-science-book-topics";

type MissionStage = "starter" | "deep-dive";
type MissionSectionKey = "mission" | "check" | "source";

interface BookMission {
  readonly book: OpenScienceBook;
  readonly topic: OpenScienceBookTopic;
  readonly index: number;
  readonly stage: MissionStage;
  readonly estimatedDurationMinutes: number;
}

const CORE_MISSION_COUNT = 3;
const MISSION_COUNT = 6;

const fallbackTopics: Record<OpenScienceBookSubject, readonly string[]> = {
  biology: [
    "Observe the system",
    "Name the parts and process",
    "Trace a cause and effect",
    "Test the model with evidence",
    "Compare a second example",
    "Connect the idea to a living system",
  ],
  chemistry: [
    "Observe matter and change",
    "Model particles and quantities",
    "Connect structure to properties",
    "Track energy and reactions",
    "Test a prediction",
    "Apply the model to a real material",
  ],
  mathematics: [
    "Name the quantities",
    "Find a relationship",
    "Test the pattern",
    "Represent the idea another way",
    "Solve a focused problem",
    "Check what the result means",
  ],
  physics: [
    "Observe and measure",
    "Choose a model",
    "Predict what changes",
    "Test the prediction",
    "Connect force, energy, or fields",
    "Explain the result with evidence",
  ],
};

const legacySectionKey: Record<MissionSectionKey, string> = {
  mission: "about",
  check: "reading",
  source: "open",
};

const legacyBlockKey: Record<MissionSectionKey, string> = {
  mission: "about",
  check: "metadata",
  source: "pdf",
};

const featuredMissionExplanations: Readonly<Record<string, readonly string[]>> = {
  "math-1252": [
    "Real numbers give us a shared number line, while exponents compress repeated multiplication and make scale easier to compare. Keep the operation and the units visible before you calculate.",
    "An equation asks for values that make two expressions equal. An inequality adds direction: it describes a set of values, so check whether every operation preserves or reverses the comparison.",
    "A function gives each allowed input exactly one output. Its rule, domain, range, table, graph, and verbal description are different views of the same relationship.",
    "A linear function changes by a constant amount for every one-unit change in input. Its slope records that rate of change, and its intercept tells you where the model starts.",
    "Polynomial behavior is shaped by powers and zeros. A zero is an input that makes the output zero, so it becomes a useful landmark when you sketch or solve.",
    "Exponential change uses a constant multiplier instead of a constant difference. Logarithms undo that growth or decay by asking which exponent produces a target value.",
  ],
  "phys-1419": [
    "Physics makes claims that can be measured and checked. Units, significant figures, and estimates are part of the reasoning, not decoration added after the calculation.",
    "Displacement includes direction; speed does not. Velocity measures how displacement changes with time, and acceleration measures how velocity changes with time.",
    "Two-dimensional motion can be separated into perpendicular components. That lets you analyze a projectile's horizontal motion and vertical motion without mixing their roles.",
    "Newton's laws connect forces to changes in motion. The net force, not any single force, determines acceleration through the relationship F = ma.",
    "Friction resists relative motion between surfaces, while drag resists motion through a fluid. Both matter because real models need to account for where energy and motion change.",
    "Moving in a circle means changing velocity direction even if speed stays constant. That change requires centripetal acceleration directed toward the center.",
  ],
  "chem-38132": [
    "Chemistry distinguishes physical properties, such as density or phase, from chemical properties, such as reactivity. Good measurements state a value, a unit, and an honest estimate of uncertainty.",
    "An element is identified by its number of protons. Atoms can gain or lose electrons to become ions, and the periodic table organizes recurring patterns in their behavior.",
    "The mole connects an invisible count of particles to a measurable mass. Concentration extends that bridge by comparing amount of solute with a chosen volume of solution.",
    "A balanced chemical equation conserves each kind of atom. Its coefficients turn the equation into a ratio you can use to predict reactant needs and product amounts.",
    "Thermochemistry tracks energy as heat and work. The sign and direction of energy transfer matter: a system can absorb energy from its surroundings or release energy to them.",
    "Electron arrangement helps explain periodic trends such as atomic size and reactivity. The periodic table is useful because it connects position, structure, and predictable chemical behavior.",
  ],
  "bio-16407": [
    "Cells share core features but organize them in different ways. A eukaryotic cell uses membrane-bound organelles to separate jobs such as energy conversion, protein processing, and storage.",
    "Living systems rely on atoms, water, and carbon-based molecules. Small building blocks can join into larger macromolecules whose shape and chemical groups affect what they do.",
    "A protein's amino-acid sequence influences how it folds, and its folded shape influences its function. A small structural change can therefore alter a cell process or contribute to disease.",
    "Bioenergetics follows how cells capture, store, and transfer energy. ATP is a useful energy carrier because cells can couple its reactions to work that would not otherwise proceed readily.",
    "Enzymes speed reactions by lowering the activation barrier without being used up. Their activity depends on conditions and on how well a substrate fits the active site.",
    "Glycolysis begins the controlled breakdown of glucose, transferring some energy into ATP and electron carriers. Later pathways can extract more energy when conditions and cell type allow it.",
  ],
};

function cleanBookText(value: string): string {
  return value
    .replaceAll("â€™", "’")
    .replaceAll("â€˜", "‘")
    .replaceAll("â€œ", "“")
    .replaceAll("â€", "”")
    .replaceAll("â€“", "–")
    .replaceAll("â€”", "—")
    .replaceAll("Â·", "·")
    .replaceAll("Â", "");
}

function courseId(book: OpenScienceBook): string {
  return `course-open-science-${book.id}`;
}

function moduleId(book: OpenScienceBook, stage: MissionStage): string {
  return stage === "starter"
    ? `module-open-science-${book.id}`
    : `module-open-science-${book.id}-deep-dive`;
}

function lessonId(book: OpenScienceBook, index: number): string {
  return index === 0
    ? `lesson-open-science-${book.id}`
    : `lesson-open-science-${book.id}-mission-${index + 1}`;
}

function sectionId(book: OpenScienceBook, missionIndex: number, key: MissionSectionKey): string {
  if (missionIndex === 0) return `section-open-science-${book.id}-${legacySectionKey[key]}`;
  return `section-open-science-${book.id}-mission-${missionIndex + 1}-${key}`;
}

function blockId(book: OpenScienceBook, missionIndex: number, key: MissionSectionKey): string {
  if (missionIndex === 0) return `block-open-science-${book.id}-${legacyBlockKey[key]}`;
  return `block-open-science-${book.id}-mission-${missionIndex + 1}-${key}`;
}

function practiceBlockId(book: OpenScienceBook, missionIndex: number): string {
  if (missionIndex === 0) return `block-open-science-${book.id}-practice`;
  return `block-open-science-${book.id}-mission-${missionIndex + 1}-practice`;
}

function versionId(book: OpenScienceBook, index: number): string {
  return `lesson-version-${lessonId(book, index).replace("lesson-", "")}-1`;
}

function bookDifficulty(book: OpenScienceBook): "balanced" | "challenging" {
  const advancedTitle =
    /advanced|abstract|analysis|astronomy|computational|complex|differential|electromagnet|graduate|mechanics|numerical|quantum|relativity|spectroscop|thermodynamics/i;
  return book.pageCount >= 650 || advancedTitle.test(book.title) ? "challenging" : "balanced";
}

function bookTitle(book: OpenScienceBook): string {
  return cleanBookText(book.title);
}

function attributionLine(book: OpenScienceBook): string {
  return [book.author, book.institution].filter(Boolean).map(cleanBookText).join(" · ");
}

function authorLine(book: OpenScienceBook): string {
  const attribution = attributionLine(book);
  return attribution ? `${bookTitle(book)} by ${attribution}` : bookTitle(book);
}

function usefulTopics(book: OpenScienceBook): readonly OpenScienceBookTopic[] {
  const seen = new Set<string>();
  const sourceTopics: readonly OpenScienceBookTopic[] =
    (openScienceBookTopicSeed as Readonly<Record<string, readonly OpenScienceBookTopic[]>>)[
      book.id
    ] ?? [];
  const topics = sourceTopics.filter((topic) => {
    const title = cleanBookText(topic.title).trim();
    const key = title.toLocaleLowerCase();
    if (!title || /^(chapters?|contents?|table of contents)$/i.test(title) || seen.has(key))
      return false;
    seen.add(key);
    return true;
  });
  const fallback = fallbackTopics[book.subject]
    .filter((title) => !seen.has(title.toLocaleLowerCase()))
    .map((title) => ({ title, tocPage: 0 }));
  return [...topics, ...fallback].slice(0, MISSION_COUNT).map((topic) => ({
    ...topic,
    title: cleanBookText(topic.title),
  }));
}

function bookMissions(book: OpenScienceBook): readonly BookMission[] {
  return usefulTopics(book).map((topic, index) => ({
    book,
    topic,
    index,
    stage: index < CORE_MISSION_COUNT ? "starter" : "deep-dive",
    estimatedDurationMinutes: index < CORE_MISSION_COUNT ? 5 : 15,
  }));
}

function subjectFrame(subject: OpenScienceBookSubject): string {
  if (subject === "mathematics") {
    return "Name the quantities, the rule that relates them, and one way to check the result.";
  }
  if (subject === "physics") {
    return "Turn an observation into quantities, a model, and a prediction you can test.";
  }
  if (subject === "chemistry") {
    return "Connect what you can observe with particles, composition, energy, and change.";
  }
  return "Connect a structure or system with its process, evidence, and consequences for living things.";
}

function missionTitle(mission: BookMission): string {
  const topic =
    mission.topic.title.length > 118
      ? `${mission.topic.title.slice(0, 115)}...`
      : mission.topic.title;
  return `Mission ${mission.index + 1}: ${topic}`;
}

function missionSummary(mission: BookMission): string {
  const verb =
    mission.stage === "starter" ? "Build one clear idea" : "Choose this optional extension";
  return `${verb} around “${mission.topic.title}” in ${mission.estimatedDurationMinutes} minutes, then take a quick check.`;
}

function missionNarrative(mission: BookMission): string {
  const source = `${authorLine(mission.book)} lists “${mission.topic.title}” as a chapter anchor.`;
  const featuredExplanation = featuredMissionExplanations[mission.book.id]?.[mission.index];
  const depth =
    mission.stage === "starter"
      ? "Keep this first pass small: explain one relationship in your own words before moving to the next mission."
      : "This optional extension gives you room to follow the source, compare examples, and strengthen the model you built in the core path.";
  return `${source} ${featuredExplanation ?? `Start with ${mission.topic.title} as a focused question, rather than a chapter to get through. ${subjectFrame(mission.book.subject)}`} ${depth}`;
}

function missionPracticePayload(mission: BookMission) {
  const subjectStep: Record<OpenScienceBookSubject, string> = {
    mathematics:
      "Write the quantities you would need, the rule that relates them, and one value that would test your rule.",
    physics:
      "Name the measurable quantities, choose a direction when it matters, and state one prediction the model should make.",
    chemistry:
      "Separate what you could observe from the particle-level explanation, then state what must be conserved or transferred.",
    biology:
      "Identify the parts of the system, the process connecting them, and one consequence if a condition changes.",
  };
  return {
    prompt: `Try it in one minute: make a tiny model of ${mission.topic.title}.`,
    steps: [
      `Write “${mission.topic.title}” in the middle of your page.`,
      subjectStep[mission.book.subject],
      "Add one concrete example or observation that could support your explanation.",
    ],
  };
}

function quickCheckPayload(mission: BookMission) {
  return {
    prompt: `What is the strongest first move when studying ${mission.topic.title}?`,
    choices: [
      `Build a small model: ${subjectFrame(mission.book.subject)}`,
      "Read until every sentence is memorized before trying an example.",
      "Treat the topic title as the whole explanation and skip the reasoning.",
    ],
    correctIndex: 0,
    feedback:
      "Exactly. A useful model gives you something to test, explain, and improve—not just a heading to remember.",
  };
}

function sourceBlockPayload(mission: BookMission) {
  const isDeepDive = mission.stage === "deep-dive";
  const sourceHint = isDeepDive
    ? "This optional mission is already structured for focused exploration."
    : "The lesson has already distilled the first idea into a short, guided route.";
  return {
    text: `This lesson is a guided, self-contained mission built from ${bookTitle(mission.book)}. ${sourceHint} Make the model, answer the quick check, and finish when it makes sense to you.`,
  };
}

function courseDescription(book: OpenScienceBook): string {
  return `${authorLine(book)} is now a six-mission path built from its chapter map. Finish the core three missions in 15 minutes, then choose the optional 45-minute deep dive. Source license: ${book.license}.`;
}

export const openScienceBookCourseSeed = openScienceBookSeed.map((book) => ({
  id: courseId(book),
  slug: `open-science-${book.subject}-${book.id}`,
  title: bookTitle(book),
  description: courseDescription(book),
  subjectId: `subject-${book.subject}`,
  difficulty: bookDifficulty(book),
  estimatedDurationMinutes: 60,
  gradeMinId: "grade-university-foundations",
  gradeMaxId: "grade-advanced",
  courseImage: null,
  isRequired: false,
  status: "published" as const,
  createdByProfileId: null,
}));

export const openScienceBookCourseCurriculumSeed = openScienceBookSeed.flatMap(
  (book) =>
    [
      [courseId(book), "curriculum-international"],
      [courseId(book), "curriculum-custom"],
    ] as const,
);

export const openScienceBookCourseGradeSeed = openScienceBookSeed.flatMap(
  (book) =>
    [
      [courseId(book), "grade-university-foundations", false, 0],
      [courseId(book), "grade-advanced", false, 1],
    ] as const,
);

export const openScienceBookModuleSeed = openScienceBookSeed.flatMap((book) => [
  {
    id: moduleId(book, "starter"),
    courseId: courseId(book),
    title: "Quick start · 15 min",
    description: `Three five-minute missions from ${bookTitle(book)}. Build momentum before you decide whether to go deeper.`,
    sortOrder: 0,
    estimatedStudyTimeMinutes: 15,
    assessmentReference: "Three quick checks",
  },
  {
    id: moduleId(book, "deep-dive"),
    courseId: courseId(book),
    title: "Go deeper · optional 45 min",
    description: `Three optional 15-minute missions for learners who want to keep exploring ${bookTitle(book)}.`,
    sortOrder: 1,
    estimatedStudyTimeMinutes: 45,
    assessmentReference: "Optional source exploration",
  },
]);

export const openScienceBookLessonSeed = openScienceBookSeed.flatMap((book) =>
  bookMissions(book).map((mission) => ({
    id: lessonId(book, mission.index),
    moduleId: moduleId(book, mission.stage),
    slug: `mission-${mission.index + 1}`,
    title: missionTitle(mission),
    summary: missionSummary(mission),
    sortOrder: mission.index % CORE_MISSION_COUNT,
    estimatedDurationMinutes: mission.estimatedDurationMinutes,
    status: "published" as const,
    currentVersionNumber: 1,
    publishedVersionId: versionId(book, mission.index),
    createdByProfileId: null,
  })),
);

export const openScienceBookSectionSeed = openScienceBookSeed.flatMap((book) =>
  bookMissions(book).flatMap(
    (mission) =>
      [
        [
          sectionId(book, mission.index, "mission"),
          lessonId(book, mission.index),
          "introduction",
          `Your ${mission.estimatedDurationMinutes}-minute mission`,
          mission.stage === "starter"
            ? "One chapter idea, one short explanation, and one small win."
            : "Optional time to extend the model with the source material.",
          0,
        ],
        [
          sectionId(book, mission.index, "check"),
          lessonId(book, mission.index),
          "knowledge-check",
          "Quick check",
          "Use the feedback to correct your model before you continue.",
          1,
        ],
        [
          sectionId(book, mission.index, "source"),
          lessonId(book, mission.index),
          "further-exploration",
          "Keep your focus",
          "This guided mission contains the learning route. No outside document is required to complete it.",
          2,
        ],
      ] as const,
  ),
);

export const openScienceBookBlockSeed = openScienceBookSeed.flatMap((book) =>
  bookMissions(book).flatMap(
    (mission) =>
      [
        [
          blockId(book, mission.index, "mission"),
          sectionId(book, mission.index, "mission"),
          "paragraph",
          "",
          0,
          { text: missionNarrative(mission) },
        ],
        [
          practiceBlockId(book, mission.index),
          sectionId(book, mission.index, "mission"),
          "example",
          "Build a tiny model",
          1,
          missionPracticePayload(mission),
        ],
        [
          blockId(book, mission.index, "check"),
          sectionId(book, mission.index, "check"),
          "quick-check",
          "Lock in the goal",
          0,
          quickCheckPayload(mission),
        ],
        [
          blockId(book, mission.index, "source"),
          sectionId(book, mission.index, "source"),
          "callout",
          "Everything you need is here",
          0,
          sourceBlockPayload(mission),
        ],
      ] as const,
  ),
);
