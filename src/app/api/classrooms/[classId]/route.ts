import { NextResponse } from "next/server";
import { classroomSchema } from "@/features/classrooms/schemas";
import { getClassroomDetail, updateClassroom } from "@/features/classrooms/service";
import { errorResponse, requireClassroomSession } from "@/features/classrooms/route-utils";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ classId: string }> },
): Promise<NextResponse> {
  try {
    const principal = await requireClassroomSession();
    const { classId } = await params;
    return NextResponse.json(await getClassroomDetail(classId, principal), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ classId: string }> },
): Promise<NextResponse> {
  try {
    const principal = await requireClassroomSession();
    const { classId } = await params;
    const parsed = classroomSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { message: "Invalid classroom details.", issues: parsed.error.issues },
        { status: 400 },
      );
    }
    return NextResponse.json(await updateClassroom(classId, parsed.data, principal));
  } catch (error) {
    return errorResponse(error);
  }
}
