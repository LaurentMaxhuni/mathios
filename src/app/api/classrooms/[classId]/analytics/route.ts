import { NextResponse } from "next/server";
import { getClassroomAnalytics } from "@/features/classrooms/service";
import { errorResponse, requireClassroomSession } from "@/features/classrooms/route-utils";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ classId: string }> },
): Promise<NextResponse> {
  try {
    const principal = await requireClassroomSession();
    const { classId } = await params;
    return NextResponse.json(await getClassroomAnalytics(classId, principal), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
