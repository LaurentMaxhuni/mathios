import {
  DEFAULT_MASTERY_RULES,
  DEFAULT_RECOMMENDATION_RULES,
  MASTERY_EVENT_TYPES,
  type ConfidenceLabel,
  type MasteryComputation,
  type MasteryDifficulty,
  type MasteryEventRecord,
  type MasteryEventType,
  type MasteryRuleConfig,
  type RecommendationCandidate,
  type RecommendationContext,
  type RecommendationRuleConfig,
} from "@/domain/mastery/types";

function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, value));
}

function round(value: number, decimals = 4): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function dateValue(value: string | Date): number {
  const time = value instanceof Date ? value.getTime() : Date.parse(value);
  return Number.isFinite(time) ? time : Date.now();
}

function asIso(value: number): string {
  return new Date(value).toISOString();
}

function daysBetween(later: number, earlier: number): number {
  return Math.max(0, (later - earlier) / 86_400_000);
}

function difficultyMultiplier(difficulty: MasteryDifficulty, rules: MasteryRuleConfig): number {
  if (difficulty === "gentle") return rules.gentleDifficultyMultiplier;
  if (difficulty === "challenging") return rules.challengingDifficultyMultiplier;
  if (difficulty === "mixed")
    return (rules.balancedDifficultyMultiplier + rules.challengingDifficultyMultiplier) / 2;
  return rules.balancedDifficultyMultiplier;
}

function eventBaseWeight(eventType: MasteryEventType, rules: MasteryRuleConfig): number {
  if (eventType === "lesson-completion") return rules.lessonWeight;
  if (eventType === "assessment") return rules.assessmentWeight;
  return rules.exerciseWeight;
}

function confidenceLabel(value: number): ConfidenceLabel {
  if (value >= 0.75) return "high";
  if (value >= 0.45) return "medium";
  return "low";
}

function normalizeThreshold(value: number | undefined): number {
  if (value === undefined || !Number.isFinite(value)) return 0.75;
  return value > 1 ? clamp(value / 100) : clamp(value);
}

function reviewDate(lastPracticedAt: string, score: number, rules: MasteryRuleConfig): string {
  const interval = score >= 0.75 ? rules.reviewIntervalDays : rules.developingReviewIntervalDays;
  return asIso(dateValue(lastPracticedAt) + interval * 86_400_000);
}

function consistencyFactor(events: readonly MasteryEventRecord[]): number {
  if (events.length < 2) return 1;
  const scores = events.map((event) => clamp(event.score));
  const mean = scores.reduce((sum, score) => sum + score, 0) / scores.length;
  const variance = scores.reduce((sum, score) => sum + (score - mean) ** 2, 0) / scores.length;
  return clamp(1 - Math.sqrt(variance));
}

export function computeMastery(input: {
  events: readonly MasteryEventRecord[];
  masteryThreshold?: number;
  prerequisiteStates?: readonly {
    conceptId: string;
    score: number;
    state: string;
    masteryThreshold?: number;
  }[];
  now?: string | Date;
  rules?: Partial<MasteryRuleConfig>;
}): MasteryComputation {
  const rules = { ...DEFAULT_MASTERY_RULES, ...input.rules };
  const now = dateValue(input.now ?? new Date());
  const threshold = normalizeThreshold(input.masteryThreshold);
  const events = [...input.events].sort((left, right) => {
    const timeDifference = dateValue(left.occurredAt) - dateValue(right.occurredAt);
    return timeDifference || left.id.localeCompare(right.id);
  });

  if (!events.length) {
    return {
      score: 0,
      confidence: 0,
      confidenceLabel: "low",
      state: "not-started",
      evidenceCount: 0,
      evidenceTypeCount: 0,
      difficultyBandCount: 0,
      lastPracticedAt: null,
      nextReviewAt: null,
      breakdown: {
        weightedScore: 0,
        totalWeight: 0,
        rawScore: 0,
        recencyFactor: 0,
        consistencyFactor: 0,
        prerequisiteFactor: 1,
        evidenceCount: 0,
        evidenceTypeCount: 0,
        difficultyBandCount: 0,
        eventWeights: [],
        weakPrerequisiteIds: [],
      },
      evidenceSummary: [],
    };
  }

  const evidenceTypes = new Set(events.map((event) => event.eventType));
  const difficultyBands = new Set(
    events.map((event) => event.difficulty).filter((difficulty) => difficulty !== "mixed"),
  );
  const eventWeights: number[] = [];
  let weightedScore = 0;
  let totalWeight = 0;
  let recencyFactor = 0;

  for (const event of events) {
    const age = daysBetween(now, dateValue(event.occurredAt));
    const recency = Math.pow(0.5, age / Math.max(1, rules.recencyHalfLifeDays));
    const attemptAdjustment = 1 / (1 + Math.max(0, event.attempts - 1) * rules.attemptPenalty);
    const hintAdjustment = Math.max(
      rules.minimumHintMultiplier,
      1 - Math.max(0, event.hintsUsed) * rules.hintPenalty,
    );
    const weight =
      eventBaseWeight(event.eventType, rules) *
      difficultyMultiplier(event.difficulty, rules) *
      recency *
      attemptAdjustment *
      hintAdjustment;
    eventWeights.push(round(weight));
    weightedScore += clamp(event.score) * weight;
    totalWeight += weight;
    recencyFactor += recency;
  }

  const rawScore = totalWeight ? clamp(weightedScore / totalWeight) : 0;
  const consistency = consistencyFactor(events);
  const prerequisiteStates = input.prerequisiteStates ?? [];
  const weakPrerequisiteIds = prerequisiteStates
    .filter(
      (prerequisite) =>
        prerequisite.score < normalizeThreshold(prerequisite.masteryThreshold ?? threshold) ||
        prerequisite.state !== "mastered",
    )
    .map((prerequisite) => prerequisite.conceptId);
  const prerequisiteFactor = Math.max(0.7, 1 - weakPrerequisiteIds.length * 0.1);
  const score = clamp(rawScore * prerequisiteFactor * (0.9 + consistency * 0.1));
  const evidenceCount = events.length;
  const evidenceTypeCount = evidenceTypes.size;
  const difficultyBandCount = difficultyBands.size;
  const confidence =
    clamp(
      (evidenceCount / Math.max(1, rules.minimumEvidenceForMastery)) *
        rules.confidenceEvidenceWeight +
        (evidenceTypeCount / Math.max(1, MASTERY_EVENT_TYPES.length)) * rules.confidenceTypeWeight +
        (difficultyBandCount / 3) * rules.confidenceDifficultyWeight +
        consistency * rules.confidenceConsistencyWeight,
    ) *
    (1 - Math.min(0.25, weakPrerequisiteIds.length * 0.08));
  const lastPracticedAt = events.reduce(
    (latest, event) =>
      dateValue(event.occurredAt) > dateValue(latest) ? event.occurredAt : latest,
    events[0]!.occurredAt,
  );
  const nextReviewAt = reviewDate(lastPracticedAt, score, rules);
  const isDue = dateValue(nextReviewAt) <= now;
  const masteryEligible =
    score >= threshold &&
    confidence >= rules.masteryConfidenceThreshold &&
    evidenceCount >= rules.minimumEvidenceForMastery &&
    evidenceTypeCount >= rules.minimumEvidenceTypesForMastery &&
    difficultyBandCount >= rules.minimumDifficultyBandsForMastery &&
    weakPrerequisiteIds.length === 0;

  let state: MasteryComputation["state"];
  if (masteryEligible) state = "mastered";
  else if (isDue) state = "needs-review";
  else if (events.length === 1 && events[0]!.eventType === "lesson-completion")
    state = "introduced";
  else if (score < 0.45) state = "developing";
  else if (score < Math.max(0.65, threshold - 0.08)) state = "practiced";
  else state = "proficient";

  const evidenceSummary = [
    ...new Set(
      events.map((event) => {
        if (event.eventType === "lesson-completion") return "Lesson completed";
        if (event.eventType === "assessment")
          return `Assessment evidence at ${Math.round(event.score * 100)}%`;
        return `${event.attempts > 1 ? `${event.attempts} attempts` : "Practice"} at ${Math.round(event.score * 100)}%`;
      }),
    ),
    ...(weakPrerequisiteIds.length
      ? [
          `${weakPrerequisiteIds.length} prerequisite${weakPrerequisiteIds.length === 1 ? "" : "s"} need attention`,
        ]
      : []),
    `Last practiced ${Math.max(0, Math.round(daysBetween(now, dateValue(lastPracticedAt))))} days ago`,
  ];

  return {
    score: round(score),
    confidence: round(confidence),
    confidenceLabel: confidenceLabel(confidence),
    state,
    evidenceCount,
    evidenceTypeCount,
    difficultyBandCount,
    lastPracticedAt,
    nextReviewAt,
    breakdown: {
      weightedScore: round(weightedScore),
      totalWeight: round(totalWeight),
      rawScore: round(rawScore),
      recencyFactor: round(recencyFactor / Math.max(1, events.length)),
      consistencyFactor: round(consistency),
      prerequisiteFactor: round(prerequisiteFactor),
      evidenceCount,
      evidenceTypeCount,
      difficultyBandCount,
      eventWeights,
      weakPrerequisiteIds,
    },
    evidenceSummary,
  };
}

function masteryFor(
  conceptId: string,
  mastery: readonly RecommendationContext["mastery"][number][],
): RecommendationContext["mastery"][number] {
  return (
    mastery.find((item) => item.conceptId === conceptId) ?? {
      conceptId,
      state: "not-started",
      score: 0,
      confidence: 0,
      confidenceLabel: "low",
      evidenceCount: 0,
      lastPracticedAt: null,
      nextReviewAt: null,
    }
  );
}

function conceptName(conceptId: string, context: RecommendationContext): string {
  return context.concepts.find((concept) => concept.id === conceptId)?.name ?? conceptId;
}

function addCandidate(
  candidates: Map<string, RecommendationCandidate>,
  candidate: RecommendationCandidate,
): void {
  const existing = candidates.get(candidate.sourceKey);
  if (!existing || existing.priority < candidate.priority)
    candidates.set(candidate.sourceKey, candidate);
}

export function generateRecommendations(
  context: RecommendationContext,
  rules: Partial<RecommendationRuleConfig> = {},
): readonly RecommendationCandidate[] {
  const configuration = { ...DEFAULT_RECOMMENDATION_RULES, ...rules };
  const now = dateValue(context.now ?? new Date());
  const candidates = new Map<string, RecommendationCandidate>();
  const mastered = (conceptId: string) =>
    masteryFor(conceptId, context.mastery).state === "mastered";

  for (const concept of context.concepts) {
    const current = masteryFor(concept.id, context.mastery);
    const threshold = normalizeThreshold(concept.masteryThreshold);
    const weak =
      current.state === "developing" ||
      current.state === "needs-review" ||
      current.score < configuration.weakScoreThreshold;
    if (weak && current.evidenceCount > 0) {
      addCandidate(candidates, {
        conceptId: concept.id,
        kind: "weak-concept",
        sourceKey: `weak-concept:${concept.id}`,
        title: `Strengthen ${concept.name}`,
        reason: `${concept.name} is currently at ${Math.round(current.score * 100)}% with ${current.confidenceLabel ?? "low"} confidence. More varied practice will make the result more reliable.`,
        priority: configuration.weakConceptPriority,
        metadata: { score: current.score, confidence: current.confidence },
      });
    }
    if (current.nextReviewAt && dateValue(current.nextReviewAt) <= now) {
      addCandidate(candidates, {
        conceptId: concept.id,
        kind: "due-for-review",
        sourceKey: `due-for-review:${concept.id}`,
        title: `Review ${concept.name}`,
        reason: `${concept.name} is due for review so recall does not fade between practice sessions.`,
        priority: configuration.reviewPriority,
        metadata: { nextReviewAt: current.nextReviewAt },
      });
    }
    if (
      current.evidenceCount > 0 &&
      current.score >= threshold - configuration.nearlyMasteredGap &&
      current.score < threshold
    ) {
      addCandidate(candidates, {
        conceptId: concept.id,
        kind: "nearly-mastered",
        sourceKey: `nearly-mastered:${concept.id}`,
        title: `Finish ${concept.name}`,
        reason: `${concept.name} is close to its ${Math.round(threshold * 100)}% mastery threshold; one focused, varied practice session could close the gap.`,
        priority: configuration.nearlyMasteredPriority,
        metadata: { score: current.score, threshold },
      });
    }
  }

  for (const link of context.prerequisiteLinks) {
    const dependent = masteryFor(link.conceptId, context.mastery);
    const prerequisite = masteryFor(link.prerequisiteConceptId, context.mastery);
    if (
      !mastered(link.prerequisiteConceptId) &&
      (dependent.evidenceCount > 0 || dependent.state !== "not-started")
    ) {
      addCandidate(candidates, {
        conceptId: link.prerequisiteConceptId,
        kind: "missing-prerequisite",
        sourceKey: `missing-prerequisite:${link.conceptId}:${link.prerequisiteConceptId}`,
        title: `Review ${link.prerequisiteName}`,
        reason: `${link.prerequisiteName} is required before ${conceptName(link.conceptId, context)}, but its current mastery is ${Math.round(prerequisite.score * 100)}%.`,
        priority: configuration.prerequisitePriority,
        metadata: { dependentConceptId: link.conceptId },
      });
    }
  }

  for (const conceptId of context.failedAssessmentConceptIds ?? []) {
    const current = masteryFor(conceptId, context.mastery);
    addCandidate(candidates, {
      conceptId,
      kind: "failed-assessment",
      sourceKey: `failed-assessment:${conceptId}`,
      title: `Review ${conceptName(conceptId, context)} after the assessment`,
      reason: `The latest assessment identified ${conceptName(conceptId, context)} as a concept to revisit before another attempt.`,
      priority: configuration.failedAssessmentPriority,
      metadata: { score: current.score },
    });
  }

  for (const conceptId of [
    ...(context.gradeRequiredConceptIds ?? []),
    ...(context.roadmapRequiredConceptIds ?? []),
  ]) {
    if (mastered(conceptId)) continue;
    const kind = (context.gradeRequiredConceptIds ?? []).includes(conceptId)
      ? "grade-requirement"
      : "missing-prerequisite";
    addCandidate(candidates, {
      conceptId,
      kind,
      sourceKey: `${kind}:${conceptId}`,
      title: `Build ${conceptName(conceptId, context)}`,
      reason: `${conceptName(conceptId, context)} is part of the learner's current target requirements and is not mastered yet.`,
      priority: configuration.gradeRequirementPriority,
      metadata: { requirement: kind === "grade-requirement" ? "grade" : "roadmap" },
    });
  }

  for (const concept of context.concepts) {
    const current = masteryFor(concept.id, context.mastery);
    if (current.state !== "not-started") continue;
    const prerequisites = context.prerequisiteLinks.filter((link) => link.conceptId === concept.id);
    const recentlyMasteredPrerequisite = prerequisites.some((link) => {
      const lastPracticedAt = masteryFor(
        link.prerequisiteConceptId,
        context.mastery,
      ).lastPracticedAt;
      return Boolean(
        lastPracticedAt &&
        daysBetween(now, dateValue(lastPracticedAt)) <= configuration.recentlyUnlockedDays,
      );
    });
    if (
      prerequisites.length &&
      prerequisites.every((link) => mastered(link.prerequisiteConceptId)) &&
      recentlyMasteredPrerequisite
    ) {
      addCandidate(candidates, {
        conceptId: concept.id,
        kind: "recently-unlocked",
        sourceKey: `recently-unlocked:${concept.id}`,
        title: `Start ${concept.name}`,
        reason: `Its required prerequisites are mastered, so ${concept.name} is now unlocked for the next step.`,
        priority: configuration.recentlyUnlockedPriority,
        metadata: { prerequisiteIds: prerequisites.map((link) => link.prerequisiteConceptId) },
      });
    }
  }

  return [...candidates.values()]
    .sort((left, right) => right.priority - left.priority || left.title.localeCompare(right.title))
    .slice(0, configuration.maximumActiveRecommendations);
}

export function recommendationKindLabel(kind: RecommendationCandidate["kind"]): string {
  return kind.replaceAll("-", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}
