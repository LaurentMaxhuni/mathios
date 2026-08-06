import { NextResponse } from "next/server";
import { asApplicationError } from "@/domain/errors/application-error";
import { getCurrentSession } from "@/infrastructure/auth/local-auth-provider";
import { requireSession } from "@/features/auth/authorization";

export async function requireNotesProfile(): Promise<string> {
  return requireSession(await getCurrentSession()).profileId;
}

export function errorResponse(error: unknown): NextResponse {
  const applicationError = asApplicationError(error);
  return NextResponse.json(applicationError.toJSON(), { status: applicationError.status });
}

export function invalidResponse(message: string, issues?: unknown): NextResponse {
  return NextResponse.json({ message, ...(issues ? { issues } : {}) }, { status: 400 });
}

export async function readJson(request: Request): Promise<Record<string, unknown>> {
  const body = await request.json().catch(() => ({}));
  return body && typeof body === "object" && !Array.isArray(body)
    ? (body as Record<string, unknown>)
    : {};
}
