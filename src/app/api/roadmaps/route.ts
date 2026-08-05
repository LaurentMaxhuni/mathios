import { NextResponse } from "next/server";
import { asApplicationError } from "@/domain/errors/application-error";
import { getCurrentSession } from "@/infrastructure/auth/local-auth-provider";
import { getRoadmapRepository } from "@/infrastructure/database/repositories/roadmap-repository";
import { canAuthorRoadmaps, listRoadmaps } from "@/features/roadmaps/service";

export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<NextResponse> {
  try {
    const session = await getCurrentSession();
    if (!session)
      return NextResponse.json({ error: "Authentication is required." }, { status: 401 });
    const query = new URL(request.url).searchParams;
    const roadmaps = await listRoadmaps(getRoadmapRepository(), {
      includeDraft: canAuthorRoadmaps(session.principal),
      includeArchived: false,
      subjectId: query.get("subjectId") ?? undefined,
      targetGradeId: query.get("targetGradeId") ?? undefined,
    });
    return NextResponse.json({ roadmaps });
  } catch (error) {
    const applicationError = asApplicationError(error);
    return NextResponse.json(applicationError.toJSON(), { status: applicationError.status });
  }
}
