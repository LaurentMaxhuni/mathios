import { NextResponse } from "next/server";
import { classroomSchema } from "@/features/classrooms/schemas";
import { createClassroom, getClassroomDashboard } from "@/features/classrooms/service";
import { errorResponse, requireClassroomSession } from "@/features/classrooms/route-utils";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  try {
    const principal = await requireClassroomSession();
    return NextResponse.json(await getClassroomDashboard(principal), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const principal = await requireClassroomSession();
    const parsed = classroomSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { message: "Invalid classroom details.", issues: parsed.error.issues },
        { status: 400 },
      );
    }
    return NextResponse.json(await createClassroom(parsed.data, principal), { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
