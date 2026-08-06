import Database from "better-sqlite3";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { DatabaseHandle } from "@/infrastructure/database/client";
import { runSeed } from "@/infrastructure/database/seed";
import { getLaboratoryRepository } from "@/infrastructure/database/repositories/laboratory-repository";
import {
  completeLaboratorySession,
  importSimulationLaboratoryData,
  saveLaboratoryMeasurement,
  saveLaboratoryObservation,
  saveLaboratoryReport,
  startLaboratorySession,
} from "@/features/laboratory/service";

describe("laboratory repository and service", () => {
  it("loads seeded activities, imports trusted simulation data, and persists a report", async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), "mathios-laboratory-"));
    const databaseUrl = `file:${path.join(directory, "laboratory.db")}`;
    let raw: Database.Database | undefined;
    try {
      await runSeed({ provider: "sqlite", databaseUrl });
      raw = new Database(path.join(directory, "laboratory.db"));
      raw.pragma("foreign_keys = ON");
      raw.prepare("INSERT INTO users (id, identifier) VALUES (?, ?)").run("user-lab", "lab-user");
      raw
        .prepare("INSERT INTO profiles (id, user_id, display_name) VALUES (?, ?, ?)")
        .run("profile-lab", "user-lab", "Lab learner");
      const repository = getLaboratoryRepository({
        provider: "sqlite",
        raw,
        db: undefined as never,
      } as unknown as DatabaseHandle);
      expect(await repository.listActivities()).toHaveLength(7);
      const activity = await repository.getActivity("determine-acceleration-from-motion-data");
      expect(activity?.activity.mode).toBe("hybrid");
      expect(activity?.variables).toHaveLength(4);
      const created = await repository.createActivity({
        id: "laboratory-test-activity",
        slug: "laboratory-test-activity",
        title: "Test activity",
        description: "Draft",
        subjectId: "subject-physics",
        mode: "real-world",
        status: "draft",
        objective: "Test",
        theory: "Test theory",
        materials: ["Ruler"],
        safetyNotes: ["Be careful"],
        analysisPrompt: "Analyze",
        graphingInstructions: "Graph",
        questions: ["Why?"],
        conclusionPrompt: "Conclude",
        extensionActivity: "Extend",
        simulationId: null,
        estimatedDurationMinutes: 10,
        createdByProfileId: "profile-lab",
        steps: [
          {
            id: "laboratory-test-step",
            type: "procedure",
            title: "Step",
            instructions: "Do it",
            expectedObservation: "",
            sortOrder: 0,
            isRequired: true,
          },
        ],
        variables: [
          {
            id: "laboratory-test-variable",
            key: "x",
            label: "X",
            symbol: "x",
            role: "measured",
            dataType: "number",
            unit: "m",
            description: "",
            defaultValue: null,
            minValue: null,
            maxValue: null,
            uncertainty: null,
            significantFigures: 3,
            theoreticalValue: null,
            configuration: {},
            sortOrder: 0,
          },
        ],
      });
      expect(created.steps).toHaveLength(1);
      expect(
        (
          await repository.updateActivity("laboratory-test-activity", {
            ...created.activity,
            steps: [{ ...created.steps[0], instructions: "Updated" }],
            variables: created.variables,
          })
        ).steps[0].instructions,
      ).toBe("Updated");

      const session = await startLaboratorySession(
        "profile-lab",
        activity!.activity.id,
        { mode: "hybrid" },
        repository,
      );
      expect(await repository.getSession("other-profile", session.id)).toBeNull();
      await saveLaboratoryObservation(
        "profile-lab",
        session.id,
        {
          stepId: activity!.steps[0].id,
          prompt: "Prepare",
          notes: "The track was level.",
          sortOrder: 0,
          metadata: {},
        },
        repository,
      );
      const timeVariable = activity!.variables.find((variable) => variable.key === "time")!;
      await saveLaboratoryMeasurement(
        "profile-lab",
        session.id,
        {
          variableId: timeVariable.id,
          observationId: null,
          rowIndex: 0,
          value: 1,
          unit: "s",
          uncertainty: 0.01,
          significantFigures: 3,
          source: "manual",
          notes: "",
        },
        repository,
      );
      const imported = await importSimulationLaboratoryData("profile-lab", session.id, repository);
      expect(imported.measurements.some((measurement) => measurement.source === "simulation")).toBe(
        true,
      );
      expect(imported.analysis.graph.points.length).toBeGreaterThan(0);
      await completeLaboratorySession("profile-lab", session.id, repository);
      const report = await saveLaboratoryReport(
        "profile-lab",
        session.id,
        {
          status: "draft",
          title: "Motion report",
          abstract: "A short report.",
          sections: [
            {
              id: "analysis",
              title: "Analysis",
              body: "The data followed the expected trend.",
              sortOrder: 0,
            },
          ],
          tables: [],
          charts: [],
          formulas: ["x = x₀ + v₀t + ½at²"],
          images: [],
          conclusion: "The measured data supports the motion model.",
        },
        repository,
      );
      expect(report.status).toBe("draft");
      expect((await repository.getReportBySession("profile-lab", session.id))?.title).toBe(
        "Motion report",
      );
    } finally {
      raw?.close();
      await rm(directory, { recursive: true, force: true });
    }
  });
});
