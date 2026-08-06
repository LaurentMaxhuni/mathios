import type { AiProvider, AiProviderHealth, AiRequest, AiResponse } from "@/domain/ai/types";
import {
  fetchWithTimeout,
  healthMessage,
  parseProviderContent,
  providerEndpoint,
  type AiFetch,
} from "@/infrastructure/ai/http-utils";
import { AiProviderUnavailableError } from "@/infrastructure/ai/http-utils";

export class RemoteAiProvider implements AiProvider {
  readonly mode = "remote" as const;
  readonly provider = "remote" as const;

  constructor(
    private readonly options: {
      baseUrl: string;
      model: string;
      apiKey: string | null;
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
    if (!this.options.apiKey) {
      throw new AiProviderUnavailableError("A remote AI API key has not been configured.");
    }
    const response = await fetchWithTimeout(
      this.options.fetchImpl ?? fetch,
      providerEndpoint(this.options.baseUrl, "chat/completions"),
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.options.apiKey}`,
        },
        body: JSON.stringify({
          model: this.options.model,
          messages: [
            { role: "system", content: request.systemPrompt },
            { role: "user", content: request.userPrompt },
          ],
          max_tokens: request.maxTokens,
          temperature: request.temperature,
          stream: false,
        }),
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
    if (!this.options.apiKey) {
      return {
        provider: this.provider,
        model: this.model,
        available: false,
        message: "A remote AI API key has not been configured.",
        checkedAt: new Date().toISOString(),
      };
    }
    try {
      const response = await fetchWithTimeout(
        this.options.fetchImpl ?? fetch,
        providerEndpoint(this.options.baseUrl, "models"),
        {
          method: "GET",
          headers: { Accept: "application/json", Authorization: `Bearer ${this.options.apiKey}` },
        },
        this.options.timeoutMs ?? 15_000,
      );
      return {
        provider: this.provider,
        model: this.model,
        available: response.ok,
        message: healthMessage(response.ok, "Remote AI"),
        checkedAt: new Date().toISOString(),
      };
    } catch (error) {
      return {
        provider: this.provider,
        model: this.model,
        available: false,
        message: error instanceof Error ? error.message : "Remote AI is unavailable.",
        checkedAt: new Date().toISOString(),
      };
    }
  }
}
