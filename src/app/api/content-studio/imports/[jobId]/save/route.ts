import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { NotFoundError, ValidationError } from "@/domain/errors/application-error";
import { aiErrorResponse } from "@/features/ai/route-utils";
import { requireCourseEditor } from "@/features/courses/service";
import { parseLessonDraftValue, saveLessonDraft } from "@/features/content-studio/service";
import { getCurrentSession } from "@/infrastructure/auth/local-auth-provider";
import { getCourseRepository } from "@/infrastructure/database/repositories/course-repository";
import { getSourceImportRepository } from "@/infrastructure/database/repositories/source-import-repository";

const saveSchema = z.object({
  courseId: z.string().trim().min(1).max(160).nullable().default(null),
  courseTitle: z.string().trim().min(2).max(180),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ jobId: string }> },
): Promise<NextResponse> {
  try {
    const principal = requireCourseEditor(await getCurrentSession());
    const parsed = saveSchema.safeParse(await request.json());
    if (!parsed.success)
      return NextResponse.json({ message: "Choose a destination course." }, { status: 400 });
    const { jobId } = await context.params;
    const imports = getSourceImportRepository();
    const record = await imports.getImport(jobId);
    if (!record || record.createdByProfileId !== principal.profileId)
      throw new NotFoundError("Source import", jobId);
    if (record.status !== "ready")
      throw new ValidationError("Finish generating source lessons before saving them.");
    const item = await imports.getNextUnsavedItem(jobId);
    if (!item) return NextResponse.json({ done: true, courseId: parsed.data.courseId, record });

    const draft = parseLessonDraftValue(item.draft);
    const saved = await saveLessonDraft({
      courseId: parsed.data.courseId,
      courseTitle: parsed.data.courseTitle,
      subjectId: record.subjectId,
      gradeId: record.targetGradeId,
      difficulty: record.difficulty,
      draft,
      createdByProfileId: principal.profileId,
    });
    await imports.markItemSaved(item.id, saved.lessonId);
    await getCourseRepository().saveAsset({
      id: randomUUID(),
      lessonId: saved.lessonId,
      blockId: null,
      kind: "source-document",
      name: `${record.title}, pages ${item.pageStart}-${item.pageEnd}`,
      sourceUrl: `storage://${record.storageKey}`,
      mimeType: record.mimeType,
      altText: `Source citation for ${draft.lessonTitle}`,
      metadata: {
        documentId: record.documentId,
        sha256: record.sha256,
        pageStart: item.pageStart,
        pageEnd: item.pageEnd,
        originalFilename: record.originalFilename,
        rightsStatus: record.rightsStatus,
      },
    });
    const updated = await imports.getImport(jobId);
    return NextResponse.json({
      done: Boolean(updated && updated.savedCount === updated.draftCount),
      courseId: saved.courseId,
      lessonId: saved.lessonId,
      record: updated,
    });
  } catch (error) {
    return aiErrorResponse(error);
  }
}
