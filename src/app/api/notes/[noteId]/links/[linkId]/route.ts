import { NextResponse } from "next/server";
import { getNotesRepository } from "@/infrastructure/database/repositories/notes-repository";
import { errorResponse, requireNotesProfile } from "@/features/notes/route-utils";

export const dynamic = "force-dynamic";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ noteId: string; linkId: string }> },
): Promise<NextResponse> {
  try {
    const profileId = await requireNotesProfile();
    const { noteId, linkId } = await params;
    const repository = getNotesRepository();
    if (new URL(request.url).searchParams.get("kind") === "backlink")
      await repository.deleteBacklink(profileId, noteId, linkId);
    else await repository.deleteNoteLink(profileId, noteId, linkId);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return errorResponse(error);
  }
}
