import { describe, expect, it } from "vitest";
import type { LaboratoryReportRecord, LaboratorySessionDetail } from "@/domain/laboratory/types";
import {
  renderLaboratoryReportHtml,
  renderLaboratoryReportPdf,
} from "@/features/laboratory/export";

const detail = {
  activity: {
    activity: { subjectName: "Physics", mode: "real-world" },
    variables: [
      { id: "time", label: "Time" },
      { id: "distance", label: "Distance" },
    ],
  },
  measurements: [
    {
      rowIndex: 0,
      variableId: "time",
      numericValue: 1,
      textValue: null,
      unit: "s",
      uncertainty: null,
    },
  ],
  analysis: {
    graph: { points: [{ x: 1, y: 2 }] },
  },
} as unknown as LaboratorySessionDetail;

const report = {
  title: "Motion report",
  abstract: "A report abstract.",
  sections: [],
  tables: [
    {
      id: "table-1",
      title: "Custom data table",
      headers: ["Quantity", "Value"],
      rows: [["Distance", "2 m"]],
    },
  ],
  charts: [
    {
      id: "chart-1",
      title: "Motion chart",
      xVariableId: "time",
      yVariableId: "distance",
      showTrendline: true,
    },
  ],
  formulas: ["x = vt"],
  images: [{ id: "image-1", src: "data:image/png;base64,abc", alt: "Plot", caption: "Plot image" }],
  conclusion: "The model is supported.",
  feedback: [],
} as unknown as LaboratoryReportRecord;

describe("laboratory report exports", () => {
  it("renders custom tables, charts, formulas, and images in HTML and PDF output", () => {
    const html = renderLaboratoryReportHtml(detail, report);
    expect(html).toContain("Custom data table");
    expect(html).toContain("Distance");
    expect(html).toContain("Motion chart");
    expect(html).toContain("data:image/png;base64,abc");

    const pdf = new TextDecoder().decode(renderLaboratoryReportPdf(detail, report));
    expect(pdf).toContain("Custom data table");
    expect(pdf).toContain("Image: Plot image");
  });
});
