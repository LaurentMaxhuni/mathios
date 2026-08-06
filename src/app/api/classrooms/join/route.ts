import { NextResponse } from "next/server";
import { joinClassroomSchema } from "@/features/classrooms/schemas";
import { joinClassByCode } from "@/features/classrooms/service";
import { errorResponse, requireClassroomSession } from "@/features/classrooms/route-utils";

export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const principal = await requireClassroomSession();
    const parsed = joinClassroomSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ message: "Enter a valid classroom join code." }, { status: 400 });
    }
    return NextResponse.json(await joinClassByCode(parsed.data.joinCode, principal));
  } catch (error) {
    return errorResponse(error);
  }
}
