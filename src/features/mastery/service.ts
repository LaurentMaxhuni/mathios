import { randomUUID } from "node:crypto";
import { NotFoundError } from "@/domain/errors/application-error";
import { computeMastery, generateRecommendations } from "@/domain/mastery/rules";
import type {
  MasteryConceptRecord,
  MasteryConceptView,
  MasteryDashboardData,
  MasteryDetail,
  MasteryEvidenceInput,
  MasteryEventRecord,
  MasterySnapshotRecord,
  RecommendationRecord,
  UserConceptMasteryRecord,
} from "@/domain/mastery/types";
import type { MasteryRepository } from "@/domain/ports/mastery-repository";
import type { AuthSession, AuthenticatedPrincipal } from "@/infrastructure/auth/auth-provider";
import { requireSession } from "@/features/auth/authorization";

function idFor(prefix: string): string {
  return `${prefix}-${randomUUID()}`;
}

function ensure<T>(value: T | null, resource: string, id: string): T {
  if (!value) throw new NotFoundError(resource, id);
  return value;
}

export function requireMasteryLearner(session: AuthSession | null): AuthenticatedPrincipal {
  return requireSession(session);
}

function emptyMastery(profileId: string, conceptId: string): UserConceptMasteryRecord {
  const computation = computeMastery({ events: [] });
  const now = new Date(0).toISOString();
  return {
    profileId,
    conceptId,
    currentSnapshotId: null,
    createdAt: now,
    updatedAt: now,
    ...computation,
  };
}

function normalizeView(
  profileId: string,
  concept: MasteryConceptRecord,
  mastery: UserConceptMasteryRecord | null,
): MasteryConceptView {
  return { ...concept, mastery: mastery ?? emptyMastery(profileId, concept.id) };
}

export async function recordMasteryEvidence(
  input: Omit<MasteryEvidenceInput, "id"> & { id?: string },
  repository: MasteryRepository,
): Promise<UserConceptMasteryRecord> {
  const concept = ensure(await repository.getConcept(input.conceptId), "Concept", input.conceptId);
  const rules = await repository.getRuleConfiguration();
  const event = await repository.upsertEvent({
    ...input,
    id: input.id ?? idFor("mastery-event"),
  });
  const events = await repository.listEvents(input.profileId, input.conceptId);
  const context = await repository.getContext(input.profileId);
  const prerequisiteStates = context.prerequisiteLinks
    .filter((link) => link.conceptId === input.conceptId)
    .map((link) => {
      const current = context.mastery.find((item) => item.conceptId === link.prerequisiteConceptId);
      return {
        conceptId: link.prerequisiteConceptId,
        score: current?.score ?? 0,
        state: current?.state ?? "not-started",
        masteryThreshold: context.concepts.find((item) => item.id === link.prerequisiteConceptId)
          ?.masteryThreshold,
      };
    });
  const computation = computeMastery({
    events,
    masteryThreshold: concept.masteryThreshold,
    prerequisiteStates,
    rules: rules.mastery,
    now: event.occurredAt,
  });
  const existing = await repository.getMastery(input.profileId, input.conceptId);
  const now = new Date().toISOString();
  const mastery: UserConceptMasteryRecord = {
    ...computation,
    profileId: input.profileId,
    conceptId: input.conceptId,
    currentSnapshotId: null,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
  const snapshot: MasterySnapshotRecord = {
    ...computation,
    id: idFor("mastery-snapshot"),
    profileId: input.profileId,
    conceptId: input.conceptId,
    createdAt: now,
    reason: `${input.eventType.replaceAll("-", " ")} evidence recorded.`,
  };
  await repository.saveMastery(mastery, snapshot);
  await refreshRecommendations(input.profileId, repository);
  return { ...mastery, currentSnapshotId: snapshot.id };
}

export async function recordLessonCompletion(
  input: { profileId: string; lessonId: string; occurredAt?: string },
  repository: MasteryRepository,
): Promise<readonly UserConceptMasteryRecord[]> {
  const conceptIds = await repository.getLessonConceptIds(input.profileId, input.lessonId);
  const results: UserConceptMasteryRecord[] = [];
  for (const conceptId of conceptIds) {
    results.push(
      await recordMasteryEvidence(
        {
          profileId: input.profileId,
          conceptId,
          eventType: "lesson-completion",
          sourceId: input.lessonId,
          score: 1,
          difficulty: "gentle",
          metadata: { lessonId: input.lessonId },
          occurredAt: input.occurredAt,
        },
        repository,
      ),
    );
  }
  return results;
}

export async function recordExerciseCompletion(
  input: { profileId: string; attemptId: string },
  repository: MasteryRepository,
): Promise<readonly UserConceptMasteryRecord[]> {
  const evidence = await repository.getExerciseEvidence(input.profileId, input.attemptId);
  const results: UserConceptMasteryRecord[] = [];
  for (const item of evidence) {
    results.push(
      await recordMasteryEvidence(
        {
          profileId: input.profileId,
          conceptId: item.conceptId,
          eventType: "exercise",
          sourceId: input.attemptId,
          score: item.score,
          difficulty: item.difficulty,
          attempts: item.attempts,
          hintsUsed: item.hintsUsed,
          partialCredit: item.partialCredit,
          metadata: { ...item.metadata, attemptId: input.attemptId },
          occurredAt: item.occurredAt,
        },
        repository,
      ),
    );
  }
  return results;
}

export async function recordAssessmentCompletion(
  input: { profileId: string; attemptId: string },
  repository: MasteryRepository,
): Promise<readonly UserConceptMasteryRecord[]> {
  const evidence = await repository.getAssessmentEvidence(input.profileId, input.attemptId);
  const results: UserConceptMasteryRecord[] = [];
  for (const item of evidence) {
    results.push(
      await recordMasteryEvidence(
        {
          profileId: input.profileId,
          conceptId: item.conceptId,
          eventType: "assessment",
          sourceId: input.attemptId,
          score: item.score,
          difficulty: item.difficulty,
          attempts: item.attempts,
          hintsUsed: item.hintsUsed,
          partialCredit: item.partialCredit,
          metadata: {
            ...item.metadata,
            attemptId: input.attemptId,
            assessmentId: item.assessmentId,
            passed: item.passed,
          },
          occurredAt: item.occurredAt,
        },
        repository,
      ),
    );
  }
  return results;
}

export async function refreshRecommendations(
  profileId: string,
  repository: MasteryRepository,
): Promise<readonly RecommendationRecord[]> {
  const [context, rules] = await Promise.all([
    repository.getContext(profileId),
    repository.getRuleConfiguration(),
  ]);
  const candidates = generateRecommendations(
    {
      concepts: context.concepts,
      mastery: context.mastery,
      prerequisiteLinks: context.prerequisiteLinks,
      failedAssessmentConceptIds: context.failedAssessmentConceptIds,
      gradeRequiredConceptIds: context.gradeRequiredConceptIds,
      roadmapRequiredConceptIds: context.roadmapRequiredConceptIds,
    },
    rules.recommendations,
  );
  await repository.saveRecommendations(profileId, candidates);
  return repository.listRecommendations(profileId);
}

export async function getMasteryDashboard(
  profileId: string,
  repository: MasteryRepository,
): Promise<MasteryDashboardData> {
  const [concepts, mastery, subjects, grades] = await Promise.all([
    repository.listConcepts(),
    repository.listMastery(profileId),
    repository.listSubjects(profileId),
    repository.listGrades(profileId),
  ]);
  const masteryByConcept = new Map(mastery.map((item) => [item.conceptId, item]));
  const views = concepts.map((concept) =>
    normalizeView(profileId, concept, masteryByConcept.get(concept.id) ?? null),
  );
  const assessed = views.filter((view) => view.mastery.evidenceCount > 0);
  return {
    concepts: views,
    subjects,
    grades,
    totalConcepts: views.length,
    assessedConcepts: assessed.length,
    masteredConcepts: views.filter((view) => view.mastery.state === "mastered").length,
    reviewConcepts: views.filter((view) => view.mastery.state === "needs-review").length,
    averageScore: views.length
      ? views.reduce((sum, view) => sum + view.mastery.score, 0) / views.length
      : 0,
    averageConfidence: assessed.length
      ? assessed.reduce((sum, view) => sum + view.mastery.confidence, 0) / assessed.length
      : 0,
  };
}

export async function getMasteryDetail(
  profileId: string,
  conceptId: string,
  repository: MasteryRepository,
): Promise<MasteryDetail> {
  return ensure(
    await repository.getMasteryDetail(profileId, conceptId),
    "Concept mastery",
    conceptId,
  );
}

export async function listReviewQueue(
  profileId: string,
  repository: MasteryRepository,
): Promise<readonly MasteryConceptView[]> {
  const dashboard = await getMasteryDashboard(profileId, repository);
  const now = Date.now();
  return dashboard.concepts
    .filter(
      (view) =>
        view.mastery.state === "needs-review" ||
        Boolean(view.mastery.nextReviewAt && Date.parse(view.mastery.nextReviewAt) <= now),
    )
    .sort((left, right) => {
      const leftDate = left.mastery.nextReviewAt ? Date.parse(left.mastery.nextReviewAt) : 0;
      const rightDate = right.mastery.nextReviewAt ? Date.parse(right.mastery.nextReviewAt) : 0;
      return leftDate - rightDate || left.name.localeCompare(right.name);
    });
}

export async function listRecommendations(
  profileId: string,
  repository: MasteryRepository,
): Promise<readonly RecommendationRecord[]> {
  await refreshRecommendations(profileId, repository);
  return repository.listRecommendations(profileId);
}

export async function dismissRecommendation(
  profileId: string,
  recommendationId: string,
  repository: MasteryRepository,
  reason?: string,
): Promise<void> {
  await repository.dismissRecommendation(profileId, recommendationId, reason);
}

export function eventForAnswer(
  event: MasteryEventRecord,
): Pick<MasteryEvidenceInput, "score" | "difficulty" | "attempts" | "hintsUsed" | "partialCredit"> {
  return {
    score: event.score,
    difficulty: event.difficulty,
    attempts: event.attempts,
    hintsUsed: event.hintsUsed,
    partialCredit: event.partialCredit,
  };
}
