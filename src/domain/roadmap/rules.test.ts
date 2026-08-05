import { describe, expect, it } from "vitest";
import {
  buildPersonalizedPath,
  buildRoadmapIntegrityReport,
  computeRoadmapProgress,
} from "@/domain/roadmap/rules";
import type {
  RoadmapEdgeRecord,
  RoadmapNodeRecord,
  UserRoadmapProgressRecord,
} from "@/domain/roadmap/types";

const node = (
  id: string,
  order: number,
  overrides: Partial<RoadmapNodeRecord> = {},
): RoadmapNodeRecord => ({
  id,
  roadmapVersionId: "version-1",
  nodeKey: id,
  type: "concept",
  title: id,
  description: "",
  referenceId: `concept-${id}`,
  referenceTitle: id,
  subjectId: "subject-mathematics",
  subjectName: "Mathematics",
  isRequired: true,
  isCheckpoint: false,
  isOptionalBranch: false,
  sortOrder: order,
  estimatedDurationMinutes: 20,
  metadata: {},
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  ...overrides,
});

const edge = (
  id: string,
  sourceNodeId: string,
  targetNodeId: string,
  type: RoadmapEdgeRecord["type"] = "requires",
): RoadmapEdgeRecord => ({
  id,
  roadmapVersionId: "version-1",
  sourceNodeId,
  targetNodeId,
  type,
  sortOrder: 0,
  createdAt: "2026-01-01T00:00:00.000Z",
});

describe("roadmap domain rules", () => {
  it("rejects duplicate nodes, missing references, and required cycles", () => {
    const nodes = [
      node("foundation", 0),
      node("duplicate", 1, { nodeKey: "foundation", referenceId: null }),
    ];
    const report = buildRoadmapIntegrityReport(nodes, [
      edge("cycle-a", nodes[0].id, nodes[1].id),
      edge("cycle-b", nodes[1].id, nodes[0].id),
    ]);

    expect(report.valid).toBe(false);
    expect(report.errors.map((issue) => issue.code)).toEqual(
      expect.arrayContaining(["duplicate-node-key", "missing-reference", "required-cycle"]),
    );
  });

  it("orders prerequisite nodes before their dependants and reports isolated nodes", () => {
    const nodes = [node("application", 0), node("foundation", 1), node("orphan", 2)];
    const report = buildRoadmapIntegrityReport(nodes, [
      edge("foundation-application", "foundation", "application"),
    ]);

    expect(report.valid).toBe(true);
    expect(report.orphanNodeIds).toEqual(["orphan"]);
  });

  it("skips mastered concepts while keeping a deterministic explanation for the remaining path", () => {
    const nodes = [node("foundation", 0), node("application", 1)];
    const path = buildPersonalizedPath({
      roadmapId: "roadmap-1",
      nodes,
      edges: [edge("foundation-application", "foundation", "application")],
      mastery: [
        {
          conceptId: "concept-foundation",
          state: "mastered",
          score: 0.96,
          confidence: 0.9,
          evidenceCount: 5,
        },
      ],
      profile: {
        profileId: "profile-1",
        currentGradeId: "grade-8",
        targetGradeId: "grade-10",
        selectedGoal: "Connect algebra to physics",
        weeklyStudyTimeMinutes: 60,
        preferredSubjects: ["subject-mathematics"],
        diagnosticWeakConceptIds: [],
        diagnosticMissingPrerequisiteConceptIds: [],
      },
      now: "2026-01-10T00:00:00.000Z",
    });

    expect(path.pathNodes.map((item) => item.state)).toEqual(["skipped-mastered", "included"]);
    expect(path.skippedMasteredTopics).toEqual(["foundation"]);
    expect(path.pathNodes[1]?.reason).toContain("foundation");
    expect(path.estimatedWeeks).toBe(1);
  });

  it("calculates required progress and the next available node", () => {
    const nodes = [node("foundation", 0), node("application", 1)];
    const progress: UserRoadmapProgressRecord[] = [
      {
        userRoadmapId: "enrollment-1",
        profileId: "profile-1",
        roadmapNodeId: "foundation",
        status: "completed",
        completionPercentage: 100,
        unlockedAt: "2026-01-01T00:00:00.000Z",
        startedAt: "2026-01-01T00:00:00.000Z",
        completedAt: "2026-01-02T00:00:00.000Z",
        updatedAt: "2026-01-02T00:00:00.000Z",
      },
      {
        userRoadmapId: "enrollment-1",
        profileId: "profile-1",
        roadmapNodeId: "application",
        status: "available",
        completionPercentage: 0,
        unlockedAt: "2026-01-02T00:00:00.000Z",
        startedAt: null,
        completedAt: null,
        updatedAt: "2026-01-02T00:00:00.000Z",
      },
    ];
    const summary = computeRoadmapProgress(nodes, progress, [
      edge("foundation-application", "foundation", "application"),
    ]);

    expect(summary).toMatchObject({
      completedNodes: 1,
      completedRequiredNodes: 1,
      percentage: 50,
      nextNodeId: "application",
    });
  });
});
