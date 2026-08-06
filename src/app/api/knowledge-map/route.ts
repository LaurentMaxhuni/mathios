import { NextResponse } from "next/server";
import { getPersonalKnowledgeMap } from "@/features/notes/service";
import { getNotesRepository } from "@/infrastructure/database/repositories/notes-repository";
import { errorResponse, requireNotesProfile } from "@/features/notes/route-utils";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  try {
    const profileId = await requireNotesProfile();
    return NextResponse.json(await getPersonalKnowledgeMap(profileId, getNotesRepository()));
  } catch (error) {
    return errorResponse(error);
  }
}
