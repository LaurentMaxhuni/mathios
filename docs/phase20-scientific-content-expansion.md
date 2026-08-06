# Phase 20: Complete Scientific Content Expansion

Phase 20 expands the reference library after the platform foundations are stable. It is a
seed-backed content phase and does not introduce new database tables or a new API boundary.

## Content contract

`src/domain/scientific-content/phase20.ts` validates the framework-independent package catalog.
Each package must have:

- a subject, domain, grade range, difficulty, and descriptive objective;
- at least one existing prerequisite or no prerequisite;
- a bounded formula/relationship with an accessible label;
- a worked example, application, misconception correction, and source-attribution note; and
- an acyclic prerequisite graph.

The required scope covers:

- Mathematics: arithmetic, algebra, geometry, trigonometry, functions, probability, statistics,
  combinatorics, calculus, linear algebra, differential equations, number theory, complex numbers,
  discrete mathematics, and olympiad mathematics.
- Physics: measurement, kinematics, dynamics, energy, momentum, rotation, gravitation, fluids,
  waves, thermodynamics, electricity, magnetism, optics, relativity, quantum physics, nuclear
  physics, particle physics, and olympiad physics.
- Chemistry: atomic structure, periodicity, bonding, stoichiometry, reactions, gases,
  thermochemistry, kinetics, equilibrium, acids and bases, electrochemistry, organic chemistry,
  inorganic chemistry, analytical chemistry, physical chemistry, biochemistry, and olympiad
  chemistry.
- Biology: cell biology, molecular biology, genetics, evolution, ecology, anatomy, physiology,
  microbiology, botany, zoology, neuroscience, immunology, biotechnology, bioinformatics, and
  olympiad biology.
- Astronomy: observational astronomy, celestial coordinates, the solar system, planetary science,
  orbital mechanics, stellar physics, stellar evolution, galaxies, exoplanets, compact objects,
  black holes, spectroscopy, cosmology, space science, and astrobiology.

## Persistence and surfaces

`src/infrastructure/database/phase20-content.ts` derives deterministic records for the existing
curriculum, course, lesson, concept, exercise, assessment, and roadmap tables. The canonical seed
imports that catalog for both SQLite and PostgreSQL. Re-running the seed updates the same stable IDs
and does not duplicate rows.

Each package provides:

- a grade-aware domain mapping and objectives across the seeded curricula;
- a published course, module, lesson, formula, worked example, and original accessible SVG
  schematic;
- a reusable concept with prerequisite, application, and misconception records;
- a published question, concept exercise set, and checkpoint assessment; and
- a node in the cross-subject `Scientific Content Progression` roadmap.

Course prerequisites mirror the concept prerequisite graph. The existing course, lesson, concept,
question, exercise, assessment, roadmap, and search surfaces therefore expose Phase 20 content
without a placeholder frontend or a new route contract.

## Source and quality boundary

The seed is a curated Mathios reference synthesis for local learning. Every package carries a source
note and the content validator rejects missing attribution, unsafe TeX commands, markup characters,
unbalanced braces, invalid grade ranges, missing prerequisites, and prerequisite cycles. The source
note is not a claim that the seed replaces a local curriculum, educator review, or primary scientific
reference. Before publishing externally, a content reviewer should verify grade placement, formulas,
units, diagrams, and assessment difficulty against the intended curriculum.

## Verification

Use the normal project checks after migrations and seed data are available:

```text
npm.cmd run format:check
npm.cmd run lint
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
npm.cmd run test:e2e
```

The seed integration test checks idempotence, package coverage across the grade ladder, formula and
diagram blocks, course prerequisites, and roadmap inclusion.
