# Phase 9: Interactive simulation framework

Mathios simulations are registry-driven domain definitions. A definition owns validated inputs,
outputs, presets, guided tasks, deterministic state transitions, and frame generation. React only
renders the public definition and calls the frame endpoint; lesson pages never contain simulation
logic.

The registry includes the complete Phase 9 examples: function transformations, unit circle, vector
components, one-dimensional motion, projectile motion, force/mass/acceleration, energy
conservation, orbital motion, gas law, reaction balancing, acid-base titration, Punnett-square
inheritance, enzyme activity, population growth, planetary orbit, moon phases, and stellar spectrum.

Published definitions are selected from the trusted registry by id/slug. Database JSON stores the
versioned public metadata and input configuration, but never executes database-provided code.
Learner sessions store validated inputs, numeric state, elapsed time, and completion results.
Results can be exported as JSON and are linked from published lessons through `lesson_simulations`.

Migration `0009_phase9_simulations.sql` is checked in for SQLite and PostgreSQL. It does not create
laboratory or planner entities from later phases.
