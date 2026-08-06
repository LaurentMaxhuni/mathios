import { NextResponse } from "next/server";
import { requireCourseEditor } from "@/features/courses/service";
import { contentStudioGenerateSchema } from "@/features/content-studio/schemas";
import { buildLessonDraftInstruction, parseLessonDraft } from "@/features/content-studio/service";
import { generateAiContent } from "@/features/ai/service";
import { aiErrorResponse } from "@/features/ai/route-utils";
import { getCurrentSession } from "@/infrastructure/auth/local-auth-provider";
import { getCurriculumRepository } from "@/infrastructure/database/repositories/curriculum-repository";

export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const principal = requireCourseEditor(await getCurrentSession());
    const parsed = contentStudioGenerateSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { message: "Invalid content brief.", issues: parsed.error.issues },
        { status: 400 },
      );
    }

    const structure = getCurriculumRepository();
    const [subject, grade] = await Promise.all([
      structure.getSubject(parsed.data.subjectId),
      structure.getGrade(parsed.data.gradeId),
    ]);
    if (!subject || !grade) {
      return NextResponse.json(
        { message: "Choose a subject and grade from the provided library." },
        { status: 400 },
      );
    }

    const generation = await generateAiContent(principal.profileId, {
      task: "lesson-draft",
      instruction: buildLessonDraftInstruction({
        courseTitle: parsed.data.courseTitle,
        topic: parsed.data.topic,
        subjectName: subject.name,
        gradeName: grade.name,
        difficulty: parsed.data.difficulty,
        learningObjectives: parsed.data.learningObjectives,
      }),
      gradeId: grade.id,
    });
    const draft = parseLessonDraft(generation.output);
    return NextResponse.json({ generationId: generation.id, generation, draft });
  } catch (error) {
    return aiErrorResponse(error);
  }
}
