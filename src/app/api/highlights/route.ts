import { NextResponse } from "next/server";
import { getNotesRepository } from "@/infrastructure/database/repositories/notes-repository";
import { createHighlight } from "@/features/notes/service";
import { highlightSchema } from "@/features/notes/schemas";
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
      highlights: await getNotesRepository().listHighlights(profileId, {
        sourceType: (query.get("sourceType") as never) || undefined,
        sourceId: query.get("sourceId") ?? undefined,
        noteId: query.get("noteId") ?? undefined,
      }),
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const profileId = await requireNotesProfile();
    const parsed = highlightSchema.safeParse(await readJson(request));
    if (!parsed.success) return invalidResponse("Invalid highlight.", parsed.error.issues);
    return NextResponse.json(await createHighlight(profileId, parsed.data, getNotesRepository()), {
      status: 201,
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: Request): Promise<NextResponse> {
  try {
    const profileId = await requireNotesProfile();
    const body = await readJson(request);
    if (typeof body.id !== "string" || !body.id.trim())
      return invalidResponse("A highlight id is required.");
    await getNotesRepository().deleteHighlight(profileId, body.id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return errorResponse(error);
  }
}
