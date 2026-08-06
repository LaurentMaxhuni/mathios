import { afterEach, describe, expect, it } from "vitest";
import { consumeRateLimit, resetRateLimitBuckets } from "@/server/rate-limit";

describe("rate limiter", () => {
  afterEach(() => resetRateLimitBuckets());

  it("allows the configured number of requests and returns retry metadata", () => {
    expect(consumeRateLimit("test", { limit: 2, windowSeconds: 60 }, 1000).allowed).toBe(true);
    expect(consumeRateLimit("test", { limit: 2, windowSeconds: 60 }, 1001).allowed).toBe(true);
    const blocked = consumeRateLimit("test", { limit: 2, windowSeconds: 60 }, 1002);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBe(60);
    expect(consumeRateLimit("test", { limit: 2, windowSeconds: 60 }, 61_001).allowed).toBe(true);
  });
});
