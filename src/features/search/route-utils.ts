import { NextResponse } from "next/server";
import { asApplicationError } from "@/domain/errors/application-error";
import { getCurrentSession } from "@/infrastructure/auth/local-auth-provider";
import { requireSession } from "@/features/auth/authorization";
import type { AuthenticatedPrincipal } from "@/infrastructure/auth/auth-provider";

export async function requireSearchProfile(): Promise<{
  profileId: string;
  principal: AuthenticatedPrincipal;
}> {
  const session = requireSession(await getCurrentSession());
  return { profileId: session.profileId, principal: session };
}

export function searchErrorResponse(error: unknown): NextResponse {
  const applicationError = asApplicationError(error);
  return NextResponse.json(applicationError.toJSON(), { status: applicationError.status });
}
