import Database from "better-sqlite3";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { DatabaseHandle } from "@/infrastructure/database/client";
import { roadmapSeed, runSeed } from "@/infrastructure/database/seed";
import {
  generatePersonalizedPath,
  reorderRoadmapNodes,
  saveRoadmapNode,
  saveRoadmapProgress,
  setRoadmapStatus,
} from "@/features/roadmaps/service";
import { getRoadmapRepository } from "@/infrastructure/database/repositories/roadmap-repository";

describe("roadmap repository and learner flow", () => {
  it("loads seeded roadmaps, unlocks progress, and persists a personalized path", async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), "mathios-roadmaps-"));
    const databaseUrl = `file:${path.join(directory, "roadmaps.db")}`;
    let raw: Database.Database | undefined;
    try {
      await runSeed({ provider: "sqlite", databaseUrl });
      raw = new Database(path.join(directory, "roadmaps.db"));
      raw.pragma("foreign_keys = ON");
      raw
        .prepare("INSERT INTO users (id, identifier) VALUES (?, ?)")
        .run("user-roadmaps", "roadmaps-user");
      raw
        .prepare(
          "INSERT INTO profiles (id, user_id, display_name, current_grade, target_grade) VALUES (?, ?, ?, ?, ?)",
        )
        .run("profile-roadmaps", "user-roadmaps", "Roadmap learner", "grade-7", "grade-10");

      const handle = {
        provider: "sqlite",
        raw,
        db: undefined as never,
      } as unknown as DatabaseHandle;
      const repository = getRoadmapRepository(handle);
      const catalog = await repository.listRoadmaps();
      expect(catalog).toHaveLength(roadmapSeed.length);
      expect(catalog.map((item) => item.title)).toContain("Complete Natural Sciences Foundations");

      const detail = await repository.getRoadmap("roadmap-math-physics-foundations");
      expect(detail).not.toBeNull();
      expect(detail?.integrity.valid).toBe(true);
      expect(detail?.nodes.length).toBe(4);

      const enrollment = await repository.enrollUser({
        id: "user-roadmap-math-physics",
        profileId: "profile-roadmaps",
        roadmapId: detail!.roadmap.id,
        roadmapVersionId: detail!.version.id,
        selectedGoal: "Build a physics foundation",
      });
      const firstNode = detail!.nodes[0];
      const secondNode = detail!.nodes[1];
      expect(
        (await repository.getUserRoadmap("profile-roadmaps", detail!.roadmap.id))?.progress,
      ).toHaveLength(4);
      expect(
        (await repository.getUserRoadmap("profile-roadmaps", detail!.roadmap.id))?.progress.find(
          (item) => item.roadmapNodeId === firstNode.id,
        )?.status,
      ).toBe("available");

      await saveRoadmapProgress(
        "profile-roadmaps",
        {
          roadmapId: detail!.roadmap.id,
          roadmapNodeId: firstNode.id,
          status: "completed",
          completionPercentage: 100,
        },
        repository,
      );
      const afterProgress = await repository.getUserRoadmap("profile-roadmaps", detail!.roadmap.id);
      expect(afterProgress?.enrollment.id).toBe(enrollment.id);
      expect(afterProgress?.summary.completedRequiredNodes).toBe(1);
      expect(
        afterProgress?.progress.find((item) => item.roadmapNodeId === secondNode.id)?.status,
      ).toBe("available");

      const pathRecord = await generatePersonalizedPath(
        "profile-roadmaps",
        detail!.roadmap.id,
        repository,
      );
      expect(pathRecord.currentGradeId).toBe("grade-7");
      expect(pathRecord.targetGradeId).toBe("grade-10");
      expect(pathRecord.pathNodes.some((item) => item.state === "completed")).toBe(true);
      expect(
        (await repository.getLatestPersonalizedPath("profile-roadmaps", detail!.roadmap.id))?.id,
      ).toBe(pathRecord.id);

      await saveRoadmapNode(
        {
          id: "roadmap-node-editor-outcome",
          roadmapVersionId: detail!.version.id,
          nodeKey: "editor-outcome",
          type: "milestone",
          title: "Editor outcome",
          description: "A versioned authoring checkpoint.",
          referenceId: null,
          referenceTitle: null,
          subjectId: null,
          isRequired: false,
          isCheckpoint: true,
          isOptionalBranch: true,
          sortOrder: 10,
          estimatedDurationMinutes: 10,
          metadata: {},
        },
        repository,
      );
      const draft = await repository.getRoadmap(detail!.roadmap.id, { includeDraft: true });
      const published = await repository.getRoadmap(detail!.roadmap.id);
      expect(draft?.version.versionNumber).toBe(2);
      expect(draft?.version.status).toBe("draft");
      expect(draft?.nodes).toHaveLength(5);
      expect(published?.version.versionNumber).toBe(1);
      expect(published?.nodes).toHaveLength(4);

      await reorderRoadmapNodes(
        {
          roadmapId: detail!.roadmap.id,
          roadmapVersionId: draft!.version.id,
          orderedNodeIds: [...draft!.nodes].reverse().map((node) => node.id),
        },
        repository,
      );
      const reordered = await repository.getRoadmap(detail!.roadmap.id, { includeDraft: true });
      expect(reordered?.nodes[0].nodeKey).toBe("editor-outcome");

      await setRoadmapStatus(detail!.roadmap.id, "published", repository);
      const republished = await repository.getRoadmap(detail!.roadmap.id);
      expect(republished?.version.versionNumber).toBe(2);
      expect(republished?.nodes).toHaveLength(5);
    } finally {
      raw?.close();
      await rm(directory, { recursive: true, force: true });
    }
  });
});
