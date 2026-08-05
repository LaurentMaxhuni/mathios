import type {
  CreateRoadmapInput,
  RoadmapCatalogEntry,
  RoadmapDetail,
  RoadmapLearningContext,
  RoadmapPrerequisiteRecord,
  RoadmapRecord,
  RoadmapSubjectRecord,
  RoadmapVersionRecord,
  SaveRoadmapEdgeInput,
  SaveRoadmapNodeInput,
  UpdateRoadmapInput,
  UserRoadmapDetail,
  UserRoadmapRecord,
  UserRoadmapStatus,
  UserRoadmapProgressRecord,
  PersonalizedPathRecord,
} from "@/domain/roadmap/types";

export interface RoadmapRepository {
  listRoadmaps(options?: {
    includeArchived?: boolean;
    includeDraft?: boolean;
    subjectId?: string;
    targetGradeId?: string;
  }): Promise<readonly RoadmapCatalogEntry[]>;
  getRoadmap(id: string, options?: { includeDraft?: boolean }): Promise<RoadmapDetail | null>;
  createRoadmap(input: CreateRoadmapInput): Promise<RoadmapRecord>;
  updateRoadmap(id: string, input: UpdateRoadmapInput): Promise<RoadmapRecord>;
  setRoadmapStatus(id: string, status: RoadmapRecord["status"]): Promise<RoadmapRecord>;
  createVersion(input: {
    id: string;
    roadmapId: string;
    versionNumber: number;
    status: RoadmapRecord["status"];
    changeSummary: string;
    snapshot: RoadmapDetail["version"]["snapshot"];
    createdByProfileId: string | null;
    publishedAt: string | null;
  }): Promise<RoadmapVersionRecord>;
  listVersions(roadmapId: string): Promise<readonly RoadmapVersionRecord[]>;
  getVersion(id: string): Promise<RoadmapVersionRecord | null>;
  saveSubject(input: Omit<RoadmapSubjectRecord, "createdAt">): Promise<void>;
  deleteSubject(input: { roadmapId: string; subjectId: string }): Promise<void>;
  savePrerequisite(input: Omit<RoadmapPrerequisiteRecord, "createdAt">): Promise<void>;
  deletePrerequisite(input: { roadmapId: string; prerequisiteRoadmapId: string }): Promise<void>;
  saveNode(input: SaveRoadmapNodeInput): Promise<void>;
  reorderNodes(input: {
    roadmapVersionId: string;
    orderedNodeIds: readonly string[];
  }): Promise<void>;
  deleteNode(id: string): Promise<void>;
  saveEdge(input: SaveRoadmapEdgeInput): Promise<void>;
  deleteEdge(id: string): Promise<void>;

  listUserRoadmaps(profileId: string): Promise<readonly UserRoadmapRecord[]>;
  getUserRoadmap(profileId: string, roadmapId: string): Promise<UserRoadmapDetail | null>;
  enrollUser(input: {
    id: string;
    profileId: string;
    roadmapId: string;
    roadmapVersionId: string;
    selectedGoal: string | null;
  }): Promise<UserRoadmapRecord>;
  updateUserRoadmapStatus(
    profileId: string,
    roadmapId: string,
    status: UserRoadmapStatus,
  ): Promise<UserRoadmapRecord>;
  saveProgress(input: {
    userRoadmapId: string;
    profileId: string;
    roadmapNodeId: string;
    status: UserRoadmapProgressRecord["status"];
    completionPercentage: number;
  }): Promise<UserRoadmapProgressRecord>;
  getLearningContext(profileId: string, roadmapId: string): Promise<RoadmapLearningContext>;
  savePersonalizedPath(input: PersonalizedPathRecord): Promise<PersonalizedPathRecord>;
  getLatestPersonalizedPath(
    profileId: string,
    roadmapId: string,
  ): Promise<PersonalizedPathRecord | null>;
}
