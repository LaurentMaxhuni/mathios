import { describe, expect, it, vi } from "vitest";
import { AuthorizationError, ValidationError } from "@/domain/errors/application-error";
import type { CourseRecord } from "@/domain/course/types";
import type { CourseRepository } from "@/domain/ports/course-repository";
import {
  requireCourseEditor,
  saveCoursePrerequisite,
  saveModulePrerequisite,
  setCourseStatus,
} from "@/features/courses/service";

function session(
  roles: readonly string[],
  permissions: readonly string[] = ["edit_content", "publish_content"],
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

describe("course authoring authorization and invariants", () => {
  it("allows teachers and rejects learners", () => {
    expect(requireCourseEditor(session(["teacher"]))).toBeDefined();
    expect(() => requireCourseEditor(session(["learner"], ["view_learning_content"]))).toThrow(
      AuthorizationError,
    );
  });

  it("rejects self prerequisites", async () => {
    const repository = {} as CourseRepository;
    await expect(
      saveCoursePrerequisite(
        { courseId: "course-1", prerequisiteCourseId: "course-1" },
        repository,
      ),
    ).rejects.toThrow(ValidationError);
    await expect(
      saveModulePrerequisite(
        { moduleId: "module-1", prerequisiteModuleId: "module-1" },
        repository,
      ),
    ).rejects.toThrow(ValidationError);
  });

  it("keeps module prerequisites inside their course", async () => {
    const repository = {
      getModule: vi.fn().mockImplementation(async (id: string) => ({
        id,
        courseId: id === "module-1" ? "course-1" : "course-2",
        isArchived: false,
      })),
    } as unknown as CourseRepository;
    await expect(
      saveModulePrerequisite(
        { moduleId: "module-1", prerequisiteModuleId: "module-2" },
        repository,
      ),
    ).rejects.toThrow(ValidationError);
  });

  it("requires published lesson content before publishing a course", async () => {
    const course = {
      id: "course-1",
      status: "draft",
    } as CourseRecord;
    const repository = {
      getCourse: vi.fn().mockResolvedValue(course),
      getCourseDetail: vi.fn().mockResolvedValue({ modules: [{ lessons: [{ status: "draft" }] }] }),
      setCourseStatus: vi.fn(),
    } as unknown as CourseRepository;
    await expect(setCourseStatus("course-1", "published", repository)).rejects.toThrow(
      ValidationError,
    );

    vi.mocked(repository.getCourseDetail).mockResolvedValue({
      modules: [{ lessons: [{ status: "published" }] }],
    } as never);
    vi.mocked(repository.setCourseStatus).mockResolvedValue({
      ...course,
      status: "published",
    } as never);
    await expect(setCourseStatus("course-1", "published", repository)).resolves.toMatchObject({
      status: "published",
    });
  });
});
