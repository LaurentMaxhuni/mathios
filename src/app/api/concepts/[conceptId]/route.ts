import { NextResponse } from "next/server";
import { asApplicationError } from "@/domain/errors/application-error";
import { getCurrentSession } from "@/infrastructure/auth/local-auth-provider";
import { getConceptRepository } from "@/infrastructure/database/repositories/concept-repository";
import {
  canAuthorConcepts,
  requireConceptEditor,
  updateConcept,
} from "@/features/concepts/service";
import { archiveConceptSchema, conceptSchema } from "@/features/concepts/schemas";

export const dynamic = "force-dynamic";

function errorResponse(error: unknown): NextResponse {
  const applicationError = asApplicationError(error);
  return NextResponse.json(applicationError.toJSON(), { status: applicationError.status });
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ conceptId: string }> },
): Promise<NextResponse> {
  try {
    const session = await getCurrentSession();
    if (!session)
      return NextResponse.json(
        { code: "UNAUTHORIZED", message: "Authentication is required." },
        { status: 401 },
      );
    const { conceptId } = await params;
    const detail = await getConceptRepository().getConceptDetail(conceptId, {
      includeDraftLessons: canAuthorConcepts(session.principal),
    });
    if (!detail)
      return NextResponse.json(
        { code: "NOT_FOUND", message: "Concept not found." },
        { status: 404 },
      );
    if (detail.concept.isArchived && !canAuthorConcepts(session.principal)) {
      return NextResponse.json(
        { code: "NOT_FOUND", message: "Concept not found." },
        { status: 404 },
      );
    }
    return NextResponse.json({ detail }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ conceptId: string }> },
): Promise<NextResponse> {
  try {
    const session = await getCurrentSession();
    requireConceptEditor(session);
    const { conceptId } = await params;
    const body = await request.json();
    if (body && typeof body === "object" && "isArchived" in body) {
      const archived = archiveConceptSchema.safeParse({
        id: conceptId,
        isArchived: body.isArchived,
      });
      if (!archived.success) {
        return NextResponse.json(
          { code: "VALIDATION_ERROR", message: "Invalid archive state." },
          { status: 400 },
        );
      }
      await getConceptRepository().archiveConcept(conceptId, archived.data.isArchived);
      return NextResponse.json({ ok: true });
    }
    const parsed = conceptSchema.safeParse({ ...(body as object), id: conceptId });
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
    const concept = await updateConcept(conceptId, parsed.data, getConceptRepository());
    return NextResponse.json({ concept });
  } catch (error) {
    return errorResponse(error);
  }
}
