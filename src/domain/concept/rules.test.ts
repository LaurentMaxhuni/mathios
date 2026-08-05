import { describe, expect, it } from "vitest";
import {
  assertValidConceptRelationship,
  buildConceptIntegrityReport,
  findRequiredPrerequisiteCycle,
  findOrphanedConceptIds,
  traverseConcepts,
} from "@/domain/concept/rules";

describe("concept graph rules", () => {
  it("rejects self-references and detects required prerequisite cycles", () => {
    expect(() =>
      assertValidConceptRelationship({
        sourceConceptId: "a",
        targetConceptId: "a",
        type: "requires",
      }),
    ).toThrow("cannot relate to itself");
    expect(
      findRequiredPrerequisiteCycle([
        { sourceConceptId: "a", targetConceptId: "b", type: "requires" },
        { sourceConceptId: "b", targetConceptId: "c", type: "requires" },
        { sourceConceptId: "c", targetConceptId: "a", type: "requires" },
      ]),
    ).toEqual(["a", "b", "c", "a"]);
  });

  it("traverses prerequisites and descendants without revisiting nodes", () => {
    const relationships = [
      { sourceConceptId: "advanced", targetConceptId: "middle", type: "requires" as const },
      { sourceConceptId: "middle", targetConceptId: "foundation", type: "requires" as const },
      { sourceConceptId: "advanced", targetConceptId: "side", type: "related-to" as const },
    ];
    expect(traverseConcepts("advanced", relationships, "prerequisites")).toEqual([
      "middle",
      "foundation",
    ]);
    expect(traverseConcepts("foundation", relationships, "descendants")).toEqual([
      "middle",
      "advanced",
    ]);
  });

  it("reports orphaned concepts and structural integrity problems", () => {
    const snapshot = {
      concepts: [{ id: "connected" }, { id: "orphan" }],
      relationships: [
        { sourceConceptId: "connected", targetConceptId: "missing", type: "related-to" as const },
        { sourceConceptId: "connected", targetConceptId: "missing", type: "related-to" as const },
      ],
      lessonLinks: [],
      objectiveLinks: [],
    };
    expect(findOrphanedConceptIds(snapshot)).toEqual(["orphan"]);
    expect(buildConceptIntegrityReport(snapshot)).toMatchObject({
      orphanedConceptIds: ["orphan"],
      missingConceptIds: ["missing"],
      duplicateRelationshipKeys: ["connected:related-to:missing"],
    });
  });
});
