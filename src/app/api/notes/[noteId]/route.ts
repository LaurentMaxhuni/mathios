import { NextResponse } from "next/server";
import { getNotesRepository } from "@/infrastructure/database/repositories/notes-repository";
import { deleteNote, getNote, updateNote } from "@/features/notes/service";
import { noteUpdateSchema } from "@/features/notes/schemas";
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
    return NextResponse.json(await getNote(profileId, noteId, getNotesRepository()));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ noteId: string }> },
): Promise<NextResponse> {
  try {
    const profileId = await requireNotesProfile();
    const { noteId } = await params;
    const parsed = noteUpdateSchema.safeParse(await readJson(request));
    if (!parsed.success) return invalidResponse("Invalid note update.", parsed.error.issues);
    return NextResponse.json(
      await updateNote(profileId, noteId, parsed.data, getNotesRepository()),
    );
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ noteId: string }> },
): Promise<NextResponse> {
  try {
    const profileId = await requireNotesProfile();
    const { noteId } = await params;
    await deleteNote(profileId, noteId, getNotesRepository());
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return errorResponse(error);
  }
}
