import { createHash, randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { requireCourseEditor } from "@/features/courses/service";
import { sourceImportFieldsSchema } from "@/features/content-studio/source-ingestion";
import { getCurrentSession } from "@/infrastructure/auth/local-auth-provider";
import { getCurriculumRepository } from "@/infrastructure/database/repositories/curriculum-repository";
import { getSourceImportRepository } from "@/infrastructure/database/repositories/source-import-repository";
import { getStorage } from "@/infrastructure/storage";
import { validateUpload } from "@/domain/storage/rules";
import { env } from "@/lib/env";
import { aiErrorResponse } from "@/features/ai/route-utils";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  try {
    const principal = requireCourseEditor(await getCurrentSession());
    const imports = await getSourceImportRepository().listImports(principal.profileId);
    return NextResponse.json({ imports }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return aiErrorResponse(error);
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  let storedKey: string | null = null;
  try {
    const principal = requireCourseEditor(await getCurrentSession());
    const form = await request.formData();
    const parsed = sourceImportFieldsSchema.safeParse({
      title: form.get("title"),
      subjectId: form.get("subjectId"),
      gradeId: form.get("gradeId"),
      difficulty: form.get("difficulty"),
      lessonSize: form.get("lessonSize"),
      rightsStatus: form.get("rightsStatus") || "unknown",
    });
    const file = form.get("file");
    if (!parsed.success || !(file instanceof File)) {
      return NextResponse.json(
        {
          message: "Choose a PDF and complete the source details.",
          issues: parsed.success ? [] : parsed.error.issues,
        },
        { status: 400 },
      );
    }
    if (file.type !== "application/pdf") {
      return NextResponse.json({ message: "Source books must be PDF files." }, { status: 400 });
    }

    const structure = getCurriculumRepository();
    const [subject, grade] = await Promise.all([
      structure.getSubject(parsed.data.subjectId),
      structure.getGrade(parsed.data.gradeId),
    ]);
    if (!subject || !grade) {
      return NextResponse.json(
        { message: "Choose a valid subject and grade or level." },
        { status: 400 },
      );
    }

    const documentId = randomUUID();
    const jobId = randomUUID();
    const body = new Uint8Array(await file.arrayBuffer());
    storedKey = `content-sources/${documentId}/source.pdf`;
    const upload = validateUpload({
      key: storedKey,
      body,
      contentType: "application/pdf",
      maxBytes: env.STORAGE_MAX_UPLOAD_BYTES,
    });
    await getStorage().put(upload);
    const record = await getSourceImportRepository().createImport({
      documentId,
      jobId,
      title: parsed.data.title,
      originalFilename: safeFilename(file.name),
      storageKey: storedKey,
      mimeType: "application/pdf",
      byteSize: upload.size,
      sha256: createHash("sha256").update(upload.body).digest("hex"),
      subjectId: subject.id,
      targetGradeId: grade.id,
      difficulty: parsed.data.difficulty,
      lessonSize: parsed.data.lessonSize,
      rightsStatus: parsed.data.rightsStatus,
      createdByProfileId: principal.profileId,
    });
    return NextResponse.json(record, { status: 202, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (storedKey)
      await getStorage()
        .delete(storedKey)
        .catch(() => undefined);
    return aiErrorResponse(error);
  }
}

function safeFilename(value: string): string {
  const filename = value.replaceAll("\\", "/").split("/").at(-1)?.trim() || "source.pdf";
  return filename.replace(/[^A-Za-z0-9._ ()-]/g, "_").slice(0, 180) || "source.pdf";
}
