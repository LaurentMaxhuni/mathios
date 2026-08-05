import { ApplicationError } from "@/domain/errors/application-error";
import type { AiProvider, AiRequest, AiResponse } from "@/infrastructure/ai/ai-provider";

export class DisabledAiProvider implements AiProvider {
  readonly mode = "disabled" as const;

  async generate(request: AiRequest): Promise<AiResponse> {
    void request;
    throw new ApplicationError("CONFLICT", "AI features are disabled in this installation.", 409);
  }
}
