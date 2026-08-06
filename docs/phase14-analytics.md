# Phase 14 analytics

Phase 14 adds local learner and teacher analytics without sending activity to a third-party analytics service.

## Data flow

```text
lesson / exercise / assessment / simulation / planner / notes / mastery
                              |
                 profile-scoped source repositories
                              |
       activity_events + learning_sessions + aggregation rules
                              |
       learner_metrics / content_metrics / analytics_snapshots
                              |
                 learner and teacher dashboards
```

The source-of-truth tables remain authoritative. Analytics tables are rebuildable projections used for dashboard speed, daily history, and teacher content signals.

## Stored entities

- `learning_sessions` stores a bounded local session lifecycle and duration.
- `activity_events` stores the eight Phase 14 event types: lesson view, lesson completion, question attempt, assessment submission, simulation session, note creation, study-session completion, and mastery change.
- `analytics_snapshots` stores serialized range/daily/weekly read models.
- `learner_metrics` stores daily profile metrics.
- `content_metrics` stores daily resource metrics, including accuracy, support count, hint rate, and discrimination index.

SQLite and PostgreSQL migrations are kept in parallel in `drizzle/sqlite/0014_phase14_analytics.sql` and `drizzle/postgres/0014_phase14_analytics.sql`. The migration runner applies each file transactionally.

## Authorization and privacy

Learner API and page reads are restricted to the current session profile. Teacher analytics requires the existing `view_analytics` permission. Teacher aggregation is performed server-side; profile identifiers are not accepted from the browser for learner events. Event capture is local-first and does not contact an external analytics provider.

## Operational risks

- Event writes use stable dedupe keys at completion boundaries to avoid double counting retries.
- Raw durations and scores are bounded by schemas and database checks; malformed event payloads are rejected.
- Date ranges are normalized to UTC day boundaries so daily metrics do not drift with browser timezone.
- Dashboard reads use explicit profile predicates to avoid cross-profile leakage.
- Derived metric persistence is best-effort after a source operation; a metrics write cannot roll back a completed lesson, answer, note, or assessment.
- Empty and low-volume states are shown explicitly. Question discrimination requires at least three outcomes and should be treated as a review signal, not a verdict.
