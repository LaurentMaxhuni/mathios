import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/features/auth/authorization";
import { getCurrentSession } from "@/infrastructure/auth/local-auth-provider";
import { getSignedStorage } from "@/infrastructure/storage";
import { env } from "@/lib/env";
import { recordRequestAuditEvent } from "@/server/audit";

const signedUrlSchema = z.object({
  operation: z.enum(["get", "put"]),
  key: z.string().min(1).max(512),
  contentType: z.string().max(120).optional(),
  expiresInSeconds: z.number().int().min(60).max(86_400).optional(),
  maxBytes: z.number().int().min(1024).max(env.STORAGE_MAX_UPLOAD_BYTES).optional(),
});

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const principal = requireSession(await getCurrentSession());
    const parsed = signedUrlSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json(
        { message: "Invalid signed URL request.", issues: parsed.error.issues },
        { status: 400 },
      );
    }
    const input = {
      key: parsed.data.key,
      expiresInSeconds: parsed.data.expiresInSeconds ?? env.STORAGE_SIGNED_URL_TTL_SECONDS,
      contentType: parsed.data.contentType,
      maxBytes: parsed.data.maxBytes ?? env.STORAGE_MAX_UPLOAD_BYTES,
    };
    const storage = getSignedStorage();
    const url =
      parsed.data.operation === "get"
        ? { operation: "get", url: await storage.createSignedDownloadUrl(input) }
        : { operation: "put", ...(await storage.createSignedUploadUrl(input)) };
    await recordRequestAuditEvent({
      actorProfileId: principal.profileId,
      eventType: `storage.signed_url.${parsed.data.operation}`,
      resourceType: "storage-object",
      resourceId: parsed.data.key,
    });
    return NextResponse.json(url, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create a signed URL.";
    return NextResponse.json(
      { message },
      { status: error instanceof Error && "status" in error ? Number(error.status) : 500 },
    );
  }
}
