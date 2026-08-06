import { describe, expect, it } from "vitest";
import { createZip, readZip } from "@/features/portability/archive";

describe("portability ZIP archive", () => {
  it("round-trips text and binary entries", () => {
    const archive = createZip([
      { path: "data.json", body: new TextEncoder().encode('{"ok":true}') },
      { path: "assets/picture.bin", body: Uint8Array.from([0, 1, 2, 255]) },
    ]);
    expect(readZip(archive)).toEqual([
      { path: "data.json", body: new TextEncoder().encode('{"ok":true}') },
      { path: "assets/picture.bin", body: Uint8Array.from([0, 1, 2, 255]) },
    ]);
  });

  it("rejects unsafe archive paths", () => {
    expect(() => createZip([{ path: "../escape.txt", body: new Uint8Array() }])).toThrow(/safe/);
  });
});
