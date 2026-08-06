import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { readZip } from "@/features/portability/archive";
import {
  packageCsv,
  packageHtml,
  packageJson,
  packageMarkdown,
  packagePdf,
  packageZip,
} from "@/features/portability/exporters";
import { packageChecksumInput } from "@/domain/portability/rules";
import type { PortablePackage } from "@/domain/portability/types";

const fixture: PortablePackage = {
  manifest: {
    magic: "mathios-portable",
    formatVersion: 1,
    phase: 15,
    kind: "content",
    createdAt: "2026-08-06T00:00:00.000Z",
    databaseProvider: "sqlite",
    tableCount: 1,
    rowCount: 1,
    fileCount: 1,
    includedTables: ["curricula"],
    checksum: "",
  },
  tables: [
    {
      name: "curricula",
      columns: ["id", "name"],
      primaryKey: ["id"],
      rows: [{ id: "c-1", name: "Science" }],
    },
  ],
  files: [
    {
      path: "assets/example.txt",
      contentType: "text/plain",
      size: 5,
      checksum: createHash("sha256").update("hello").digest("hex"),
      bodyBase64: Buffer.from("hello").toString("base64"),
    },
  ],
};
fixture.manifest.checksum = createHash("sha256")
  .update(packageChecksumInput({ tables: fixture.tables, files: fixture.files }))
  .digest("hex");

describe("portability exporters", () => {
  it("renders all requested human and machine formats", () => {
    expect(new TextDecoder().decode(packageJson(fixture))).toContain("mathios-portable");
    expect(packageMarkdown(fixture)).toContain("## curricula");
    expect(packageCsv(fixture)).toContain("curricula,0,id");
    expect(packageHtml(fixture)).toContain("Science");
    expect(new TextDecoder().decode(packagePdf(fixture))).toContain("%PDF-1.4");
    expect(readZip(packageZip(fixture)).map((file) => file.path)).toEqual(
      expect.arrayContaining(["data.json", "export.html", "assets/example.txt"]),
    );
  });
});
