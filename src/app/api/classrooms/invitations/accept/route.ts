import { NextResponse } from "next/server";
import { acceptInvitationSchema } from "@/features/classrooms/schemas";
import { acceptInvitationByCode } from "@/features/classrooms/service";
import { errorResponse, requireClassroomSession } from "@/features/classrooms/route-utils";

export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const principal = await requireClassroomSession();
    const parsed = acceptInvitationSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ message: "Enter a valid invitation code." }, { status: 400 });
    }
    return NextResponse.json(await acceptInvitationByCode(parsed.data.code, principal));
  } catch (error) {
    return errorResponse(error);
  }
}
