import { NextResponse } from "next/server";
import { submissionSchema } from "@/features/classrooms/schemas";
import { getClassroomDetail, submitAssignment } from "@/features/classrooms/service";
import { errorResponse, requireClassroomSession } from "@/features/classrooms/route-utils";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ classId: string; assignmentId: string }> },
): Promise<NextResponse> {
  try {
    const principal = await requireClassroomSession();
    const { classId, assignmentId } = await params;
    const detail = await getClassroomDetail(classId, principal);
    return NextResponse.json({
      submissions: detail.submissions.filter(
        (submission) => submission.assignmentId === assignmentId,
      ),
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ classId: string; assignmentId: string }> },
): Promise<NextResponse> {
  try {
    const principal = await requireClassroomSession();
    const { classId, assignmentId } = await params;
    const parsed = submissionSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ message: "Write a response before submitting." }, { status: 400 });
    }
    return NextResponse.json(
      await submitAssignment(classId, assignmentId, parsed.data.response, principal),
      { status: 201 },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
