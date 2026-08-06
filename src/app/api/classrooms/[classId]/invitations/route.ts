import { NextResponse } from "next/server";
import { invitationSchema } from "@/features/classrooms/schemas";
import { createInvitation, getClassroomDetail } from "@/features/classrooms/service";
import { errorResponse, requireClassroomSession } from "@/features/classrooms/route-utils";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ classId: string }> },
): Promise<NextResponse> {
  try {
    const principal = await requireClassroomSession();
    const { classId } = await params;
    const detail = await getClassroomDetail(classId, principal);
    return NextResponse.json({ invitations: detail.invitations });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ classId: string }> },
): Promise<NextResponse> {
  try {
    const principal = await requireClassroomSession();
    const { classId } = await params;
    const parsed = invitationSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ message: "Invalid invitation details." }, { status: 400 });
    }
    return NextResponse.json(await createInvitation(classId, parsed.data, principal), {
      status: 201,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
