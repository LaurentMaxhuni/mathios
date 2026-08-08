import "./load-env";

import postgres from "postgres";
import {
  openScienceBookBlockSeed,
  openScienceBookCourseCurriculumSeed,
  openScienceBookCourseGradeSeed,
  openScienceBookCourseSeed,
  openScienceBookLessonSeed,
  openScienceBookModuleSeed,
  openScienceBookSectionSeed,
} from "@/infrastructure/database/open-science-book-missions";
import { env } from "@/lib/env";

const SNAPSHOT_DATE = "2026-01-01T00:00:00.000Z";

const courseRows = openScienceBookCourseSeed.map((course) => ({
  id: course.id,
  slug: course.slug,
  title: course.title,
  description: course.description,
  subject_id: course.subjectId,
  difficulty: course.difficulty,
  estimated_duration_minutes: course.estimatedDurationMinutes,
  grade_min_id: course.gradeMinId,
  grade_max_id: course.gradeMaxId,
  course_image: course.courseImage,
  is_required: course.isRequired,
  status: course.status,
  created_by_profile_id: course.createdByProfileId,
}));

const curriculumRows = openScienceBookCourseCurriculumSeed.map(
  ([courseId, curriculumId]) => ({ course_id: courseId, curriculum_id: curriculumId }),
);

const gradeRows = openScienceBookCourseGradeSeed.map(
  ([courseId, gradeId, isRequired, sortOrder]) => ({
    course_id: courseId,
    grade_id: gradeId,
    is_required: isRequired,
    sort_order: sortOrder,
  }),
);

const moduleRows = openScienceBookModuleSeed.map((module) => ({
  id: module.id,
  course_id: module.courseId,
  title: module.title,
  description: module.description,
  sort_order: module.sortOrder,
  estimated_study_time_minutes: module.estimatedStudyTimeMinutes,
  assessment_reference: module.assessmentReference,
  is_archived: false,
}));

const lessonRows = openScienceBookLessonSeed.map((lesson) => ({
  id: lesson.id,
  module_id: lesson.moduleId,
  slug: lesson.slug,
  title: lesson.title,
  summary: lesson.summary,
  sort_order: lesson.sortOrder,
  estimated_duration_minutes: lesson.estimatedDurationMinutes,
  status: lesson.status,
  current_version_number: lesson.currentVersionNumber,
  published_version_id: lesson.publishedVersionId,
  created_by_profile_id: lesson.createdByProfileId,
}));

const sectionRows = openScienceBookSectionSeed.map(
  ([id, lessonId, kind, title, description, sortOrder]) => ({
    id,
    lesson_id: lessonId,
    kind,
    title,
    description,
    sort_order: sortOrder,
  }),
);

const blockRows = openScienceBookBlockSeed.map(
  ([id, sectionId, type, title, sortOrder, payload]) => ({
    id,
    section_id: sectionId,
    type,
    title: title || null,
    sort_order: sortOrder,
    payload: JSON.stringify(payload),
  }),
);

const sectionsByLesson = new Map<string, typeof sectionRows>();
for (const section of sectionRows) {
  const sections = sectionsByLesson.get(section.lesson_id) ?? [];
  sections.push(section);
  sectionsByLesson.set(section.lesson_id, sections);
}

const blocksBySection = new Map<string, typeof blockRows>();
for (const block of blockRows) {
  const blocks = blocksBySection.get(block.section_id) ?? [];
  blocks.push(block);
  blocksBySection.set(block.section_id, blocks);
}

function snapshotForLesson(lesson: (typeof lessonRows)[number]): string {
  return JSON.stringify({
    lesson: {
      id: lesson.id,
      slug: lesson.slug,
      title: lesson.title,
      summary: lesson.summary,
      estimatedDurationMinutes: lesson.estimated_duration_minutes,
    },
    sections: (sectionsByLesson.get(lesson.id) ?? []).map((section) => ({
      section: {
        id: section.id,
        lessonId: section.lesson_id,
        kind: section.kind,
        title: section.title,
        description: section.description,
        sortOrder: section.sort_order,
        createdAt: SNAPSHOT_DATE,
        updatedAt: SNAPSHOT_DATE,
      },
      blocks: (blocksBySection.get(section.id) ?? []).map((block) => ({
        id: block.id,
        sectionId: block.section_id,
        type: block.type,
        title: block.title,
        sortOrder: block.sort_order,
        payload: JSON.parse(block.payload),
        createdAt: SNAPSHOT_DATE,
        updatedAt: SNAPSHOT_DATE,
      })),
    })),
    assets: [],
    objectiveIds: [],
  });
}

const versionRows = lessonRows.flatMap((lesson) => {
  const snapshot = snapshotForLesson(lesson);
  const prefix = lesson.id.replace("lesson-", "");
  return [
    {
      id: `lesson-version-${prefix}-1`,
      lesson_id: lesson.id,
      version_number: 1,
      status: "published",
      change_summary: "Initial published lesson",
      snapshot,
      created_by_profile_id: null,
      published_at: SNAPSHOT_DATE,
    },
    {
      id: `lesson-version-${prefix}-2`,
      lesson_id: lesson.id,
      version_number: 2,
      status: "draft",
      change_summary: "Draft workspace after publishing",
      snapshot,
      created_by_profile_id: null,
      published_at: null,
    },
  ];
});

async function main(): Promise<void> {
  const database = postgres(env.DATABASE_URL, { max: 1, connect_timeout: 20 });
  try {
    await database.begin(async (transaction) => {
      await transaction`
        INSERT INTO courses ${transaction(courseRows)}
        ON CONFLICT (id) DO UPDATE SET
          slug = EXCLUDED.slug,
          title = EXCLUDED.title,
          description = EXCLUDED.description,
          subject_id = EXCLUDED.subject_id,
          difficulty = EXCLUDED.difficulty,
          estimated_duration_minutes = EXCLUDED.estimated_duration_minutes,
          grade_min_id = EXCLUDED.grade_min_id,
          grade_max_id = EXCLUDED.grade_max_id,
          course_image = EXCLUDED.course_image,
          is_required = EXCLUDED.is_required,
          status = EXCLUDED.status,
          updated_at = NOW()
      `;
      await transaction`
        INSERT INTO course_curricula ${transaction(curriculumRows)}
        ON CONFLICT DO NOTHING
      `;
      await transaction`
        INSERT INTO course_grades ${transaction(gradeRows)}
        ON CONFLICT (course_id, grade_id) DO UPDATE SET
          is_required = EXCLUDED.is_required,
          sort_order = EXCLUDED.sort_order
      `;
      await transaction`
        INSERT INTO modules ${transaction(moduleRows)}
        ON CONFLICT (id) DO UPDATE SET
          course_id = EXCLUDED.course_id,
          title = EXCLUDED.title,
          description = EXCLUDED.description,
          sort_order = EXCLUDED.sort_order,
          estimated_study_time_minutes = EXCLUDED.estimated_study_time_minutes,
          assessment_reference = EXCLUDED.assessment_reference,
          is_archived = FALSE,
          updated_at = NOW()
      `;
      await transaction`
        INSERT INTO lessons ${transaction(lessonRows)}
        ON CONFLICT (id) DO UPDATE SET
          module_id = EXCLUDED.module_id,
          slug = EXCLUDED.slug,
          title = EXCLUDED.title,
          summary = EXCLUDED.summary,
          sort_order = EXCLUDED.sort_order,
          estimated_duration_minutes = EXCLUDED.estimated_duration_minutes,
          status = EXCLUDED.status,
          current_version_number = EXCLUDED.current_version_number,
          published_version_id = EXCLUDED.published_version_id,
          updated_at = NOW()
      `;
      await transaction`
        INSERT INTO lesson_sections ${transaction(sectionRows)}
        ON CONFLICT (id) DO UPDATE SET
          lesson_id = EXCLUDED.lesson_id,
          kind = EXCLUDED.kind,
          title = EXCLUDED.title,
          description = EXCLUDED.description,
          sort_order = EXCLUDED.sort_order,
          updated_at = NOW()
      `;
      await transaction`
        INSERT INTO lesson_blocks ${transaction(blockRows)}
        ON CONFLICT (id) DO UPDATE SET
          section_id = EXCLUDED.section_id,
          type = EXCLUDED.type,
          title = EXCLUDED.title,
          sort_order = EXCLUDED.sort_order,
          payload = EXCLUDED.payload,
          updated_at = NOW()
      `;
      await transaction`
        INSERT INTO lesson_versions ${transaction(versionRows)}
        ON CONFLICT (id) DO UPDATE SET
          lesson_id = EXCLUDED.lesson_id,
          version_number = EXCLUDED.version_number,
          status = EXCLUDED.status,
          change_summary = EXCLUDED.change_summary,
          snapshot = EXCLUDED.snapshot,
          created_by_profile_id = EXCLUDED.created_by_profile_id,
          published_at = EXCLUDED.published_at
      `;
      await transaction`
        INSERT INTO app_metadata (key, value, updated_at)
        VALUES ('seed_version', 'phase-20-open-science-missions', NOW())
        ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
      `;
    });

    const [summary] = await database`
      SELECT
        (SELECT COUNT(*)::int FROM courses WHERE id LIKE 'course-open-science-%') AS courses,
        (SELECT COUNT(*)::int FROM modules WHERE id LIKE 'module-open-science-%') AS modules,
        (SELECT COUNT(*)::int FROM lessons WHERE id LIKE 'lesson-open-science-%') AS lessons,
        (SELECT COUNT(*)::int FROM lesson_blocks WHERE id LIKE 'block-open-science-%' AND type = 'quick-check') AS quick_checks
    `;
    console.log(JSON.stringify(summary));
  } finally {
    await database.end({ timeout: 5 });
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
