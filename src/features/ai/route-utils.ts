import { NextResponse } from "next/server";
import { asApplicationError, AuthorizationError } from "@/domain/errors/application-error";
import { hasPermission, requireSession } from "@/features/auth/authorization";
import { getCurrentSession } from "@/infrastructure/auth/local-auth-provider";

export async function requireAiSession() {
  return requireSession(await getCurrentSession());
}

export function requireAiSettingsPermission(
  principal: Awaited<ReturnType<typeof requireAiSession>>,
): void {
  if (!hasPermission(principal, "manage_application_settings")) {
    throw new AuthorizationError("Application-settings permission is required to configure AI.");
  }
}

export function requireAiReviewPermission(
  principal: Awaited<ReturnType<typeof requireAiSession>>,
): void {
  if (!hasPermission(principal, "edit_content")) {
    throw new AuthorizationError(
      "Content-edit permission is required to review generated content.",
    );
  }
}

export function aiErrorResponse(error: unknown): NextResponse {
  const applicationError = asApplicationError(error);
  return NextResponse.json(applicationError.toJSON(), {
    status: applicationError.status,
    headers: { "Cache-Control": "no-store" },
  });
}
