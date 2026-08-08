import { NextResponse } from "next/server";
import { NotFoundError, ValidationError } from "@/domain/errors/application-error";
import { generateAiContent } from "@/features/ai/service";
import { aiErrorResponse } from "@/features/ai/route-utils";
import { requireCourseEditor } from "@/features/courses/service";
import {
  buildSourceLessonInstruction,
  chunkExtractedPages,
  parseSourceLessonBatch,
} from "@/features/content-studio/source-ingestion";
import { extractPdfPages } from "@/features/content-studio/source-pdf";
import { getCurrentSession } from "@/infrastructure/auth/local-auth-provider";
import { getCurriculumRepository } from "@/infrastructure/database/repositories/curriculum-repository";
import { getSourceImportRepository } from "@/infrastructure/database/repositories/source-import-repository";
import { getStorage } from "@/infrastructure/storage";

export const dynamic = "force-dynamic";

export async function POST(
  _request: Request,
  context: { params: Promise<{ jobId: string }> },
): Promise<NextResponse> {
  try {
    return await processImport(context);
  } catch (error) {
    return aiErrorResponse(error);
  }
}

async function processImport(context: {
  params: Promise<{ jobId: string }>;
}): Promise<NextResponse> {
  const principal = requireCourseEditor(await getCurrentSession());
  const { jobId } = await context.params;
  const repository = getSourceImportRepository();
  let record = await repository.getImport(jobId);
  if (!record || record.createdByProfileId !== principal.profileId) {
    return aiErrorResponse(new NotFoundError("Source import", jobId));
  }

  if (record.status === "ready") return NextResponse.json(record);
  if (record.status === "queued" || record.status === "failed") {
    const began = await repository.beginExtraction(jobId);
    if (!began) return NextResponse.json(await repository.getImport(jobId), { status: 202 });
    try {
      const object = await getStorage().get(record.storageKey);
      if (!object) throw new NotFoundError("Stored source PDF", record.documentId);
      const pages = await extractPdfPages(object.body);
      const chunks = chunkExtractedPages(pages, record.lessonSize);
      if (!chunks.length)
        throw new ValidationError("No teachable text chunks could be extracted from this PDF.");
      await repository.saveExtraction({ jobId, documentId: record.documentId, pages, chunks });
      return NextResponse.json(await repository.getImport(jobId), { status: 202 });
    } catch (error) {
      const message = error instanceof Error ? error.message : "The PDF could not be extracted.";
      await repository.failImport(jobId, message);
      return aiErrorResponse(error);
    }
  }

  if (record.status === "extracting") return NextResponse.json(record, { status: 202 });

  const chunk = await repository.claimNextChunk(jobId);
  if (!chunk) {
    await repository.finishIfComplete(jobId);
    return NextResponse.json(await repository.getImport(jobId), { status: 202 });
  }
  try {
    const structure = getCurriculumRepository();
    const [subject, grade] = await Promise.all([
      structure.getSubject(record.subjectId),
      structure.getGrade(record.targetGradeId),
    ]);
    if (!subject || !grade)
      throw new ValidationError("The source subject or grade is no longer available.");
    const generation = await generateAiContent(principal.profileId, {
      task: "source-lesson-draft",
      instruction: buildSourceLessonInstruction({
        documentTitle: record.title,
        subjectName: subject.name,
        gradeName: grade.name,
        difficulty: record.difficulty,
        lessonSize: record.lessonSize,
        pageStart: chunk.pageStart,
        pageEnd: chunk.pageEnd,
      }),
      gradeId: grade.id,
      grounding: [
        {
          type: "creator",
          label: `${record.title}, pages ${chunk.pageStart}-${chunk.pageEnd}`,
          content: chunk.text,
          resourceId: record.documentId,
          approved: record.rightsStatus === "permitted",
        },
      ],
    });
    const lessons = parseSourceLessonBatch(generation.output, {
      start: chunk.pageStart,
      end: chunk.pageEnd,
    });
    await repository.completeChunk({ chunk, generationId: generation.id, lessons });
    await repository.finishIfComplete(jobId);
    record = (await repository.getImport(jobId))!;
    return NextResponse.json(record, { status: record.status === "ready" ? 200 : 202 });
  } catch (error) {
    await repository.releaseChunk(
      chunk.id,
      error instanceof Error ? error.message : "Lesson generation failed.",
    );
    return aiErrorResponse(error);
  }
}
