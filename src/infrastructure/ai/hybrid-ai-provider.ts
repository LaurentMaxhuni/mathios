import type { AiProvider, AiProviderHealth, AiRequest, AiResponse } from "@/domain/ai/types";
import { AiProviderUnavailableError } from "@/infrastructure/ai/http-utils";

export class HybridAiProvider implements AiProvider {
  readonly mode = "hybrid" as const;
  readonly provider = "local" as const;

  constructor(
    private readonly local: AiProvider,
    private readonly remote: AiProvider,
  ) {}

  get model(): string {
    return `${this.local.model} → ${this.remote.model}`;
  }

  async generate(request: AiRequest): Promise<AiResponse> {
    try {
      return await this.local.generate(request);
    } catch (localError) {
      if (!(localError instanceof AiProviderUnavailableError)) throw localError;
      try {
        return await this.remote.generate(request);
      } catch (remoteError) {
        if (!(remoteError instanceof AiProviderUnavailableError)) throw remoteError;
        throw new AiProviderUnavailableError(
          "Neither the local nor remote AI provider is available.",
        );
      }
    }
  }

  async checkHealth(): Promise<AiProviderHealth> {
    const [local, remote] = await Promise.all([
      this.local.checkHealth(),
      this.remote.checkHealth(),
    ]);
    return {
      provider: "local",
      model: this.model,
      available: local.available || remote.available,
      message: local.available
        ? "Hybrid AI will use the local provider first."
        : remote.available
          ? "Hybrid AI will use the remote fallback."
          : "Neither hybrid AI provider is available.",
      checkedAt: new Date().toISOString(),
    };
  }
}
