import { ApplicationError } from "@/domain/errors/application-error";
import type { AiProvider, AiRequest, AiResponse } from "@/infrastructure/ai/ai-provider";

export class DisabledAiProvider implements AiProvider {
  readonly mode = "disabled" as const;
  readonly provider = "disabled" as const;
  readonly model = "disabled";

  async generate(request: AiRequest): Promise<AiResponse> {
    void request;
    throw new ApplicationError("CONFLICT", "AI features are disabled in this installation.", 409);
  }

  async checkHealth() {
    return {
      provider: this.provider,
      model: this.model,
      available: false,
      message: "AI is disabled in this installation.",
      checkedAt: new Date().toISOString(),
    } as const;
  }
}
