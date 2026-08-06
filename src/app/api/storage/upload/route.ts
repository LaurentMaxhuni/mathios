import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { getStorage } from "@/infrastructure/storage";
import { verifyLocalStorageSignature } from "@/infrastructure/storage/signed-url";

export const dynamic = "force-dynamic";

export async function PUT(request: Request): Promise<NextResponse> {
  if (env.STORAGE_PROVIDER !== "local")
    return NextResponse.json({ message: "Not found." }, { status: 404 });
  const url = new URL(request.url);
  const key = url.searchParams.get("key");
  const expiresAt = Number(url.searchParams.get("expires"));
  const signature = url.searchParams.get("signature") ?? "";
  if (!key || !verifyLocalStorageSignature("put", key, expiresAt, signature, env.SESSION_SECRET)) {
    return NextResponse.json({ message: "The signed URL is invalid or expired." }, { status: 403 });
  }

  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (declaredLength > env.STORAGE_MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      { message: "The upload exceeds the configured limit." },
      { status: 413 },
    );
  }
  try {
    const body = await readBodyWithLimit(request, env.STORAGE_MAX_UPLOAD_BYTES);
    const stored = await getStorage().put({
      key,
      body,
      contentType: request.headers.get("content-type") ?? undefined,
    });
    return NextResponse.json({ key: stored.key, size: stored.size }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "The upload could not be stored." },
      { status: error instanceof Error && "status" in error ? Number(error.status) : 500 },
    );
  }
}

async function readBodyWithLimit(request: Request, maxBytes: number): Promise<Uint8Array> {
  if (!request.body) return new Uint8Array();
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const result = await reader.read();
      if (result.done) break;
      total += result.value.byteLength;
      if (total > maxBytes) throw new Error("The upload exceeds the configured limit.");
      chunks.push(result.value);
    }
  } finally {
    reader.releaseLock();
  }
  const body = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return body;
}
