import { asApplicationError, type ErrorIssue } from "@/domain/errors/application-error";
import { logger } from "@/lib/logger";
import { z } from "zod";

export interface ActionState {
  ok: boolean;
  message?: string;
  issues?: readonly ErrorIssue[];
}

export const initialActionState: ActionState = { ok: false };

export function actionStateFromZod(error: z.ZodError): ActionState {
  return {
    ok: false,
    message: "Please review the highlighted fields.",
    issues: error.issues.map((issue) => ({
      path: issue.path.join(".") || "form",
      message: issue.message,
    })),
  };
}

export function actionStateFromError(error: unknown): ActionState {
  const applicationError = asApplicationError(error);
  if (applicationError.code === "INTERNAL_ERROR") {
    logger.error("Server action failed", { code: applicationError.code });
  }
  return {
    ok: false,
    message: applicationError.message,
    issues: applicationError.issues,
  };
}

export function issueFor(state: ActionState, path: string): string | undefined {
  return state.issues?.find((issue) => issue.path === path)?.message;
}
