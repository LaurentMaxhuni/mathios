import { NextResponse } from "next/server";
import { hasPermission } from "@/features/auth/authorization";
import { ValidationError } from "@/domain/errors/application-error";
import { restoreOptionsSchema } from "@/features/portability/schemas";
import { errorResponse, requirePortabilitySession } from "@/features/portability/route-utils";
import { previewRestore, restorePortability } from "@/features/portability/service";

export const dynamic = "force-dynamic";

async function readPayload(
  request: Request,
): Promise<{ bytes: Uint8Array; fileName: string; mode: "merge" | "replace"; preview: boolean }> {
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("multipart/form-data")) {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File))
      throw new ValidationError("Choose a JSON or ZIP portability file.");
    const mode = form.get("mode") === "replace" ? "replace" : "merge";
    const preview = form.get("preview") === "true";
    return {
      bytes: new Uint8Array(await file.arrayBuffer()),
      fileName: file.name || "backup.json",
      mode,
      preview,
    };
  }
  let body: { package?: unknown; mode?: "merge" | "replace"; preview?: boolean };
  try {
    body = (await request.json()) as {
      package?: unknown;
      mode?: "merge" | "replace";
      preview?: boolean;
    };
  } catch {
    throw new ValidationError("The restore request is not valid JSON.");
  }
  const payload = body.package ?? body;
  return {
    bytes: new TextEncoder().encode(JSON.stringify(payload)),
    fileName: "backup.json",
    mode: body.mode === "replace" ? "replace" : "merge",
    preview: Boolean(body.preview),
  };
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const principal = await requirePortabilitySession();
    if (!hasPermission(principal, "restore_backups")) {
      return NextResponse.json({ message: "Restore permission is required." }, { status: 403 });
    }
    const payload = await readPayload(request);
    const parsed = restoreOptionsSchema.safeParse({ mode: payload.mode, preview: payload.preview });
    if (!parsed.success)
      return NextResponse.json(
        { message: "Invalid restore options.", issues: parsed.error.issues },
        { status: 400 },
      );
    const result = parsed.data.preview
      ? await previewRestore(payload.bytes, payload.fileName, parsed.data.mode, principal.profileId)
      : await restorePortability(
          payload.bytes,
          payload.fileName,
          parsed.data.mode,
          principal.profileId,
        );
    return NextResponse.json({ run: result.run, preview: result.preview });
  } catch (error) {
    return errorResponse(error);
  }
}
