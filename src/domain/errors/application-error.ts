export type ApplicationErrorCode =
  "VALIDATION_ERROR" | "NOT_FOUND" | "UNAUTHORIZED" | "FORBIDDEN" | "CONFLICT" | "INTERNAL_ERROR";

export interface ErrorIssue {
  path: string;
  message: string;
}

export interface SerializedApplicationError {
  code: ApplicationErrorCode;
  message: string;
  status: number;
  issues?: ErrorIssue[];
}

export class ApplicationError extends Error {
  public readonly code: ApplicationErrorCode;
  public readonly status: number;
  public readonly issues: readonly ErrorIssue[];

  constructor(
    code: ApplicationErrorCode,
    message: string,
    status: number,
    options: { issues?: readonly ErrorIssue[]; cause?: unknown } = {},
  ) {
    super(message, { cause: options.cause });
    this.name = "ApplicationError";
    this.code = code;
    this.status = status;
    this.issues = options.issues ?? [];
  }

  toJSON(): SerializedApplicationError {
    return {
      code: this.code,
      message: this.message,
      status: this.status,
      ...(this.issues.length > 0 ? { issues: [...this.issues] } : {}),
    };
  }
}

export class ValidationError extends ApplicationError {
  constructor(message: string, issues: readonly ErrorIssue[] = []) {
    super("VALIDATION_ERROR", message, 400, { issues });
    this.name = "ValidationError";
  }
}

export class NotFoundError extends ApplicationError {
  constructor(resource: string, identifier?: string) {
    super(
      "NOT_FOUND",
      identifier ? `${resource} '${identifier}' was not found.` : `${resource} was not found.`,
      404,
    );
    this.name = "NotFoundError";
  }
}

export class AuthorizationError extends ApplicationError {
  constructor(message = "You are not authorized to perform this action.") {
    super("FORBIDDEN", message, 403);
    this.name = "AuthorizationError";
  }
}

export class AuthenticationError extends ApplicationError {
  constructor(message = "Authentication is required.") {
    super("UNAUTHORIZED", message, 401);
    this.name = "AuthenticationError";
  }
}

export class ConflictError extends ApplicationError {
  constructor(message: string) {
    super("CONFLICT", message, 409);
    this.name = "ConflictError";
  }
}

export function isApplicationError(error: unknown): error is ApplicationError {
  return error instanceof ApplicationError;
}

export function asApplicationError(error: unknown): ApplicationError {
  if (isApplicationError(error)) return error;
  return new ApplicationError("INTERNAL_ERROR", "An unexpected error occurred.", 500, {
    cause: error,
  });
}
