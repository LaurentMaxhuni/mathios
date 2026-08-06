import { describe, expect, it } from "vitest";
import { isAllowedSameOrigin } from "@/server/security";

describe("request security", () => {
  it("rejects cross-site origins and allows same-origin requests", () => {
    const base = { nextUrl: { origin: "https://mathios.example" } };
    expect(
      isAllowedSameOrigin({ ...base, headers: new Headers({ origin: "https://mathios.example" }) }),
    ).toBe(true);
    expect(
      isAllowedSameOrigin({ ...base, headers: new Headers({ origin: "https://evil.example" }) }),
    ).toBe(false);
    expect(
      isAllowedSameOrigin({ ...base, headers: new Headers({ "sec-fetch-site": "cross-site" }) }),
    ).toBe(false);
  });
});
