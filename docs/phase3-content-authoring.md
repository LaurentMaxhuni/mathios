# Phase 3 content authoring

Phase 3 introduces the reusable learning hierarchy:

```text
Curriculum -> Grade -> Subject -> Course -> Module -> Lesson -> Section -> Block
```

Courses can be placed in multiple curricula and grades. Modules provide ordering, study time, objective references, assessment references, and prerequisites. Lessons have draft, published, and archived states.

## Authoring workflow

1. Open `/courses/manage` with a teacher, content-creator, or administrator profile.
2. Create a course, add modules, and add lessons.
3. Open a lesson editor at `/lessons/:lessonId/edit`.
4. Add sections and blocks. Payloads are JSON so new block renderers can be added without a migration; formulas require LaTeX and an accessible label.
5. Preview the current draft. Autosave updates the current draft version.
6. Publish a validated lesson. The reader uses the immutable published snapshot.
7. Restore an older version from `/lessons/:lessonId/versions`; restoration always creates a new draft.

Supported block types include headings, paragraphs, Markdown, formulas, definitions, theorems, examples, callouts, warnings, common mistakes, images, diagrams, tables, code, files, video/audio references, exercise/simulation references, tabs, accordions, comparisons, and timelines.

## Authorization

Readers need `view_learning_content` and can only resolve published courses/lessons. Course authoring requires `edit_content` plus a teacher, content-creator, or administrator role. Publishing additionally requires `publish_content`. Phase 3 does not introduce concepts, exercises, assessments, or mastery tables.

## Progress

`user_lesson_progress` is profile-scoped and records start/completion timestamps, time spent, last viewed block, completion percentage, and revisit count. Completion is intentionally separate from future concept mastery.
