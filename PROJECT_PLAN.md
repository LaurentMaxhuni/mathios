# Phased Implementation Plan

Build the science learning platform as a modular monolith using incremental, production-quality phases.

Do not attempt to generate the entire platform in one implementation pass.

For every phase:

1. Review the existing architecture and code.
2. Preserve previously completed functionality.
3. Define the exact scope before writing code.
4. Update the database schema through migrations.
5. Implement backend and frontend functionality together.
6. Add validation and error handling.
7. Add tests for important domain logic.
8. Update seed data where appropriate.
9. Update documentation.
10. Verify that the application runs locally.
11. Do not leave placeholder pages for features included in the phase.
12. Do not begin functionality assigned to later phases unless it is required as infrastructure.

---

# Phase 0: Architecture and Project Foundation

## Objective

Establish the technical architecture, project structure, development environment, conventions, and deployment foundation.

Do not build substantial product features yet.

## Tasks

### Architecture

Define and document:

* Modular monolith architecture
* Presentation layer
* Application layer
* Domain layer
* Infrastructure layer
* Feature-module boundaries
* Dependency direction
* Repository interfaces
* Storage abstractions
* Authentication abstraction
* Search abstraction
* AI provider abstraction
* Local and deployed environment differences

### Technology stack

Use:

* Next.js
* React
* TypeScript
* Tailwind CSS
* shadcn/ui
* React Hook Form
* Zod
* TanStack Query where server-state caching is needed
* Zustand only for appropriate local client state
* Drizzle ORM or Prisma
* SQLite locally
* PostgreSQL compatibility for deployment
* Vitest or Jest for unit and integration tests
* Playwright for end-to-end testing
* Docker and Docker Compose
* ESLint
* Prettier

Use KaTeX or MathJax for scientific notation and formulas.

### Project structure

Create a clean feature-oriented structure similar to:

```text
src/
├── app/
├── components/
│   ├── ui/
│   ├── layout/
│   └── shared/
├── features/
│   ├── auth/
│   ├── profiles/
│   ├── curricula/
│   ├── grades/
│   ├── subjects/
│   ├── courses/
│   ├── lessons/
│   ├── concepts/
│   ├── roadmaps/
│   ├── assessments/
│   ├── mastery/
│   ├── simulations/
│   ├── notes/
│   ├── planner/
│   ├── analytics/
│   └── settings/
├── domain/
├── infrastructure/
│   ├── database/
│   ├── storage/
│   ├── search/
│   └── ai/
├── lib/
├── server/
├── styles/
└── types/
```

Each feature should contain its own:

* Components
* Schemas
* Services
* Repositories
* Queries
* Mutations
* Types
* Tests

### Environment configuration

Support:

* Development
* Test
* Local production
* Docker
* Hosted production

Create validated environment configuration.

Do not access environment variables directly throughout the codebase.

### Database foundation

Configure:

* SQLite development database
* PostgreSQL-compatible schema design
* Database migrations
* Seed system
* Transaction support
* Test database strategy

### Storage foundation

Create a storage interface supporting:

* Local filesystem storage
* Future S3-compatible storage

### Error handling

Create:

* Typed application errors
* Validation errors
* Not-found errors
* Authorization errors
* Conflict errors
* Global error boundaries
* User-friendly error screens
* Structured server logging

### UI foundation

Implement:

* Responsive application shell
* Sidebar
* Header
* Navigation
* Breadcrumbs
* Dark and light themes
* Subject color tokens
* Loading states
* Empty states
* Error states
* Dialog system
* Toast system
* Accessible form components

### Testing foundation

Configure:

* Unit testing
* Integration testing
* End-to-end testing
* Test factories
* Test database
* CI-compatible commands

### Deployment foundation

Create:

* Dockerfile
* Docker Compose configuration
* Health endpoint
* Production build command
* Database migration command
* Seed command
* Environment example file
* Deployment documentation

## Completion criteria

Phase 0 is complete when:

* The application starts locally.
* Database migrations run successfully.
* SQLite works locally.
* The schema remains compatible with PostgreSQL.
* Docker starts the application successfully.
* The base UI shell works.
* Tests run successfully.
* Environment validation works.
* Error handling is functional.
* No substantial learning features have been implemented prematurely.

---

# Phase 1: Local Profiles, Authentication, Roles, and Settings

## Objective

Create the identity and permissions foundation for local personal use and future multi-user deployment.

## Features

### Local profile selection

Support:

* Create local profile
* Edit profile
* Delete profile
* Select profile at startup
* Optional profile PIN or password
* Profile avatar
* Display name
* Preferred theme
* Preferred language
* Current curriculum
* Current grade

The platform should support a single personal profile without requiring cloud authentication.

### Authentication modes

Support configuration for:

* Local profile mode
* Local credential mode
* Future hosted authentication mode

Use an authentication abstraction instead of coupling domain logic to one provider.

### Roles

Implement:

* Learner
* Teacher
* Content creator
* Administrator

A local profile may hold multiple roles.

### Permissions

Implement role-based access control for:

* Viewing learning content
* Editing content
* Publishing content
* Managing users
* Viewing analytics
* Managing application settings
* Running backups
* Restoring backups

### User settings

Support:

* Theme
* Reduced motion
* Text size
* Default grade
* Default curriculum
* Preferred subjects
* Study-session duration
* Week start day
* Formula rendering preference
* Accessibility preferences

### Onboarding

Create an onboarding process where the learner selects:

* Curriculum
* Current grade
* Target grade
* Subjects
* Learning goals
* Weekly study time
* Preferred study days
* Difficulty preference

Allow onboarding to be skipped and completed later.

## Database entities

Implement:

* users
* profiles
* roles
* user_roles
* permissions
* role_permissions
* user_settings
* onboarding_responses

## Screens

Create:

* Profile selection
* Create profile
* Edit profile
* Sign-in or PIN screen
* Onboarding
* Role-management screen
* User settings
* Accessibility settings

## Completion criteria

* A user can create and select a local profile.
* A profile can hold multiple roles.
* Protected actions enforce permissions.
* Onboarding data is saved.
* Settings persist locally.
* The app remains usable without internet access.

---

# Phase 2: Curriculum, Grade, and Subject Structure

## Objective

Build the educational hierarchy separating content by curriculum, grade, subject, domain, and difficulty.

## Features

### Curricula

Support:

* Custom curriculum
* Kosovo curriculum
* International curriculum
* Additional future curricula

Each curriculum should contain metadata, grade definitions, subjects, learning objectives, and required topics.

### Grades

Initially support:

* Grade 6
* Grade 7
* Grade 8
* Grade 9
* Grade 10
* Grade 11
* Grade 12
* University foundations
* Advanced
* Olympiad

Grades must be configurable rather than hardcoded.

### Subjects

Create:

* Mathematics
* Physics
* Chemistry
* Biology
* Astronomy

Each subject should have:

* Name
* Slug
* Description
* Icon
* Accent
* Grade availability
* Subject domains
* Recommended study hours
* Display order

### Domains

Implement configurable domains under each subject.

Example Mathematics domains:

* Arithmetic
* Algebra
* Geometry
* Trigonometry
* Calculus

Example Physics domains:

* Mechanics
* Waves
* Thermodynamics
* Electricity
* Modern physics

### Grade-subject structure

Allow:

* Subjects to appear in multiple grades
* Domains to span multiple grades
* Topic depth to increase by grade
* Curriculum-specific subject availability
* Required and optional subjects
* Required and optional domains

### Learning objectives

Create grade-specific and curriculum-specific learning objectives.

## Content management

Administrators and content creators should be able to:

* Create curricula
* Edit curricula
* Create grades
* Reorder grades
* Add subjects to grades
* Add domains to subjects
* Define required and optional content
* Define learning objectives
* Archive curriculum structures

## Database entities

Implement:

* curricula
* grades
* curriculum_grades
* subjects
* curriculum_subjects
* grade_subjects
* domains
* subject_domains
* learning_objectives
* grade_learning_objectives

## Screens

Create:

* Curriculum explorer
* Grade explorer
* Subject explorer
* Grade dashboard
* Subject dashboard
* Curriculum management
* Grade management
* Subject management
* Domain management

## Seed data

Add:

* Grades 6 through 12
* University foundations
* Advanced
* Olympiad
* All five subjects
* Several domains per subject
* Example grade-subject mappings

## Completion criteria

* Users can browse content by curriculum.
* Users can browse content by grade.
* Users can browse content by subject.
* Grades and curricula are editable.
* Subjects are not tightly coupled to a single grade.
* The same domain may appear at different depths across grades.

---

# Phase 3: Courses, Modules, Lessons, and Content Authoring

## Objective

Build the core lesson-delivery and content-authoring system.

## Course hierarchy

Implement:

```text
Curriculum
└── Grade
    └── Subject
        └── Course
            └── Module
                └── Lesson
```

Courses and lessons may belong to multiple grades or roadmaps.

## Course features

Support:

* Course metadata
* Subject
* Grade range
* Curriculum compatibility
* Difficulty
* Estimated duration
* Required or optional status
* Course image
* Learning objectives
* Prerequisite courses
* Module ordering
* Publication status

## Module features

Support:

* Module title
* Description
* Order
* Learning objectives
* Estimated study time
* Module assessment
* Prerequisites

## Lesson features

Each lesson should support structured blocks:

* Introduction
* Why this matters
* Learning objectives
* Prerequisite check
* Intuitive explanation
* Formal explanation
* Definition
* Formula
* Derivation
* Diagram
* Image
* Table
* Worked example
* Guided practice
* Independent exercise
* Common mistake
* Real-world application
* Cross-subject connection
* Summary
* Knowledge check
* Further exploration
* Advanced extension
* Olympiad extension

## Block editor

Create a block-based lesson editor supporting:

* Reordering
* Duplication
* Deletion
* Block templates
* Preview mode
* Draft mode
* Autosave
* Version history
* Publishing
* Archiving

Supported block types:

* Heading
* Paragraph
* Markdown
* Formula
* Definition
* Theorem
* Example
* Callout
* Warning
* Common mistake
* Image
* Diagram
* Table
* Code
* File
* Video
* Audio
* Exercise reference
* Simulation reference
* Tabs
* Accordion
* Comparison
* Timeline

## Formula rendering

Support:

* Inline LaTeX
* Block LaTeX
* Accessible formula labels
* Copyable formulas
* Formula validation in the editor

## Progress tracking

Track:

* Lesson started
* Lesson completed
* Time spent
* Last viewed block
* Completion percentage
* Revisit count

Do not equate lesson completion with concept mastery.

## Versioning

Support:

* Draft
* Published
* Archived
* Version history
* Restore previous version
* Change summary

## Database entities

Implement:

* courses
* course_grades
* course_curricula
* course_prerequisites
* modules
* module_prerequisites
* lessons
* lesson_sections
* lesson_blocks
* lesson_assets
* lesson_learning_objectives
* lesson_versions
* user_lesson_progress

## Screens

Create:

* Course catalog
* Course detail
* Module page
* Lesson reader
* Course editor
* Module editor
* Lesson block editor
* Content preview
* Version history

## Completion criteria

* A creator can build and publish complete lessons.
* A learner can read lessons with formulas and structured content.
* Lessons can be reused across grades and curricula.
* Lesson progress is saved.
* Draft and published states work.
* Content blocks are extensible.

---

# Phase 4: Concepts, Prerequisites, and the Knowledge Graph

## Objective

Implement the central concept graph connecting lessons, grades, and subjects.

## Concept model

Each concept should include:

* Name
* Slug
* Description
* Subject
* Domain
* Grade range
* Difficulty
* Learning objectives
* Common misconceptions
* Real-world applications
* Associated lessons
* Associated exercises
* Associated simulations
* Mastery threshold

## Relationship types

Support:

* Requires
* Recommended before
* Unlocks
* Related to
* Builds upon
* Applies in
* Used by
* Cross-subject connection
* Grade-level extension
* Advanced extension
* Alternative explanation

Prevent invalid graph relationships where possible.

Detect:

* Self-references
* Duplicate relationships
* Circular required-prerequisite chains
* Missing concepts
* Orphaned concepts

## Knowledge graph interface

Use React Flow or an equivalent library.

Support:

* Zoom
* Pan
* Search
* Subject filters
* Grade filters
* Domain filters
* Difficulty filters
* Relationship filters
* Mastery filters
* Locked and unlocked states
* Concept details panel
* Prerequisite path highlighting
* Descendant path highlighting
* Fullscreen mode
* Minimap
* Automatic graph layout

## Concept pages

Show:

* Description
* Grade placement
* Subject and domain
* Prerequisites
* Related concepts
* Lessons teaching the concept
* Exercises practicing the concept
* Concepts unlocked
* Mastery state
* Real-world applications
* Cross-subject uses

## Authoring tools

Allow creators to:

* Create concepts
* Link concepts to lessons
* Add relationships
* Validate graph integrity
* Preview prerequisite paths
* Bulk import relationships
* View orphaned concepts

## Database entities

Implement:

* concepts
* lesson_concepts
* concept_relationships
* concept_learning_objectives
* concept_applications
* concept_misconceptions

## Completion criteria

* Concepts are reusable independently of lessons.
* Prerequisites connect concepts across subjects.
* The visual graph works with filters.
* Cyclic required dependencies are detected.
* Learners can see why a concept matters and what it unlocks.

---

# Phase 5: Exercises, Questions, and Answer Validation

## Objective

Create the reusable question and exercise engine.

## Question types

Support:

* Multiple choice
* Multiple selection
* True or false
* Numeric answer
* Numeric answer with tolerance
* Numeric answer with unit
* Algebraic expression
* Formula input
* Short answer
* Long answer
* Matching
* Ordering
* Diagram labeling
* Graph interpretation
* Table interpretation
* Multi-step problem

## Question metadata

Every question should support:

* Subject
* Grade range
* Concepts
* Learning objectives
* Difficulty
* Estimated time
* Source
* Author
* Tags
* Publication status
* Version
* Hints
* Explanation
* Full solution
* Common wrong answers
* Error-specific feedback
* Partial-credit rules

## Answer validation

Implement:

* Exact matching
* Case-insensitive matching
* Numeric tolerance
* Unit validation
* Unit conversion
* Significant figures
* Equivalent fractions
* Equivalent algebraic expressions
* Multiple valid answers
* Ordered-step validation where appropriate

Ensure mathematical expression parsing is sandboxed and safe.

Do not use unrestricted code evaluation.

## Exercise sets

Support:

* Lesson exercises
* Module practice
* Concept practice
* Grade practice
* Custom practice sets
* Randomized practice
* Difficulty-adaptive practice

## Question templates

Support randomized variables.

Examples:

* Random force and mass values
* Random triangle dimensions
* Random chemical quantities
* Random genetic probabilities

Generated instances must retain reproducible seeds.

## Question authoring

Create:

* Question editor
* Answer editor
* Hint editor
* Solution editor
* Preview mode
* Validation preview
* Template variable preview
* Bulk import

## Database entities

Implement:

* questions
* question_versions
* question_options
* question_hints
* question_solutions
* question_concepts
* question_learning_objectives
* question_templates
* exercise_sets
* exercise_set_questions
* exercise_attempts
* question_attempts

## Completion criteria

* Learners can answer all core question types.
* Responses are stored.
* Numeric and unit validation work.
* Equivalent mathematical expressions are handled safely.
* Questions are reusable across lessons and assessments.
* Randomized questions are reproducible.

---

# Phase 6: Assessments, Diagnostics, and Placement

## Objective

Build formal and informal assessment workflows.

## Assessment types

Support:

* Lesson knowledge check
* Module quiz
* Unit test
* Grade exam
* Subject exam
* Diagnostic test
* Placement test
* Roadmap checkpoint
* Cumulative review
* Timed exam
* Untimed practice
* Olympiad problem set

## Assessment configuration

Support:

* Sections
* Question pools
* Fixed questions
* Randomized questions
* Difficulty distribution
* Concept coverage
* Time limit
* Attempt limit
* Passing threshold
* Partial credit
* Feedback visibility
* Review mode
* Retake rules
* Question ordering
* Automatic submission

## Diagnostic assessments

Use diagnostic tests to identify:

* Missing prerequisites
* Current grade readiness
* Subject strengths
* Weak concepts
* Recommended starting point

Diagnostic output should provide explainable recommendations.

## Assessment results

Show:

* Total score
* Section scores
* Concept scores
* Correct and incorrect responses
* Time spent
* Average response time
* Mistake categories
* Recommended review
* Previous-attempt comparison

## Database entities

Implement:

* assessments
* assessment_sections
* assessment_questions
* assessment_pools
* assessment_attempts
* assessment_section_results
* question_attempts
* diagnostic_results
* placement_results

## Completion criteria

* Assessments can be created and assigned.
* Learners can take timed and untimed assessments.
* Attempts resume safely when appropriate.
* Results connect to concepts.
* Diagnostic tests recommend a starting level.
* Attempt limits and passing rules work correctly.

---

# Phase 7: Concept Mastery and Learning Recommendations

## Objective

Implement concept-level mastery tracking and rule-based recommendations.

## Mastery states

Use:

* Not started
* Introduced
* Developing
* Practiced
* Proficient
* Mastered
* Needs review

## Mastery inputs

Consider:

* Lesson completion
* Exercise accuracy
* Assessment performance
* Question difficulty
* Attempts
* Hint use
* Partial credit
* Recency
* Consistency
* Prerequisite mastery

## Mastery algorithm

Create a deterministic, configurable algorithm.

Requirements:

* Explainable score
* Configurable weights
* No dependency on AI
* Historical snapshots
* Decay or review logic
* Protection against mastery from one easy question
* Higher confidence from varied evidence
* Separate current score and confidence score

Example output:

```text
Concept: Vector Components
Mastery: 74%
Confidence: Medium
State: Proficient

Evidence:
- Lesson completed
- 14 of 18 practice questions correct
- Module assessment score: 78%
- 3 hints used
- Last practiced 6 days ago
```

## Recommendations

Generate recommendations for:

* Missing required prerequisites
* Weak concepts
* Failed assessment concepts
* Concepts due for review
* Current roadmap requirements
* Grade requirements
* Nearly mastered concepts
* Recently unlocked concepts

Every recommendation must explain its reason.

Example:

```text
Review trigonometric ratios because they are required for vector components, projectile motion, and orbital mechanics.
```

## Database entities

Implement:

* user_concept_mastery
* mastery_events
* mastery_snapshots
* mastery_rules
* recommendation_rules
* recommendations
* recommendation_dismissals

## Screens

Create:

* Mastery dashboard
* Subject mastery map
* Grade mastery view
* Concept mastery details
* Recommendation feed
* Review queue

## Completion criteria

* Mastery updates after exercises and assessments.
* Each score is explainable.
* Recommendations work without AI.
* Weak prerequisites are surfaced.
* Historical mastery changes are visible.

---

# Phase 8: Interdisciplinary Roadmaps and Personalized Paths

## Objective

Build reusable learning roadmaps combining subjects and grades.

## Roadmap features

Support:

* Title
* Description
* Goal
* Target grade
* Target difficulty
* Included subjects
* Estimated duration
* Cover image
* Prerequisites
* Nodes
* Edges
* Optional branches
* Required nodes
* Checkpoints
* Final outcomes

## Roadmap node types

Support:

* Concept
* Lesson
* Course
* Module
* Assessment
* Simulation
* Laboratory activity
* Milestone

## Roadmap behavior

Allow:

* Sequential paths
* Branching paths
* Optional enrichment
* Grade-specific variants
* Advanced extensions
* Prerequisite validation
* Locked nodes
* Recommended next node
* Progress tracking
* Multiple active roadmaps

## Initial roadmaps

Seed:

* Mathematics and Physics Foundations
* Algebra to Classical Mechanics
* Mathematics for Astronomy
* Introductory Astrophysics
* Chemistry for Biology
* Biochemistry Foundations
* Complete Natural Sciences Foundations

## Personalized learning paths

Generate a path using:

* Current grade
* Target grade
* Diagnostic results
* Existing mastery
* Selected goal
* Available weekly time
* Required prerequisites

The generated path must show:

* Included topics
* Skipped mastered topics
* Missing prerequisites
* Estimated duration
* Reason for ordering

## Roadmap editor

Support:

* Drag-and-drop nodes
* Connect edges
* Set required and optional nodes
* Validate dependencies
* Preview learner path
* Publish and version roadmap

## Database entities

Implement:

* roadmaps
* roadmap_versions
* roadmap_nodes
* roadmap_edges
* roadmap_prerequisites
* roadmap_subjects
* user_roadmaps
* user_roadmap_progress
* personalized_paths

## Completion criteria

* Roadmaps reuse existing content.
* Cross-subject paths work.
* Progress is tracked per roadmap.
* Personalized paths account for mastery.
* The user can understand why lessons are ordered.

---

# Phase 9: Interactive Simulation Framework

## Objective

Build a reusable system for interactive scientific simulations.

## Simulation engine

Support:

* Simulation metadata
* Input variables
* Sliders
* Numeric controls
* Toggles
* Buttons
* Animation loop
* Pause and resume
* Reset
* Time scaling
* Graph outputs
* Data tables
* Presets
* Guided tasks
* Export results

## Simulation architecture

Create a simulation registry where simulations define:

* Inputs
* Outputs
* State
* Validation
* Renderer
* Controls
* Data collection
* Presets
* Lesson integration

Avoid hardcoding simulation logic into lesson pages.

## Initial simulations

Build several complete examples:

### Mathematics

* Function transformation explorer
* Unit-circle explorer
* Vector-components explorer

### Physics

* One-dimensional motion
* Projectile motion
* Force, mass, and acceleration
* Energy conservation
* Orbital motion

### Chemistry

* Gas-law explorer
* Reaction balancing
* Acid-base titration model

### Biology

* Punnett-square simulator
* Enzyme activity
* Population growth

### Astronomy

* Planetary orbit explorer
* Moon phases
* Stellar spectrum explorer

## Simulation integration

Allow simulations to:

* Appear inside lessons
* Open fullscreen
* Be assigned as exercises
* Store learner presets
* Record completion
* Produce data for lab activities

## Database entities

Implement:

* simulations
* simulation_versions
* simulation_inputs
* simulation_presets
* lesson_simulations
* user_simulation_sessions
* simulation_results

## Completion criteria

* Simulations are reusable.
* Inputs and outputs are defined consistently.
* Sessions can save results.
* Simulations integrate into lessons.
* At least one complete simulation exists for each subject.

---

# Phase 10: Virtual Laboratory and Scientific Reports

## Objective

Create a virtual laboratory for simulated and real-world experiments.

## Laboratory activity structure

Each activity should include:

* Objective
* Theory
* Materials
* Safety notes
* Variables
* Procedure
* Data table
* Analysis
* Graphing
* Questions
* Conclusion
* Extension activity

## Laboratory features

Support:

* Simulated experiment
* Real-world experiment guide
* Observation recording
* Data entry
* Units
* Significant figures
* Graph creation
* Uncertainty calculation
* Theoretical comparison
* Report writing
* Report export

## Report editor

Support:

* Structured sections
* Tables
* Charts
* Formulas
* Images
* Conclusions
* Teacher feedback
* Draft and submitted states
* PDF and HTML export

## Initial labs

Create examples such as:

* Determine acceleration from motion data
* Estimate gravitational acceleration using a pendulum
* Verify Ohm’s law
* Explore gas laws
* Analyze enzyme activity
* Model planetary orbital periods
* Estimate Planck’s constant using LED data

## Database entities

Implement:

* laboratory_activities
* laboratory_steps
* laboratory_variables
* laboratory_sessions
* laboratory_observations
* laboratory_measurements
* laboratory_reports
* laboratory_feedback

## Completion criteria

* Learners can complete a structured experiment.
* Data can be recorded and graphed.
* Reports can be saved and exported.
* Simulations can supply laboratory data.
* Real-world and simulated modes are supported.

---

# Phase 11: Study Planner, Goals, and Calendar

## Objective

Turn courses and roadmaps into an actionable study schedule.

## Study goals

Support goals based on:

* Grade completion
* Subject completion
* Course completion
* Roadmap completion
* Exam preparation
* Concept mastery
* Weekly study time

## Planner inputs

Support:

* Start date
* Target date
* Weekly study hours
* Available days
* Session duration
* Priority subjects
* Rest days
* Difficulty preference
* Review frequency

## Schedule generation

Generate:

* Lesson sessions
* Exercise sessions
* Review sessions
* Simulation sessions
* Laboratory sessions
* Assessment sessions
* Catch-up sessions

## Calendar features

Support:

* Month view
* Week view
* Agenda view
* Drag and drop
* Rescheduling
* Mark complete
* Skip
* Move missed sessions
* Workload indicators
* Conflict detection

## Adaptive rescheduling

When a session is missed:

* Recalculate remaining workload
* Preserve target date when possible
* Warn when the plan is no longer realistic
* Suggest reduced scope or increased study time

## Database entities

Implement:

* study_goals
* study_plans
* study_plan_items
* study_sessions
* study_availability
* study_exceptions
* study_completion_events

## Completion criteria

* Users can generate a plan from a roadmap or goal.
* Sessions appear in a calendar.
* Missed work can be rescheduled.
* Workload remains balanced.
* Completion updates roadmap and lesson progress.

---

# Phase 12: Notes, Highlights, Bookmarks, and Personal Knowledge Base

## Objective

Create a local personal knowledge-management system connected to learning content.

## Notes

Allow notes linked to:

* Subject
* Grade
* Course
* Module
* Lesson
* Concept
* Question
* Simulation
* Assessment
* Laboratory activity

## Note features

Support:

* Markdown
* LaTeX
* Images
* Tags
* Folders
* Backlinks
* Internal links
* Search
* Pinning
* Archiving
* Autosave

## Highlights

Allow users to highlight:

* Lesson text
* Definitions
* Formulas
* Examples
* Question solutions

Store source location so highlights remain linked to content.

## Bookmarks

Allow bookmarking:

* Lessons
* Concepts
* Exercises
* Simulations
* Roadmaps
* Notes

## Personal concept map

Show relationships between:

* User notes
* Platform concepts
* Lessons
* Bookmarked resources

## Database entities

Implement:

* notes
* note_links
* note_tags
* tags
* folders
* highlights
* bookmarks
* note_backlinks

## Completion criteria

* Notes support formulas and markdown.
* Notes can link to platform content.
* Search finds note content.
* Highlights retain their source.
* Personal knowledge relationships are visible.

---

# Phase 13: Global Search and Content Discovery

## Objective

Implement fast local search across the platform.

## Searchable content

Include:

* Curricula
* Grades
* Subjects
* Domains
* Courses
* Modules
* Lessons
* Concepts
* Questions
* Assessments
* Simulations
* Laboratory activities
* Roadmaps
* Notes
* Bookmarks

## Search features

Support:

* Full-text search
* Type filters
* Subject filters
* Grade filters
* Curriculum filters
* Difficulty filters
* Mastery filters
* Publication-status filters
* Recent searches
* Search suggestions
* Keyboard navigation

## Local search

Use an indexed local search solution appropriate for SQLite and local execution.

Possible options:

* SQLite FTS
* MiniSearch
* FlexSearch
* A dedicated local index

Use a search abstraction so another provider can be used in deployed environments.

## Completion criteria

* Search works without internet.
* Results are ranked usefully.
* Filters work.
* Notes and educational content are searchable.
* Indexes update when content changes.

---

# Phase 14: Dashboard and Learning Analytics

## Objective

Create complete learner and teacher analytics.

## Learner dashboard

Show:

* Current grade
* Curriculum
* Active subjects
* Active roadmaps
* Current lesson
* Recommended next activity
* Weekly study progress
* Weak concepts
* Recently mastered concepts
* Upcoming assessments
* Study streak
* Time studied
* Recent notes
* Bookmarks

## Learner analytics

Include:

* Time studied
* Lessons completed
* Questions attempted
* Accuracy
* Assessment scores
* Mastery by subject
* Mastery by grade
* Mastery over time
* Weakest concepts
* Most improved concepts
* Hint use
* Attempt count
* Average response time
* Study consistency

## Teacher analytics

Include:

* Learner progress
* Grade distribution
* Concept difficulty
* Common mistakes
* Assessment performance
* Question discrimination
* Learners requiring support
* Completion rates

## Event tracking

Implement local activity events for:

* Lesson view
* Lesson completion
* Question attempt
* Assessment submission
* Simulation session
* Note creation
* Study-session completion
* Mastery change

Do not depend on third-party analytics.

## Database entities

Implement:

* activity_events
* learning_sessions
* analytics_snapshots
* learner_metrics
* content_metrics

## Completion criteria

* Dashboards use real application data.
* Metrics are computed consistently.
* Analytics remain local.
* Learners can inspect progress over time.
* Teachers can identify difficult concepts.

---

# Phase 15: Import, Export, Backup, and Restore

## Objective

Make all content and user data portable.

## Content export

Support:

* JSON
* Markdown
* CSV
* ZIP content package
* HTML
* PDF where applicable

Content packages may contain:

* Curriculum structure
* Grades
* Subjects
* Courses
* Lessons
* Concepts
* Relationships
* Questions
* Assessments
* Roadmaps
* Simulations
* Assets

## User data export

Include:

* Profile
* Settings
* Progress
* Mastery
* Attempts
* Notes
* Highlights
* Bookmarks
* Plans
* Goals
* Analytics

## Backup types

Support:

* Full backup
* Content-only backup
* User-data-only backup
* Settings-only backup

## Restore features

Support:

* Backup validation
* Version compatibility
* Restore preview
* Conflict handling
* Merge
* Replace
* Rollback on failure

## Automatic backups

Support:

* Configurable schedule
* Retention count
* Backup location
* Encryption option
* Backup integrity checks

## Completion criteria

* A complete local installation can be backed up.
* A backup can restore the application on another machine.
* Invalid backups are rejected safely.
* Imports use stable identifiers.
* Assets are included when required.

---

# Phase 16: Optional Local and Remote AI Features

## Objective

Add optional AI without making the application dependent on it.

## Provider abstraction

Support:

* Disabled AI mode
* Local model mode
* Remote API mode
* Hybrid mode

Possible providers:

* Ollama-compatible local models
* OpenAI-compatible APIs
* Other configurable adapters

## AI features

Implement optional:

* Alternative explanation
* Simpler explanation
* Advanced explanation
* Socratic tutoring
* Contextual hints
* Lesson summaries
* Note summaries
* Practice-question generation
* Question variations
* Written-answer feedback
* Misconception analysis
* Natural-language search
* Study-plan suggestions

## Grounding

AI responses should use:

* Current lesson
* Current concept
* Selected grade
* Learner mastery
* Approved source content

Clearly separate:

* Official curriculum content
* Creator-authored content
* AI-generated content

## Safety and quality

Requirements:

* Mark generated content
* Allow creator review
* Do not overwrite official content automatically
* Store provider configuration securely
* Handle unavailable providers gracefully
* Core features must continue working when AI is disabled
* Never expose secret keys to the frontend

## Completion criteria

* The app works fully with AI disabled.
* Local AI can be configured.
* Remote providers can be configured.
* Generated content is labeled.
* AI output uses relevant educational context.

---

# Phase 17: Multi-User, Teacher, and Classroom Features

## Objective

Extend the personal platform into a system usable by teachers and multiple learners.

## Classroom features

Support:

* Classes
* Learner enrollment
* Teacher assignment
* Subject groups
* Grade groups
* Invitations
* Join codes

## Assignments

Teachers can assign:

* Lessons
* Courses
* Exercise sets
* Assessments
* Simulations
* Laboratory activities
* Roadmaps

Assignments should support:

* Due date
* Start date
* Attempt limits
* Late submission rules
* Individual or class assignment
* Status tracking

## Teacher feedback

Support:

* Written feedback
* Manual grading
* Rubrics
* Laboratory report feedback
* Returned work
* Resubmission

## Privacy and separation

Ensure:

* Learners only see permitted class data
* Teachers only access assigned classes
* Administrators manage global configuration
* Local single-user mode remains simple

## Database entities

Implement:

* classes
* class_members
* class_teachers
* assignments
* assignment_targets
* assignment_submissions
* grading_rubrics
* teacher_feedback
* invitations

## Completion criteria

* Teachers can create classes and assignments.
* Learners can submit assigned work.
* Permissions are enforced.
* Single-user mode remains unaffected.
* Teacher analytics use classroom data.

---

# Phase 18: Deployment Hardening and Production Readiness

## Objective

Prepare the platform for reliable self-hosted and cloud deployment.

## Database deployment

Support:

* PostgreSQL
* Migration from SQLite where feasible
* Connection pooling
* Backup procedures
* Production migrations

## Object storage

Add an S3-compatible storage adapter.

Support:

* Local filesystem
* S3-compatible storage
* Configurable upload limits
* Signed URLs where required

## Production authentication

Allow integration with a hosted authentication provider while preserving local authentication.

## Security hardening

Implement:

* Rate limiting
* CSRF protection where applicable
* Security headers
* Content Security Policy
* Secure cookies
* Session rotation
* Brute-force protection
* Audit logs
* Upload scanning and validation
* Secret rotation guidance
* Backup encryption
* Database access restrictions

## Observability

Implement:

* Structured logs
* Health checks
* Readiness checks
* Error tracking adapter
* Performance metrics
* Database diagnostics

## Deployment targets

Document:

* Docker Compose
* Self-hosted Linux server
* Vercel-compatible frontend deployment where architecture permits
* Node-compatible hosting
* PostgreSQL deployment
* S3-compatible storage

## Completion criteria

* The same codebase runs locally and in production.
* Production uses PostgreSQL and object storage.
* No localhost-only assumptions remain.
* Security controls are documented and tested.
* Health and readiness checks work.

---

# Phase 19: Accessibility, Performance, and Quality Audit

## Objective

Conduct a complete application-wide quality pass.

## Accessibility

Audit and improve:

* Keyboard navigation
* Screen-reader labels
* Focus order
* Focus visibility
* Formula accessibility
* Color contrast
* Text resizing
* Reduced motion
* Captions
* Image descriptions
* Accessible tables
* Accessible graphs
* Error announcements

Target WCAG 2.2 AA where practical.

## Performance

Audit:

* Initial bundle size
* Route loading
* Database queries
* Search indexing
* Knowledge graph rendering
* Simulation performance
* Large lesson rendering
* Media loading
* Memory use
* Offline startup

Implement:

* Lazy loading
* Pagination
* Virtualized lists
* Query optimization
* Asset compression
* Caching
* Background indexing

## Quality

Review:

* Type safety
* Dead code
* Duplicate logic
* Error handling
* Loading states
* Empty states
* Test coverage
* Database constraints
* Content validation
* Permission checks
* Responsive behavior

## Completion criteria

* Major accessibility issues are fixed.
* Large data sets remain usable.
* Core flows are covered by end-to-end tests.
* No critical type, lint, or migration errors remain.
* The application behaves consistently on desktop and mobile.

---

# Phase 20: Complete Scientific Content Expansion

## Objective

Expand the platform’s educational content after the platform itself is stable.

Do not attempt to author every subject fully before the underlying systems are reliable.

## Mathematics content

Expand:

* Arithmetic
* Algebra
* Geometry
* Trigonometry
* Functions
* Probability
* Statistics
* Combinatorics
* Calculus
* Linear algebra
* Differential equations
* Number theory
* Complex numbers
* Discrete mathematics
* Olympiad mathematics

## Physics content

Expand:

* Measurement
* Kinematics
* Dynamics
* Energy
* Momentum
* Rotation
* Gravitation
* Fluids
* Waves
* Thermodynamics
* Electricity
* Magnetism
* Optics
* Relativity
* Quantum physics
* Nuclear physics
* Particle physics
* Olympiad physics

## Chemistry content

Expand:

* Atomic structure
* Periodicity
* Bonding
* Stoichiometry
* Reactions
* Gases
* Thermochemistry
* Kinetics
* Equilibrium
* Acids and bases
* Electrochemistry
* Organic chemistry
* Inorganic chemistry
* Analytical chemistry
* Physical chemistry
* Biochemistry
* Olympiad chemistry

## Biology content

Expand:

* Cell biology
* Molecular biology
* Genetics
* Evolution
* Ecology
* Anatomy
* Physiology
* Microbiology
* Botany
* Zoology
* Neuroscience
* Immunology
* Biotechnology
* Bioinformatics
* Olympiad biology

## Astronomy content

Expand:

* Observational astronomy
* Celestial coordinates
* Solar system
* Planetary science
* Orbital mechanics
* Stellar physics
* Stellar evolution
* Galaxies
* Exoplanets
* Compact objects
* Black holes
* Spectroscopy
* Cosmology
* Space science
* Astrobiology

## Content validation

Every content package should be checked for:

* Correct grade placement
* Clear prerequisites
* Valid formulas
* Concept relationships
* Learning objectives
* Exercise coverage
* Assessment coverage
* Accessible diagrams
* Source attribution
* Scientific accuracy

## Completion criteria

* Every grade has meaningful content.
* Subjects have coherent grade progression.
* Advanced topics correctly depend on foundations.
* Roadmaps connect content across subjects.
* Content quality is reviewed separately from software quality.

---

# Recommended Development Order

Use this order without skipping foundational phases:

```text
Phase 0  Architecture
Phase 1  Profiles and authentication
Phase 2  Curricula, grades, and subjects
Phase 3  Courses and lessons
Phase 4  Concepts and knowledge graph
Phase 5  Exercises
Phase 6  Assessments
Phase 7  Mastery and recommendations
Phase 8  Roadmaps
Phase 9  Simulations
Phase 10 Virtual laboratory
Phase 11 Study planner
Phase 12 Notes and bookmarks
Phase 13 Search
Phase 14 Analytics
Phase 15 Backup and portability
Phase 16 Optional AI
Phase 17 Multi-user classrooms
Phase 18 Deployment hardening
Phase 19 Quality audit
Phase 20 Content expansion
```

# Minimum Complete Personal Version

The first strong, personally usable release should include Phases 0 through 11.

This release would provide:

* Local profiles
* Grade separation
* Curricula
* Five subjects
* Courses and lessons
* Knowledge graph
* Exercises
* Assessments
* Mastery
* Recommendations
* Interdisciplinary roadmaps
* Simulations
* Study planning

Phases 12 through 16 turn it into a more complete personal learning environment.

Phases 17 through 19 make it suitable for other learners, teachers, and public deployment.

Phase 20 should continue gradually as the educational library grows.

# Coding-Agent Rule

At the beginning of each phase, the coding agent must produce:

1. Scope summary
2. Database changes
3. API or server-action changes
4. Frontend pages and components
5. Domain logic
6. Tests
7. Seed-data changes
8. Migration considerations
9. Risks
10. Completion checklist

The coding agent must implement only the current phase and the minimum infrastructure required by it.

It must not generate superficial placeholders for later phases.

The result of every phase must be runnable, testable, and compatible with all previously completed phases.
