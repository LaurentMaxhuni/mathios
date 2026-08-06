import { describe, expect, it } from "vitest";
import { normalizeStorageKey, validateUpload } from "@/domain/storage/rules";

describe("storage rules", () => {
  it("normalizes safe keys and rejects traversal", () => {
    expect(normalizeStorageKey("backups\\daily.zip")).toBe("backups/daily.zip");
    expect(() => normalizeStorageKey("../outside.zip")).toThrow(/safe/);
    expect(() => normalizeStorageKey("/absolute.zip")).toThrow(/safe/);
  });

  it("enforces limits and lightweight content signatures", () => {
    expect(
      validateUpload({
        key: "backups/daily.zip",
        body: new Uint8Array([0x50, 0x4b, 0x03, 0x04]),
        contentType: "application/zip",
        maxBytes: 4,
      }).size,
    ).toBe(4);
    expect(() =>
      validateUpload({
        key: "backups/daily.zip",
        body: new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0x01]),
        contentType: "application/zip",
        maxBytes: 4,
      }),
    ).toThrow(/limit/);
    expect(() =>
      validateUpload({
        key: "backups/daily.zip",
        body: "not a zip",
        contentType: "application/zip",
      }),
    ).toThrow(/signature/);
  });
});
