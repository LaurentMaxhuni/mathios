import { describe, expect, it, vi } from "vitest";
import type { ConceptRepository } from "@/domain/ports/concept-repository";
import { AuthorizationError, ValidationError } from "@/domain/errors/application-error";
import type { AuthSession } from "@/infrastructure/auth/auth-provider";
import { requireConceptEditor, saveConceptRelationship } from "@/features/concepts/service";

function session(roles: readonly string[], permissions: readonly string[]): AuthSession {
  return {
    principal: {
      subjectId: "user-1",
      userId: "user-1",
      profileId: "profile-1",
      displayName: "Test",
      roles,
      permissions,
    },
  };
}

function concept(id: string) {
  return {
    id,
    slug: id,
    name: id,
    description: "",
    subjectId: "subject-physics",
    domainId: null,
    gradeMinId: null,
    gradeMaxId: null,
    difficulty: "balanced" as const,
    masteryThreshold: 70,
    isArchived: false,
    createdAt: "now",
    updatedAt: "now",
  };
}

describe("concept authoring authorization and graph invariants", () => {
  it("allows only content authors to manage concepts", () => {
    expect(() => requireConceptEditor(session(["learner"], ["view_learning_content"]))).toThrow(
      AuthorizationError,
    );
    expect(requireConceptEditor(session(["content-creator"], ["edit_content"])).profileId).toBe(
      "profile-1",
    );
  });

  it("rejects a required relationship that closes a cycle", async () => {
    const repository = {
      getConcept: vi.fn(async (id: string) => concept(id)),
      listRelationships: vi.fn(async () => [
        {
          id: "edge-b-a",
          sourceConceptId: "b",
          targetConceptId: "a",
          type: "requires" as const,
          createdAt: "now",
          updatedAt: "now",
          sourceConcept: { id: "b", slug: "b", name: "b", subjectId: "subject-physics" },
          targetConcept: { id: "a", slug: "a", name: "a", subjectId: "subject-physics" },
        },
      ]),
    } as unknown as ConceptRepository;
    await expect(
      saveConceptRelationship(
        { sourceConceptId: "a", targetConceptId: "b", type: "requires" },
        repository,
      ),
    ).rejects.toThrow(ValidationError);
  });
});
