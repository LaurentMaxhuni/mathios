import { NextResponse } from "next/server";
import { getNotesRepository } from "@/infrastructure/database/repositories/notes-repository";
import { createInternalLink, createResourceLink, getNote } from "@/features/notes/service";
import { noteLinkSchema } from "@/features/notes/schemas";
import {
  errorResponse,
  invalidResponse,
  readJson,
  requireNotesProfile,
} from "@/features/notes/route-utils";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ noteId: string }> },
): Promise<NextResponse> {
  try {
    const profileId = await requireNotesProfile();
    const { noteId } = await params;
    const note = await getNote(profileId, noteId, getNotesRepository());
    return NextResponse.json({ links: note.links, backlinks: note.backlinks });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ noteId: string }> },
): Promise<NextResponse> {
  try {
    const profileId = await requireNotesProfile();
    const { noteId } = await params;
    const parsed = noteLinkSchema.safeParse(await readJson(request));
    if (!parsed.success) return invalidResponse("Invalid note link.", parsed.error.issues);
    const repository = getNotesRepository();
    const link =
      parsed.data.kind === "resource"
        ? await createResourceLink(profileId, noteId, parsed.data, repository)
        : await createInternalLink(
            profileId,
            noteId,
            parsed.data.targetNoteId,
            parsed.data.anchor,
            repository,
          );
    return NextResponse.json(link, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
