# Phase 16: Optional local and remote AI

Phase 16 adds an AI layer without making Mathios dependent on a model provider. The default mode
is disabled, and lessons, exercises, search, planning, analytics, and portability remain usable
without network access or an API key.

## Provider contract

The domain AI module and provider port define provider-neutral modes and tasks:

- disabled;
- Ollama-compatible local models, including native /api/chat and OpenAI-compatible /v1;
- OpenAI-compatible remote APIs;
- hybrid local-first routing with a remote fallback when the local provider is unavailable.

Provider adapters use bounded requests, a timeout, non-streaming JSON responses, and generic error
messages. Remote keys are sent only in server-side authorization headers. Provider URLs reject
credentials, query strings, fragments, and non-HTTPS remote endpoints.

## Grounding and labeling

The AI studio at /ai accepts a published lesson ID, concept ID, selected grade, and learner
context. Published lesson snapshots, concept metadata, and profile mastery are converted into
bounded grounding sources. Official, creator-authored, mastery, and learner-provided sources remain
visibly distinct; learner-provided text is marked unapproved and all source text is treated as data
rather than instructions.

Supported tasks cover explanations, Socratic tutoring, hints, lesson/note summaries, practice
question generation and variations, written-answer feedback, misconception analysis,
natural-language search, and study-plan suggestions. Every stored response is marked
AI-generated, keeps its grounding source list, and starts in generated review status. Profiles with
content-edit permission can approve or reject a result. Approval is only a review record and never
publishes or overwrites authoritative content.

## Configuration and persistence

ai_settings is a singleton application configuration row. It stores mode, local/remote endpoint
and model names, output limits, and temperature. A remote API key is encrypted with AES-256-GCM
using a key derived from SESSION_SECRET; only a boolean hasRemoteApiKey is returned to the browser.
AI_REMOTE_API_KEY is also supported as a server-only environment fallback.

ai_generations stores profile-scoped task, provider/model, bounded instruction, source metadata,
output, and review status. Migration 0016_phase16_optional_ai.sql is checked in for SQLite and
PostgreSQL. Seed data keeps the mode disabled and does not create credentials.

## API

- GET/PATCH /api/ai/settings reads or updates configuration; changes require application-settings permission.
- GET /api/ai/health checks the configured provider without exposing credentials.
- POST /api/ai/generate creates a grounded, labeled generation for the current profile.
- GET /api/ai/generations lists the current profile's history.
- PATCH /api/ai/generations/:generationId approves or rejects a result with content-edit permission.

## Risks and safeguards

Prompt-injection text is delimited and explicitly treated as untrusted data. Source, instruction,
learner-context, output, model, and token limits are bounded. Provider failures are translated
into safe, non-secret errors; hybrid fallback only occurs for provider-unavailable failures.
Secrets are excluded from settings responses, persisted generation payloads, browser state, and
logs. AI-generated content is never copied into official or creator-authored tables.
