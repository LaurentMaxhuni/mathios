import { describe, expect, it } from "vitest";
import { parseEnv } from "@/lib/env";

describe("parseEnv", () => {
  it("defaults to Neon Postgres and Neon Auth", () => {
    const config = parseEnv({});

    expect(config.APP_ENV).toBe("development");
    expect(config.DATABASE_PROVIDER).toBe("postgres");
    expect(config.AUTH_MODE).toBe("neon-auth");
    expect(config.STORAGE_PROVIDER).toBe("local");
    expect(config.AI_PROVIDER).toBe("disabled");
  });

  it("rejects invalid provider configuration", () => {
    expect(() => parseEnv({ DATABASE_PROVIDER: "mysql" })).toThrow(/DATABASE_PROVIDER/);
  });

  it("requires production-safe hosted settings and a protected metrics token", () => {
    expect(() => parseEnv({ METRICS_TOKEN: "too-short" })).toThrow(/METRICS_TOKEN/);
    expect(() =>
      parseEnv({
        APP_ENV: "hosted-production",
        NEXT_PUBLIC_APP_URL: "https://learn.example.com",
        SESSION_SECRET: "production-secret-that-is-long-enough-for-hosted-runtime",
        DATABASE_PROVIDER: "sqlite",
        STORAGE_PROVIDER: "local",
      }),
    ).toThrow(/DATABASE_PROVIDER/);

    const configuration = parseEnv({
      NODE_ENV: "production",
      APP_ENV: "hosted-production",
      NEXT_PUBLIC_APP_URL: "https://learn.example.com",
      SESSION_SECRET: "production-secret-that-is-long-enough-for-hosted-runtime",
      DATABASE_PROVIDER: "postgres",
      DATABASE_URL: "postgres://mathios:secret@example.com/mathios",
      STORAGE_PROVIDER: "s3",
      S3_BUCKET: "mathios-production",
      AUTH_MODE: "hosted",
      HOSTED_AUTH_PUBLIC_KEY: "public-key",
      METRICS_TOKEN: "metrics-token-that-is-long-enough",
    });

    expect(configuration.APP_ENV).toBe("hosted-production");
  });
});
