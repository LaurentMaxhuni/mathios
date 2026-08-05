# Phase 7: Concept Mastery and Learning Recommendations

Phase 7 turns lesson, exercise, and assessment completion into an inspectable concept-level record. It is intentionally deterministic and AI-free: every score, confidence value, review date, and recommendation can be explained from stored evidence and the active rule configuration.

## Scope

- Mastery states: Not started, Introduced, Developing, Practiced, Proficient, Mastered, and Needs review.
- Evidence from lesson completion, exercise accuracy, and assessment performance.
- Difficulty, attempts, hints, partial credit, recency, evidence variety, and prerequisite health.
- Separate mastery score and confidence, with protection against declaring mastery from one easy question.
- Historical snapshots, gradual recency decay, and a review queue.
- Deterministic recommendations for missing prerequisites, weak concepts, failed assessments, due review, grade requirements, nearly mastered concepts, and newly unlocked concepts.
- Profile-scoped dismissal records without deleting mastery history.

Roadmap planning, adaptive scheduling, analytics, simulations, notes, and AI recommendations are later-phase concerns.

## Persistence

`0007_phase7_mastery_recommendations.sql` is checked in for SQLite and PostgreSQL. The migration adds:

- `user_concept_mastery` for the current profile/concept record;
- `mastery_events` for idempotent evidence keyed by profile, concept, event type, and source;
- `mastery_snapshots` for immutable historical score changes;
- `mastery_rules` and `recommendation_rules` for active JSON rule configuration;
- `recommendations` for current, dismissed, or completed explainable suggestions; and
- `recommendation_dismissals` for the profile-scoped dismissal audit trail.

The seed installs the default rule sets and records `phase-7` in `app_metadata`. Rule configuration remains data so a later phase can add administration without changing the domain contract.

## Domain and application flow

`src/domain/mastery/rules.ts` computes weighted evidence with recency, difficulty, attempt, hint, and consistency adjustments. Confidence increases with evidence count, evidence-type variety, difficulty-band variety, and consistent scores. Prerequisites reduce the score and block the Mastered state until they are healthy. The computation returns a breakdown and evidence summary suitable for the detail view.

`src/features/mastery/service.ts` records normalized evidence, saves current mastery and a snapshot together, then refreshes recommendations. Existing lesson, exercise, and assessment completion paths call the service only after their own persistence succeeds. Repeating the same source event is safe because the repository upserts the event.

## Routes and screens

- `/mastery`: dashboard with score, confidence, subjects, grades, concepts, and next actions;
- `/mastery/subjects` and `/mastery/subjects/[subjectId]`: subject mastery map;
- `/mastery/grades` and `/mastery/grades/[gradeId]`: grade-range mastery view;
- `/mastery/concepts/[conceptId]`: concept detail, evidence, prerequisites, unlocks, and snapshots;
- `/recommendations`: active recommendation feed with reason text and dismissal; and
- `/review-queue`: due and needs-review concepts.

The API exposes dashboard/recommendation reads, concept detail, recommendation dismissal, and a server action for recommendation refresh. All reads and mutations are profile-scoped through the existing local session boundary.

## Verification

Unit coverage exercises scoring safeguards, varied evidence, recency, prerequisite effects, and recommendation explanations. Migration and seed tests verify both new table families and idempotent default rules. Repository integration coverage should assert event upsert, current-plus-snapshot writes, recommendation persistence, and dismissal behavior. The browser suite covers navigation to the mastery dashboard, subject/grade maps, concept detail, recommendation feed, and review queue after the seeded learner session is established.
