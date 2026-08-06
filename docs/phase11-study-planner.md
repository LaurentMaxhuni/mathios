# Phase 11: Study planner, goals, and calendar

Phase 11 turns an existing Mathios learning target into a date-aware study rhythm. It is deliberately a deterministic feature: the same goal, learning items, availability, exceptions, and existing sessions produce the same schedule.

## Scope

Learners can plan toward a grade, subject, course, roadmap, exam, concept, or a weekly study-time goal. A goal records its start and target dates, weekly minutes, available weekdays, session length, priority subjects, rest days, difficulty preference, and review cadence.

Generated work can be a lesson, exercise, review, simulation, laboratory activity, assessment, or catch-up session. The calendar exposes month, week, and agenda views. Sessions can be completed, skipped, marked missed, or moved by drag-and-drop; the API rejects overlapping moves. Calendar exceptions support unavailable days, blocked windows, and extra availability.

## Data model

Migration `0011_phase11_study_planner.sql` adds seven profile-scoped tables:

- `study_goals` stores the learner intent and planning constraints.
- `study_plans` stores one generated schedule version and its realism/warning summary.
- `study_plan_items` stores the learning work selected for that plan.
- `study_sessions` stores date-only calendar placement and lifecycle state.
- `study_availability` stores recurring weekday windows.
- `study_exceptions` stores one-off blocked or extended windows.
- `study_completion_events` provides an append-only audit trail for completion, skip, miss, and reschedule events.

The SQLite and PostgreSQL migrations are kept equivalent. Dates are stored as `YYYY-MM-DD` values and times as integer minutes from midnight, so scheduling is stable across time zones and daylight-saving transitions. Source-specific IDs remain metadata rather than polymorphic foreign keys; completion propagation resolves them through the existing course and roadmap ports.

## Scheduling rules

The framework-free rules module validates the planning window, normalizes recurring availability, removes rest days and exceptions, and allocates work in deterministic priority/order order. It respects both weekly study minutes and per-window maximum minutes, splits work into the requested session length, adds spaced review items when configured, and reports capacity, scheduled minutes, unallocated minutes, warnings, and a `realistic`/`tight`/`infeasible` classification.

Existing sessions are treated as occupied when a schedule is regenerated or a missed session is moved. The move validator checks date validity, day bounds, and overlap conflicts. A dashboard read promotes overdue scheduled/in-progress sessions to `missed` and records the event. Catch-up generation retains the original session ID while recording its previous date and a reschedule event; if capacity is insufficient, the response keeps the remaining warning visible instead of silently dropping the work.

## Application and API boundaries

`src/domain/planner` contains the records, constants, date-only helpers, scheduler, conflict detection, and catch-up rules. `src/domain/ports/planner-repository.ts` defines persistence behavior. `src/features/planner` owns Zod input validation, planning services, progress propagation, and the client workspace. `src/infrastructure/database/repositories/study-planner-repository.ts` implements explicit SQLite/PostgreSQL queries. Routes under `/api/planner` require the active local profile and expose:

- dashboard/options and goal creation;
- goal read, update, archive, and plan generation;
- session move/status updates;
- availability replacement;
- exception creation/deletion; and
- missed-session redistribution.

Completing a lesson session writes the existing profile-scoped lesson progress record. Roadmap-backed items also resolve the learner's enrollment and write roadmap-node progress, preserving the Phase 8 progress model rather than introducing a second source of truth.

## Seed and verification

The Phase 11 seed is idempotent. On a seeded database with at least one profile it adds one small roadmap-backed example goal, plan, item, and session for that first profile; a seed run before profiles exist remains safe and can be rerun after profile creation. It does not create planner data for arbitrary profiles.

Coverage includes deterministic scheduling, rest days, review generation, exceptions, occupied slots, conflict rejection, catch-up identity, SQLite repository persistence, availability, plan generation, session mutation, completion events, migration bookkeeping, and seed bookkeeping. The Playwright suite covers profile sign-in, goal generation, calendar agenda switching, and session completion through the browser.
