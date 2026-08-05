export const ROADMAP_NODE_TYPES = [
  "concept",
  "lesson",
  "course",
  "module",
  "assessment",
  "simulation",
  "laboratory-activity",
  "milestone",
] as const;

export type RoadmapNodeType = (typeof ROADMAP_NODE_TYPES)[number];

export const ROADMAP_EDGE_TYPES = ["requires", "recommended", "optional"] as const;
export type RoadmapEdgeType = (typeof ROADMAP_EDGE_TYPES)[number];

export const ROADMAP_STATUSES = ["draft", "published", "archived"] as const;
export type RoadmapStatus = (typeof ROADMAP_STATUSES)[number];

export const ROADMAP_PROGRESS_STATUSES = [
  "locked",
  "available",
  "in-progress",
  "completed",
  "skipped",
] as const;
export type RoadmapProgressStatus = (typeof ROADMAP_PROGRESS_STATUSES)[number];

export const USER_ROADMAP_STATUSES = ["active", "paused", "completed", "archived"] as const;
export type UserRoadmapStatus = (typeof USER_ROADMAP_STATUSES)[number];

export const PERSONALIZED_PATH_NODE_STATES = [
  "included",
  "skipped-mastered",
  "missing-prerequisite",
  "completed",
  "locked",
] as const;
export type PersonalizedPathNodeState = (typeof PERSONALIZED_PATH_NODE_STATES)[number];

export type RoadmapDifficulty = "gentle" | "balanced" | "challenging";

export interface RoadmapRecord {
  id: string;
  slug: string;
  title: string;
  description: string;
  goal: string;
  targetGradeId: string | null;
  targetDifficulty: RoadmapDifficulty;
  estimatedDurationMinutes: number;
  coverImage: string | null;
  status: RoadmapStatus;
  createdByProfileId: string | null;
  currentVersionNumber: number;
  publishedVersionId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RoadmapCatalogEntry extends RoadmapRecord {
  targetGradeName: string | null;
  subjectNames: readonly string[];
  nodeCount: number;
  requiredNodeCount: number;
  checkpointCount: number;
  activeEnrollment?: UserRoadmapSummary | null;
}

export interface RoadmapVersionRecord {
  id: string;
  roadmapId: string;
  versionNumber: number;
  status: RoadmapStatus;
  changeSummary: string;
  snapshot: RoadmapSnapshot;
  createdByProfileId: string | null;
  createdAt: string;
  publishedAt: string | null;
}

export interface RoadmapSubjectRecord {
  roadmapId: string;
  subjectId: string;
  sortOrder: number;
  createdAt: string;
  subjectName?: string;
  subjectSlug?: string;
}

export interface RoadmapPrerequisiteRecord {
  roadmapId: string;
  prerequisiteRoadmapId: string;
  isRequired: boolean;
  createdAt: string;
  prerequisiteTitle?: string;
}

export interface RoadmapNodeRecord {
  id: string;
  roadmapVersionId: string;
  nodeKey: string;
  type: RoadmapNodeType;
  title: string;
  description: string;
  referenceId: string | null;
  referenceTitle: string | null;
  subjectId: string | null;
  subjectName: string | null;
  isRequired: boolean;
  isCheckpoint: boolean;
  isOptionalBranch: boolean;
  sortOrder: number;
  estimatedDurationMinutes: number;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface RoadmapEdgeRecord {
  id: string;
  roadmapVersionId: string;
  sourceNodeId: string;
  targetNodeId: string;
  type: RoadmapEdgeType;
  sortOrder: number;
  createdAt: string;
}

export interface RoadmapSnapshot {
  roadmap: Pick<
    RoadmapRecord,
    | "id"
    | "slug"
    | "title"
    | "description"
    | "goal"
    | "targetGradeId"
    | "targetDifficulty"
    | "estimatedDurationMinutes"
    | "coverImage"
  >;
  subjects: readonly RoadmapSubjectRecord[];
  prerequisites: readonly RoadmapPrerequisiteRecord[];
  nodes: readonly RoadmapNodeRecord[];
  edges: readonly RoadmapEdgeRecord[];
}

export interface RoadmapDetail {
  roadmap: RoadmapRecord;
  version: RoadmapVersionRecord;
  subjects: readonly RoadmapSubjectRecord[];
  prerequisites: readonly RoadmapPrerequisiteRecord[];
  nodes: readonly RoadmapNodeRecord[];
  edges: readonly RoadmapEdgeRecord[];
  integrity: RoadmapIntegrityReport;
}

export interface RoadmapIntegrityIssue {
  code:
    | "duplicate-node-key"
    | "missing-node"
    | "self-edge"
    | "duplicate-edge"
    | "required-cycle"
    | "missing-reference"
    | "orphan-node";
  message: string;
  nodeId?: string;
  edgeId?: string;
  relatedNodeIds?: readonly string[];
  severity: "error" | "warning";
}

export interface RoadmapIntegrityReport {
  valid: boolean;
  errors: readonly RoadmapIntegrityIssue[];
  warnings: readonly RoadmapIntegrityIssue[];
  requiredCycleNodeIds: readonly string[];
  orphanNodeIds: readonly string[];
}

export interface CreateRoadmapInput {
  id: string;
  slug: string;
  title: string;
  description: string;
  goal: string;
  targetGradeId: string | null;
  targetDifficulty: RoadmapDifficulty;
  estimatedDurationMinutes: number;
  coverImage: string | null;
  status: RoadmapStatus;
  createdByProfileId: string | null;
}

export type UpdateRoadmapInput = Omit<CreateRoadmapInput, "id" | "createdByProfileId"> & {
  createdByProfileId?: string | null;
};

export interface SaveRoadmapNodeInput {
  id: string;
  roadmapVersionId: string;
  nodeKey: string;
  type: RoadmapNodeType;
  title: string;
  description: string;
  referenceId: string | null;
  referenceTitle: string | null;
  subjectId: string | null;
  isRequired: boolean;
  isCheckpoint: boolean;
  isOptionalBranch: boolean;
  sortOrder: number;
  estimatedDurationMinutes: number;
  metadata: Record<string, unknown>;
}

export interface SaveRoadmapEdgeInput {
  id: string;
  roadmapVersionId: string;
  sourceNodeId: string;
  targetNodeId: string;
  type: RoadmapEdgeType;
  sortOrder: number;
}

export interface UserRoadmapRecord {
  id: string;
  profileId: string;
  roadmapId: string;
  roadmapVersionId: string;
  status: UserRoadmapStatus;
  selectedGoal: string | null;
  startedAt: string;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UserRoadmapSummary {
  id: string;
  roadmapId: string;
  status: UserRoadmapStatus;
  progressPercentage: number;
  completedNodeCount: number;
  totalNodeCount: number;
  nextNodeId: string | null;
  updatedAt: string;
}

export interface UserRoadmapProgressRecord {
  userRoadmapId: string;
  profileId: string;
  roadmapNodeId: string;
  status: RoadmapProgressStatus;
  completionPercentage: number;
  unlockedAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  updatedAt: string;
}

export interface RoadmapProgressSummary {
  totalNodes: number;
  requiredNodes: number;
  completedNodes: number;
  completedRequiredNodes: number;
  availableNodes: number;
  lockedNodes: number;
  percentage: number;
  nextNodeId: string | null;
}

export interface UserRoadmapDetail {
  enrollment: UserRoadmapRecord;
  roadmap: RoadmapRecord;
  version: RoadmapVersionRecord;
  subjects: readonly RoadmapSubjectRecord[];
  prerequisites: readonly RoadmapPrerequisiteRecord[];
  nodes: readonly RoadmapNodeRecord[];
  edges: readonly RoadmapEdgeRecord[];
  progress: readonly UserRoadmapProgressRecord[];
  summary: RoadmapProgressSummary;
}

export interface RoadmapLearningProfile {
  profileId: string;
  currentGradeId: string | null;
  targetGradeId: string | null;
  selectedGoal: string | null;
  weeklyStudyTimeMinutes: number | null;
  preferredSubjects: readonly string[];
  diagnosticWeakConceptIds: readonly string[];
  diagnosticMissingPrerequisiteConceptIds: readonly string[];
}

export interface PersonalizationMastery {
  conceptId: string;
  state: string;
  score: number;
  confidence: number;
  evidenceCount: number;
}

export interface RoadmapPersonalizationInput {
  roadmapId: string;
  nodes: readonly RoadmapNodeRecord[];
  edges: readonly RoadmapEdgeRecord[];
  mastery: readonly PersonalizationMastery[];
  completedNodeIds?: readonly string[];
  profile: RoadmapLearningProfile;
  now?: string;
}

export interface PersonalizedPathNode {
  nodeId: string;
  order: number;
  title: string;
  type: RoadmapNodeType;
  referenceId: string | null;
  subjectId: string | null;
  state: PersonalizedPathNodeState;
  estimatedDurationMinutes: number;
  prerequisiteNodeIds: readonly string[];
  reason: string;
}

export interface PersonalizedPathRecord {
  id: string;
  profileId: string;
  roadmapId: string;
  userRoadmapId: string | null;
  currentGradeId: string | null;
  targetGradeId: string | null;
  selectedGoal: string | null;
  weeklyStudyTimeMinutes: number | null;
  estimatedDurationMinutes: number;
  estimatedWeeks: number | null;
  includedTopics: readonly string[];
  skippedMasteredTopics: readonly string[];
  missingPrerequisites: readonly string[];
  pathNodes: readonly PersonalizedPathNode[];
  generatedAt: string;
}

export interface RoadmapLearningContext {
  profile: RoadmapLearningProfile;
  mastery: readonly PersonalizationMastery[];
  completedNodeIds: readonly string[];
}
