import { NextResponse } from "next/server";
import { asApplicationError, AuthorizationError } from "@/domain/errors/application-error";
import type { BackupType } from "@/domain/portability/types";
import { hasPermission, requireSession } from "@/features/auth/authorization";
import { getCurrentSession } from "@/infrastructure/auth/local-auth-provider";

export async function requirePortabilitySession() {
  return requireSession(await getCurrentSession());
}

export function requireBackupPermission(
  principal: Awaited<ReturnType<typeof requirePortabilitySession>>,
  kind?: BackupType,
): void {
  if (kind === "user-data" || kind === "settings") {
    if (principal.permissions.includes("run_backups")) return;
    return;
  }
  if (!hasPermission(principal, "run_backups")) {
    throw new AuthorizationError("Backup permission is required for installation content.");
  }
}

export function errorResponse(error: unknown): NextResponse {
  const applicationError = asApplicationError(error);
  return NextResponse.json(applicationError.toJSON(), { status: applicationError.status });
}
