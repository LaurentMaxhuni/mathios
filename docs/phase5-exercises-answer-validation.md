# Phase 5: Exercises, Questions, and Answer Validation

Phase 5 adds a reusable question engine on top of the Phase 4 concept graph.

## Boundaries

Questions are reusable content records with immutable versions. Exercise sets group published questions for lesson, module, concept, grade, custom, randomized, or adaptive practice. Assessment workflows, diagnostics, mastery calculations, recommendations, and teacher grading remain Phase 6 or later.

Learner reads resolve only published question versions and published exercise sets. Author reads may inspect drafts. Answer specifications, option keys, solutions, error feedback, and template answer expressions are kept server-side for learner routes; the attempt endpoint validates and stores the result without returning the answer key.

## Database

Migration 0005_phase5_exercises_questions.sql adds:

- questions and question_versions for reusable metadata and immutable content versions.
- question_options, question_hints, and question_solutions for structured authoring.
- question_concepts and question_learning_objectives for Phase 4/2 links.
- question_templates for seeded randomized instances.
- exercise_sets, exercise_set_questions, exercise_attempts, and question_attempts for reusable practice and response history.

JSON fields are stored as text in both dialects so SQLite and PostgreSQL keep the same contract. The migration runner applies the migration transactionally.

## Validation

src/domain/exercise/rules.ts is the shared validator. It supports:

- exact and case-insensitive text matching;
- numeric tolerance, units, conversion, and significant figures;
- equivalent fractions and algebraic/formula expressions;
- multiple valid answers, multiple selection, matching, ordering, and multi-step partial credit;
- saved-for-review long answers.

src/domain/exercise/expression.ts uses a small tokenizer, parser, and evaluator. It does not call eval, Function, or a code interpreter. Only numeric literals, variables, arithmetic operators, parentheses, and a small allow-list of mathematical functions are accepted.

src/domain/exercise/generator.ts uses a deterministic seeded PRNG. A generated instance stores its seed with the question attempt so the prompt and expected answer can be reproduced.

Randomized sets use the attempt seed for deterministic ordering. Adaptive sets target the configured difficulty band with deterministic tie-breaking; learner mastery and diagnostic recommendations remain later-phase concerns.

## Server surface

- /api/exercises/questions and /api/exercises/questions/:questionId expose authoring reads/mutations and published learner reads.
- /api/exercises/questions/import bulk-imports validated question records for authors.
- /api/exercises/sets and /api/exercises/sets/:setId expose exercise-set catalog and publication.
- /api/exercises/sets/:setId/attempts starts a learner attempt.
- /api/exercises/attempts/:attemptId/answers validates and stores a response.
- /api/exercises/attempts/:attemptId/complete closes an attempt.
- /api/exercises/validate previews validation for content authors.
- /api/exercises/templates/preview renders deterministic seeded template instances for authors.

Author mutations require edit_content and an author role. Learner attempts require a signed local session and are scoped to the current profile.
