# Phase 17: classrooms

Phase 17 adds the multi-user classroom boundary while preserving the local profile workflow. The classroom feature is available at `/classrooms` and uses the existing signed local session and profile roles.

## Responsibilities

- Teachers and administrators create named classes with subject and grade group metadata.
- Learners enroll with a join code; teachers can also issue profile-targeted or reusable invitations.
- Teachers assign published lessons, courses, exercise sets, assessments, simulations, laboratory activities, and roadmaps.
- Assignments carry optional start/due times, attempt limits, late rules, class or individual targets, and status tracking.
- Learners submit bounded written responses. Teachers can return work, require resubmission, grade it, attach written feedback, and record rubric scores.
- Teacher analytics are derived from classroom targets and submissions, not from the learner analytics read model.

## Persistence and provider parity

`0017_phase17_classrooms.sql` is checked in for both SQLite and PostgreSQL. The migration creates `classes`, `class_members`, `class_teachers`, `assignments`, `assignment_targets`, `assignment_submissions`, `grading_rubrics`, `teacher_feedback`, and `invitations`, with foreign keys, unique membership/target constraints, bounded status checks, and indexes for class, profile, assignment, and submission reads.

`ClassroomRepository` is the domain port. The infrastructure adapter keeps explicit SQL for both providers and assembles assignment targets, latest submission state, latest feedback, rubrics, and classroom analytics. Assignments store typed resource metadata and a display title; they do not copy or edit the authoritative content tables.

## Access and privacy

- Administrators may list and inspect all classrooms.
- A class owner or assigned teacher may manage that class, create assignments, invite people, and review submissions.
- An active learner may inspect the class shell, their own membership, assignments targeted to them, their own submissions, and the rubrics/feedback attached to those assignments.
- Learners cannot create classes, manage assignments, review work, or submit from a teacher-owned class account.
- Join codes enroll the current profile as a learner. Invitations can enroll a named profile as a learner or assign a teacher role.
- The local profile flow remains unchanged; classrooms are additive and no classroom data is required for ordinary single-user study.

The service applies these rules before repository calls. Routes use the existing application error envelope, and unauthenticated classroom requests fail with the standard 401 response.

## Seed and verification

`db:seed` remains idempotent. When at least one profile exists it adds a sample Physics classroom owned by the first profile, enrolls the second profile when present, and adds a targeted lesson assignment with a small rubric. With no profiles, the seed skips profile-dependent classroom rows. Domain, repository, service, migration, seed, and browser coverage exercises the timing/attempt rules, lifecycle persistence, privacy filtering, and teacher workflow.

## Risks and follow-up boundaries

Classroom analytics currently count persisted submissions and derive rates from assignment targets; a future phase can add pagination, richer gradebook aggregation, notification delivery, and production deployment controls. Phase 17 intentionally does not introduce hosted authentication, external messaging, object storage, or later deployment hardening.
