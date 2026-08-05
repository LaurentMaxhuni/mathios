import { describe, expect, it } from "vitest";
import { parseEnv } from "@/lib/env";

describe("parseEnv", () => {
  it("provides safe local-first defaults", () => {
    const config = parseEnv({});

    expect(config.APP_ENV).toBe("development");
    expect(config.DATABASE_PROVIDER).toBe("sqlite");
    expect(config.STORAGE_PROVIDER).toBe("local");
    expect(config.AI_PROVIDER).toBe("disabled");
  });

  it("rejects invalid provider configuration", () => {
    expect(() => parseEnv({ DATABASE_PROVIDER: "mysql" })).toThrow(/DATABASE_PROVIDER/);
  });
});
