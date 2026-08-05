import { describe, expect, it } from "vitest";
import { createSessionToken, readSessionToken } from "@/features/auth/session-token";

describe("local session tokens", () => {
  it("round-trips and rejects tampered or expired tokens", () => {
    const issuedAt = 1_700_000_000_000;
    const token = createSessionToken("profile-1", "test-secret", issuedAt);
    expect(readSessionToken(token, "test-secret", issuedAt + 1_000)?.profileId).toBe("profile-1");
    expect(readSessionToken(`${token}x`, "test-secret", issuedAt)).toBeNull();
    expect(readSessionToken(token, "test-secret", issuedAt + 31 * 24 * 60 * 60 * 1000)).toBeNull();
  });
});
