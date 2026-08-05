# Phase 6: Assessments, Diagnostics, and Placement

Phase 6 adds formal and informal assessment workflows on top of the reusable Phase 5 question and validation engine.

## Boundaries

Assessment records support lesson knowledge checks, module quizzes, unit and grade exams, subject exams, diagnostic and placement tests, roadmap checkpoints, cumulative reviews, timed exams, untimed practice, and olympiad problem sets. Mastery updates, personalized roadmaps, analytics, and assignment-specific scheduling remain later phases.

Authors can configure sections, fixed questions, reproducible pools, difficulty distribution, concept coverage, time and attempt limits, passing thresholds, partial credit, feedback visibility, review mode, retake rules, ordering, and automatic submission. Learners only receive published assessments and sanitized question instances; answer specifications and correct-option flags stay server-side.

## Database

Migration `0006_phase6_assessments.sql` adds:

- `assessments`, `assessment_sections`, `assessment_questions`, and `assessment_pools` for the reusable assessment definition;
- `assessment_attempts` for resumable timed or untimed learner sessions;
- `assessment_section_results` for weighted section and concept scores;
- `diagnostic_results` and `placement_results` for explainable readiness and starting-level recommendations;
- a nullable `assessment_attempt_id` on `question_attempts`, with a parent XOR check so an answer belongs to exactly one exercise or assessment attempt.

Both dialect migrations keep JSON configuration, question instances, responses, validation results, concept scores, and recommendations as text with the same application contract. SQLite rebuilds the Phase 5 answer table to preserve existing exercise attempts while adding the assessment parent.

## Domain and application logic

`src/domain/assessment/rules.ts` validates assessment definitions, selects fixed and pooled questions with a seeded PRNG, honors difficulty and concept filters, calculates score summaries, builds section concept results, groups mistake categories, enforces review selection, and produces explainable diagnostic analysis.

`src/features/assessments/service.ts` enforces author/learner permissions, publication invariants, attempt limits, safe resume behavior, expiry and auto-submit, static Phase 5 answer validation, feedback visibility, result persistence, diagnostic output, and placement review questions.

## Server surface

- `/api/assessments` and `/api/assessments/:assessmentId` expose catalog reads and author metadata/status mutations.
- `/api/assessments/:assessmentId/sections`, `/pools`, and `/questions` expose authoring mutations.
- `/api/assessments/:assessmentId/attempts` starts or resumes a learner attempt.
- `/api/assessments/attempts/:attemptId/answers` saves a validated response.
- `/api/assessments/attempts/:attemptId/complete` closes an attempt and persists section, diagnostic, or placement results.

Author mutations require `edit_content` plus an author role. Learner reads and attempts require the signed local session and are scoped to the current profile.

## Frontend

`/assessments` lists published assessments, `/assessments/[assessmentId]` provides the learner player, `/assessments/manage` lists author records, and `/assessments/[assessmentId]/edit` provides the Phase 6 authoring forms. The player supports radio, checkbox, and free-text responses, timed countdowns, resume-safe server attempts, after-submit feedback, section scores, time metrics, mistake categories, previous-attempt comparison, and diagnostic/placement recommendations.

## Verification

The Phase 6 unit coverage exercises deterministic pool selection, score and diagnostic rules. SQLite integration coverage verifies seeded catalog data, sanitized question instances, answer persistence, scoring, section results, and resumable attempt records. The browser suite covers assessment catalog navigation and the learner submission flow alongside the existing Phase 5 exercise flow.
