import { NextResponse } from "next/server";
import { asApplicationError } from "@/domain/errors/application-error";
import { getCurrentSession } from "@/infrastructure/auth/local-auth-provider";
import { getConceptRepository } from "@/infrastructure/database/repositories/concept-repository";
import { requireConceptEditor, saveConceptRelationship } from "@/features/concepts/service";
import { conceptRelationshipSchema } from "@/features/concepts/schemas";

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
    const relationships = await getConceptRepository().listRelationships({ conceptId });
    return NextResponse.json({ relationships }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ conceptId: string }> },
): Promise<NextResponse> {
  try {
    requireConceptEditor(await getCurrentSession());
    const { conceptId } = await params;
    const parsed = conceptRelationshipSchema.safeParse({
      ...(await request.json()),
      sourceConceptId: conceptId,
    });
    if (!parsed.success) {
      return NextResponse.json(
        {
          code: "VALIDATION_ERROR",
          message: "Please review the relationship fields.",
          issues: parsed.error.issues,
        },
        { status: 400 },
      );
    }
    const relationship = await saveConceptRelationship(parsed.data, getConceptRepository());
    return NextResponse.json({ relationship }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
