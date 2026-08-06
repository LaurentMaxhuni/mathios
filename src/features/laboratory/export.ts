import type {
  LaboratorySessionDetail,
  LaboratoryReportRecord,
  ReportChart,
} from "@/domain/laboratory/types";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapePdf(value: string): string {
  return value.replaceAll("\\", "\\\\").replaceAll("(", "\\(").replaceAll(")", "\\)");
}

function paragraphHtml(value: string): string {
  return value
    .split(/\r?\n\r?\n/)
    .map((paragraph) => `<p>${escapeHtml(paragraph).replaceAll("\n", "<br>")}</p>`)
    .join("");
}

function chartSvg(detail: LaboratorySessionDetail, chart: ReportChart): string {
  const points =
    detail.activity.variables.find((variable) => variable.id === chart.xVariableId) &&
    detail.activity.variables.find((variable) => variable.id === chart.yVariableId)
      ? detail.analysis.graph.points
      : [];
  if (!points.length)
    return `<p class="empty-chart">No paired measurements are available for this chart.</p>`;
  const maxX = Math.max(...points.map((point) => point.x), 1);
  const minX = Math.min(...points.map((point) => point.x), 0);
  const minY = Math.min(...points.map((point) => point.y), 0);
  const maxY = Math.max(...points.map((point) => point.y), 1);
  const x = (value: number) => 32 + ((value - minX) / Math.max(maxX - minX, 0.0001)) * 340;
  const y = (value: number) => 218 - ((value - minY) / Math.max(maxY - minY, 0.0001)) * 190;
  const polyline = points.map((point) => `${x(point.x)},${y(point.y)}`).join(" ");
  const regression = detail.analysis.graph.regression;
  const trendline =
    chart.showTrendline && regression
      ? `<line x1="${x(minX)}" y1="${y(regression.slope * minX + regression.intercept)}" x2="${x(maxX)}" y2="${y(regression.slope * maxX + regression.intercept)}" stroke="#f59e0b" stroke-width="2" stroke-dasharray="5 4"/>`
      : "";
  return `<svg viewBox="0 0 400 250" role="img" aria-label="${escapeHtml(chart.title)}"><line x1="32" y1="218" x2="372" y2="218" stroke="#94a3b8"/><line x1="32" y1="28" x2="32" y2="218" stroke="#94a3b8"/><polyline points="${polyline}" fill="none" stroke="#0f766e" stroke-width="2"/>${trendline}${points.map((point) => `<circle cx="${x(point.x)}" cy="${y(point.y)}" r="3" fill="#0f766e"/>`).join("")}</svg>`;
}

function reportTableHtml(table: LaboratoryReportRecord["tables"][number]): string {
  const headers = table.headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("");
  const rows = table.rows
    .map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`)
    .join("");
  return `<table><caption>${escapeHtml(table.title)}</caption><thead><tr>${headers}</tr></thead><tbody>${rows || `<tr><td colspan="${Math.max(table.headers.length, 1)}">No rows recorded.</td></tr>`}</tbody></table>`;
}

export function renderLaboratoryReportHtml(
  detail: LaboratorySessionDetail,
  report: LaboratoryReportRecord,
): string {
  const sections = report.sections
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map(
      (section) =>
        `<section><h2>${escapeHtml(section.title)}</h2>${paragraphHtml(section.body)}</section>`,
    )
    .join("");
  const measurements = [...detail.measurements]
    .sort((a, b) => a.rowIndex - b.rowIndex || a.variableId.localeCompare(b.variableId))
    .map((measurement) => {
      const variable = detail.activity.variables.find((item) => item.id === measurement.variableId);
      return `<tr><td>${measurement.rowIndex + 1}</td><td>${escapeHtml(variable?.label ?? measurement.variableId)}</td><td>${escapeHtml(measurement.numericValue === null ? (measurement.textValue ?? "") : String(measurement.numericValue))}</td><td>${escapeHtml(measurement.unit ?? variable?.unit ?? "")}</td><td>${measurement.uncertainty === null ? "" : `± ${measurement.uncertainty}`}</td></tr>`;
    })
    .join("");
  const charts = report.charts
    .map(
      (chart) =>
        `<figure><figcaption>${escapeHtml(chart.title)}</figcaption>${chartSvg(detail, chart)}</figure>`,
    )
    .join("");
  const feedback = report.feedback.length
    ? `<section><h2>Teacher feedback</h2>${report.feedback.map((item) => `<blockquote><strong>${escapeHtml(item.authorName)}</strong><p>${escapeHtml(item.body).replaceAll("\n", "<br>")}</p></blockquote>`).join("")}</section>`
    : "";
  const formulaList =
    report.formulas.length || report.tables.length
      ? `<section><h2>Formulas and tables</h2>${report.formulas.map((formula) => `<p><code>${escapeHtml(formula)}</code></p>`).join("")}${report.tables.map((table) => reportTableHtml(table)).join("")}</section>`
      : "";
  const imageList = report.images.length
    ? `<section><h2>Images</h2>${report.images.map((image) => `<figure><img src="${escapeHtml(image.src)}" alt="${escapeHtml(image.alt)}"><figcaption>${escapeHtml(image.caption)}</figcaption></figure>`).join("")}</section>`
    : "";
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${escapeHtml(report.title)}</title><style>body{font-family:system-ui,sans-serif;max-width:860px;margin:40px auto;padding:0 24px;color:#172033;line-height:1.55}h1{font-size:32px;margin-bottom:4px}h2{margin-top:32px;border-bottom:1px solid #d8dee9;padding-bottom:6px}table{border-collapse:collapse;width:100%;margin:16px 0}th,td{border:1px solid #cbd5e1;padding:7px;text-align:left}th{background:#f1f5f9}svg{width:100%;max-width:520px;border:1px solid #cbd5e1;background:#f8fafc}figure{margin:20px 0}figcaption{font-weight:600;margin-bottom:8px}blockquote{border-left:4px solid #0f766e;margin:16px 0;padding:4px 16px;background:#f0fdfa}.empty-chart{color:#64748b}code{background:#f1f5f9;padding:3px 6px;border-radius:4px}</style></head><body><header><p>${escapeHtml(detail.activity.activity.subjectName)} · ${escapeHtml(detail.activity.activity.mode)}</p><h1>${escapeHtml(report.title)}</h1><p>${escapeHtml(report.abstract)}</p></header>${sections}<section><h2>Measurements</h2><table><thead><tr><th>Row</th><th>Variable</th><th>Value</th><th>Unit</th><th>Uncertainty</th></tr></thead><tbody>${measurements || '<tr><td colspan="5">No measurements recorded.</td></tr>'}</tbody></table></section>${charts ? `<section><h2>Charts</h2>${charts}</section>` : ""}${formulaList}${imageList}<section><h2>Conclusion</h2>${paragraphHtml(report.conclusion)}</section>${feedback}<footer><p>Generated by Mathios laboratory workspace.</p></footer></body></html>`;
}

function reportLines(detail: LaboratorySessionDetail, report: LaboratoryReportRecord): string[] {
  const lines = [
    report.title,
    `${detail.activity.activity.subjectName} · ${detail.activity.activity.mode}`,
    "",
    report.abstract,
    ...report.sections.flatMap((section) => ["", section.title, ...section.body.split(/\r?\n/)]),
    "",
    "Measurements",
    "Row | Variable | Value | Unit | Uncertainty",
    ...detail.measurements.map((measurement) => {
      const variable = detail.activity.variables.find((item) => item.id === measurement.variableId);
      return `${measurement.rowIndex + 1} | ${variable?.label ?? measurement.variableId} | ${measurement.numericValue === null ? (measurement.textValue ?? "") : measurement.numericValue} | ${measurement.unit ?? variable?.unit ?? ""} | ${measurement.uncertainty ?? ""}`;
    }),
    "",
    "Conclusion",
    ...report.conclusion.split(/\r?\n/),
  ];
  if (report.formulas.length) lines.push("", "Formulas", ...report.formulas);
  for (const table of report.tables) {
    lines.push(
      "",
      table.title,
      table.headers.join(" | "),
      ...table.rows.map((row) => row.join(" | ")),
    );
  }
  for (const chart of report.charts) {
    lines.push(
      "",
      chart.title,
      ...detail.analysis.graph.points.map((point) => `(${point.x}, ${point.y})`),
    );
  }
  for (const image of report.images)
    lines.push("", `Image: ${image.caption || image.alt}`, image.src);
  for (const feedback of report.feedback)
    lines.push("", `Feedback from ${feedback.authorName}`, ...feedback.body.split(/\r?\n/));
  return lines.flatMap((line) => line.match(/.{1,104}/g) ?? [""]);
}

export function renderLaboratoryReportPdf(
  detail: LaboratorySessionDetail,
  report: LaboratoryReportRecord,
): Uint8Array {
  const lines = reportLines(detail, report);
  const pages: string[][] = [];
  for (let index = 0; index < lines.length; index += 46) pages.push(lines.slice(index, index + 46));
  if (!pages.length) pages.push([report.title]);
  const objects: string[] = [];
  const pageIds: number[] = [];
  const contentIds: number[] = [];
  const fontId = 3;
  objects.push("<< /Type /Catalog /Pages 2 0 R >>");
  objects.push(
    `<< /Type /Pages /Kids [${pages.map((_, index) => `${4 + index * 2} 0 R`).join(" ")}] /Count ${pages.length} >>`,
  );
  objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  for (const [index, page] of pages.entries()) {
    const pageId = 4 + index * 2;
    const contentId = pageId + 1;
    pageIds.push(pageId);
    contentIds.push(contentId);
    const stream = [
      `BT`,
      "/F1 10 Tf",
      "48 750 Td",
      ...page.map(
        (line, lineIndex) =>
          `(${escapePdf(line)}) Tj${lineIndex === page.length - 1 ? "" : " 0 -15 Td"}`,
      ),
      "ET",
    ].join("\n");
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 ${fontId} 0 R >> >> /Contents ${contentId} 0 R >>`,
    );
    objects.push(
      `<< /Length ${Buffer.byteLength(stream, "utf8")} >>\nstream\n${stream}\nendstream`,
    );
  }
  void pageIds;
  void contentIds;
  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [0];
  for (const [index, object] of objects.entries()) {
    offsets.push(Buffer.byteLength(pdf, "utf8"));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  }
  const xrefOffset = Buffer.byteLength(pdf, "utf8");
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let index = 1; index <= objects.length; index += 1)
    pdf += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return new TextEncoder().encode(pdf);
}
