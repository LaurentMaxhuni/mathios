# Phase 8: Interdisciplinary roadmaps and personalized paths

Phase 8 adds reusable learning roadmaps that compose concepts, lessons, courses, modules,
assessments, and future simulation/laboratory references across subjects and grades.

## Boundaries

Roadmap content is versioned independently of learner enrollment. Published readers resolve the
published version; author edits fork a published version into a draft before changing nodes or
edges. Required edges read as `source unlocks target`, and required cycles are rejected by the
domain validator. Optional and recommended edges remain visible without blocking a learner.

The persistence model contains roadmaps, versions, subject and roadmap prerequisites, nodes,
edges, user enrollments, per-node progress, and persisted personalized-path snapshots. Resource
references are typed at the node boundary so Phase 9 simulations and Phase 10 laboratory
activities can be added without changing the roadmap graph contract.

## Personalization

Path generation is deterministic and framework-independent. It combines current and target grade,
the selected goal, weekly study time, diagnostic weak/missing-prerequisite concept IDs, existing
mastery, and completed roadmap nodes. Mastered concepts are marked as skipped, completed nodes
remain completed, and other nodes are ordered topologically with a plain-language reason. The
generated snapshot records estimated minutes/weeks, included topics, skipped topics, missing
prerequisites, and every node explanation.

## Learner and author surfaces

- `/roadmaps` is the published catalog and active-enrollment overview.
- `/roadmaps/[roadmapId]` shows the learner route, locks, progress, and path summary.
- `/personalized-paths` shows generated path snapshots and explanations.
- `/roadmaps/manage` and `/roadmaps/[roadmapId]/edit` provide authoring, version, subject,
  prerequisite, node, edge, and graph-integrity controls.
- `/api/roadmaps`, `/api/roadmaps/[roadmapId]`, enrollment/progress/path routes, and
  `/api/personalized-paths` expose the same permission-scoped contracts.

Simulation and laboratory execution remain later phases; roadmap nodes can reference those future
resources without implementing their engines here.
