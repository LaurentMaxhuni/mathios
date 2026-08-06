import { NextResponse } from "next/server";
import { acceptInvitation } from "@/features/classrooms/service";
import { errorResponse, requireClassroomSession } from "@/features/classrooms/route-utils";

export const dynamic = "force-dynamic";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ invitationId: string }> },
): Promise<NextResponse> {
  try {
    const principal = await requireClassroomSession();
    const { invitationId } = await params;
    return NextResponse.json(await acceptInvitation(invitationId, principal));
  } catch (error) {
    return errorResponse(error);
  }
}
