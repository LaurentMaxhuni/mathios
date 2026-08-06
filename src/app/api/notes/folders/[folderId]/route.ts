import { NextResponse } from "next/server";
import { getNotesRepository } from "@/infrastructure/database/repositories/notes-repository";
import { deleteFolder, updateFolder } from "@/features/notes/service";
import { folderUpdateSchema } from "@/features/notes/schemas";
import {
  errorResponse,
  invalidResponse,
  readJson,
  requireNotesProfile,
} from "@/features/notes/route-utils";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ folderId: string }> },
): Promise<NextResponse> {
  try {
    const profileId = await requireNotesProfile();
    const { folderId } = await params;
    const parsed = folderUpdateSchema.safeParse(await readJson(request));
    if (!parsed.success) return invalidResponse("Invalid folder update.", parsed.error.issues);
    return NextResponse.json(
      await updateFolder(profileId, folderId, parsed.data, getNotesRepository()),
    );
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ folderId: string }> },
): Promise<NextResponse> {
  try {
    const profileId = await requireNotesProfile();
    const { folderId } = await params;
    await deleteFolder(profileId, folderId, getNotesRepository());
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return errorResponse(error);
  }
}
