export type AiProviderMode = "disabled" | "local" | "remote" | "hybrid";

export interface AiRequest {
  prompt: string;
  context?: readonly { label: string; content: string }[];
}

export interface AiResponse {
  content: string;
  generated: true;
  provider: AiProviderMode;
}

export interface AiProvider {
  readonly mode: AiProviderMode;
  generate(request: AiRequest): Promise<AiResponse>;
}
