import { NextResponse } from "next/server";
import { NotFoundError, ValidationError } from "@/domain/errors/application-error";
import { requireCourseEditor } from "@/features/courses/service";
import { getAiRepository } from "@/infrastructure/database/repositories/ai-repository";
import { getCurrentSession } from "@/infrastructure/auth/local-auth-provider";
import { getCurriculumRepository } from "@/infrastructure/database/repositories/curriculum-repository";
import { aiErrorResponse } from "@/features/ai/route-utils";
import { contentStudioSaveSchema } from "@/features/content-studio/schemas";
import { parseLessonDraftValue, saveLessonDraft } from "@/features/content-studio/service";

export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const principal = requireCourseEditor(await getCurrentSession());
    const parsed = contentStudioSaveSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { message: "Invalid lesson draft.", issues: parsed.error.issues },
        { status: 400 },
      );
    }

    const draft = parseLessonDraftValue(parsed.data.draft);
    const structure = getCurriculumRepository();
    const [subject, grade] = await Promise.all([
      structure.getSubject(parsed.data.subjectId),
      structure.getGrade(parsed.data.gradeId),
    ]);
    if (!subject || !grade) throw new ValidationError("Choose a valid subject and grade.");

    const generations = await getAiRepository().listGenerations(principal.profileId, 100);
    const generation = generations.find((item) => item.id === parsed.data.generationId);
    if (!generation || generation.task !== "lesson-draft" || generation.status === "rejected") {
      throw new NotFoundError("AI lesson draft", parsed.data.generationId);
    }

    return NextResponse.json(
      await saveLessonDraft({
        courseId: parsed.data.courseId,
        courseTitle: parsed.data.courseTitle,
        subjectId: subject.id,
        gradeId: grade.id,
        difficulty: parsed.data.difficulty,
        draft,
        createdByProfileId: principal.profileId,
      }),
    );
  } catch (error) {
    return aiErrorResponse(error);
  }
}
