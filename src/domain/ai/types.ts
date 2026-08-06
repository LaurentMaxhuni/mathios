export const AI_MODES = ["disabled", "local", "remote", "hybrid"] as const;
export type AiProviderMode = (typeof AI_MODES)[number];

export const AI_PROVIDER_KINDS = ["disabled", "local", "remote"] as const;
export type AiProviderKind = (typeof AI_PROVIDER_KINDS)[number];

export const AI_TASKS = [
  "alternative-explanation",
  "simpler-explanation",
  "advanced-explanation",
  "socratic-tutoring",
  "contextual-hint",
  "lesson-summary",
  "note-summary",
  "practice-question-generation",
  "question-variation",
  "written-answer-feedback",
  "misconception-analysis",
  "natural-language-search",
  "study-plan-suggestion",
] as const;
export type AiTask = (typeof AI_TASKS)[number];

export const AI_GENERATION_STATUSES = ["generated", "approved", "rejected"] as const;
export type AiGenerationStatus = (typeof AI_GENERATION_STATUSES)[number];

export const AI_SOURCE_TYPES = ["official", "creator", "approved", "learner", "mastery"] as const;
export type AiSourceType = (typeof AI_SOURCE_TYPES)[number];

export interface AiGroundingSource {
  type: AiSourceType;
  label: string;
  content: string;
  resourceId?: string;
  approved: boolean;
}

export interface AiRequest {
  task: AiTask;
  systemPrompt: string;
  userPrompt: string;
  grounding: readonly AiGroundingSource[];
  maxTokens: number;
  temperature: number;
}

export interface AiResponse {
  content: string;
  generated: true;
  provider: AiProviderKind;
  model: string;
}

export interface AiProviderHealth {
  provider: AiProviderKind;
  model: string;
  available: boolean;
  message: string;
  checkedAt: string;
}

export interface AiProvider {
  readonly mode: AiProviderMode;
  readonly provider: AiProviderKind;
  readonly model: string;
  generate(request: AiRequest): Promise<AiResponse>;
  checkHealth(): Promise<AiProviderHealth>;
}

export interface AiSettingsRecord {
  id: 1;
  mode: AiProviderMode;
  localBaseUrl: string;
  localModel: string;
  remoteBaseUrl: string;
  remoteModel: string;
  remoteApiKeyCiphertext: string | null;
  maxTokens: number;
  temperature: number;
  createdAt: string;
  updatedAt: string;
}

export interface AiSettingsView extends Omit<AiSettingsRecord, "remoteApiKeyCiphertext"> {
  hasRemoteApiKey: boolean;
}

export interface AiSettingsInput {
  mode: AiProviderMode;
  localBaseUrl: string;
  localModel: string;
  remoteBaseUrl: string;
  remoteModel: string;
  remoteApiKey?: string | null;
  maxTokens: number;
  temperature: number;
}

export interface AiGenerationRecord {
  id: string;
  profileId: string;
  task: AiTask;
  mode: AiProviderMode;
  provider: AiProviderKind;
  model: string;
  instruction: string;
  grounding: readonly AiGroundingSource[];
  output: string;
  status: AiGenerationStatus;
  reviewedByProfileId: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AiGenerationInput {
  task: AiTask;
  instruction: string;
  lessonId?: string;
  conceptId?: string;
  gradeId?: string;
  learnerContext?: string;
}

export interface AiDashboardData {
  settings: AiSettingsView;
  generations: readonly AiGenerationRecord[];
}
