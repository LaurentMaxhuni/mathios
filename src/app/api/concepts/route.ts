import { NextResponse } from "next/server";
import { asApplicationError } from "@/domain/errors/application-error";
import { getCurrentSession } from "@/infrastructure/auth/local-auth-provider";
import { getConceptRepository } from "@/infrastructure/database/repositories/concept-repository";
import {
  canAuthorConcepts,
  createConcept,
  requireConceptEditor,
} from "@/features/concepts/service";
import { conceptSchema } from "@/features/concepts/schemas";

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
    const author = canAuthorConcepts(session.principal);
    const concepts = await getConceptRepository().listConcepts({
      search: searchParams.get("search") ?? undefined,
      subjectId: searchParams.get("subjectId") ?? undefined,
      domainId: searchParams.get("domainId") ?? undefined,
      gradeId: searchParams.get("gradeId") ?? undefined,
      difficulty:
        (searchParams.get("difficulty") as "gentle" | "balanced" | "challenging" | null) ??
        undefined,
      includeArchived: author && searchParams.get("includeArchived") === "true",
    });
    return NextResponse.json({ concepts }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const session = await getCurrentSession();
    requireConceptEditor(session);
    const parsed = conceptSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        {
          code: "VALIDATION_ERROR",
          message: "Please review the concept fields.",
          issues: parsed.error.issues,
        },
        { status: 400 },
      );
    }
    if (parsed.data.id) {
      return NextResponse.json(
        { code: "VALIDATION_ERROR", message: "Use PATCH to update an existing concept." },
        { status: 400 },
      );
    }
    const concept = await createConcept(parsed.data, getConceptRepository());
    return NextResponse.json({ concept }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
