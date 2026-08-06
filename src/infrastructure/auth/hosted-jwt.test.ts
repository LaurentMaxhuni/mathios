import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { verifyHostedJwt } from "@/infrastructure/auth/hosted-jwt";

describe("hosted JWT verification", () => {
  it("verifies an issuer- and audience-bound HS256 token", () => {
    const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");
    const header = encode({ alg: "HS256", typ: "JWT" });
    const payload = encode({
      sub: "hosted-user-1",
      iss: "https://issuer.example",
      aud: "mathios",
      exp: 1_700_000_100,
    });
    const content = `${header}.${payload}`;
    const signature = createHmac("sha256", "a".repeat(32)).update(content).digest("base64url");
    const claims = verifyHostedJwt(
      `${content}.${signature}`,
      {
        sharedSecret: "a".repeat(32),
        issuer: "https://issuer.example",
        audience: "mathios",
      },
      1_700_000_000_000,
    );
    expect(claims?.sub).toBe("hosted-user-1");
    expect(
      verifyHostedJwt(
        `${content}.${signature}`,
        { sharedSecret: "b".repeat(32) },
        1_700_000_000_000,
      ),
    ).toBeNull();
  });
});
