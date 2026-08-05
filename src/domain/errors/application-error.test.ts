import { describe, expect, it } from "vitest";
import {
  ApplicationError,
  ValidationError,
  asApplicationError,
} from "@/domain/errors/application-error";

describe("application errors", () => {
  it("serializes safe validation details", () => {
    const error = new ValidationError("Input is invalid.", [{ path: "name", message: "Required" }]);

    expect(error.toJSON()).toEqual({
      code: "VALIDATION_ERROR",
      message: "Input is invalid.",
      status: 400,
      issues: [{ path: "name", message: "Required" }],
    });
  });

  it("normalizes unknown errors without exposing internals", () => {
    const error = asApplicationError(new Error("private implementation detail"));

    expect(error).toBeInstanceOf(ApplicationError);
    expect(error.code).toBe("INTERNAL_ERROR");
    expect(error.message).toBe("An unexpected error occurred.");
  });
});
