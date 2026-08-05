import { describe, expect, it } from "vitest";
import { hashSecret, verifySecret } from "@/features/auth/secret";

describe("local secret hashing", () => {
  it("verifies the correct secret without storing it in plain text", () => {
    const hash = hashSecret("correct horse");
    expect(hash).toMatch(/^scrypt\$/);
    expect(hash).not.toContain("correct horse");
    expect(verifySecret("correct horse", hash)).toBe(true);
    expect(verifySecret("wrong horse", hash)).toBe(false);
  });
});
