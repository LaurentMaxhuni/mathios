import { describe, expect, it } from "vitest";
import { AuthorizationError } from "@/domain/errors/application-error";
import { hasPermission, requirePermission } from "@/features/auth/authorization";

const session = {
  principal: {
    subjectId: "user-1",
    userId: "user-1",
    profileId: "profile-1",
    displayName: "Ada",
    roles: ["learner"] as const,
    permissions: ["view_learning_content"] as const,
  },
};

describe("role-based authorization", () => {
  it("checks the persisted permission set", () => {
    expect(hasPermission(session.principal, "view_learning_content")).toBe(true);
    expect(hasPermission(session.principal, "manage_users")).toBe(false);
    expect(() => requirePermission(session, "manage_users")).toThrow(AuthorizationError);
  });
});
