import { NextResponse } from "next/server";
import { asApplicationError } from "@/domain/errors/application-error";
import { requireSession } from "@/features/auth/authorization";
import { getCurrentSession } from "@/infrastructure/auth/local-auth-provider";

export async function requireClassroomSession() {
  return requireSession(await getCurrentSession());
}

export function errorResponse(error: unknown): NextResponse {
  const applicationError = asApplicationError(error);
  return NextResponse.json(applicationError.toJSON(), {
    status: applicationError.status,
    headers: { "Cache-Control": "no-store" },
  });
}
