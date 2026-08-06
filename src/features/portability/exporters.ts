import { createZip } from "@/features/portability/archive";
import { packageChecksumInput, stableStringify } from "@/domain/portability/rules";
import type { PortablePackage } from "@/domain/portability/types";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function displayValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  return typeof value === "string" ? value : stableStringify(value);
}

function escapeCsv(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
}

function packageTitle(pkg: PortablePackage): string {
  return `Mathios ${pkg.manifest.kind} portability package`;
}

export function packageJson(pkg: PortablePackage): Uint8Array {
  return new TextEncoder().encode(`${JSON.stringify(pkg, null, 2)}\n`);
}

export function packageMarkdown(pkg: PortablePackage): string {
  const lines = [
    `# ${packageTitle(pkg)}`,
    "",
    `- Created: ${pkg.manifest.createdAt}`,
    `- Tables: ${pkg.manifest.tableCount}`,
    `- Rows: ${pkg.manifest.rowCount}`,
    `- Assets: ${pkg.manifest.fileCount}`,
    `- Checksum: \`${pkg.manifest.checksum}\``,
  ];
  for (const table of pkg.tables) {
    lines.push(
      "",
      `## ${table.name}`,
      "",
      `Primary key: ${table.primaryKey.join(", ") || "none"}`,
      "",
    );
    if (!table.rows.length) {
      lines.push("_No rows._");
      continue;
    }
    lines.push("```json", JSON.stringify(table.rows, null, 2), "```");
  }
  if (pkg.files.length) {
    lines.push(
      "",
      "## Included assets",
      "",
      ...pkg.files.map((file) => `- \`${file.path}\` (${file.contentType}, ${file.size} bytes)`),
    );
  }
  return `${lines.join("\n")}\n`;
}

export function packageCsv(pkg: PortablePackage): string {
  const lines = ["table,row,field,value"];
  for (const table of pkg.tables) {
    table.rows.forEach((row, rowIndex) => {
      for (const column of table.columns) {
        lines.push(
          [table.name, String(rowIndex), column, displayValue(row[column])]
            .map(escapeCsv)
            .join(","),
        );
      }
    });
  }
  return `${lines.join("\n")}\n`;
}

export function packageHtml(pkg: PortablePackage): string {
  const tables = pkg.tables
    .map((table) => {
      const headers = table.columns.map((column) => `<th>${escapeHtml(column)}</th>`).join("");
      const rows = table.rows
        .map(
          (row) =>
            `<tr>${table.columns.map((column) => `<td>${escapeHtml(displayValue(row[column]))}</td>`).join("")}</tr>`,
        )
        .join("");
      return `<section><h2>${escapeHtml(table.name)}</h2><table><thead><tr>${headers}</tr></thead><tbody>${rows || `<tr><td colspan="${Math.max(table.columns.length, 1)}">No rows.</td></tr>`}</tbody></table></section>`;
    })
    .join("");
  const assets = pkg.files.length
    ? `<section><h2>Included assets</h2><ul>${pkg.files.map((file) => `<li>${escapeHtml(file.path)} · ${escapeHtml(file.contentType)} · ${file.size} bytes</li>`).join("")}</ul></section>`
    : "";
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${escapeHtml(packageTitle(pkg))}</title><style>body{font-family:system-ui,sans-serif;max-width:1200px;margin:32px auto;padding:0 24px;color:#172033;line-height:1.45}h1{font-size:30px}h2{margin-top:32px;border-bottom:1px solid #d8dee9;padding-bottom:6px}table{border-collapse:collapse;width:100%;font-size:12px;margin:12px 0;table-layout:fixed;word-break:break-word}th,td{border:1px solid #cbd5e1;padding:6px;text-align:left;vertical-align:top}th{background:#f1f5f9}code{word-break:break-all}</style></head><body><h1>${escapeHtml(packageTitle(pkg))}</h1><p>Created ${escapeHtml(pkg.manifest.createdAt)} · ${pkg.manifest.rowCount} rows · ${pkg.manifest.fileCount} assets</p>${tables}${assets}<footer><p>Mathios portability checksum: <code>${escapeHtml(pkg.manifest.checksum)}</code></p></footer></body></html>`;
}

function escapePdf(value: string): string {
  return value.replaceAll("\\", "\\\\").replaceAll("(", "\\(").replaceAll(")", "\\)");
}

function pdfLines(pkg: PortablePackage): string[] {
  const lines = [packageTitle(pkg), `Created: ${pkg.manifest.createdAt}`, ""];
  for (const table of pkg.tables) {
    lines.push(`Table: ${table.name}`, `Rows: ${table.rows.length}`);
    for (const row of table.rows.slice(0, 200)) {
      lines.push(
        table.columns.map((column) => `${column}=${displayValue(row[column])}`).join(" | "),
      );
    }
    lines.push("");
  }
  lines.push(`Checksum: ${pkg.manifest.checksum}`);
  return lines.flatMap((line) => line.match(/.{1,104}/g) ?? [""]);
}

export function packagePdf(pkg: PortablePackage): Uint8Array {
  const lines = pdfLines(pkg);
  const pages: string[][] = [];
  for (let index = 0; index < lines.length; index += 46) pages.push(lines.slice(index, index + 46));
  if (!pages.length) pages.push([packageTitle(pkg)]);
  const objects: string[] = ["<< /Type /Catalog /Pages 2 0 R >>"];
  objects.push(
    `<< /Type /Pages /Kids [${pages.map((_, index) => `${4 + index * 2} 0 R`).join(" ")}] /Count ${pages.length} >>`,
  );
  objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  for (const [index, page] of pages.entries()) {
    const pageId = 4 + index * 2;
    const contentId = pageId + 1;
    const stream = [
      "BT",
      "/F1 9 Tf",
      "48 750 Td",
      ...page.map(
        (line, lineIndex) =>
          `(${escapePdf(line)}) Tj${lineIndex === page.length - 1 ? "" : " 0 -15 Td"}`,
      ),
      "ET",
    ].join("\n");
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentId} 0 R >>`,
    );
    objects.push(
      `<< /Length ${new TextEncoder().encode(stream).byteLength} >>\nstream\n${stream}\nendstream`,
    );
  }
  let output = "%PDF-1.4\n";
  const offsets: number[] = [0];
  for (const [index, object] of objects.entries()) {
    offsets.push(new TextEncoder().encode(output).byteLength);
    output += `${index + 1} 0 obj\n${object}\nendobj\n`;
  }
  const xrefOffset = new TextEncoder().encode(output).byteLength;
  output += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let index = 1; index <= objects.length; index += 1)
    output += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
  output += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return new TextEncoder().encode(output);
}

export function packageZip(pkg: PortablePackage): Uint8Array {
  const encoder = new TextEncoder();
  const files = [
    { path: "manifest.json", body: encoder.encode(`${JSON.stringify(pkg.manifest, null, 2)}\n`) },
    { path: "data.json", body: packageJson(pkg) },
    { path: "export.md", body: encoder.encode(packageMarkdown(pkg)) },
    { path: "export.csv", body: encoder.encode(packageCsv(pkg)) },
    { path: "export.html", body: encoder.encode(packageHtml(pkg)) },
    { path: "export.pdf", body: packagePdf(pkg) },
    ...pkg.tables.map((table) => ({
      path: `tables/${table.name}.csv`,
      body: encoder.encode(packageCsv({ ...pkg, tables: [table] })),
    })),
    ...pkg.files.map((file) => ({
      path: file.path,
      body: Uint8Array.from(atob(file.bodyBase64), (character) => character.charCodeAt(0)),
    })),
  ];
  return createZip(files);
}

export function packageChecksum(pkg: PortablePackage): string {
  return packageChecksumInput(pkg);
}
