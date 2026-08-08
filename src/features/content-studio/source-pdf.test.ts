import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import type { PortablePackage } from "@/domain/portability/types";
import { packageChecksumInput } from "@/domain/portability/rules";
import { packagePdf } from "@/features/portability/exporters";
import { extractPdfPages } from "@/features/content-studio/source-pdf";

describe("source PDF extraction", () => {
  it("extracts selectable text while preserving page numbers", async () => {
    const pkg: PortablePackage = {
      manifest: {
        magic: "mathios-portable",
        formatVersion: 1,
        phase: 15,
        kind: "content",
        createdAt: "2026-08-08T00:00:00.000Z",
        databaseProvider: "sqlite",
        tableCount: 1,
        rowCount: 1,
        fileCount: 0,
        includedTables: ["lessons"],
        checksum: "",
      },
      tables: [
        {
          name: "lessons",
          columns: ["title", "summary"],
          primaryKey: ["title"],
          rows: [
            {
              title: "Balanced forces",
              summary:
                "When equal forces act in opposite directions, the net force is zero and motion does not change. This source sentence is deliberately long enough for extraction validation.",
            },
          ],
        },
      ],
      files: [],
    };
    pkg.manifest.checksum = createHash("sha256")
      .update(packageChecksumInput({ tables: pkg.tables, files: pkg.files }))
      .digest("hex");

    const pages = await extractPdfPages(packagePdf(pkg));
    expect(pages[0]?.pageNumber).toBe(1);
    expect(pages.map((page) => page.text).join(" ")).toContain("Balanced forces");
  });
});
