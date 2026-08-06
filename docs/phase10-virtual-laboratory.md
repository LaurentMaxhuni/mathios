# Phase 10: Virtual laboratory and scientific reports

The laboratory module turns a published experiment activity into a private, auditable workspace.
Activities support simulated, real-world, and hybrid modes. A learner records observations and
measurements, optionally imports data from the trusted Phase 9 simulation registry, reviews a
graph and theory comparison, then saves or submits a structured report.

## Activity contract

`laboratory_activities` stores the bounded editorial content: objective, theory, materials, safety
notes, analysis and graphing prompts, questions, conclusion prompt, extension, mode, publication
state, and an optional trusted simulation id. Procedure steps live in `laboratory_steps`; measured
and controlled variables live in `laboratory_variables`. Variable configuration can declare a
`simulationKey` or a calculation hint, but it is metadata only and is never executed as code.

## Learner flow

1. Start a session for a published activity.
2. Follow the procedure and save observation notes.
3. Enter measurements by trial row. Numeric values are finite, range-checked, converted to the
   variable unit, and rounded according to significant figures. Uncertainty is preserved.
4. For linked activities, import deterministic samples from the registered simulation definition.
5. Review paired graph points, linear regression, and comparisons with theoretical values.
6. Complete the session, write the report, and save it as a draft or submit it.
7. Export the report as sanitized HTML or a deterministic text-and-data PDF. Teacher/content
   creator feedback is stored separately and shown with the report.

## Persistence

Migration `0010_phase10_laboratory.sql` is checked in for both SQLite and PostgreSQL. The eight
tables are `laboratory_activities`, `laboratory_steps`, `laboratory_variables`,
`laboratory_sessions`, `laboratory_observations`, `laboratory_measurements`, `laboratory_reports`,
and `laboratory_feedback`. JSON columns are bounded structured content only; raw activity content
cannot execute application code. Session, report, and feedback reads are profile-scoped where the
learner owns the record.

## API surface

- `GET/POST /api/laboratories`
- `GET/PATCH /api/laboratories/:activityId`
- `POST /api/laboratories/:activityId/publish`
- `GET/POST /api/laboratories/:activityId/sessions`
- `GET/PATCH /api/laboratories/sessions/:sessionId`
- `POST /api/laboratories/sessions/:sessionId/observations`
- `POST /api/laboratories/sessions/:sessionId/measurements`
- `POST /api/laboratories/sessions/:sessionId/simulation-data`
- `POST /api/laboratories/sessions/:sessionId/complete`
- `GET/PUT /api/laboratories/sessions/:sessionId/report`
- `GET /api/laboratories/reports/:reportId/export?format=html|pdf`
- `POST /api/laboratories/reports/:reportId/feedback`

All mutation payloads use Zod schemas and the service layer applies domain rules and permission
checks before repository writes.
