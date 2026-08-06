import { NextResponse } from "next/server";
import { getNotesRepository } from "@/infrastructure/database/repositories/notes-repository";
import { getAnalyticsRepository } from "@/infrastructure/database/repositories/analytics-repository";
import { trackActivityEvent } from "@/features/analytics/service";
import { createNote, getNotesDashboard } from "@/features/notes/service";
import { noteInputSchema, notesQuerySchema } from "@/features/notes/schemas";
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
    const query = Object.fromEntries(new URL(request.url).searchParams.entries());
    const parsed = notesQuerySchema.safeParse(query);
    if (!parsed.success) return invalidResponse("Invalid note filters.", parsed.error.issues);
    const repository = getNotesRepository();
    const dashboard = await getNotesDashboard(profileId, repository, parsed.data);
    return NextResponse.json(dashboard);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const profileId = await requireNotesProfile();
    const parsed = noteInputSchema.safeParse(await readJson(request));
    if (!parsed.success) return invalidResponse("Invalid note.", parsed.error.issues);
    const note = await createNote(profileId, parsed.data, getNotesRepository());
    await trackActivityEvent(
      {
        id: `activity-note-creation-${note.id}`,
        profileId,
        eventType: "note-creation",
        resourceType: "note",
        resourceId: note.id,
        dedupeKey: `note-creation:${note.id}`,
        metadata: { title: note.title },
      },
      getAnalyticsRepository(),
    );
    return NextResponse.json(note, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
