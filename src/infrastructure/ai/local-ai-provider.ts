import type { AiProvider, AiProviderHealth, AiRequest, AiResponse } from "@/domain/ai/types";
import {
  fetchWithTimeout,
  healthMessage,
  parseProviderContent,
  providerEndpoint,
  type AiFetch,
} from "@/infrastructure/ai/http-utils";

export class LocalAiProvider implements AiProvider {
  readonly mode = "local" as const;
  readonly provider = "local" as const;

  constructor(
    private readonly options: {
      baseUrl: string;
      model: string;
      maxTokens: number;
      temperature: number;
      timeoutMs?: number;
      fetchImpl?: AiFetch;
    },
  ) {}

  get model(): string {
    return this.options.model;
  }

  async generate(request: AiRequest): Promise<AiResponse> {
    const openAiCompatible = this.options.baseUrl.endsWith("/v1");
    const endpoint = providerEndpoint(
      this.options.baseUrl,
      openAiCompatible ? "chat/completions" : "api/chat",
    );
    const body = openAiCompatible
      ? {
          model: this.options.model,
          messages: messagesFor(request),
          max_tokens: request.maxTokens,
          temperature: request.temperature,
          stream: false,
        }
      : {
          model: this.options.model,
          messages: messagesFor(request),
          options: { num_predict: request.maxTokens, temperature: request.temperature },
          stream: false,
        };
    const response = await fetchWithTimeout(
      this.options.fetchImpl ?? fetch,
      endpoint,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
      this.options.timeoutMs ?? 15_000,
    );
    return {
      content: await parseProviderContent(response),
      generated: true,
      provider: this.provider,
      model: this.model,
    };
  }

  async checkHealth(): Promise<AiProviderHealth> {
    const openAiCompatible = this.options.baseUrl.endsWith("/v1");
    const endpoint = providerEndpoint(
      this.options.baseUrl,
      openAiCompatible ? "models" : "api/tags",
    );
    try {
      const response = await fetchWithTimeout(
        this.options.fetchImpl ?? fetch,
        endpoint,
        { method: "GET", headers: { Accept: "application/json" } },
        this.options.timeoutMs ?? 15_000,
      );
      return {
        provider: this.provider,
        model: this.model,
        available: response.ok,
        message: healthMessage(response.ok, "Local AI"),
        checkedAt: new Date().toISOString(),
      };
    } catch (error) {
      return {
        provider: this.provider,
        model: this.model,
        available: false,
        message: error instanceof Error ? error.message : "Local AI is unavailable.",
        checkedAt: new Date().toISOString(),
      };
    }
  }
}

function messagesFor(request: AiRequest): readonly { role: "system" | "user"; content: string }[] {
  return [
    { role: "system", content: request.systemPrompt },
    { role: "user", content: request.userPrompt },
  ];
}
