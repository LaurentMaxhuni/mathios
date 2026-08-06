import { NextResponse } from "next/server";
import { getNotesRepository } from "@/infrastructure/database/repositories/notes-repository";
import { createFolder } from "@/features/notes/service";
import { folderInputSchema } from "@/features/notes/schemas";
import {
  errorResponse,
  invalidResponse,
  readJson,
  requireNotesProfile,
} from "@/features/notes/route-utils";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  try {
    const profileId = await requireNotesProfile();
    return NextResponse.json({ folders: await getNotesRepository().listFolders(profileId) });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const profileId = await requireNotesProfile();
    const parsed = folderInputSchema.safeParse(await readJson(request));
    if (!parsed.success) return invalidResponse("Invalid folder.", parsed.error.issues);
    return NextResponse.json(await createFolder(profileId, parsed.data, getNotesRepository()), {
      status: 201,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
