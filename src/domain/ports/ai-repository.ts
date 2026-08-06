import type {
  AiGenerationRecord,
  AiGenerationStatus,
  AiSettingsInput,
  AiSettingsRecord,
  AiSettingsView,
} from "@/domain/ai/types";

export interface AiRepository {
  getSettings(): Promise<AiSettingsRecord>;
  getSettingsView(): Promise<AiSettingsView>;
  updateSettings(
    input: Omit<AiSettingsInput, "remoteApiKey"> & { remoteApiKeyCiphertext: string | null },
  ): Promise<AiSettingsRecord>;
  createGeneration(input: {
    id: string;
    profileId: string;
    task: AiGenerationRecord["task"];
    mode: AiGenerationRecord["mode"];
    provider: AiGenerationRecord["provider"];
    model: string;
    instruction: string;
    grounding: AiGenerationRecord["grounding"];
    output: string;
    status: AiGenerationStatus;
  }): Promise<AiGenerationRecord>;
  listGenerations(profileId: string, limit?: number): Promise<readonly AiGenerationRecord[]>;
  reviewGeneration(
    generationId: string,
    status: Extract<AiGenerationStatus, "approved" | "rejected">,
    reviewedByProfileId: string,
  ): Promise<AiGenerationRecord>;
}
