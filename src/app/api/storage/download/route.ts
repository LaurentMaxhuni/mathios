import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { getStorage } from "@/infrastructure/storage";
import { verifyLocalStorageSignature } from "@/infrastructure/storage/signed-url";
import { normalizeStorageKey } from "@/domain/storage/rules";

export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<NextResponse> {
  if (env.STORAGE_PROVIDER !== "local")
    return NextResponse.json({ message: "Not found." }, { status: 404 });
  const url = new URL(request.url);
  const key = url.searchParams.get("key");
  const expiresAt = Number(url.searchParams.get("expires"));
  const signature = url.searchParams.get("signature") ?? "";
  if (!key || !verifyLocalStorageSignature("get", key, expiresAt, signature, env.SESSION_SECRET)) {
    return NextResponse.json({ message: "The signed URL is invalid or expired." }, { status: 403 });
  }

  try {
    const normalizedKey = normalizeStorageKey(key);
    const object = await getStorage().get(normalizedKey);
    if (!object) return NextResponse.json({ message: "Object not found." }, { status: 404 });
    return new NextResponse(object.body as BodyInit, {
      headers: {
        ...(object.contentType ? { "Content-Type": object.contentType } : {}),
        "Content-Length": String(object.size),
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch {
    return NextResponse.json({ message: "The stored object could not be read." }, { status: 500 });
  }
}
