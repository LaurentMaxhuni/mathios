import { NextResponse } from "next/server";
import { asApplicationError } from "@/domain/errors/application-error";
import { CONCEPT_RELATIONSHIP_TYPES } from "@/domain/concept/types";
import { getCurrentSession } from "@/infrastructure/auth/local-auth-provider";
import { getConceptRepository } from "@/infrastructure/database/repositories/concept-repository";
import { canAuthorConcepts } from "@/features/concepts/service";

export const dynamic = "force-dynamic";

function errorResponse(error: unknown): NextResponse {
  const applicationError = asApplicationError(error);
  return NextResponse.json(applicationError.toJSON(), { status: applicationError.status });
}

export async function GET(request: Request): Promise<NextResponse> {
  try {
    const session = await getCurrentSession();
    if (!session)
      return NextResponse.json(
        { code: "UNAUTHORIZED", message: "Authentication is required." },
        { status: 401 },
      );
    const searchParams = new URL(request.url).searchParams;
    const relationshipTypes = searchParams
      .getAll("relationshipType")
      .flatMap((value) => value.split(","))
      .filter((value): value is (typeof CONCEPT_RELATIONSHIP_TYPES)[number] =>
        CONCEPT_RELATIONSHIP_TYPES.includes(value as (typeof CONCEPT_RELATIONSHIP_TYPES)[number]),
      );
    const graph = await getConceptRepository().getGraph({
      search: searchParams.get("search") ?? undefined,
      subjectId: searchParams.get("subjectId") ?? undefined,
      domainId: searchParams.get("domainId") ?? undefined,
      gradeId: searchParams.get("gradeId") ?? undefined,
      difficulty:
        (searchParams.get("difficulty") as "gentle" | "balanced" | "challenging" | null) ??
        undefined,
      relationshipTypes,
      masteryState: searchParams.get("masteryState") === "unassessed" ? "unassessed" : "all",
      includeArchived: canAuthorConcepts(session.principal),
    });
    return NextResponse.json({ graph }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return errorResponse(error);
  }
}
