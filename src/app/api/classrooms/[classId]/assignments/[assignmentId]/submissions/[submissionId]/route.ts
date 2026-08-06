import { NextResponse } from "next/server";
import { reviewSubmissionSchema } from "@/features/classrooms/schemas";
import { reviewSubmission } from "@/features/classrooms/service";
import { errorResponse, requireClassroomSession } from "@/features/classrooms/route-utils";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ classId: string; assignmentId: string; submissionId: string }> },
): Promise<NextResponse> {
  try {
    const principal = await requireClassroomSession();
    const { classId, submissionId } = await params;
    const parsed = reviewSubmissionSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ message: "Invalid review details." }, { status: 400 });
    }
    return NextResponse.json(await reviewSubmission(classId, submissionId, parsed.data, principal));
  } catch (error) {
    return errorResponse(error);
  }
}
