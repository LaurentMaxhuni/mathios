import { describe, expect, it } from "vitest";
import { decryptAiSecret, encryptAiSecret } from "@/infrastructure/ai/secret-vault";

describe("AI secret vault", () => {
  it("round-trips encrypted API keys without storing plaintext", () => {
    const encrypted = encryptAiSecret("remote-secret");
    expect(encrypted).not.toContain("remote-secret");
    expect(decryptAiSecret(encrypted)).toBe("remote-secret");
    expect(decryptAiSecret("invalid")).toBeNull();
  });
});
