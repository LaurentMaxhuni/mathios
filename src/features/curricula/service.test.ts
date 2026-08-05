import { describe, expect, it, vi } from "vitest";
import { AuthorizationError, ValidationError } from "@/domain/errors/application-error";
import type { CurriculumRepository } from "@/domain/ports/curriculum-repository";
import { requireStructureManager, saveGradeSubject } from "@/features/curricula/service";

function session(
  roles: readonly string[],
  permissions: readonly string[] = ["edit_content"] as const,
) {
  return {
    principal: {
      subjectId: "user-1",
      userId: "user-1",
      profileId: "profile-1",
      roles,
      permissions,
    },
  };
}

describe("curriculum structure authorization and rules", () => {
  it("allows only administrators and content creators to edit structure", () => {
    expect(() => requireStructureManager(session(["learner"]))).toThrow(AuthorizationError);
    expect(() => requireStructureManager(session(["teacher"]))).toThrow(AuthorizationError);
    expect(requireStructureManager(session(["content-creator"]))).toBeDefined();
  });

  it("requires curriculum-level availability before a subject can be placed on a grade", async () => {
    const repository = {
      getCurriculum: vi.fn().mockResolvedValue({ isArchived: false }),
      getGrade: vi.fn().mockResolvedValue({ isArchived: false }),
      getSubject: vi.fn().mockResolvedValue({ isArchived: false }),
      listCurriculumGrades: vi.fn().mockResolvedValue([]),
      listCurriculumSubjects: vi.fn().mockResolvedValue([]),
    } as unknown as CurriculumRepository;

    await expect(
      saveGradeSubject(
        {
          curriculumId: "curriculum-1",
          gradeId: "grade-1",
          subjectId: "subject-1",
          isRequired: true,
          isAvailable: true,
          sortOrder: 0,
        },
        repository,
      ),
    ).rejects.toThrow(ValidationError);
  });
});
