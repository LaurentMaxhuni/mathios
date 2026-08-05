import { describe, expect, it } from "vitest";
import { AnonymousAuthProvider } from "@/infrastructure/auth/anonymous-auth-provider";

describe("AnonymousAuthProvider", () => {
  it("keeps the foundation usable without an identity", async () => {
    const provider = new AnonymousAuthProvider();

    await expect(provider.getSession()).resolves.toBeNull();
    await expect(provider.signOut()).resolves.toBeUndefined();
  });

  it("fails closed when sign-in is requested before Phase 1", async () => {
    const provider = new AnonymousAuthProvider();

    await expect(provider.signIn({ identifier: "local" })).rejects.toMatchObject({
      code: "UNAUTHORIZED",
      status: 401,
    });
  });
});
