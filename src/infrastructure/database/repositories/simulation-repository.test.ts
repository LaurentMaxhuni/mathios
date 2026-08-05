import Database from "better-sqlite3";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { runSeed } from "@/infrastructure/database/seed";
import type { DatabaseHandle } from "@/infrastructure/database/client";
import { getSimulationRepository } from "@/infrastructure/database/repositories/simulation-repository";
import { completeSimulation, startSimulation } from "@/features/simulations/service";

describe("simulation repository", () => {
  it("loads seeded models, persists a session, and saves a result", async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), "mathios-simulations-"));
    const databaseUrl = `file:${path.join(directory, "simulations.db")}`;
    let raw: Database.Database | undefined;
    try {
      await runSeed({ provider: "sqlite", databaseUrl });
      raw = new Database(path.join(directory, "simulations.db"));
      raw.pragma("foreign_keys = ON");
      raw.prepare("INSERT INTO users (id, identifier) VALUES (?, ?)").run("user-sim", "sim-user");
      raw
        .prepare("INSERT INTO profiles (id, user_id, display_name) VALUES (?, ?, ?)")
        .run("profile-sim", "user-sim", "Simulation learner");
      const repository = getSimulationRepository({
        provider: "sqlite",
        raw,
        db: undefined as never,
      } as unknown as DatabaseHandle);
      const catalog = await repository.listSimulations();
      expect(catalog).toHaveLength(17);
      const detail = await repository.getSimulation("one-dimensional-motion", {
        profileId: "profile-sim",
      });
      expect(detail?.version.definition.title).toBe("One-dimensional motion");
      expect(
        detail?.lessonLinks.some((link) => link.lessonId === "lesson-constant-acceleration"),
      ).toBe(true);
      const session = await startSimulation("profile-sim", "one-dimensional-motion", repository);
      const result = await completeSimulation(
        "profile-sim",
        {
          sessionId: session.id,
          inputs: { ...session.inputs, time: 8 },
          state: session.state,
          elapsedSeconds: 4,
        },
        repository,
      );
      expect(result.completionPercentage).toBe(100);
      expect((await repository.getSession("profile-sim", session.id))?.status).toBe("completed");
    } finally {
      raw?.close();
      await rm(directory, { recursive: true, force: true });
    }
  });
});
