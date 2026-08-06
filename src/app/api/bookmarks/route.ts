import { NextResponse } from "next/server";
import { getNotesRepository } from "@/infrastructure/database/repositories/notes-repository";
import { createBookmark } from "@/features/notes/service";
import { bookmarkSchema } from "@/features/notes/schemas";
import {
  errorResponse,
  invalidResponse,
  readJson,
  requireNotesProfile,
} from "@/features/notes/route-utils";

export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<NextResponse> {
  try {
    const profileId = await requireNotesProfile();
    const query = new URL(request.url).searchParams;
    return NextResponse.json({
      bookmarks: await getNotesRepository().listBookmarks(profileId, {
        resourceType: query.get("resourceType") as never,
        resourceId: query.get("resourceId") ?? undefined,
      }),
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const profileId = await requireNotesProfile();
    const parsed = bookmarkSchema.safeParse(await readJson(request));
    if (!parsed.success) return invalidResponse("Invalid bookmark.", parsed.error.issues);
    return NextResponse.json(await createBookmark(profileId, parsed.data, getNotesRepository()), {
      status: 201,
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: Request): Promise<NextResponse> {
  try {
    const profileId = await requireNotesProfile();
    const parsed = bookmarkSchema
      .pick({ resourceType: true, resourceId: true })
      .safeParse(await readJson(request));
    if (!parsed.success) return invalidResponse("Invalid bookmark removal.", parsed.error.issues);
    await getNotesRepository().deleteBookmark(
      profileId,
      parsed.data.resourceType,
      parsed.data.resourceId,
    );
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return errorResponse(error);
  }
}
